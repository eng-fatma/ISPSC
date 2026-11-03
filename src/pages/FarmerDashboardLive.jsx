import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './FarmerDashboardLive.css'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  CloudSun,
  Droplets,
  FlaskConical,
  History,
  Loader2,
  RefreshCw,
  Ruler,
  Sparkles,
  Sprout,
  Thermometer,
  Tractor,
  Wind,
} from 'lucide-react'
import { useFarmerDashboard, DASHBOARD_LOADING_STAGES } from '../hooks/useFarmerDashboard'


const ADAPTATION_PLANS = [
  { id: 'heat', goal: 'risk', title: 'التكيف مع الحرارة', hint: 'محاصيل ومواعيد تتحمل ارتفاع الحرارة', Icon: Thermometer, tone: 'orange' },
  { id: 'water', goal: 'water', title: 'ترشيد المياه', hint: 'محاصيل تناسب قلة الأمطار والري', Icon: Droplets, tone: 'blue' },
  { id: 'season', goal: 'default', title: 'أنسب موعد للزراعة', hint: 'حسب المناخ المتوقع لموسمك', Icon: CalendarDays, tone: 'green' },
]

// ترشيح مبدئي من آخر قراءة فعلية لطقس الأرض من NASA POWER (بيانات حقيقية مش أرقام تجريبية)
// باك: يتحسب الترشيح لاحقاً من المناخ التاريخي للأرض (متوسط سنين) بدل آخر قراءة
function recommendedPlanId(weather) {
  if (!weather) return null
  if ((weather.temperature_2m ?? 0) >= 35) return 'heat'
  if (weather.relative_humidity_2m != null && weather.relative_humidity_2m <= 30) return 'water'
  return 'season'
}

function numberFormat(number) {
  return Number(number || 0).toLocaleString('ar-EG')
}

function areaSum(farms) {
  const total = farms.reduce((sum, farm) => sum + Number(farm.area_size || 0), 0)
  const units = new Set(farms.map((farm) => farm.area_unit).filter(Boolean))
  const unit = units.size === 1 ? [...units][0] : 'وحدة مساحة'
  return { total, unit }
}

function cropStatusClass(status) {
  if (status === 'جيد' || status === 'ممتاز' || status === 'مستقر') return 'good'
  if (status === 'متوسط' || status === 'مقبول') return 'medium'
  return 'attention'
}

