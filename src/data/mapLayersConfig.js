// src/data/mapLayersConfig.js
// كتالوج طبقات الخريطة الزراعية (بنفس فكرة NASA Worldview) + دوال التواريخ.
// كل الطبقات من مصادر مجانية وبدون مفتاح: NASA GIBS + Esri + OpenStreetMap.
// لإضافة طبقة جديدة: كفاية تضيف عنصر في المصفوفة المناسبة تحت — الواجهة بتتبني منها لوحدها.

export const DAY_MS = 86400000

/* ===================== دوال التواريخ (كلها UTC) ===================== */

export function todayUtc() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export const toIso = (d) => d.toISOString().slice(0, 10)
export const fromIso = (s) => new Date(`${s}T00:00:00Z`)
export const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS)

export function addMonths(d, n) {
  const r = new Date(d.getTime())
  r.setUTCMonth(r.getUTCMonth() + n)
  return r
}

// أول يوم في فترة الـ8 أيام اللي بتحتوي التاريخ ده (الفترات بتبدأ من 1 يناير كل سنة)
export function composite8DayStart(date) {
  const jan1 = Date.UTC(date.getUTCFullYear(), 0, 1)
  const dayIndex = Math.floor((date.getTime() - jan1) / DAY_MS)
  return new Date(jan1 + Math.floor(dayIndex / 8) * 8 * DAY_MS)
}

// التاريخ الفعلي اللي بنطلبه من ناسا لطبقة معينة:
// - مش بنطلب تاريخ أحدث من اللي ناسا نشرته (lagDays) عشان ما نجيبش صورة فاضية
// - الطبقات التجميعية (8 أيام) بنرجّعها لأول يوم في الفترة
export function effectiveDate(layer, selected) {
  const limit = addDays(todayUtc(), -layer.lagDays)
  const d = selected.getTime() > limit.getTime() ? limit : selected
  return layer.composite8 ? composite8DayStart(d) : d
}

/* ===================== مصادر الصور ===================== */

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best'

// رابط بلاطات GIBS — timeSuffix للطبقات اللي بتتحدّث أكتر من مرة في اليوم
export function gibsTileUrl(layer, iso) {
  const time = `${iso}${layer.timeSuffix || ''}`
  return `${GIBS}/${layer.gibsId}/default/${time}/GoogleMapsCompatible_Level${layer.level}/{z}/{y}/{x}.${layer.ext}`
}

/* ===================== الطبقات المرجعية (أسماء ومواصلات) ===================== */

export const REFERENCE_LAYERS = [
  {
    id: 'labels',
    title: 'أسماء الأماكن والحدود',
    source: 'Esri — Boundaries & Places',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    defaultOn: true,
  },
  {
    id: 'roads',
    title: 'الطرق والمواصلات',
    source: 'Esri — Transportation',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    defaultOn: false,
  },
]

/* ===================== الخرائط الأساسية (اختيار واحدة) ===================== */

export const BASE_LAYERS = [
  {
    id: 'esri',
    title: 'قمر صناعي عالي الدقة',
    source: 'Esri World Imagery',
    kind: 'static',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri — Esri, Maxar, Earthstar Geographics',
  },
  {
    id: 'modis-true',
    title: 'صورة حقيقية يومية (MODIS Terra)',
    source: 'NASA GIBS',
    kind: 'gibs',
    gibsId: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    level: 9,
    ext: 'jpg',
    lagDays: 1,
    maxZoom: 19,
    attribution: 'Imagery &copy; NASA GIBS / ESDIS (MODIS Terra)',
  },
  {
    id: 'viirs-true',
    title: 'صورة حقيقية يومية (VIIRS)',
    source: 'NASA GIBS',
    kind: 'gibs',
    gibsId: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    level: 9,
    ext: 'jpg',
    lagDays: 1,
    maxZoom: 19,
    attribution: 'Imagery &copy; NASA GIBS / ESDIS (VIIRS SNPP)',
  },
  {
    id: 'osm',
    title: 'خريطة الشوارع',
    source: 'OpenStreetMap',
    kind: 'static',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  },
]

/* ===================== طبقات بيانات ناسا (تتشغّل فوق الخريطة الأساسية) ===================== */

