// محرك المطابقة الحقيقي بين بيانات الأرض والمحاصيل — src/utils/cropMatching.js

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

export function getCurrentArabicMonth(date = new Date()) {
  return ARABIC_MONTHS[date.getMonth()]
}


export function normalizeArabic(text) {
  if (!text) return ''
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^ال/, '')
    .replace(/إ|أ|آ/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
}

// هل نص التربة بتاع الأرض موجود جوه أي وصف من أوصاف تربة المحصول؟
function soilContains(farmSoilType, cropSoilDescription) {
  if (!farmSoilType || !cropSoilDescription) return false
  const a = normalizeArabic(farmSoilType)
  const b = normalizeArabic(cropSoilDescription)
  return a.length > 0 && b.includes(a)
}

// تقييم تربة الأرض ضد محصول معيّن — يرجع { points, tierLabel }
function scoreSoil(farmSoilType, crop) {
  if (!farmSoilType) return { points: null, tierLabel: null }
  if (soilContains(farmSoilType, crop.soil_best)) return { points: 30, tierLabel: 'ممتازة' }
  if (soilContains(farmSoilType, crop.soil_second)) return { points: 20, tierLabel: 'جيدة' }
  if (soilContains(farmSoilType, crop.soil_third)) return { points: 10, tierLabel: 'مقبولة' }
  if (soilContains(farmSoilType, crop.soil_worst)) return { points: 0, tierLabel: 'غير مناسبة' }
  return { points: null, tierLabel: null } // تربة الأرض مش موصوفة في بيانات المحصول خالص
}

function scoreRange(value, min, max, fullPoints, tolerance = 0) {
  if (value == null || (min == null && max == null)) return null
  if (min != null && max != null) {
    if (value >= min && value <= max) return fullPoints
    if (tolerance > 0 && (value >= min - tolerance && value <= max + tolerance)) return Math.round(fullPoints * 0.5)
    return 0
  }
  if (max != null) return value <= max ? fullPoints : 0
  if (min != null) return value >= min ? fullPoints : 0
  return null
}

function scoreTemperature(currentTemp, crop) {
  if (currentTemp == null) return null
  const { temp_min_ideal, temp_max_ideal, temp_max_tolerable } = crop
  if (temp_min_ideal == null && temp_max_ideal == null) return null
  if (temp_min_ideal != null && temp_max_ideal != null &&
      currentTemp >= temp_min_ideal && currentTemp <= temp_max_ideal) return 25
  if (temp_max_tolerable != null && currentTemp > (temp_max_ideal ?? temp_max_tolerable) && currentTemp <= temp_max_tolerable) return 12
  return 0
}

// activeMonths: أشهر الزراعة المعتبرة (الافتراضي: الشهر الحالي بس) — المحصول "في موسمه" لو أي شهر زراعة ليه جواها
function scoreCalendar(crop, activeMonths) {
  if (!crop.planting_months) return null
  const months = activeMonths && activeMonths.length > 0 ? activeMonths : [getCurrentArabicMonth()]
  const inSeason = months.some((m) => crop.planting_months.includes(m))
  return { inSeason, penalty: inSeason ? 0 : -35 }
}

function scoreSalinity(farmSalinity, crop) {
  if (farmSalinity == null) return null
  const { ec_safe_limit, ec_max_acceptable, yield_drop_percent_per_ec } = crop
  if (ec_safe_limit == null && ec_max_acceptable == null) return null
  if (ec_safe_limit != null && farmSalinity <= ec_safe_limit) return { points: 15, warning: null }
  if (ec_max_acceptable != null && farmSalinity <= ec_max_acceptable) {
    const excess = ec_safe_limit != null ? farmSalinity - ec_safe_limit : null
    const dropNote = yield_drop_percent_per_ec != null && excess != null
      ? `متوقع انخفاض إنتاجية تقريبي ${Math.round(excess * yield_drop_percent_per_ec)}% بسبب الملوحة`
      : 'الملوحة أعلى من المستوى الآمن — إنتاجية أقل من المتوقع'
    return { points: 8, warning: dropNote }
  }
  return { points: 0, warning: 'ملوحة الأرض أعلى من الحد المقبول لهذا المحصول' }
}

