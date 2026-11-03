// آخر قراءة طقس فعلية من NASA POWER لنقطة GPS — مشتركة بين الداشبورد وصفحة التوقع الذكي.
// NASA POWER بيانات فعلية (MERRA-2) متأخرة كام ساعة لكام يوم، مش توقعات، ودقتها عشرات الكيلومترات.
// باك: لما نبني الباك إند، الدالة دي تتحول لطلب من السيرفر ومحدش هيحس في الواجهة.
import { NASA_POWER_HOURLY_API_BASE } from '../data/weatherConfig'

// NASA POWER بيرجع -999 لأي قيمة مش متاحة لسه
export const nasaValid = (v) => typeof v === 'number' && Number.isFinite(v) && v > -900
export const toYmd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '')

// بترجع: { temperature_2m (°م), relative_humidity_2m (%), wind_speed_10m (كم/س), time (ISO UTC), source }
// أي قيمة مش متاحة بترجع null — وبترمي خطأ لو مفيش ولا قراءة حرارة.
export async function fetchLatestNasaReading({ lat, lng }, signal) {
  const end = new Date()
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
  const params = new URLSearchParams({
    parameters: 'T2M,RH2M,WS10M',
    community: 'AG',
    latitude: lat,
    longitude: lng,
    start: toYmd(start),
    end: toYmd(end),
    format: 'JSON',
    'time-standard': 'UTC',
  })
  const res = await fetch(`${NASA_POWER_HOURLY_API_BASE}?${params}`, { signal })
  if (!res.ok) throw new Error('تعذّر جلب بيانات الطقس من ناسا باور')
  const json = await res.json()
  const p = json?.properties?.parameter
  const temps = p?.T2M || {}

  const keys = Object.keys(temps).sort().filter((k) => nasaValid(temps[k])) // YYYYMMDDHH
  if (keys.length === 0) throw new Error('مفيش بيانات متاحة من ناسا باور للموقع ده حالياً')
  const k = keys[keys.length - 1]
  return {
    temperature_2m: Math.round(temps[k] * 10) / 10,
    relative_humidity_2m: nasaValid(p?.RH2M?.[k]) ? Math.round(p.RH2M[k]) : null,
    // ناسا بترجّع الرياح بالمتر/ثانية — بنحوّلها لكم/س
    wind_speed_10m: nasaValid(p?.WS10M?.[k]) ? Math.round(p.WS10M[k] * 3.6 * 10) / 10 : null,
    time: new Date(Date.UTC(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8), +k.slice(8, 10))).toISOString(),
    source: 'NASA POWER',
  }
}