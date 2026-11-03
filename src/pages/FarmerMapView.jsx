// src/pages/FarmerMapView.jsx
// الخريطة الزراعية بأسلوب NASA Worldview: لوحة طبقات (طبقات / أحداث / بيانات) + بحث + شريط زمني + أدوات (قياس، لقطة، مشاركة).
// كله فرونت إند (مصادر ناسا مجانية وبدون مفتاح). الأماكن اللي محتاجة باك لاحقًا متعلّم عليها: // TODO: Backend Integration
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, ScaleControl, Marker, Popup, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import {
  Layers, CalendarDays, Download, ChevronUp, ChevronDown, Eye, EyeOff, Search, LocateFixed, Share2, Camera, Info,
  Plus, Minus, Ruler, Play, Pause, ChevronLeft, ChevronRight, SkipForward, X, CircleDot, Circle, Trash2,
} from 'lucide-react'
import {
  DAY_MS, todayUtc, toIso, fromIso, addDays, addMonths, effectiveDate, gibsTileUrl,
  REFERENCE_LAYERS, BASE_LAYERS, DATA_LAYERS, EVENT_CATEGORIES, EVENT_FALLBACK,
} from '../data/mapLayersConfig'
import './FarmerMapView.css'

/* ===================== ثوابت ===================== */

const EGYPT_CENTER = [26.8, 30.8]
const EGYPT_ZOOM = 6
const PICK_ZOOM = 11 // الزوم اللي بنروحله لما المستخدم يختار موقع من بعيد
const MIN_DATE = '2000-02-24' // أقدم تاريخ فيه صور MODIS
const TIMELINE_DAYS = 365 // مدى الشريط الزمني (آخر سنة)
const PLAY_INTERVAL_MS = 1500

// بيانات الطقس والإشعاع الشمسي من NASA POWER
// TODO: Backend Integration — الطلب ده بييجي من الفرونت مؤقتًا. الأفضل ينتقل للسيرفر (يطلب من ناسا ويخزّن النتيجة)،
// لأن NASA POWER ممكن تحجب التطبيق لو اتكرر الطلب لنفس الموقع كتير.
const POWER_API_BASE = 'https://power.larc.nasa.gov/api/temporal/daily/point'
const POWER_PARAMS = 'T2M,RH2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN'
const POWER_LAG_DAYS = 7
const POWER_WINDOW_DAYS = 30
const POWER_MISSING = -990 // ناسا بترجّع -999 للقيمة الناقصة

// أحداث ناسا الحية (EONET) — TODO: Backend Integration: كاش على السيرفر بدل ما كل مستخدم يطلب من ناسا
const EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=200'
const REGION_BOX = { south: 5, north: 45, west: -20, east: 65 } // مصر وما حولها (أفريقيا + الشرق الأوسط)

// البحث عن الأماكن — TODO: Backend Integration: Nominatim له سياسة استخدام (طلب في الثانية)، الأفضل نمرّره من السيرفر
const GEOCODE_URL = 'https://nominatim.openstreetmap.org/search'

const STEP_UNITS = [
  { id: 'day', label: 'يوم' },
  { id: 'week', label: 'أسبوع' },
  { id: 'month', label: 'شهر' },
]

/* ===================== دوال مساعدة ===================== */

const toPowerDate = (d) => d.toISOString().slice(0, 10).replaceAll('-', '')

const formatNumber = (value, digits = 1, suffix = '') =>
  value == null ? '—' : `${value.toLocaleString('ar-EG', { maximumFractionDigits: digits })}${suffix}`

const formatDate = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  d.toLocaleDateString('ar-EG', { ...opts, timeZone: 'UTC' })

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

function formatCoord(lat, lng) {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}°${ns}  ${Math.abs(lng).toFixed(4)}°${ew}`
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters).toLocaleString('ar-EG')} م`
  return `${(meters / 1000).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} كم`
}

// بيفهم إحداثيات مكتوبة زي: 26.8, 30.8
function parseCoordinates(text) {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,،\s]\s*(-?\d+(?:\.\d+)?)$/)
  if (!m) return null
  const lat = parseFloat(m[1])
  const lng = parseFloat(m[2])
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

function averageOf(series) {
  const values = Object.values(series || {}).filter((v) => typeof v === 'number' && v > POWER_MISSING)
  if (values.length === 0) return null
  return { avg: values.reduce((a, b) => a + b, 0) / values.length, sum: values.reduce((a, b) => a + b, 0) }
}

function powerRange() {
  const end = new Date(Date.now() - POWER_LAG_DAYS * DAY_MS)
  const start = new Date(end.getTime() - (POWER_WINDOW_DAYS - 1) * DAY_MS)
  return { start, end }
}

function powerParams(lat, lng, format) {
  const { start, end } = powerRange()
  return new URLSearchParams({
    parameters: POWER_PARAMS,
    community: 'AG',
    longitude: lng.toFixed(4),
    latitude: lat.toFixed(4),
    start: toPowerDate(start),
    end: toPowerDate(end),
    format,
  })
}