// حساب "بونص الهدف" — شفاف ومحدود، بيتحسب فوق الأساس الزراعي مش بديل عنه
function scoreGoal(goal, crop, predictedPrice) {
  if (!goal || goal === 'default') return 0
  switch (goal) {
    case 'price': {
      const price = predictedPrice ?? crop.price_avg_egp_ton
      if (price == null) return 0
      // بونص نسبي بسيط: كل 5000 ج/طن = نقطة، لحد أقصى 10
      return Math.min(10, Math.round(price / 5000))
    }
    case 'water': {
      if (crop.water_need_min == null) return 0
      // كل ما احتياج المية أقل كل ما البونص أعلى (عكسي)، لحد أقصى 10
      return Math.max(0, 10 - Math.round(crop.water_need_min / 100))
    }
    case 'longterm':
      if (crop.is_perennial) return 10
      if (crop.harvest_duration_months != null) return Math.min(10, Math.round(crop.harvest_duration_months))
      return 0
    case 'risk': {
      let bonus = crop.salinity_tolerance_level === 'عالي' ? 6 : crop.salinity_tolerance_level === 'متوسط' ? 3 : 0
      if (crop.strictly_avoid) bonus -= 2
      return Math.max(0, bonus)
    }
    case 'export':
      return crop.is_exportable ? 15 : 0
    default:
      return 0
  }
}

/**
 * الدالة الرئيسية — بتحسب نسبة التوافق بين أرض وكل محصول في القائمة
 * @param {object} farmData - { soilType, ph, salinity }
 * @param {object} weather - { temp, humidity } من NASA POWER
 * @param {array} crops - كل صفوف جدول crops
 * @param {string} goal - أحد: 'default' | 'price' | 'water' | 'longterm' | 'risk' | 'export'
 * @param {object} predictionsByCropId - نتيجة market_price_predictions (اختياري)
 * @param {object} options - { skipCalendar }: تجاهل خصم "خارج موسم الزراعة" (للمحصول الدائم اللي مزروع بالفعل)
 */
export function matchCrops(farmData, weather, crops, goal, predictionsByCropId = {}, activeMonths = null, options = {}) {
  const { soilType, ph, salinity } = farmData
  const currentTemp = weather?.temp ?? null
  const currentHumidity = weather?.humidity ?? null

  return crops.map((crop) => {
    const soilResult = scoreSoil(soilType, crop)
    const tempPoints = scoreTemperature(currentTemp, crop)
    const humidityPoints = scoreRange(currentHumidity, crop.humidity_min, crop.humidity_max, 15, 10)
    const phPoints = scoreRange(ph, crop.ph_min, crop.ph_max, 15, 0.5)
    const salinityResult = scoreSalinity(salinity, crop)
    const calendarResult = options.skipCalendar ? null : scoreCalendar(crop, activeMonths)

    const dimensions = [
      { key: 'soil', points: soilResult.points, max: 30 },
      { key: 'temp', points: tempPoints, max: 25 },
      { key: 'humidity', points: humidityPoints, max: 15 },
      { key: 'ph', points: phPoints, max: 15 },
      { key: 'salinity', points: salinityResult?.points ?? null, max: 15 },
    ]

    const available = dimensions.filter((d) => d.points != null)
    const skipped = dimensions.filter((d) => d.points == null).map((d) => d.key)
    const earnedPoints = available.reduce((sum, d) => sum + d.points, 0)
    const maxPossible = available.reduce((sum, d) => sum + d.max, 0)

    let percent = maxPossible > 0 ? Math.round((earnedPoints / maxPossible) * 100) : null
    const calendarPenaltyApplied = calendarResult && !calendarResult.inSeason
    if (percent != null && calendarPenaltyApplied) {
      percent = Math.max(0, percent + calendarResult.penalty)
    }

    const prediction = predictionsByCropId[crop.id]
    const goalBonus = percent != null ? scoreGoal(goal, crop, prediction?.predicted_price_egp_ton) : 0
    const finalPercent = percent != null ? Math.min(100, percent + goalBonus) : null

    return {
      crop,
      matchPercent: finalPercent,
      isApproximate: skipped.length > 0,
      skippedDimensions: skipped,
      soilTier: soilResult.tierLabel,
      inSeason: calendarResult ? calendarResult.inSeason : null,
      plantingMonths: crop.planting_months || null,
      salinityWarning: salinityResult?.warning ?? null,
      predictedPrice: prediction?.predicted_price_egp_ton ?? null,
      predictionConfidence: prediction?.prediction_confidence ?? null,
    }
  })
  .filter((r) => r.matchPercent != null)
  .sort((a, b) => b.matchPercent - a.matchPercent)
}

