import { Fragment, useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import PageLoading from '../components/PageLoading'

import { supabase } from '../lib/supabase'
import { NASA_POWER_DAILY_API_BASE, EGYPT_LOCATIONS } from '../data/weatherConfig'
import { fetchLatestNasaReading, nasaValid, toYmd } from '../lib/nasaPower'
import { buildRotationPlans, getSeasonPlan, getMissingFarmFields, normalizeArabic } from '../utils/cropMatching'
import {
  Target, Sprout, Tractor, PenLine, AlertTriangle, MapPin,
  Thermometer, Droplets, CheckCircle2, XCircle, TrendingUp,
  Sparkles, Loader2, CalendarDays, ArrowLeft,
} from 'lucide-react'
import './PriceForecastPage.css'

const GOALS = [
  { id: 'default', label: 'توازن عام' },
  { id: 'price', label: 'أعلى سعر' },
  { id: 'water', label: 'أقل مياه' },
  { id: 'longterm', label: 'المدى البعيد' },
  { id: 'risk', label: 'أقل مخاطر' },
  { id: 'export', label: 'قابل للتصدير' },
]

const PLAN_LABELS = ['الخطة الأولى', 'الخطة الثانية', 'الخطة الثالثة']
const SEASON_ORDER_LABELS = ['الموسم الأول', 'الموسم الثاني', 'الموسم الثالث']

function findLocationByName(name) {
  if (!name) return null
  const target = normalizeArabic(name)
  return EGYPT_LOCATIONS.find((loc) => normalizeArabic(loc.name) === target) || null
}

// الجو المعتاد لكل موسم في موقع الأرض: متوسط آخر 5 سنين من بيانات NASA POWER اليومية لأشهر الموسم
// (بنستخدمه للمواسم الجاية لأن الجو الحالي مش بيمثّلها). بنجيب البيانات في طلب واحد لكل المواسم.
// لو الطلب فشل بيرمي خطأ، ولو موسم معيّن مالوش بيانات بيرجع null وتتعلّم النتيجة "تقريبية".
async function fetchTypicalSeasonWeathers(loc, seasons) {
  const end = new Date()
  end.setDate(end.getDate() - 7) // بيانات NASA بتتأخر كام يوم
  const start = new Date(end)
  start.setFullYear(start.getFullYear() - 5)
  const params = new URLSearchParams({
    parameters: 'T2M,RH2M',
    community: 'AG',
    latitude: loc.lat,
    longitude: loc.lng,
    start: toYmd(start),
    end: toYmd(end),
    format: 'JSON',
  })
  const res = await fetch(`${NASA_POWER_DAILY_API_BASE}?${params}`)
  if (!res.ok) throw new Error('تعذّر جلب الجو المعتاد للمواسم')
  const json = await res.json()

  const temps = json?.properties?.parameter?.T2M || {}
  const hums = json?.properties?.parameter?.RH2M || {}
  const buckets = seasons.map(() => ({ t: [], h: [] }))
  Object.keys(temps).forEach((day) => { // day = YYYYMMDD
    const monthIndex = Number(day.slice(4, 6)) - 1
    seasons.forEach((season, si) => {
      if (!season.monthIndexes.includes(monthIndex)) return
      if (nasaValid(temps[day])) buckets[si].t.push(temps[day])
      if (nasaValid(hums[day])) buckets[si].h.push(hums[day])
    })
  })
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
  return buckets.map(({ t, h }) => (
    t.length === 0 ? null : { temp: Math.round(avg(t) * 10) / 10, humidity: h.length > 0 ? Math.round(avg(h)) : null }
  ))
}

// خطوة واحدة في الخطة: موسم + المحصول المختار له + نسبة التوافق
function PlanStep({ step, previous }) {
  const { season, item, carriedOver } = step
  const previousName = previous?.item?.crop?.name_ar
  return (
    <div className="plan-step">
      <div className="step-season">
        <span className="season-pill"><CalendarDays size={12} /> {SEASON_ORDER_LABELS[season.order - 1]}</span>
        <span className="step-season-name">{season.label}</span>
      </div>

      {!item ? (
        <div className="no-results">مفيش محصول ببيانات كافية للمطابقة في الموسم ده</div>
      ) : (
        <>
          <div className="result-top">
            <span className="result-name">{item.crop.name_ar}</span>
            <span className="result-percent">{item.matchPercent}%</span>
          </div>
          <div className="result-bar"><i style={{ width: `${item.matchPercent}%` }} /></div>
          {item.seasonPercent !== item.matchPercent && (
            <div className="step-raw">توافق المحصول للموسم ده: {item.seasonPercent}%</div>
          )}

          <div className="result-badges">
            {carriedOver && <span className="badge in-season">محصول دائم — بيكمّل من الموسم اللي قبله</span>}
            {item.rotation === 'different' && previousName && <span className="badge in-season">تنويع بعد {previousName}</span>}
            {item.rotation === 'same' && previousName && <span className="badge approx">نفس تصنيف {previousName}</span>}
            {item.soilTier && (
              <span className={`badge soil-${item.soilTier === 'ممتازة' ? 'great' : item.soilTier === 'جيدة' ? 'good' : item.soilTier === 'مقبولة' ? 'ok' : 'bad'}`}>
                تربة {item.soilTier}
              </span>
            )}
            {item.inSeason === true && <span className="badge in-season"><CheckCircle2 size={11} /> داخل موسم الزراعة</span>}
            {item.inSeason === false && <span className="badge out-season"><XCircle size={11} /> خارج موسم الزراعة</span>}
            {item.isApproximate && <span className="badge approx">نتيجة تقريبية</span>}
          </div>

          {!carriedOver && item.plantingMonths && <div className="result-planting">الزراعة: {item.plantingMonths}</div>}
          {item.salinityWarning && (
            <div className="result-warning"><AlertTriangle size={12} /> {item.salinityWarning}</div>
          )}
          {item.predictedPrice != null && (
            <div className="result-price">
              <TrendingUp size={12} /> السعر المتوقع: {Math.round(item.predictedPrice).toLocaleString('ar-EG')} ج/طن
              {item.predictionConfidence && <span className="pred-conf"> ({item.predictionConfidence})</span>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PredictPage() {
  const location = useLocation()
  const [farms, setFarms] = useState([])
  const [farmsLoading, setFarmsLoading] = useState(true)
  const [crops, setCrops] = useState([])
  const [cropsLoading, setCropsLoading] = useState(true)
  const [predictionsByCropId, setPredictionsByCropId] = useState({})

  const [selectedFarmId, setSelectedFarmId] = useState('') // '' = إدخال يدوي
  const [manual, setManual] = useState({
    governorate: '', soilType: '', ph: '', salinity: '', prevCrop: '', area: '',
  })
  const [goal, setGoal] = useState(GOALS.some((g) => g.id === location.state?.goal) ? location.state.goal : 'default')

  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState(null)

  const [results, setResults] = useState(null)
  const [running, setRunning] = useState(false)
  const [saveState, setSaveState] = useState('idle')
  const [saveError, setSaveError] = useState('')
  const [savedRunId, setSavedRunId] = useState('')
  const [dataError, setDataError] = useState('')

  useEffect(() => {
    (async () => {
      setFarmsLoading(true)
      const { data: userData } = await supabase.auth.getUser()
            if (userData?.user) {
        const { data, error } = await supabase

          .from('farms')
          .select('id, name, governorate, soil_type, ph, salinity, gps_lat, gps_lng, soil_analyzed_at')
          .eq('owner_id', userData.user.id)
                    .order('created_at', { ascending: true })
        if (error) setDataError(`تعذر تحميل الأراضي: ${error.message}`)
        setFarms(data || [])
      }
      setFarmsLoading(false)

    })()

    ;(async () => {
      setCropsLoading(true)
            const { data, error } = await supabase
        .from('crops')

        .select(`
          id, name_ar, category, image_url,
          temp_min_ideal, temp_max_ideal, temp_max_tolerable,
          humidity_min, humidity_max, ph_min, ph_max,
          soil_best, soil_second, soil_third, soil_worst,
          ec_safe_limit, ec_max_acceptable, yield_drop_percent_per_ec, salinity_tolerance_level,
          planting_months, harvest_months, season_primary, season_secondary,
          water_need_min, water_need_max, is_perennial, harvest_duration_months,
          price_avg_egp_ton, is_exportable, strictly_avoid, success_tips
                `)
      if (error) setDataError(`تعذر تحميل بنك المحاصيل: ${error.message}`)
      setCrops(data || [])
      setCropsLoading(false)

    })()

    ;(async () => {
            const { data } = await supabase
        .from('market_prices')
        .select('crop_id, predicted_price_egp_ton, prediction_confidence')
      const map = {}
      for (const p of data || []) map[p.crop_id] = p
      setPredictionsByCropId(map)
    })()
  }, [])

  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || null

  const activeFarmData = useMemo(() => {
    if (selectedFarm) {
      return {
        soilType: selectedFarm.soil_type,
        ph: selectedFarm.ph,
        salinity: selectedFarm.salinity,
        governorate: selectedFarm.governorate,
        gpsLat: selectedFarm.gps_lat,
        gpsLng: selectedFarm.gps_lng,
      }
    }
    return {
      soilType: manual.soilType || null,
      ph: manual.ph !== '' ? Number(manual.ph) : null,
      salinity: manual.salinity !== '' ? Number(manual.salinity) : null,
      governorate: manual.governorate || null,
      gpsLat: null,
      gpsLng: null,
    }
  }, [selectedFarm, manual])

  const missingFields = getMissingFarmFields(activeFarmData)

  const resolvedLocation = useMemo(() => {
    if (activeFarmData.gpsLat && activeFarmData.gpsLng) {
      return { lat: activeFarmData.gpsLat, lng: activeFarmData.gpsLng, isExact: true }
    }
    const found = findLocationByName(activeFarmData.governorate)
    return found ? { lat: found.lat, lng: found.lng, isExact: false } : null
  }, [activeFarmData])

  const fetchWeather = useCallback(async (loc) => {
    setWeatherLoading(true)
    setWeatherError(null)
    try {
      const r = await fetchLatestNasaReading(loc)
      setWeather({ temp: r.temperature_2m, humidity: r.relative_humidity_2m, source: r.source, readingTime: r.time })
    } catch (err) {
      setWeatherError(err.message)
      setWeather(null)
    } finally {
      setWeatherLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (resolvedLocation) fetchWeather(resolvedLocation)
      else setWeather(null)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [resolvedLocation, fetchWeather])

    async function savePrediction() {
    if (!results || saveState === 'saving') return
    setSaveState('saving')
    setSaveError('')
    // نحفظ كل خطوات الخطط، وكل صف عليه رقم الخطة ومفتاح الموسم بتاعه
    // باك: الدالة save_crop_prediction_run لازم تقبل details.plan و details.carriedOver و details.rotation (rank دلوقتي = رقم الخطة)
    const payload = results.plans.flatMap((plan) => plan.steps.filter((step) => step.item).map((step) => ({
      crop_id: step.item.crop?.id != null ? String(step.item.crop.id) : null,
      crop_name_ar: step.item.crop?.name_ar || null,
      rank: plan.rank,
      match_percent: step.item.matchPercent,
      details: {
        plan: plan.rank,
        season: step.season.key,
        seasonOrder: step.season.order,
        seasonPercent: step.item.seasonPercent,
        carriedOver: step.carriedOver,
        rotation: step.item.rotation,
        soilTier: step.item.soilTier,
        inSeason: step.item.inSeason,
        isApproximate: step.item.isApproximate,
        skippedDimensions: step.item.skippedDimensions,
        salinityWarning: step.item.salinityWarning,
        predictedPrice: step.item.predictedPrice,
        predictionConfidence: step.item.predictionConfidence,
      },
    })))

    const { data, error } = await supabase.rpc('save_crop_prediction_run', {
      p_farm_id: selectedFarmId || null,
      p_goal: goal,
      p_input_data: activeFarmData,
      p_weather_data: weather,
      p_results: payload,
    })

    if (error) {
      setSaveState('error')
      setSaveError(error.message)
      return
    }

    setSavedRunId(data || '')
    setSaveState('saved')
  }

  async function runPrediction() {
    if (missingFields.length > 0 || !resolvedLocation || !weather) return
    setRunning(true)
    setSaveState('idle')
    setSavedRunId('')

    const plan = getSeasonPlan() // 3 مواسم متتالية: الحالي ثم اللي بعده ثم اللي بعده
    let typicalWeathers = []
    try {
      typicalWeathers = await fetchTypicalSeasonWeathers(resolvedLocation, plan.slice(1))
    } catch {
      typicalWeathers = []
    }

    const seasons = plan.map((season, index) => {
      const seasonWeather = season.isCurrent ? weather : (typicalWeathers[index - 1] ?? null)
      return {
        ...season,
        weather: seasonWeather,
        weatherKind: season.isCurrent ? 'actual' : (seasonWeather ? 'typical' : 'none'),
      }
    })
    const plans = buildRotationPlans(activeFarmData, seasons, crops, goal, predictionsByCropId)
    setResults({ seasons, plans })
    setRunning(false)
  }

  const canRun = missingFields.length === 0 && !!resolvedLocation && !!weather && !weatherLoading

  return (
        <div className="predict-page">
      {(farmsLoading || cropsLoading) && <PageLoading label="جاري تجهيز صفحة توقع المحاصيل..." />}
      {dataError && <div className="predict-data-error"><AlertTriangle size={15} /> {dataError}</div>}

      <div className="predict-header">
        <Sprout size={22} />
        <div>
          <h1>توقع المحاصيل الذكي</h1>
          <p>مطابقة حقيقية بين بيانات أرضك والطقس الفعلي دلوقتي، ضد بنك بيانات المحاصيل المصرية</p>
        </div>
      </div>

      <div className="predict-card">
        <div className="predict-card-title"><Target size={16} /> هدفك من الزراعة</div>
        <div className="goal-pills">
          {GOALS.map((g) => (
            <button key={g.id} className={`goal-pill ${goal === g.id ? 'active' : ''}`} onClick={() => setGoal(g.id)}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="predict-card">
        <div className="predict-card-title"><Tractor size={16} /> بيانات الأرض</div>

        {farmsLoading ? (
          <div className="predict-inline-loading"><Loader2 size={14} className="spin" /> جاري تحميل أراضيك...</div>
        ) : farms.length > 0 ? (
          <div className="land-selector">
            {farms.map((f) => (
              <button
                key={f.id}
                className={`land-pill ${selectedFarmId === f.id ? 'active' : ''}`}
                onClick={() => setSelectedFarmId(f.id)}
              >
                <Tractor size={13} /> {f.name}
              </button>
            ))}
            <button
              className={`land-pill manual ${selectedFarmId === '' ? 'active' : ''}`}
              onClick={() => setSelectedFarmId('')}
            >
              <PenLine size={13} /> إدخال يدوي
            </button>
          </div>
        ) : null}

        {selectedFarm ? (
          <div className="farm-summary">
            <div><span>المحافظة</span><strong>{selectedFarm.governorate || '—'}</strong></div>
            <div><span>نوع التربة</span><strong>{selectedFarm.soil_type || '—'}</strong></div>
            <div><span>pH</span><strong>{selectedFarm.ph ?? '—'}</strong></div>
            <div><span>الملوحة (EC)</span><strong>{selectedFarm.salinity ?? '—'}</strong></div>
          </div>
        ) : (
          <div className="manual-form">
            <div className="form-row">
              <label>المحافظة / المنطقة
                <input
                  placeholder="مثال: الشرقية"
                  value={manual.governorate}
                  onChange={(e) => setManual((m) => ({ ...m, governorate: e.target.value }))}
                />
              </label>
              <label>نوع التربة
                <input
                  placeholder="مثال: طينية، رملية، طمية"
                  value={manual.soilType}
                  onChange={(e) => setManual((m) => ({ ...m, soilType: e.target.value }))}
                />
              </label>
            </div>
            <div className="form-row">
              <label>قيمة pH التربة
                <input
                  type="number" step="0.1" placeholder="مثال: 6.8"
                  value={manual.ph}
                  onChange={(e) => setManual((m) => ({ ...m, ph: e.target.value }))}
                />
              </label>
              <label>درجة الملوحة (dS/m)
                <input
                  type="number" step="0.1" placeholder="مثال: 2.5"
                  value={manual.salinity}
                  onChange={(e) => setManual((m) => ({ ...m, salinity: e.target.value }))}
                />
              </label>
            </div>
            <div className="form-row">
              <label>المحصول السابق (اختياري)
                <input
                  placeholder="مثال: قمح، برسيم"
                  value={manual.prevCrop}
                  onChange={(e) => setManual((m) => ({ ...m, prevCrop: e.target.value }))}
                />
              </label>
              <label>مساحة الأرض (فدان)
                <input
                  type="number" placeholder="مثال: 5"
                  value={manual.area}
                  onChange={(e) => setManual((m) => ({ ...m, area: e.target.value }))}
                />
              </label>
            </div>
          </div>
        )}

        {missingFields.length > 0 && (
          <div className="missing-fields-notice">
            <AlertTriangle size={15} />
            بيانات ناقصة لازم تكملها قبل ما نشغّل التوقع: <strong>{missingFields.join('، ')}</strong>
            {selectedFarm && ' — اكملها من صفحة "أرضي"'}
          </div>
        )}

        <div className="live-weather-row">
          {!resolvedLocation && !weatherLoading && (activeFarmData.governorate || selectedFarm) && (
            <div className="weather-note warn">
              <AlertTriangle size={14} /> معرفناش نحدد إحداثيات المحافظة دي تلقائياً — اكتب اسم محافظة مصرية معروف
            </div>
          )}
          {weatherLoading && (
            <div className="weather-note"><Loader2 size={14} className="spin" /> جاري جلب بيانات ناسا باور...</div>
          )}
          {weatherError && (
            <div className="weather-note error"><AlertTriangle size={14} /> {weatherError}</div>
          )}
                    {weather && resolvedLocation && !weatherLoading && (
            <div className="weather-note ok">
              <MapPin size={13} /> آخر قراءة من ناسا باور {resolvedLocation.isExact ? 'عند أرضك' : 'للمحافظة (تقريبي)'}:
              <Thermometer size={13} /> {weather.temp}°م
              <Droplets size={13} /> {weather.humidity ?? '—'}%
            </div>
          )}
        </div>

        <button className="run-btn" disabled={!canRun || cropsLoading} onClick={runPrediction}>
          {running ? <><Loader2 size={16} className="spin" /> جاري الحساب...</> : <><Sparkles size={16} /> شغّل التوقع الذكي</>}
        </button>
      </div>

      {results && (
        <div className="season-results">
          <div className="predict-card">
            <div className="predict-card-title"><CalendarDays size={16} /> أساس المطابقة</div>
            <ul className="basis-list">
              {results.seasons.map((season) => (
                <li key={season.key}>
                  <strong>{SEASON_ORDER_LABELS[season.order - 1]} — {season.label}</strong>
                  {' '}({season.months[0]} – {season.months[season.months.length - 1]}):{' '}
                  {season.weatherKind === 'actual' && <>آخر قراءة من ناسا باور {season.weather.temp}°م — رطوبة {season.weather.humidity ?? '—'}%</>}
                  {season.weatherKind === 'typical' && (
                    <>الجو المعتاد للموسم (متوسط آخر 5 سنين من ناسا باور) {season.weather.temp}°م{season.weather.humidity != null ? ` — رطوبة ${season.weather.humidity}%` : ''}</>
                  )}
                  {season.weatherKind === 'none' && <>تقدير تقريبي (مقدرناش نجيب الجو المعتاد)، فالنسب معتمدة على التربة وpH والملوحة وموعد الزراعة</>}
                </li>
              ))}
            </ul>
            <p className="basis-note">
              النسبة بتقل مع المواسم الأبعد، لأن كل موسم مبني على اللي قبله (نسبته = توافق محصوله × نسبة الموسم السابق)، والجو بيبقى أقل تأكيداً.
            </p>
          </div>

          {results.plans.length === 0 ? (
            <div className="predict-card no-results">مفيش محاصيل ببيانات كافية للمطابقة ضد أرضك في الموسم الأول، فمقدرناش نكوّن خطط</div>
          ) : (
            results.plans.map((plan) => (
              <div className={`predict-card plan-card ${plan.rank === 1 ? 'top' : ''}`} key={plan.rank}>
                <div className="plan-header">
                  <span className="plan-title"><Sparkles size={16} /> {PLAN_LABELS[plan.rank - 1] ?? `الخطة ${plan.rank.toLocaleString('ar-EG')}`}</span>
                  {plan.averagePercent != null && <span className="plan-avg">متوسط التوافق {plan.averagePercent}%</span>}
                </div>
                <div className="plan-steps">
                  {plan.steps.map((step, index) => (
                    <Fragment key={step.season.key}>
                      {index > 0 && <div className="plan-link" aria-hidden="true"><ArrowLeft size={18} /></div>}
                      <PlanStep step={step} previous={plan.steps[index - 1]} />
                    </Fragment>
                  ))}
                </div>
              </div>
            ))
          )}

          <div className="predict-card">
            <div className="prediction-save-area">
              <button className="prediction-save-btn" onClick={savePrediction} disabled={saveState === 'saving'}>
                {saveState === 'saving' ? <><Loader2 size={15} className="spin" /> جاري حفظ النتيجة...</> : saveState === 'saved' ? <><CheckCircle2 size={15} /> تم حفظ النتيجة</> : 'حفظ النتيجة في حسابي'}
              </button>
              {saveState === 'error' && <span className="prediction-save-error">تعذر الحفظ: {saveError}</span>}
              {saveState === 'saved' && savedRunId && <span className="prediction-save-ok">تم حفظ عملية التوقع في حسابك.</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PredictPage