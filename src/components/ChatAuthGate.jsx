import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured, configError } from '../lib/supabaseClient'

const box = { maxWidth: 380, margin: '60px auto', padding: 24, borderRadius: 14, background: 'var(--card-bg, #fff)', border: '1px solid rgba(0,0,0,.08)', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }
const field = { width: '100%', padding: '10px 12px', margin: '6px 0 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,.2)', fontFamily: 'inherit', fontSize: '0.95rem', boxSizing: 'border-box' }
const btn = { width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: 'var(--ds-primary, #2E7D32)', color: '#fff', fontFamily: 'inherit', fontSize: '1rem', cursor: 'pointer' }

function translateAuthError(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'الإيميل أو كلمة السر غلط.'
  if (m.includes('already registered')) return 'الإيميل ده مسجّل قبل كده. جرّب تسجيل الدخول.'
  if (m.includes('password should be')) return 'كلمة السر لازم تكون 6 حروف على الأقل.'
  if (m.includes('email not confirmed')) return 'فعّل الإيميل الأول من الرسالة اللي وصلتلك.'
  if (m.includes('rate limit')) return 'محاولات كتير. استنى شوية وجرّب تاني.'
  return 'حصلت مشكلة. حاول تاني.'
}

// بيعرض شاشة دخول لو مفيش جلسة، وإلا بيعرض الصفحة.
function ChatAuthGate({ children }) {
  const [session, setSession] = useState(undefined) // undefined = لسه بنفحص
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) {
    return (
      <div style={box}>
        <h2 style={{ marginTop: 0 }}>الاتصال بـ Supabase ناقص</h2>
        <p style={{ color: '#b3261e' }}>{configError}</p>
        <p>صحّح السطرين دول في ملف <code>.env</code> وأعد تشغيل <code>npm run dev</code>:</p>
        <pre style={{ direction: 'ltr', textAlign: 'left', background: '#f4f4f4', padding: 10, borderRadius: 8 }}>{'VITE_SUPABASE_URL=...\nVITE_SUPABASE_ANON_KEY=...'}</pre>
      </div>
    )
  }
  if (session === undefined) return <div style={{ ...box, textAlign: 'center' }}>جاري التحميل...</div>
  if (session) return children

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setMsg('')
    const fn = mode === 'login' ? supabase.auth.signInWithPassword : supabase.auth.signUp
    const { data, error } = await fn.call(supabase.auth, { email: email.trim(), password })
    setBusy(false)
    if (error) return setMsg(translateAuthError(error.message))
    if (mode === 'signup' && !data.session) setMsg('اتبعتلك رسالة تأكيد على الإيميل. أكّديه وبعدين سجّلي دخول.')
  }

  return (
    <form style={box} onSubmit={submit}>
      <h2 style={{ marginTop: 0 }}>{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</h2>
      <p style={{ fontSize: '0.85rem', opacity: 0.75 }}>لازم تسجّل دخول عشان تستخدم المساعد الزراعي وتتحفظ محادثاتك.</p>
      <label>الإيميل<input style={field} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" /></label>
      <label>كلمة السر<input style={field} type="password" required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" /></label>
      {msg && <p role="alert" style={{ color: '#b3261e', fontSize: '0.9rem' }}>{msg}</p>}
      <button style={btn} disabled={busy}>{busy ? '...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}</button>
      <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg('') }} style={{ background: 'none', border: 'none', color: 'var(--ds-primary, #2E7D32)', cursor: 'pointer', fontFamily: 'inherit' }}>
          {mode === 'login' ? 'معنديش حساب، أنشئ حساب' : 'عندي حساب، سجّل دخول'}
        </button>
      </p>
    </form>
  )
}

export default ChatAuthGate