async function fetchNasaPower(lat, lng, signal) {
  const { start, end } = powerRange()
  const response = await fetch(`${POWER_API_BASE}?${powerParams(lat, lng, 'JSON')}`, { signal })
  if (!response.ok) throw new Error('تعذر جلب بيانات ناسا')
  const series = (await response.json())?.properties?.parameter
  if (!series) throw new Error('رد ناسا مش مكتمل')

  const temp = averageOf(series.T2M)
  if (!temp) throw new Error('مفيش بيانات متاحة لهذا الموقع')
  return {
    from: formatDate(start, { day: 'numeric', month: 'long' }),
    to: formatDate(end, { day: 'numeric', month: 'long' }),
    temperature: temp.avg,
    humidity: averageOf(series.RH2M)?.avg ?? null,
    rainTotal: averageOf(series.PRECTOTCORR)?.sum ?? null,
    solar: averageOf(series.ALLSKY_SFC_SW_DWN)?.avg ?? null,
  }
}

// آخر نقطة هندسية للحدث (EONET ممكن يرجّع Point أو Polygon)
function eventPosition(event) {
  const geo = event.geometry?.[event.geometry.length - 1]
  if (!geo) return null
  if (geo.type === 'Point') return { lat: geo.coordinates[1], lng: geo.coordinates[0], date: geo.date }
  if (geo.type === 'Polygon') {
    const [lng, lat] = geo.coordinates[0][0]
    return { lat, lng, date: geo.date }
  }
  return null
}

const insideRegion = (p) =>
  p.lat >= REGION_BOX.south && p.lat <= REGION_BOX.north && p.lng >= REGION_BOX.west && p.lng <= REGION_BOX.east

