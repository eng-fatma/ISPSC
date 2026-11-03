// src/pages/LoginPage.jsx
// صفحة الدخول والتسجيل الحقيقية + الحساب التجريبي.
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, DEMO_AVAILABLE } from '../context/authState'
import { isSupabaseConfigured, configError } from '../lib/supabaseClient'
import logoSmall from '../assets/logo-small.png'
import './LoginPage.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function EyeIcon({ off }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10z" />
      <circle cx="10" cy="10" r="2.5" />
      {off && <path d="M3 3l14 14" />}
    </svg>
  )
}

// مسار الرجوع بعد الدخول: لازم يكون مسار داخلي في الموقع بس (حماية من التحويل لموقع خارجي)
function safeFrom(state) {
  const from = state?.from
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/login')) return from
  return '/dashboard'
}

export default function LoginPage() {
  const { session, loading, signIn, signUp, demoLogin } = useAuth()
  const location = useLocation()

  const [tab, setTab] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  if (!loading && session) return <Navigate to={safeFrom(location.state)} replace />

  function switchTab(next) {
    setTab(next)
    setError('')
    setInfo('')
    setPassword('')
    setConfirm('')
  }

  function validate() {
    const mail = email.trim()
    if (!EMAIL_RE.test(mail)) return 'اكتب إيميل صحيح.'
    if (tab === 'signup') {
      const name = fullName.replace(/\s+/g, ' ').trim()
      if (name.length < 2) return 'اكتب اسمك (حرفين على الأقل).'
      if (name.length > 60) return 'الاسم طويل جداً (60 حرف كحد أقصى).'
      if (password.length < 8) return 'كلمة السر لازم 8 حروف على الأقل.'
      if (password.length > 72) return 'كلمة السر طويلة جداً (72 حرف كحد أقصى).'
      if (!/\p{L}/u.test(password) || !/\d/.test(password)) return 'كلمة السر لازم تحتوي على حروف وأرقام.'
      if (password !== confirm) return 'كلمتا السر مش متطابقتين.'
    } else if (!password) {
      return 'اكتب كلمة السر.'
    }
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    setInfo('')
    const problem = validate()
    if (problem) { setError(problem); return }

    setBusy(true)
    try {
      if (tab === 'login') {
        const { error: err } = await signIn(email.trim(), password)
        if (err) setError(err)
      } else {
        const { error: err, needsConfirmation } = await signUp({
          fullName: fullName.replace(/\s+/g, ' ').trim(),
          email: email.trim(),
          password,
        })
        if (err) setError(err)
        else if (needsConfirmation) {
          setInfo('اتبعتلك رسالة تأكيد على إيميلك. افتحها وبعدها سجّل دخولك.')
          setTab('login')
          setPassword('')
          setConfirm('')
        }
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleDemo() {
    if (busy) return
    setError('')
    setInfo('')
    setBusy(true)
    try {
      const { error: err } = await demoLogin()
      if (err) setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="lg-page" dir="rtl">
      <div className="lg-glow" aria-hidden="true" />
      <main className="lg-card">
        <header className="lg-brand">
          <div className="lg-logo">
            <img src={logoSmall} alt="ISPSC" className="lg-logo-img" />
            <div className="lg-logo-txt">IS<span>PSC</span></div>
          </div>
          <p className="lg-tagline">منصة الزراعة الذكية للمزارع المصري</p>
        </header>

        {!isSupabaseConfigured ? (
          <div className="lg-alert lg-alert-error" role="alert">
            <strong>الاتصال بالسيرفر غير مكتمل.</strong>
            <span>{configError}</span>
          </div>
        ) : (
          <>
            <div className="lg-tabs" role="tablist" aria-label="نوع العملية">
              <button type="button" role="tab" aria-selected={tab === 'login'} className={`lg-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>تسجيل الدخول</button>
              <button type="button" role="tab" aria-selected={tab === 'signup'} className={`lg-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => switchTab('signup')}>حساب جديد</button>
            </div>

            <form className="lg-form" onSubmit={handleSubmit} noValidate>
              {tab === 'signup' && (
                <div className="lg-field">
                  <label htmlFor="lg-name">الاسم</label>
                  <input id="lg-name" type="text" autoComplete="name" maxLength={60} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="مثال: أحمد محمود" />
                </div>
              )}

              <div className="lg-field">
                <label htmlFor="lg-email">الإيميل</label>
                <input id="lg-email" type="email" inputMode="email" autoComplete="email" dir="ltr" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              </div>

              <div className="lg-field">
                <label htmlFor="lg-pass">كلمة السر</label>
                <div className="lg-pass">
                  <input id="lg-pass" type={showPass ? 'text' : 'password'} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} dir="ltr" maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                  <button type="button" className="lg-eye" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}>
                    <EyeIcon off={showPass} />
                  </button>
                </div>
                {tab === 'signup' && <small className="lg-hint">8 حروف على الأقل، وفيها حروف وأرقام.</small>}
              </div>

              {tab === 'signup' && (
                <div className="lg-field">
                  <label htmlFor="lg-confirm">تأكيد كلمة السر</label>
                  <input id="lg-confirm" type={showPass ? 'text' : 'password'} autoComplete="new-password" dir="ltr" maxLength={72} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
                </div>
              )}

              {error && <div className="lg-alert lg-alert-error" role="alert">{error}</div>}
              {info && <div className="lg-alert lg-alert-info" role="status">{info}</div>}

              <button type="submit" className="lg-btn lg-btn-primary" disabled={busy}>
                {busy ? 'لحظة…' : tab === 'login' ? 'دخول' : 'إنشاء الحساب'}
              </button>
            </form>

            {DEMO_AVAILABLE && (
              <section className="lg-demo" aria-label="الحساب التجريبي">
                <div className="lg-or"><span>أو</span></div>
                <button type="button" className="lg-btn lg-btn-demo" onClick={handleDemo} disabled={busy}>
                  حساب تجريبي
                </button>
                <p className="lg-demo-note">
                  جرّب المنصة من غير تسجيل، بما فيها المساعد الذكي. الحساب مشترك وبياناته تجريبية.
                  ربط جهاز التحليل غير متاح فيه لأنه محتاج الجهاز الفعلي.
                </p>
              </section>
            )}
          </>
        )}
      </main>
      <footer className="lg-foot">ISPSC © 2026</footer>
    </div>
  )
}
