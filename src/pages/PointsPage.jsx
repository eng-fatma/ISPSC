import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './ProfilePage.css'

const LEVELS = [
  { key: 'new', emoji: '🌱', label: 'مزارع جديد', min: 0 },
  { key: 'active', emoji: '🌿', label: 'مزارع نشط', min: 25 },
  { key: 'pro', emoji: '🌾', label: 'مزارع محترف', min: 60 },
  { key: 'expert', emoji: '👑', label: 'خبير زراعي', min: 90 },
]

function getLevel(activityScore) {
  let current = LEVELS[0]
  for (const lvl of LEVELS) {
    if (activityScore >= lvl.min) current = lvl
  }
  const currentIndex = LEVELS.findIndex((l) => l.key === current.key)
  const next = LEVELS[currentIndex + 1]
  const progress = next ? Math.min(100, Math.round(((activityScore - current.min) / (next.min - current.min)) * 100)) : 100
  return { current, next, progress }
}

function calcCompletion(profile) {
  const filled = fields.filter((f) => profile?.[f] && String(profile[f]).trim() !== '').length
  return Math.round((filled / fields.length) * 100)
}

function ProfileSkeleton() {
  return (
    <div className="premium-profile-page">
      <div className="profile-hero skeleton-block" style={{ height: 250 }}></div>
      <div className="profile-sections-grid">
        <div className="profile-card skeleton-block" style={{ height: 120 }}></div>
        <div className="profile-card skeleton-block" style={{ height: 120 }}></div>
        <div className="profile-card skeleton-block" style={{ height: 120 }}></div>
      </div>
    </div>
  )
}

function ProfilePage() {
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showFullBio, setShowFullBio] = useState(false)
  const [stats, setStats] = useState({ lands: 0, currentCrops: 0, seasons: 0, totalArea: 0, alertsDone: 0, soilAnalyses: 0, recommendationsApplied: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setAuthUser(user)

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData || null)

      try {
        const { count } = await supabase.from('farms').select('*', { count: 'exact', head: true }).eq('owner_id', user.id)
        setStats((s) => ({ ...s, lands: count || 0 }))
      } catch {
        // هيتظبط أكتر في مرحلة "أراضي"
      }

      setLoading(false)
    }
    fetchProfile()
  }, [])

  if (loading) return <ProfileSkeleton />

  if (!authUser) {
    return <div className="profile-skeleton">لازم تسجّل دخول الأول</div>
  }

  const fullName = profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'مزارع'
  const firstName = fullName.split(' ')[0]
  const bioText = profile?.bio || 'لا يوجد نبذة شخصية حالياً. يمكنك إضافتها من الإعدادات.'
  const completion = calcCompletion(profile)
  const { current: level, progress: levelProgress } = getLevel(completion)

  const statCards = [
    { icon: '🚜', value: stats.lands, label: 'أراضي مسجلة', to: '/my-farm' },
    { icon: '🌱', value: stats.currentCrops, label: 'محاصيل حالية', to: '/my-farm' },
    { icon: '⚠️', value: stats.alertsDone, label: 'تنبيهات منفذة', to: '/alerts' },
    { icon: '📊', value: stats.soilAnalyses, label: 'تحليلات زراعية', to: '/my-farm' },
  ]

  return (
    <div className="premium-profile-page fade-in">
      <section className="profile-hero">
        <div
          className="hero-cover"
          style={{ backgroundImage: `url(${profile?.cover_url || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200'})` }}
        >
          <div className="hero-overlay"></div>
          <button className="change-cover-btn" onClick={() => navigate('/settings')}>تغيير صورة الغلاف</button>
        </div>

        <div className="hero-content-wrapper">
          <div className="profile-main-info">
            <div className="avatar-wrapper">
              <div className="main-avatar">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt={fullName} /> : firstName.charAt(0)}
                <div className="avatar-edit-overlay" onClick={() => navigate('/settings')}>تغيير الصورة</div>
              </div>
            </div>

            <div className="info-text">
              <div className="name-row">
                <h1>{fullName}</h1>
                <span className="role-badge">🌾 مزارع</span>
              </div>
              <p className="bio-mini">{bioText.substring(0, 80)}{bioText.length > 80 ? '...' : ''}</p>
              <div className="meta-info">
                <span>📍 {profile?.governorate || 'غير محدد'}{profile?.center ? ` · ${profile.center}` : ''}</span>
                <span>📅 انضم {authUser.created_at ? new Date(authUser.created_at).toLocaleDateString('ar-EG') : '—'}</span>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <button className="btn-premium primary" onClick={() => navigate('/settings')}>تعديل البروفايل</button>
            <button className="btn-premium secondary" onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              alert('تم نسخ رابط البروفايل')
            }}>مشاركة</button>
          </div>
        </div>
      </section>

      <div className="profile-sections-grid">
        <div className="profile-card premium-card bio-card">
          <h3>نبذة عني</h3>
          <p className={showFullBio ? 'full' : 'truncated'}>{bioText}</p>
          {bioText.length > 150 && (
            <button className="read-more-btn" onClick={() => setShowFullBio(!showFullBio)}>
              {showFullBio ? 'عرض أقل' : 'عرض المزيد'}
            </button>
          )}
        </div>

        <div className="profile-card premium-card level-card">
          <h3>مستوى المزارع</h3>
          <div className="level-display">
            <span className="level-icon">{level.emoji}</span>
            <div className="level-info">
              <div className="level-name">{level.label}</div>
              <div className="level-progress-bar">
                <div className="progress-fill" style={{ width: `${levelProgress}%` }}></div>
              </div>
              <span className="next-level-hint">{levelProgress < 100 ? `باقي ${100 - levelProgress}% للمستوى التالي` : 'أعلى مستوى'}</span>
            </div>
          </div>
        </div>

        <div className="profile-card premium-card completion-card">
          <h3>اكتمال الملف الشخصي</h3>
          <div className="completion-circle-wrapper">
            <div className="completion-stat">{completion}%</div>
            <div className="completion-bar"><div className="fill" style={{ width: `${completion}%` }}></div></div>
          </div>
          {completion < 100 && (
            <button className="complete-btn" onClick={() => navigate('/settings')}>استكمال البيانات</button>
          )}
        </div>
      </div>

      <section className="profile-stats-section">
        <h3 className="section-title">ملخص النشاط</h3>
        <div className="stats-mini-grid">
          {statCards.map((s) => (
            <div className="stat-mini-card" key={s.label} onClick={() => navigate(s.to)}>
              <span className="stat-icon">{s.icon}</span>
              <span className="stat-number">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default ProfilePage