export const DATA_LAYERS = [
  {
    id: 'ndvi',
    title: 'الغطاء النباتي (NDVI)',
    source: 'MODIS Terra — تجميع كل 8 أيام',
    desc: 'بيوضّح كثافة وصحة النبات. الأخضر الغامق = نبات كثيف وصحي، والبني = أرض جرداء أو نبات ضعيف.',
    gibsId: 'MODIS_Terra_NDVI_8Day',
    level: 9,
    ext: 'png',
    lagDays: 16, // صور آخر أيام بتتأخر شوية قبل ما تتنشر
    composite8: true,
    defaultOn: false, // مقفولة افتراضيًا عشان تبان الصورة الحقيقية والسحب؛ شغّلها من لوحة الطبقات
    defaultOpacity: 0.75,
    legend: { gradient: 'linear-gradient(90deg, #a6742c, #e6d36a, #7bc24a, #1b7a35)', from: 'نبات قليل', to: 'نبات كثيف' },
    attribution: 'Imagery &copy; NASA GIBS / ESDIS (MODIS Terra NDVI)',
  },
  {
    id: 'evi',
    title: 'مؤشر النبات المحسّن (EVI)',
    source: 'MODIS Terra — تجميع كل 8 أيام',
    desc: 'زي NDVI لكنه أدق في المحاصيل الكثيفة لأنه بيقلّل تأثير التربة والغلاف الجوي.',
    gibsId: 'MODIS_Terra_EVI_8Day',
    level: 9,
    ext: 'png',
    lagDays: 16,
    composite8: true,
    defaultOn: false,
    defaultOpacity: 0.75,
    legend: { gradient: 'linear-gradient(90deg, #a6742c, #e6d36a, #7bc24a, #1b7a35)', from: 'نبات قليل', to: 'نبات كثيف' },
    attribution: 'Imagery &copy; NASA GIBS / ESDIS (MODIS Terra EVI)',
  },
  {
    id: 'lst',
    title: 'حرارة سطح الأرض (نهارًا)',
    source: 'MODIS Terra — يومي',
    desc: 'حرارة سطح التربة والنبات (مش حرارة الهواء). مفيدة لمتابعة الإجهاد الحراري والجفاف.',
    gibsId: 'MODIS_Terra_Land_Surface_Temp_Day',
    level: 7,
    ext: 'png',
    lagDays: 3,
    defaultOn: false,
    defaultOpacity: 0.7,
    legend: { gradient: 'linear-gradient(90deg, #2c5fb3, #6fc3d6, #f4e27a, #e8872f, #b3261e)', from: 'أبرد', to: 'أسخن' },
    attribution: 'Imagery &copy; NASA GIBS / ESDIS (MODIS Terra LST)',
  },
  {
    id: 'rain',
    title: 'معدل الأمطار',
    source: 'GPM IMERG — يومي',
    desc: 'شدة هطول الأمطار من أقمار GPM. المناطق الفاضية = مفيش أمطار مسجّلة.',
    gibsId: 'IMERG_Precipitation_Rate',
    level: 6,
    ext: 'png',
    timeSuffix: 'T12:00:00Z', // الطبقة دي بتتحدّث كل نص ساعة، فبنحدد وقت ثابت في اليوم
    lagDays: 2,
    defaultOn: false,
    defaultOpacity: 0.8,
    legend: { gradient: 'linear-gradient(90deg, #b9e3f5, #4aa3df, #2a5db8, #6a2c9c)', from: 'خفيف', to: 'غزير' },
    attribution: 'Imagery &copy; NASA GIBS / ESDIS (GPM IMERG)',
  },
]

/* ===================== أحداث ناسا (EONET) ===================== */

export const EVENT_CATEGORIES = {
  wildfires: { label: 'حرائق', color: '#EF4444' },
  severeStorms: { label: 'عواصف شديدة', color: '#3B82F6' },
  volcanoes: { label: 'براكين', color: '#F97316' },
  floods: { label: 'فيضانات', color: '#06B6D4' },
  drought: { label: 'جفاف', color: '#D4A017' },
  dustHaze: { label: 'غبار وضباب', color: '#A67C52' },
  seaLakeIce: { label: 'جليد', color: '#93C5FD' },
  landslides: { label: 'انهيارات أرضية', color: '#92400E' },
  snow: { label: 'ثلوج', color: '#CBD5E1' },
  tempExtremes: { label: 'حرارة / برودة قصوى', color: '#F43F5E' },
  manmade: { label: 'أحداث بشرية', color: '#8B5CF6' },
  waterColor: { label: 'تغيّر لون المياه', color: '#14B8A6' },
}

export const EVENT_FALLBACK = { label: 'أخرى', color: '#9CA3AF' }