const DashboardSkeleton = ({ stage }) => {
  const currentIndex = DASHBOARD_LOADING_STAGES.findIndex((item) => item.key === stage)
  return (
    <div className="live-dash-loading" aria-live="polite" aria-busy="true">
      <div className="live-dash-loading-mark"><Sprout size={28} /></div>
      <div className="live-dash-loading-title">تقوم بتعبئة لوحة بيانات مزرعتك</div>
      <div className="live-dash-loading-subtitle">كل خطوة بتتحدث لحظة ما البيانات بتوصل فعليًا</div>
      <ul className="live-dash-loading-steps">
        {DASHBOARD_LOADING_STAGES.map((item, index) => {
          const status = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'pending'
          return (
            <li className={`live-dash-loading-step ${status}`} key={item.key}>
              <span className="live-dash-loading-step-icon">
                {status === 'done' && <CheckCircle2 size={16} />}
                {status === 'active' && <Loader2 size={16} className="live-dash-loading-spin" />}
                {status === 'pending' && <Circle size={16} />}
              </span>
              <span>{item.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function EmptyFarmsState({ onOpenFarms }) {
  return (
    <div className="live-dash-empty-farms">
      <div className="live-dash-empty-icon"><Tractor size={30} /></div>
      <h2>لسه مفيش أرض مسجلة</h2>
      <p>سجّل أول أرض عشان نقدر نعرض لك الطقس والمحاصيل والتنبيهات الخاصة بيها.</p>
      <button className="live-dash-primary-btn" onClick={onOpenFarms}>إضافة أرض <ArrowLeft size={15} /></button>
    </div>
  )
}

export default function FarmerDashboardLive() {
  const navigate = useNavigate()
  const {
    loading,
    stage,
    error,
    warnings,
    displayName,
    farms,
    plots,
    activities,
    soil,
    weather,
    allAlerts,
    unreadNotifications,
    refresh,
  } = useFarmerDashboard()
  const [weatherOpen, setWeatherOpen] = useState(false)

  if (loading) return <DashboardSkeleton stage={stage} />

  if (error) {
    return (
      <div className="live-dash-state live-dash-error-state">
        <AlertTriangle size={34} />
        <h2>حصلت مشكلة في تحميل الداشبورد</h2>
        <p>{error}</p>
        <button className="live-dash-primary-btn" onClick={refresh}><RefreshCw size={15} /> إعادة المحاولة</button>
      </div>
    )
  }

  if (!farms.length) return <EmptyFarmsState onOpenFarms={() => navigate('/my-farm')} />

  const { total: totalArea, unit: areaUnit } = areaSum(farms)
  const soilValue = soil?.soil_quality || soil?.quality || soil?.soil_health_score
  const soilDate = soil?.analyzed_at || soil?.soil_analyzed_at
  const currentCrops = plots.filter((plot) => plot.displayCrop !== 'بدون محصول مسجل').slice(0, 4)
  const alertCount = unreadNotifications.length || allAlerts.length
  const recommendedId = recommendedPlanId(weather)

  return (
    <div className="live-dash-page">
      <div className="live-dash-heading live-dash-reveal">
        <div>
          <div className="live-dash-eyebrow"><Activity size={14} /> ملخص حي من بيانات مزرعتك</div>
          <h1>{new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير'} {displayName || 'يا مزارع'}</h1>
          <p>كل رقم هنا مبني على البيانات المسجلة لحسابك، مش أرقام تجريبية.</p>
        </div>
        <button className="live-dash-refresh-btn" onClick={refresh} title="تحديث البيانات"><RefreshCw size={17} /> تحديث</button>
      </div>

      {warnings.length > 0 && (
        <div className="live-dash-warning live-dash-reveal">
          <AlertTriangle size={16} />
          <span>فيه بيانات اختيارية لم تكتمل: {warnings.length} مصدر. باقي الداشبورد شغال بالبيانات المتاحة.</span>
        </div>
      )}

      <div className="live-dash-grid">
        <section className="live-dash-card live-dash-weather-card live-dash-reveal" style={{ '--delay': '40ms' }}>
          <div className="live-dash-card-head">
            <span><CloudSun size={17} /> طقس الأراضي</span>
            <button className="live-dash-icon-btn" onClick={() => setWeatherOpen((value) => !value)} aria-label="عرض تفاصيل الأراضي">
              {weatherOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </button>
          </div>
          {weather ? (
            <>
              <div className="live-dash-weather-main">
                <strong>{Math.round(weather.temperature_2m ?? 0)}°</strong>
                <span>{weather.locationName || 'موقع الأرض'}{weather.exact ? ' — موقع دقيق' : ' — موقع تقريبي'} — المصدر: ناسا باور</span>
              </div>
              <div className="live-dash-weather-details">
                <span><Droplets size={14} /> {Math.round(weather.relative_humidity_2m ?? 0)}% رطوبة</span>
                <span><Wind size={14} /> {Math.round(weather.wind_speed_10m ?? 0)} كم/س</span>
              </div>
            </>
          ) : (
            <div className="live-dash-card-empty light">لا يوجد بيانات حاليًا لاستلام الطقس.</div>
          )}
          {weatherOpen && (
            <div className="live-dash-weather-farms">
              {farms.map((farm) => <div key={farm.id}><span>{farm.name}</span><span>{farm.governorate || 'موقع غير مسجل'}</span></div>)}
            </div>
          )}
        </section>

        <section className="live-dash-card live-dash-reveal" style={{ '--delay': '90ms' }}>
          <div className="live-dash-card-head"><span><Tractor size={17} /> الأرض</span><Ruler size={16} className="live-dash-muted-icon" /></div>
          <div className="live-dash-stat-row">
            <div><strong>{numberFormat(farms.length)}</strong><span>أرض</span></div>
            <div><strong>{numberFormat(totalArea)}</strong><span>{areaUnit}</span></div>
            <div><strong>{numberFormat(plots.length)}</strong><span>قطعة</span></div>
          </div>
          <button className="live-dash-link-btn" onClick={() => navigate('/my-farm')}>إظهار الأرض <ArrowLeft size={14} /></button>
        </section>

        <section className="live-dash-card live-dash-reveal" style={{ '--delay': '140ms' }}>
          <div className="live-dash-card-head"><span><Sprout size={17} /> المحاصيل الحالية</span></div>
          {currentCrops.length > 0 ? (
            <div className="live-dash-crop-list">
              {currentCrops.map((plot) => (
                <div className="live-dash-crop-row" key={plot.id}>
                  <span>{plot.displayCrop}</span>
                  <span className={`live-dash-status ${cropStatusClass(plot.displayStatus)}`}>{plot.displayStatus}</span>
                </div>
              ))}
            </div>
          ) : <div className="live-dash-card-empty">ليس لديك محاصيل حاليًا في القطع.</div>}
          <button className="live-dash-link-btn" onClick={() => navigate('/my-farm')}>إدارة المحاصيل <ArrowLeft size={14} /></button>
        </section>

        <section className="live-dash-card live-dash-reveal" style={{ '--delay': '190ms' }}>
          <div className="live-dash-card-head"><span><FlaskConical size={17} /> صحة التربة</span></div>
          <strong className="live-dash-highlight-number">{soilValue ?? '—'}</strong>
          <span className="live-dash-muted-text">{soilDate ? `آخر تحليل: ${new Date(soilDate).toLocaleDateString('ar-EG')}` : 'لا يوجد تحليل تربة مسجل'}</span>
          <button className="live-dash-link-btn" onClick={() => navigate('/analysis')}>عرض التحليل <ArrowLeft size={14} /></button>
        </section>

        <section className="live-dash-card live-dash-reveal" style={{ '--delay': '240ms' }} onClick={() => navigate('/alerts')}>
          <div className="live-dash-card-head"><span><Bell size={17} /> التنبيهات</span><span className="live-dash-counter">{numberFormat(alertCount)}</span></div>
          {allAlerts.length > 0 ? (
            <div className="live-dash-alert-list">
              {allAlerts.slice(0, 2).map((alert) => <div key={alert.id}><span>{alert.title || 'تنبيه جديد'}</span><small>{alert.created_at ? new Date(alert.created_at).toLocaleDateString('ar-EG') : ''}</small></div>)}
            </div>
          ) : <div className="live-dash-card-empty">لا توجد تنبيهات جديدة حاليًا.</div>}
          <button className="live-dash-link-btn" onClick={(event) => { event.stopPropagation(); navigate('/alerts') }}>فتح مركز التنبيهات <ArrowLeft size={14} /></button>
        </section>

        <section className="live-dash-card live-dash-reveal" style={{ '--delay': '290ms' }}>
          <div className="live-dash-card-head">
            <span><Sparkles size={17} /> أفضل خطة للتكيف</span>
            <span className="live-dash-muted-text">مع تغيّر المناخ</span>
          </div>
          <div className="live-dash-plan-list">
            {ADAPTATION_PLANS.map(({ id, goal, title, hint, Icon, tone }) => (
              <button
                type="button"
                className={`live-dash-plan ${recommendedId === id ? 'recommended' : ''}`}
                key={id}
                onClick={() => navigate('/predict', { state: { goal } })}
              >
                <span className={`live-dash-plan-icon ${tone}`}><Icon size={17} /></span>
                <span className="live-dash-plan-text">
                  <strong>{title}</strong>
                  <small>{hint}</small>
                </span>
                {recommendedId === id && <span className="live-dash-plan-badge">موصى بها الآن</span>}
                <ArrowLeft size={15} className="live-dash-plan-arrow" />
              </button>
            ))}
          </div>
          <button className="live-dash-link-btn" onClick={() => navigate('/predict')}>افتح توقع المحاصيل <ArrowLeft size={14} /></button>
        </section>

        <section className="live-dash-card live-dash-reveal" style={{ '--delay': '390ms' }}>
          <div className="live-dash-card-head"><span><History size={17} /> أحدث الأنشطة</span></div>
          {activities.length > 0 ? (
            <div className="live-dash-activity-list">{activities.slice(0, 3).map((activity) => <div key={activity.id}><span>{activity.text}</span><small>{activity.time}</small></div>)}</div>
          ) : <div className="live-dash-card-empty">ليس هناك أي أنشطة مسجلة حتى الآن.</div>}
          <button className="live-dash-link-btn" onClick={() => navigate('/my-farm')}>أعرض سجل الأرض <ArrowLeft size={14} /></button>
        </section>
      </div>

      <div className="live-dash-footer-note live-dash-reveal">
        <CheckCircle2 size={15} /> هذا الداشبورد يعرض البيانات المتاحة فعلياً فقط. في حالة نقص البيانات المصدر، سنبينها بدلاً من عرض رقم افتراضي.
      </div>
    </div>
  )
}