// أي حقول أرض ناقصة عشان المطابقة تشتغل بأعلى دقة ممكنة
export function getMissingFarmFields(farmData) {
  const missing = []
  if (!farmData.soilType) missing.push('نوع التربة')
  if (farmData.ph == null) missing.push('قيمة pH التربة')
  if (farmData.salinity == null) missing.push('درجة الملوحة (EC)')
  return missing
}


/* ===================== المواسم الزراعية ===================== */
// نفس تقسيم المواسم المستخدم في صفحة "أرضي": شتوي (نوفمبر–فبراير) / صيفي (مارس–يونيو) / نيلي (يوليو–أكتوبر)
export const SEASONS = [
  { key: 'شتوي', label: 'الموسم الشتوي', monthIndexes: [10, 11, 0, 1] },
  { key: 'صيفي', label: 'الموسم الصيفي', monthIndexes: [2, 3, 4, 5] },
  { key: 'نيلي', label: 'الموسم النيلي', monthIndexes: [6, 7, 8, 9] },
]

export function getSeasonIndex(date = new Date()) {
  const m = date.getMonth()
  return SEASONS.findIndex((season) => season.monthIndexes.includes(m))
}

// المواسم المتتالية: الحالي ثم اللي بعده ثم اللي بعده (الافتراضي 3 مواسم)
export function getSeasonPlan(date = new Date(), count = 3) {
  const currentIdx = getSeasonIndex(date)
  const current = SEASONS[currentIdx]

  // أيام باقية على نهاية الموسم الحالي (لحد آخر يوم في آخر شهر فيه)
  const lastMonth = current.monthIndexes[current.monthIndexes.length - 1]
  let endYear = date.getFullYear()
  if (lastMonth < date.getMonth()) endYear += 1
  const endDate = new Date(endYear, lastMonth + 1, 0)
  const daysLeft = Math.max(0, Math.ceil((endDate - date) / (1000 * 60 * 60 * 24)))

  return Array.from({ length: count }, (_, i) => {
    const season = SEASONS[(currentIdx + i) % SEASONS.length]
    return {
      ...season,
      order: i + 1,
      months: season.monthIndexes.map((m) => ARABIC_MONTHS[m]),
      isCurrent: i === 0,
      daysLeft: i === 0 ? daysLeft : null,
    }
  })
}

// المحاصيل المرشحة للموسم: موسمها الأساسي/الثانوي هو الموسم ده، أو دائمة (أشجار) وزراعتها بتقع في أشهره
function isCropCandidateForSeason(crop, season) {
  if (crop.season_primary === season.key || crop.season_secondary === season.key) return true
  if (crop.season_primary === 'دائم' && crop.planting_months) {
    return season.months.some((m) => crop.planting_months.includes(m))
  }
  return false
}

/**
 * أفضل المحاصيل لموسم معيّن مع نسبة التوافق لكل محصول
 * @param {object} season - عنصر من getSeasonPlan()
 * @param {object|null} seasonWeather - { temp, humidity } (فعلي للموسم الحالي، معتاد للموسم الجاي، أو null)
 */
