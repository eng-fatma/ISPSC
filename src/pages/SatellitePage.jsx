import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { NASA_POWER_HOURLY_API_BASE, EGYPT_LOCATIONS } from '../data/weatherConfig'
import {
  Satellite, Thermometer, Droplets, Wind, CloudRain, RefreshCw,
  AlertTriangle, MapPin, Tractor, Radio,
} from 'lucide-react'
import './SatellitePage.css'

// بيانات NASA POWER بتتحدث على فترات طويلة (ساعية ومتأخرة كام ساعة/يوم)،
// فمفيش فايدة من polling سريع — كل ساعة كافية جداً.
const POLL_INTERVAL_MS = 60 * 60 * 1000

// NASA POWER بيرجع -999 لأي قيمة مش متاحة لسه (اللحظات الأحدث غالباً مش جاهزة) — isValid بيتخطاها
const isValid = (v) => typeof v === 'number' && Number.isFinite(v) && v > -900
const round1 = (v) => Math.round(v * 10) / 10
const pad2 = (n) => String(n).padStart(2, '0')
const toYmd = (d) => `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`

// 'YYYYMMDDHH' (UTC) -> Date
function parseHourKey(key) {
  return new Date(Date.UTC(+key.slice(0, 4), +key.slice(4, 6) - 1, +key.slice(6, 8), +key.slice(8, 10)))
}