const PIN_ICON = L.divIcon({
  className: 'fmv-pin-wrap',
  html: '<div class="fmv-pin"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const eventIcon = (color) =>
  L.divIcon({
    className: 'fmv-pin-wrap',
    html: `<div class="fmv-event-dot" style="background:${color}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })

// قراءة الحالة الأولية من رابط المشاركة: ?v=lat,lng,zoom&t=YYYY-MM-DD&b=base&l=ndvi,lst&p=lat,lng
function readInitialState() {
  const q = new URLSearchParams(window.location.search)
  const state = {}
  const v = q.get('v')?.split(',').map(Number)
  if (v?.length === 3 && v.every(Number.isFinite)) state.view = { center: [v[0], v[1]], zoom: v[2] }
  const t = q.get('t')
  if (t && /^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = fromIso(t)
    if (!Number.isNaN(d.getTime()) && d <= todayUtc() && t >= MIN_DATE) state.date = d
  }
  const b = q.get('b')
  if (BASE_LAYERS.some((x) => x.id === b)) state.base = b
  const l = q.get('l')
  if (l !== null) state.overlays = l.split(',').filter((id) => DATA_LAYERS.some((x) => x.id === id))
  const p = q.get('p')?.split(',').map(Number)
  if (p?.length === 2 && p.every(Number.isFinite)) state.point = { lat: p[0], lng: p[1] }
  return state
}

/* ===================== مكوّنات داخل الخريطة ===================== */

// بيحفظ نسخة الخريطة في ref عشان الأزرار اللي برّه الخريطة (زووم، بحث، لقطة) تستخدمها
function MapBridge({ mapRef }) {
  const map = useMap()
  useEffect(() => {
    mapRef.current = map
    // أي تغيّر في حجم الغلاف (انتقال الصفحة، تغيير الشاشة) بنعيد حساب حجم الخريطة عشان ما يفضلش جزء أبيض
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    const timer = setTimeout(() => map.invalidateSize(), 400)
    return () => { observer.disconnect(); clearTimeout(timer) }
  }, [map, mapRef])
  return null
}

// بيلتقط الضغط (اختيار موقع أو نقطة قياس) وحركة الماوس (الإحداثيات بتتكتب مباشرة في الـDOM من غير re-render)
function MapEvents({ onClick, coordsRef }) {
  useMapEvents({
    click: (e) => onClick(e.latlng),
    mousemove: (e) => { if (coordsRef.current) coordsRef.current.textContent = formatCoord(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

/* ===================== الصفحة ===================== */

function FarmerMapView() {
  const initial = useMemo(() => readInitialState(), [])
  const today = useMemo(() => todayUtc(), [])
  const minDate = useMemo(() => fromIso(MIN_DATE), [])
  const timelineStart = useMemo(() => addDays(today, -TIMELINE_DAYS), [today])

  /* ---- الطبقات والتاريخ ---- */
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 700)
  const [tab, setTab] = useState('layers') // layers | events | data
  const [baseId, setBaseId] = useState(initial.base || 'modis-true')
  const [refOn, setRefOn] = useState(() => Object.fromEntries(REFERENCE_LAYERS.map((l) => [l.id, l.defaultOn])))
  const [overlayOn, setOverlayOn] = useState(() =>
    Object.fromEntries(DATA_LAYERS.map((l) => [l.id, initial.overlays ? initial.overlays.includes(l.id) : l.defaultOn])))
  const [overlayOpacity, setOverlayOpacity] = useState(() => Object.fromEntries(DATA_LAYERS.map((l) => [l.id, l.defaultOpacity])))
  const [date, setDate] = useState(initial.date || addDays(today, -1))
  const [stepUnit, setStepUnit] = useState('day')
  const [playing, setPlaying] = useState(false)
  const [missing, setMissing] = useState(() => new Set()) // مفاتيح "layerId|date" اللي صورها مش متاحة

  /* ---- الموقع المختار وبيانات ناسا ---- */
  const [point, setPoint] = useState(initial.point || null) // { lat, lng }
  const [nasa, setNasa] = useState({ status: 'idle', data: null }) // idle | loading | ready | error
  const requestRef = useRef({ id: 0, controller: null })
  const cacheRef = useRef(new Map()) // عشان منكررش الطلب لنفس الموقع

  /* ---- البحث ---- */
  const [query, setQuery] = useState('')
  const [searchState, setSearchState] = useState({ status: 'idle', results: [] }) // idle | loading | done | error

  /* ---- القياس ---- */
  const [measuring, setMeasuring] = useState(false)
  const [measurePoints, setMeasurePoints] = useState([])

  /* ---- الأحداث ---- */
  const [events, setEvents] = useState({ status: 'idle', items: [] }) // idle | loading | ready | error
  const [regionOnly, setRegionOnly] = useState(true)
  const [hiddenCats, setHiddenCats] = useState(() => new Set())

  /* ---- أخرى ---- */
  const [infoOpen, setInfoOpen] = useState(false)
  const [toast, setToast] = useState('')
  const mapRef = useRef(null)
  const coordsRef = useRef(null)
  const toastTimer = useRef(null)

  const dateIso = toIso(date)
  const base = BASE_LAYERS.find((b) => b.id === baseId) || BASE_LAYERS[0]
  const activeOverlays = DATA_LAYERS.filter((l) => overlayOn[l.id])

  /* ---------- إشعار صغير ---------- */
  const showToast = useCallback((text) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2600)
  }, [])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  /* ---------- الشريط الزمني ---------- */
  function stepDate(dir) {
    setDate((cur) => {
      const next = stepUnit === 'month' ? addMonths(cur, dir) : addDays(cur, dir * (stepUnit === 'week' ? 7 : 1))
      return clamp(next.getTime(), minDate.getTime(), today.getTime()) === next.getTime() ? next : cur
    })
  }

  // التشغيل التلقائي: بيتقدّم خطوة كل فترة لحد ما يوصل لليوم
  useEffect(() => {
    if (!playing) return undefined
    const timer = setInterval(() => {
      setDate((cur) => {
        const next = stepUnit === 'month' ? addMonths(cur, 1) : addDays(cur, stepUnit === 'week' ? 7 : 1)
        if (next.getTime() > today.getTime()) { setPlaying(false); return cur }
        return next
      })
    }, PLAY_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [playing, stepUnit, today])

  const sliderValue = clamp(Math.round((date.getTime() - timelineStart.getTime()) / DAY_MS), 0, TIMELINE_DAYS)

  // علامات الشهور تحت الشريط
  const monthTicks = useMemo(() => {
    const ticks = []
    let cursor = new Date(Date.UTC(timelineStart.getUTCFullYear(), timelineStart.getUTCMonth() + 1, 1))
    while (cursor.getTime() <= today.getTime()) {
      ticks.push({
        key: toIso(cursor),
        left: ((cursor.getTime() - timelineStart.getTime()) / DAY_MS / TIMELINE_DAYS) * 100,
        label: formatDate(cursor, { month: 'short' }),
      })
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
    }
    return ticks
  }, [timelineStart, today])

  /* ---------- اختيار موقع وبيانات ناسا ---------- */
  async function loadNasaData(lat, lng) {
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`
    const req = requestRef.current
    req.controller?.abort()
    const id = req.id + 1
    req.id = id

    const cached = cacheRef.current.get(key)
    if (cached) { setNasa({ status: 'ready', data: cached }); return }

    const controller = new AbortController()
    req.controller = controller
    setNasa({ status: 'loading', data: null })
    try {
      const data = await fetchNasaPower(lat, lng, controller.signal)
      cacheRef.current.set(key, data)
      if (req.id === id) setNasa({ status: 'ready', data })
    } catch (err) {
      if (err.name === 'AbortError' || req.id !== id) return
      setNasa({ status: 'error', data: null })
    }
  }

  function selectPoint(lat, lng, { fly = true } = {}) {
    setPoint({ lat, lng })
    setTab('data')
    setPanelOpen(true)
    const map = mapRef.current
    if (fly && map) {
      if (map.getZoom() < PICK_ZOOM - 1) map.flyTo([lat, lng], PICK_ZOOM, { duration: 1 })
      else map.panTo([lat, lng])
    }
    loadNasaData(lat, lng)
  }

  function clearPoint() {
    requestRef.current.controller?.abort()
    requestRef.current.id += 1
    setPoint(null)
    setNasa({ status: 'idle', data: null })
  }

  // لو الرابط فيه موقع مختار، بنحمّل بياناته أول ما الصفحة تفتح
  useEffect(() => {
    if (initial.point) loadNasaData(initial.point.lat, initial.point.lng)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleMapClick(latlng) {
    if (measuring) { setMeasurePoints((pts) => [...pts, [latlng.lat, latlng.lng]]); return }
    selectPoint(latlng.lat, latlng.lng)
  }

  /* ---------- البحث ---------- */
  async function runSearch(e) {
    e?.preventDefault()
    const text = query.trim()
    if (!text) return

    // 1) إحداثيات مباشرة
    const coords = parseCoordinates(text)
    if (coords) {
      setSearchState({ status: 'idle', results: [] })
      selectPoint(coords.lat, coords.lng)
      return
    }

    // 2) اسم مكان
    setSearchState({ status: 'loading', results: [] })
    try {
      const params = new URLSearchParams({ q: text, format: 'jsonv2', limit: '5', 'accept-language': 'ar' })
      const res = await fetch(`${GEOCODE_URL}?${params}`)
      if (!res.ok) throw new Error('search failed')
      const results = (await res.json()).map((r) => ({
        id: r.place_id,
        name: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        box: r.boundingbox?.map(Number), // [south, north, west, east]
      }))
      setSearchState({ status: 'done', results })
    } catch {
      setSearchState({ status: 'error', results: [] })
    }
  }

  function pickSearchResult(r) {
    setSearchState({ status: 'idle', results: [] })
    setQuery(r.name.split('،')[0])
    const map = mapRef.current
    if (map && r.box?.length === 4) map.flyToBounds([[r.box[0], r.box[2]], [r.box[1], r.box[3]]], { maxZoom: 12, duration: 1 })
    selectPoint(r.lat, r.lng, { fly: !r.box })
  }

  function locateMe() {
    if (!navigator.geolocation) { showToast('المتصفح لا يدعم تحديد الموقع'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => selectPoint(pos.coords.latitude, pos.coords.longitude),
      () => showToast('تعذر تحديد موقعك — تأكد من السماح بالوصول للموقع'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  /* ---------- الأدوات: قياس، مشاركة، لقطة ---------- */
  function toggleMeasure() {
    setMeasuring((on) => !on)
    setMeasurePoints([])
  }

  const measureTotal = useMemo(() => {
    let total = 0
    for (let i = 1; i < measurePoints.length; i += 1) total += L.latLng(measurePoints[i - 1]).distanceTo(L.latLng(measurePoints[i]))
    return total
  }, [measurePoints])

  async function shareLink() {
    const map = mapRef.current
    const q = new URLSearchParams()
    if (map) {
      const c = map.getCenter()
      q.set('v', `${c.lat.toFixed(4)},${c.lng.toFixed(4)},${map.getZoom()}`)
    }
    q.set('t', dateIso)
    q.set('b', baseId)
    q.set('l', activeOverlays.map((l) => l.id).join(','))
    if (point) q.set('p', `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`)
    const url = `${window.location.origin}${window.location.pathname}?${q}`
    try {
      await navigator.clipboard.writeText(url)
      showToast('تم نسخ رابط الخريطة')
    } catch {
      window.prompt('انسخ الرابط:', url)
    }
  }

  // لقطة للمنطقة المعروضة من NASA Worldview Snapshots (بتتفتح في تاب جديد)
  function openSnapshot() {
    const map = mapRef.current
    if (!map) return
    const b = map.getBounds()
    const south = clamp(b.getSouth(), -85, 85)
    const north = clamp(b.getNorth(), -85, 85)
    const west = clamp(b.getWest(), -180, 180)
    const east = clamp(b.getEast(), -180, 180)
    const size = map.getSize()
    const width = Math.min(2048, size.x * 2)
    const height = Math.max(1, Math.round((width * size.y) / size.x))

    const layers = [base.kind === 'gibs' ? base.gibsId : 'MODIS_Terra_CorrectedReflectance_TrueColor']
    activeOverlays.forEach((l) => layers.push(l.gibsId))
    if (refOn.labels) layers.push('Reference_Labels_15m', 'Coastlines_15m')

    const params = new URLSearchParams({
      REQUEST: 'GetSnapshot',
      TIME: toIso(date.getTime() > addDays(today, -1).getTime() ? addDays(today, -1) : date),
      BBOX: `${south},${west},${north},${east}`,
      CRS: 'EPSG:4326',
      LAYERS: layers.join(','),
      WRAP: 'none',
      FORMAT: 'image/jpeg',
      WIDTH: String(width),
      HEIGHT: String(height),
    })
    window.open(`https://wvs.earthdata.nasa.gov/api/v1/snapshot?${params}`, '_blank', 'noopener')
  }

  /* ---------- أحداث ناسا ---------- */
  const eventsAbortRef = useRef(null)
  useEffect(() => () => eventsAbortRef.current?.abort(), [])

  function loadEvents() {
    eventsAbortRef.current?.abort()
    const controller = new AbortController()
    eventsAbortRef.current = controller
    setEvents({ status: 'loading', items: [] })
    fetch(EONET_URL, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error('eonet'); return res.json() })
      .then((json) => {
        const items = (json.events || [])
          .map((ev) => {
            const pos = eventPosition(ev)
            const catId = ev.categories?.[0]?.id
            return pos ? { id: ev.id, title: ev.title, catId, ...pos } : null
          })
          .filter(Boolean)
        setEvents({ status: 'ready', items })
      })
      .catch((err) => { if (err.name !== 'AbortError') setEvents({ status: 'error', items: [] }) })
  }

  // فتح تبويب: الأحداث بتتحمّل أول مرة بس يتفتح فيها التبويب
  function openTab(id) {
    setTab(id)
    setPanelOpen(true)
    if (id === 'events' && events.status === 'idle') loadEvents()
  }

  const visibleEvents = useMemo(
    () => events.items.filter((ev) => !hiddenCats.has(ev.catId) && (!regionOnly || insideRegion(ev))),
    [events.items, hiddenCats, regionOnly],
  )

  function toggleCat(catId) {
    setHiddenCats((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId); else next.add(catId)
      return next
    })
  }

  /* ---------- مساعدات العرض ---------- */
  const markMissing = (layerId, iso) =>
    setMissing((prev) => {
      const key = `${layerId}|${iso}`
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      return next
    })

  const baseEffIso = base.kind === 'gibs' ? toIso(effectiveDate(base, date)) : null
  const isMissing = (layer) => missing.has(`${layer.id}|${toIso(effectiveDate(layer, date))}`)
  const eventsOnMap = tab === 'events'

  return (
    <div className="map-page">
      <div className="map-header">
        <div className="map-breadcrumb">الرئيسية / الخريطة الزراعية</div>
        <h1>الخريطة الزراعية</h1>
        <p>تابع حالة المزروعات والطقس والأحداث من أقمار ناسا الصناعية، واختر أي تاريخ من الشريط الزمني</p>
      </div>

      <div className="fmv-shell">
        <div className="fmv-stage">
          {/* ===================== الخريطة ===================== */}
          <MapContainer
            center={initial.view?.center || EGYPT_CENTER}
            zoom={initial.view?.zoom || EGYPT_ZOOM}
            minZoom={2}
            zoomControl={false}
            worldCopyJump
            className={`fmv-map ${measuring ? 'is-measuring' : ''}`}
          >
            <MapBridge mapRef={mapRef} />
            <MapEvents onClick={handleMapClick} coordsRef={coordsRef} />
            <ScaleControl position="bottomleft" metric imperial />

            {/* الخريطة الأساسية — key بيخلّيها تتحمّل من جديد لما التاريخ يتغير */}
            {base.kind === 'gibs' ? (
              <TileLayer
                key={`${base.id}-${baseEffIso}`}
                url={gibsTileUrl(base, baseEffIso)}
                attribution={base.attribution}
                maxNativeZoom={base.level}
                maxZoom={base.maxZoom}
                zIndex={1}
                eventHandlers={{ tileerror: () => markMissing(base.id, baseEffIso) }}
              />
            ) : (
              <TileLayer key={base.id} url={base.url} attribution={base.attribution} maxZoom={base.maxZoom} zIndex={1} />
            )}

            {/* طبقات بيانات ناسا */}
            {activeOverlays.map((layer, i) => {
              const eff = toIso(effectiveDate(layer, date))
              return (
                <TileLayer
                  key={`${layer.id}-${eff}`}
                  url={gibsTileUrl(layer, eff)}
                  attribution={layer.attribution}
                  maxNativeZoom={layer.level}
                  maxZoom={19}
                  opacity={overlayOpacity[layer.id]}
                  zIndex={5 + i}
                  eventHandlers={{ tileerror: () => markMissing(layer.id, eff) }}
                />
              )
            })}

            {/* الطبقات المرجعية (أسماء / طرق) فوق كل حاجة */}
            {REFERENCE_LAYERS.filter((l) => refOn[l.id]).map((l, i) => (
              <TileLayer key={l.id} url={l.url} maxZoom={l.maxZoom} zIndex={20 + i} />
            ))}

            {/* أحداث ناسا (بتظهر لما تبويب الأحداث يكون مفتوح) */}
            {eventsOnMap && visibleEvents.map((ev) => {
              const cat = EVENT_CATEGORIES[ev.catId] || EVENT_FALLBACK
              return (
                <Marker key={ev.id} position={[ev.lat, ev.lng]} icon={eventIcon(cat.color)}>
                  <Popup>
                    <div className="fmv-popup">
                      <strong>{ev.title}</strong>
                      <span>{cat.label}{ev.date ? ` · ${formatDate(new Date(ev.date))}` : ''}</span>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* القياس */}
            {measurePoints.length > 1 && <Polyline positions={measurePoints} pathOptions={{ color: '#F5C84B', weight: 3, dashArray: '6 6' }} />}
            {measurePoints.map((p, i) => (
              <CircleMarker key={`${p[0]}-${p[1]}-${i}`} center={p} radius={5} pathOptions={{ color: '#fff', weight: 2, fillColor: '#F5C84B', fillOpacity: 1 }} />
            ))}

            {point && <Marker position={[point.lat, point.lng]} icon={PIN_ICON} />}
          </MapContainer>

          {/* ===================== أعلى اليمين: البحث والأزرار ===================== */}
          <div className="fmv-topbar">
            <form className="fmv-search" onSubmit={runSearch} role="search">
              <Search size={16} className="fmv-search-icon" aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن مكان أو اكتب إحداثيات (26.8, 30.8)"
                aria-label="ابحث عن مكان أو إحداثيات"
              />
              {query && (
                <button type="button" className="fmv-icon-btn ghost" aria-label="مسح" onClick={() => { setQuery(''); setSearchState({ status: 'idle', results: [] }) }}>
                  <X size={14} />
                </button>
              )}
              {searchState.status !== 'idle' && (
                <div className="fmv-search-results">
                  {searchState.status === 'loading' && <div className="fmv-search-note">جاري البحث...</div>}
                  {searchState.status === 'error' && <div className="fmv-search-note">تعذر البحث الآن، حاول مرة أخرى.</div>}
                  {searchState.status === 'done' && searchState.results.length === 0 && <div className="fmv-search-note">مفيش نتائج مطابقة.</div>}
                  {searchState.results.map((r) => (
                    <button type="button" key={r.id} onClick={() => pickSearchResult(r)}>{r.name}</button>
                  ))}
                </div>
              )}
            </form>

            <button type="button" className="fmv-icon-btn" title="موقعي الحالي" aria-label="موقعي الحالي" onClick={locateMe}><LocateFixed size={18} /></button>
            <button type="button" className="fmv-icon-btn" title="نسخ رابط الخريطة" aria-label="مشاركة" onClick={shareLink}><Share2 size={18} /></button>
            <button type="button" className="fmv-icon-btn" title="لقطة للمنطقة المعروضة" aria-label="لقطة" onClick={openSnapshot}><Camera size={18} /></button>
            <button type="button" className="fmv-icon-btn" title="معلومات" aria-label="معلومات" onClick={() => setInfoOpen(true)}><Info size={18} /></button>
          </div>

          {/* زووم */}
          <div className="fmv-zoom">
            <button type="button" className="fmv-icon-btn" aria-label="تكبير" onClick={() => mapRef.current?.zoomIn()}><Plus size={18} /></button>
            <button type="button" className="fmv-icon-btn" aria-label="تصغير" onClick={() => mapRef.current?.zoomOut()}><Minus size={18} /></button>
          </div>

          {/* ===================== لوحة الطبقات (يسار) ===================== */}
          <aside className={`fmv-panel ${panelOpen ? '' : 'collapsed'}`} aria-label="لوحة الطبقات">
            <div className="fmv-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'layers'} className={tab === 'layers' ? 'active' : ''} onClick={() => openTab('layers')}>
                <Layers size={16} /> الطبقات
              </button>
              <button type="button" role="tab" aria-selected={tab === 'events'} className={tab === 'events' ? 'active' : ''} onClick={() => openTab('events')}>
                <CalendarDays size={16} /> الأحداث
              </button>
              <button type="button" role="tab" aria-selected={tab === 'data'} className={tab === 'data' ? 'active' : ''} onClick={() => openTab('data')}>
                <Download size={16} /> البيانات
              </button>
              <button type="button" className="fmv-collapse" aria-label={panelOpen ? 'طيّ اللوحة' : 'فتح اللوحة'} onClick={() => setPanelOpen((v) => !v)}>
                {panelOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {panelOpen && (
              <div className="fmv-panel-body">
                {/* ---------- تبويب الطبقات ---------- */}
                {tab === 'layers' && (
                  <>
                    <div className="fmv-group-title">طبقات بيانات ناسا</div>
                    {DATA_LAYERS.map((layer) => {
                      const on = overlayOn[layer.id]
                      const eff = effectiveDate(layer, date)
                      return (
                        <div key={layer.id} className={`fmv-layer ${on ? 'on' : ''}`}>
                          <button
                            type="button"
                            className="fmv-layer-head"
                            aria-pressed={on}
                            onClick={() => setOverlayOn((s) => ({ ...s, [layer.id]: !s[layer.id] }))}
                          >
                            {on ? <Eye size={18} /> : <EyeOff size={18} />}
                            <span className="fmv-layer-text">
                              <strong>{layer.title}</strong>
                              <small>{layer.source}</small>
                            </span>
                          </button>
                          {on && (
                            <div className="fmv-layer-body">
                              <p>{layer.desc}</p>
                              <div className="fmv-legend-bar" style={{ background: layer.legend.gradient }} />
                              <div className="fmv-legend-labels"><span>{layer.legend.from}</span><span>{layer.legend.to}</span></div>
                              <label className="fmv-opacity">
                                <span>الشفافية</span>
                                <input
                                  type="range"
                                  min="0.1"
                                  max="1"
                                  step="0.05"
                                  value={overlayOpacity[layer.id]}
                                  onChange={(e) => setOverlayOpacity((s) => ({ ...s, [layer.id]: Number(e.target.value) }))}
                                />
                              </label>
                              {toIso(eff) !== dateIso && (
                                <p className="fmv-note">
                                  {layer.composite8 ? 'الفترة المعروضة تبدأ من' : 'أحدث صورة متاحة بتاريخ'} {formatDate(eff)}
                                </p>
                              )}
                              {isMissing(layer) && <p className="fmv-warn">مفيش صورة متاحة لهذا التاريخ (أو فيه مشكلة اتصال) — جرّب تاريخ أقدم.</p>}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    <div className="fmv-group-title">طبقات مرجعية</div>
                    {REFERENCE_LAYERS.map((layer) => (
                      <div key={layer.id} className={`fmv-layer ${refOn[layer.id] ? 'on' : ''}`}>
                        <button type="button" className="fmv-layer-head" aria-pressed={refOn[layer.id]} onClick={() => setRefOn((s) => ({ ...s, [layer.id]: !s[layer.id] }))}>
                          {refOn[layer.id] ? <Eye size={18} /> : <EyeOff size={18} />}
                          <span className="fmv-layer-text"><strong>{layer.title}</strong><small>{layer.source}</small></span>
                        </button>
                      </div>
                    ))}

                    <div className="fmv-group-title">الخريطة الأساسية</div>
                    {BASE_LAYERS.map((layer) => {
                      const selected = layer.id === baseId
                      return (
                        <div key={layer.id} className={`fmv-layer ${selected ? 'on' : ''}`}>
                          <button type="button" className="fmv-layer-head" aria-pressed={selected} onClick={() => setBaseId(layer.id)}>
                            {selected ? <CircleDot size={18} /> : <Circle size={18} />}
                            <span className="fmv-layer-text"><strong>{layer.title}</strong><small>{layer.source}</small></span>
                          </button>
                          {selected && layer.kind === 'gibs' && isMissing(layer) && (
                            <div className="fmv-layer-body"><p className="fmv-warn">مفيش صورة لهذا التاريخ — جرّب تاريخ أقدم.</p></div>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}

                {/* ---------- تبويب الأحداث ---------- */}
                {tab === 'events' && (
                  <>
                    <div className="fmv-group-title">أحداث طبيعية حية من ناسا (آخر 30 يوم)</div>
                    <div className="fmv-seg">
                      <button type="button" className={regionOnly ? 'active' : ''} onClick={() => setRegionOnly(true)}>مصر وما حولها</button>
                      <button type="button" className={!regionOnly ? 'active' : ''} onClick={() => setRegionOnly(false)}>العالم كله</button>
                    </div>

                    <div className="fmv-cats">
                      {Object.entries(EVENT_CATEGORIES).map(([id, cat]) => (
                        <button
                          type="button"
                          key={id}
                          className={`fmv-cat ${hiddenCats.has(id) ? 'off' : ''}`}
                          aria-pressed={!hiddenCats.has(id)}
                          onClick={() => toggleCat(id)}
                        >
                          <i style={{ background: cat.color }} /> {cat.label}
                        </button>
                      ))}
                    </div>

                    {events.status === 'loading' && <p className="fmv-note">جاري جلب الأحداث من ناسا...</p>}
                    {events.status === 'error' && (
                      <p className="fmv-note">
                        تعذر جلب الأحداث.
                        <button type="button" className="fmv-retry" onClick={loadEvents}>إعادة المحاولة</button>
                      </p>
                    )}
                    {events.status === 'ready' && visibleEvents.length === 0 && (
                      <p className="fmv-note">مفيش أحداث حالية في النطاق ده{regionOnly ? ' — جرّب "العالم كله".' : '.'}</p>
                    )}
                    {visibleEvents.map((ev) => {
                      const cat = EVENT_CATEGORIES[ev.catId] || EVENT_FALLBACK
                      return (
                        <button type="button" key={ev.id} className="fmv-event-item" onClick={() => mapRef.current?.flyTo([ev.lat, ev.lng], 8, { duration: 1 })}>
                          <i style={{ background: cat.color }} />
                          <span><strong>{ev.title}</strong><small>{cat.label}{ev.date ? ` · ${formatDate(new Date(ev.date), { day: 'numeric', month: 'short' })}` : ''}</small></span>
                        </button>
                      )
                    })}
                    <p className="fmv-source">المصدر: NASA EONET</p>
                  </>
                )}

                {/* ---------- تبويب البيانات ---------- */}
                {tab === 'data' && (
                  <>
                    {!point && <p className="fmv-note">اضغط على أي نقطة في الخريطة لعرض بيانات ناسا لها.</p>}
                    {point && (
                      <>
                        <div className="fmv-point-head">
                          <div>
                            <div className="fmv-group-title nomargin">الموقع المختار</div>
                            <div className="fmv-coords" dir="ltr">{formatCoord(point.lat, point.lng)}</div>
                          </div>
                          <button type="button" className="fmv-icon-btn ghost" aria-label="إلغاء اختيار الموقع" onClick={clearPoint}><X size={16} /></button>
                        </div>

                        <div className="fmv-section-title">الغطاء النباتي (NDVI)</div>
                        <div className="fmv-rows">
                          <div><span>صورة القمر الصناعي</span><strong>{overlayOn.ndvi ? formatDate(effectiveDate(DATA_LAYERS[0], date)) : 'الطبقة متوقفة'}</strong></div>
                          {/* TODO: Backend Integration — قيمة NDVI الرقمية عند النقطة محتاجة معالجة على السيرفر (مثلاً AppEEARS أو Earth Engine) — GIBS بيدّي صور بس */}
                          <div><span>قيمة NDVI عند الموقع</span><strong>قريباً</strong></div>
                        </div>

                        <div className="fmv-section-title">بيانات ناسا{nasa.data ? ` — من ${nasa.data.from} إلى ${nasa.data.to}` : ''}</div>
                        {nasa.status === 'loading' && <p className="fmv-note">جاري جلب البيانات من ناسا...</p>}
                        {nasa.status === 'error' && (
                          <p className="fmv-note">
                            تعذر جلب بيانات ناسا لهذا الموقع.
                            <button type="button" className="fmv-retry" onClick={() => loadNasaData(point.lat, point.lng)}>إعادة المحاولة</button>
                          </p>
                        )}
                        {nasa.status === 'ready' && (
                          <div className="fmv-rows">
                            <div><span>متوسط درجة الحرارة</span><strong>{formatNumber(nasa.data.temperature, 1, ' °م')}</strong></div>
                            <div><span>متوسط رطوبة الجو</span><strong>{formatNumber(nasa.data.humidity, 0, '٪')}</strong></div>
                            <div><span>إجمالي الأمطار</span><strong>{formatNumber(nasa.data.rainTotal, 1, ' مم')}</strong></div>
                            <div><span>متوسط الإشعاع الشمسي</span><strong>{formatNumber(nasa.data.solar, 1, ' kWh/م²')}</strong></div>
                          </div>
                        )}

                        <a
                          className="fmv-action"
                          href={`${POWER_API_BASE}?${powerParams(point.lat, point.lng, 'CSV')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download size={16} /> تحميل بيانات الطقس (CSV)
                        </a>
                      </>
                    )}

                    <button type="button" className="fmv-action" onClick={openSnapshot}>
                      <Camera size={16} /> لقطة للمنطقة المعروضة
                    </button>
                    <p className="fmv-source">المصادر: NASA GIBS · NASA POWER</p>
                  </>
                )}
              </div>
            )}
          </aside>

          {/* ===================== أسفل اليمين: الإحداثيات + القياس ===================== */}
          <div className="fmv-bottom-right">
            {measuring && (
              <div className="fmv-measure-chip">
                <span>{measurePoints.length > 1 ? formatDistance(measureTotal) : 'اضغط على الخريطة لبدء القياس'}</span>
                {measurePoints.length > 0 && (
                  <button type="button" aria-label="مسح القياس" onClick={() => setMeasurePoints([])}><Trash2 size={14} /></button>
                )}
              </div>
            )}
            <div className="fmv-bottom-row">
              <div className="fmv-coords-readout" dir="ltr" ref={coordsRef}>—</div>
              <button
                type="button"
                className={`fmv-icon-btn ${measuring ? 'active' : ''}`}
                title="قياس المسافة"
                aria-label="قياس المسافة"
                aria-pressed={measuring}
                onClick={toggleMeasure}
              >
                <Ruler size={18} />
              </button>
            </div>
          </div>

          {toast && <div className="fmv-toast" role="status">{toast}</div>}
        </div>

        {/* ===================== الشريط الزمني ===================== */}
        <div className="fmv-timeline" dir="ltr">
          <div className="fmv-date-box">
            <input
              type="date"
              value={dateIso}
              min={MIN_DATE}
              max={toIso(today)}
              aria-label="التاريخ"
              onChange={(e) => { if (e.target.value) { setPlaying(false); setDate(fromIso(e.target.value)) } }}
            />
            <small dir="rtl">{formatDate(date)}</small>
          </div>

          <div className="fmv-controls">
            <button type="button" className="fmv-icon-btn" aria-label="السابق" onClick={() => { setPlaying(false); stepDate(-1) }}><ChevronLeft size={20} /></button>
            <button type="button" className="fmv-icon-btn" aria-label="التالي" onClick={() => { setPlaying(false); stepDate(1) }}><ChevronRight size={20} /></button>
            <button type="button" className="fmv-icon-btn" aria-label="أحدث تاريخ" title="أحدث تاريخ" onClick={() => { setPlaying(false); setDate(addDays(today, -1)) }}><SkipForward size={18} /></button>
            <button type="button" className={`fmv-icon-btn ${playing ? 'active' : ''}`} aria-label={playing ? 'إيقاف' : 'تشغيل'} title="تشغيل متتابع" onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
          </div>

          <div className="fmv-track">
            <input
              type="range"
              min="0"
              max={TIMELINE_DAYS}
              value={sliderValue}
              aria-label="الشريط الزمني"
              onChange={(e) => { setPlaying(false); setDate(addDays(timelineStart, Number(e.target.value))) }}
            />
            <div className="fmv-ticks" dir="rtl">
              {monthTicks.map((t) => <span key={t.key} style={{ left: `${t.left}%` }}>{t.label}</span>)}
            </div>
          </div>

          <div className="fmv-step" dir="rtl">
            <span>الخطوة</span>
            <select value={stepUnit} onChange={(e) => setStepUnit(e.target.value)} aria-label="وحدة الخطوة">
              {STEP_UNITS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ===================== نافذة المعلومات ===================== */}
      {infoOpen && (
        <div className="fmv-modal-backdrop" onClick={() => setInfoOpen(false)}>
          <div className="fmv-modal" role="dialog" aria-modal="true" aria-label="معلومات عن الخريطة" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="fmv-icon-btn ghost fmv-modal-close" aria-label="إغلاق" onClick={() => setInfoOpen(false)}><X size={16} /></button>
            <h3>إزاي تستخدم الخريطة</h3>
            <ul>
              <li><strong>الطبقات:</strong> شغّل أو أوقف أي طبقة من ناسا (النبات، الحرارة، الأمطار) وغيّر شفافيتها.</li>
              <li><strong>الشريط الزمني:</strong> اختار أي تاريخ أو اضغط تشغيل لمتابعة التغيّر عبر الأيام.</li>
              <li><strong>الأحداث:</strong> حرائق وعواصف وفيضانات حية من ناسا.</li>
              <li><strong>البيانات:</strong> اضغط على أي نقطة لعرض طقس ناسا لها وتحميله.</li>
              <li><strong>القياس:</strong> زرار المسطرة تحت اليمين لقياس مسافة على الخريطة.</li>
            </ul>
            <p className="fmv-source">المصادر: NASA GIBS · NASA POWER · NASA EONET · Esri · OpenStreetMap</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default FarmerMapView