export function matchCropsForSeason(farmData, seasonWeather, crops, goal, predictionsByCropId, season, limit = 4) {
  const candidates = crops.filter((crop) => isCropCandidateForSeason(crop, season))
  return matchCrops(farmData, seasonWeather, candidates, goal, predictionsByCropId, season.months).slice(0, limit)
}


/* ===================== خطط التناوب (كل خطة = محصول لكل موسم، وكل موسم مربوط باللي قبله) ===================== */
const SAME_CATEGORY_PENALTY = 10 // خصم لو المحصول نفس تصنيف المحصول اللي قبله (التنويع أفضل للتربة)

const isPerennial = (crop) => crop.is_perennial === true || crop.season_primary === 'دائم'

// الموسم اللي بعد محصول معيّن: لو دائم (شجر) بيكمّل في الأرض، غير كده بنختار أنسب محصول مع مراعاة التنويع
function buildNextStep(farmData, season, previous, usedIds, crops, goal, predictionsByCropId) {
  if (isPerennial(previous.crop)) {
    const [item] = matchCrops(farmData, season.weather, [previous.crop], goal, predictionsByCropId, season.months, { skipCalendar: true })
    return { season, carriedOver: true, item: item ? { ...item, inSeason: null, rotation: null } : null }
  }

  const candidates = crops.filter((crop) => isCropCandidateForSeason(crop, season) && !usedIds.has(crop.id))
  const ranked = matchCrops(farmData, season.weather, candidates, goal, predictionsByCropId, season.months)
    .map((match) => {
      const sameCategory = !!previous.crop.category && match.crop.category === previous.crop.category
      return {
        ...match,
        rotation: sameCategory ? 'same' : 'different',
        matchPercent: sameCategory ? Math.max(0, match.matchPercent - SAME_CATEGORY_PENALTY) : match.matchPercent,
      }
    })
    .sort((a, b) => b.matchPercent - a.matchPercent)

  return { season, carriedOver: false, item: ranked[0] ?? null }
}

/**
 * بيبني خطط من المواسم المتتالية: كل خطة بتبدأ بمحصول من أفضل محاصيل الموسم الأول،
 * وبعدها كل موسم بيتختار على أساس المحصول اللي قبله (من غير تكرار، مع تفضيل التنويع).
 * نسبة كل موسم تراكمية (توافق محصوله × نسبة الموسم اللي قبله)، فبتقل مع الأبعد.
 * الخطط بتترتب بمتوسط النسب.
 * @param {array} seasons - من getSeasonPlan() ومضاف على كل عنصر weather
 * @returns {array} [{ rank, averagePercent, steps: [{ season, item, carriedOver }] }]
 */
export function buildRotationPlans(farmData, seasons, crops, goal, predictionsByCropId, planCount = 3) {
  if (seasons.length === 0) return []
  const [first, ...rest] = seasons
  const seeds = matchCropsForSeason(farmData, first.weather, crops, goal, predictionsByCropId, first, planCount)

  const plans = seeds.map((seed) => {
    const firstItem = { ...seed, seasonPercent: seed.matchPercent, rotation: null }
    const steps = [{ season: first, carriedOver: false, item: firstItem }]
    const usedIds = new Set([seed.crop.id])
    let previous = firstItem
    for (const season of rest) {
      const step = buildNextStep(farmData, season, previous, usedIds, crops, goal, predictionsByCropId)
      if (step.item) {
        // النسبة تراكمية: توافق المحصول في الموسم × نسبة الموسم اللي قبله، فبتقل كل ما نبعد
        step.item = {
          ...step.item,
          seasonPercent: step.item.matchPercent,
          matchPercent: Math.round((previous.matchPercent * step.item.matchPercent) / 100),
        }
        usedIds.add(step.item.crop.id)
        previous = step.item
      }
      steps.push(step)
    }
    const percents = steps.filter((s) => s.item).map((s) => s.item.matchPercent)
    const averagePercent = percents.length > 0 ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null
    return { steps, averagePercent }
  })

  return plans
    .sort((a, b) => (b.averagePercent ?? -1) - (a.averagePercent ?? -1))
    .map((plan, i) => ({ ...plan, rank: i + 1 }))
}