// يحوّل رد NASA POWER الخام لنفس الشكل اللي الواجهة شغالة عليه
// (current = آخر قراءة فعلية متاحة، daily = آخر 5 أيام فعلية)
function buildWeatherFromNasa(json) {
  const p = json?.properties?.parameter
  if (!p?.T2M) throw new Error('رد غير متوقع من ناسا باور، جرب تاني')

  const rows = Object.keys(p.T2M)
    .sort()
    .map((key) => ({
      key,
      time: parseHourKey(key),
      temp: p.T2M[key],
      humidity: p.RH2M?.[key],
      windMs: p.WS10M?.[key],
      rain: p.PRECTOTCORR?.[key], // مم/ساعة
    }))
    .filter((r) => isValid(r.temp))

  if (rows.length === 0) throw new Error('مفيش بيانات متاحة من ناسا باور للموقع ده حالياً')

  const last = rows[rows.length - 1]

  // تجميع يومي
  const days = new Map()
  for (const r of rows) {
    const day = r.key.slice(0, 8)
    if (!days.has(day)) days.set(day, { max: -Infinity, min: Infinity, rain: 0 })
    const d = days.get(day)
    d.max = Math.max(d.max, r.temp)
    d.min = Math.min(d.min, r.temp)
    if (isValid(r.rain)) d.rain += r.rain
  }
  const dayKeys = [...days.keys()].sort().slice(-5)

  return {
    current: {
      time: last.time.toISOString(),
      temperature_2m: round1(last.temp),
      relative_humidity_2m: isValid(last.humidity) ? Math.round(last.humidity) : null,
      // NASA بترجّع الرياح بالمتر/ثانية — بنحوّلها لكم/س
      wind_speed_10m: isValid(last.windMs) ? round1(last.windMs * 3.6) : null,
      precipitation: isValid(last.rain) ? round1(last.rain) : null,
    },
    daily: {
      time: dayKeys.map((k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`),
      temperature_2m_max: dayKeys.map((k) => round1(days.get(k).max)),
      temperature_2m_min: dayKeys.map((k) => round1(days.get(k).min)),
      precipitation_sum: dayKeys.map((k) => round1(days.get(k).rain)),
    },
  }
}

function SatellitePage() {
  const [farmLocations, setFarmLocations] = useState([]) // أراضي المستخدم الحقيقية (لو محددة GPS)
  const [farmsLoading, setFarmsLoading] = useState(true)

  const [location, setLocation] = useState(null)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetchedAt, setLastFetchedAt] = useState(null)

  const abortRef = useRef(null)

  // تحميل أراضي المستخدم الحقيقية من Supabase (بدل الاعتماد على محافظة عامة بس)
  useEffect(() => {
    (async () => {
      setFarmsLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) { setFarmsLoading(false); return }

      const { data } = await supabase
        .from('farms')
        .select('id, name, gps_lat, gps_lng')
        .eq('owner_id', userData.user.id)
        .not('gps_lat', 'is', null)
        .not('gps_lng', 'is', null)

      const farms = (data || []).map((f) => ({
        name: f.name || 'أرض بدون اسم',
        lat: f.gps_lat,
        lng: f.gps_lng,
        isFarm: true,
      }))
      setFarmLocations(farms)
      setLocation(farms[0] || { ...EGYPT_LOCATIONS[0], isFarm: false })
      setFarmsLoading(false)
    })()
  }, [])

  const fetchWeather = useCallback(async (loc) => {
    if (!loc) return
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      // آخر 8 أيام (UTC) عشان نضمن 5 أيام فعلية حتى لو آخر يومين لسه مش جاهزين عند ناسا
      const end = new Date()
      const start = new Date(end.getTime() - 8 * 24 * 60 * 60 * 1000)
      const params = new URLSearchParams({
        parameters: 'T2M,RH2M,WS10M,PRECTOTCORR',
        community: 'AG',
        latitude: loc.lat,
        longitude: loc.lng,
        start: toYmd(start),
        end: toYmd(end),
        format: 'JSON',
        'time-standard': 'UTC',
      })
      const res = await fetch(`${NASA_POWER_HOURLY_API_BASE}?${params}`, { signal: controller.signal })
      if (!res.ok) throw new Error('فشل الاتصال بخدمة ناسا باور، جرب تاني')
      const data = await res.json()
      setWeather(buildWeatherFromNasa(data))
      setLastFetchedAt(new Date())
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!location) return
    fetchWeather(location)
    const interval = setInterval(() => fetchWeather(location), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [location, fetchWeather])

  const sourceTime = weather?.current?.time
    ? new Date(weather.current.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    : null

  const alerts = []
  if (weather?.current?.wind_speed_10m > 40) {
    alerts.push('رياح قوية مسجلة — يُنصح بتجنب الرش الآن')
  }
  const lastDayRain = weather?.daily?.precipitation_sum?.slice(-1)[0]
  if (lastDayRain > 10) {
    alerts.push('أمطار غزيرة مسجلة في آخر يوم — قلّل الري')
  }

  if (farmsLoading) {
    return (
      <div className="satellite-page">
        <div className="satellite-skeleton-header" />
        <div className="satellite-skeleton-pills" />
        <div className="satellite-skeleton-stats">
          <div className="satellite-skeleton-stat" />
          <div className="satellite-skeleton-stat" />
          <div className="satellite-skeleton-stat" />
          <div className="satellite-skeleton-stat" />
        </div>
      </div>
    )
  }

  return (
    <div className="satellite-page">
      <div className="satellite-header">
        <div className="satellite-breadcrumb">الرئيسية / مراقبة الأقمار الصناعية</div>
        <h1><Satellite size={22} /> مراقبة الطقس والأقمار الصناعية</h1>
        <p>بيانات فعلية من أقمار ناسا الصناعية ونماذجها — مش أرقام تخمينية</p>
      </div>

      <div className="satellite-source-badge">
        <Radio size={13} />
        المصدر: <a href="https://power.larc.nasa.gov" target="_blank" rel="noreferrer">NASA POWER</a>
        — بيانات أقمار ناسا (MERRA-2 / IMERG)، فعلية وشبه لحظية وبدون توليد بيانات محلياً
      </div>

      <div className="location-selector">
        {farmLocations.length > 0 && (
          <div className="location-group">
            <span className="location-group-label"><Tractor size={13} /> أراضيك</span>
            <div className="location-group-items">
              {farmLocations.map((loc) => (
                <button
                  key={loc.name}
                  className={`location-btn farm ${location?.name === loc.name ? 'active' : ''}`}
                  onClick={() => setLocation(loc)}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="location-group">
          <span className="location-group-label"><MapPin size={13} /> محافظات عامة</span>
          <div className="location-group-items">
            {EGYPT_LOCATIONS.map((loc) => (
              <button
                key={loc.name}
                className={`location-btn ${location?.name === loc.name ? 'active' : ''}`}
                onClick={() => setLocation({ ...loc, isFarm: false })}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {farmLocations.length === 0 && (
        <div className="satellite-note">
          لسه معندكش أرض محددة الموقع بالـ GPS. البيانات دلوقتي تقريبية على مستوى المحافظة —
          حدد موقع أرضك من صفحة "أرضي" عشان تشوف طقس مكانك بالظبط.
        </div>
      )}

      {loading && !weather && (
        <div className="satellite-skeleton-stats">
          <div className="satellite-skeleton-stat" />
          <div className="satellite-skeleton-stat" />
          <div className="satellite-skeleton-stat" />
          <div className="satellite-skeleton-stat" />
        </div>
      )}

      {error && (
        <div className="satellite-error">
          <AlertTriangle size={16} /> {error}
          <button onClick={() => fetchWeather(location)}>حاول تاني</button>
        </div>
      )}

      {weather && (
        <>
          <div className="current-weather-card">
            <div className="weather-stat">
              <Thermometer size={22} className="weather-stat-icon" />
              <div className="weather-stat-value">{weather.current.temperature_2m ?? '—'}°م</div>
              <div className="weather-stat-label">آخر حرارة مسجلة</div>
            </div>
            <div className="weather-stat">
              <Droplets size={22} className="weather-stat-icon" />
              <div className="weather-stat-value">{weather.current.relative_humidity_2m ?? '—'}%</div>
              <div className="weather-stat-label">الرطوبة</div>
            </div>
            <div className="weather-stat">
              <Wind size={22} className="weather-stat-icon" />
              <div className="weather-stat-value">{weather.current.wind_speed_10m ?? '—'} كم/س</div>
              <div className="weather-stat-label">سرعة الرياح</div>
            </div>
            <div className="weather-stat">
              <CloudRain size={22} className="weather-stat-icon" />
              <div className="weather-stat-value">{weather.current.precipitation ?? '—'} مم</div>
              <div className="weather-stat-label">أمطار آخر ساعة</div>
            </div>
          </div>

          <div className="forecast-card">
            <div className="forecast-card-title">آخر 5 أيام (قراءات فعلية)</div>
            <div className="forecast-days">
              {weather.daily.time.map((date, i) => (
                <div className="forecast-day" key={date}>
                  <div className="forecast-date">
                    {new Date(date).toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })}
                  </div>
                  <div className="forecast-temps">
                    <span className="temp-max">{weather.daily.temperature_2m_max[i]}°</span>
                    <span className="temp-min">{weather.daily.temperature_2m_min[i]}°</span>
                  </div>
                  <div className="forecast-rain">
                    <CloudRain size={11} /> {weather.daily.precipitation_sum[i]} مم
                  </div>
                </div>
              ))}
            </div>
          </div>

          {alerts.map((text) => (
            <div className="auto-alert" key={text}>
              <AlertTriangle size={16} /> تنبيه تلقائي: {text}
            </div>
          ))}
        </>
      )}

      <div className="satellite-footer-row">
        <button className="satellite-refresh-btn" onClick={() => fetchWeather(location)} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> تحديث الآن
        </button>
        <div className="auto-update-note">
          {sourceTime ? `آخر قراءة متاحة من ناسا: ${sourceTime}` : ''}
          {lastFetchedAt ? ` — تحديث تلقائي كل ${POLL_INTERVAL_MS / 60000} دقيقة` : ''}
        </div>
      </div>
    </div>
  )
}

export default SatellitePage