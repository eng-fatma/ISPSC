// src/context/AuthContext.jsx
// حالة تسجيل الدخول الحقيقية (Supabase Auth) على مستوى الموقع كله.
import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase as realClient, isSupabaseConfigured, configError } from '../lib/supabaseClient'
import { setMockIdentity } from '../lib/supabase.mock'
import { arabicAuthError } from '../lib/authErrors'
import { AuthContext, DEMO_EMAIL, DEMO_PASSWORD, DEMO_AVAILABLE } from './authState'


function displayNameOf(user) {
  const fromMeta = user?.user_metadata?.full_name
  if (fromMeta && String(fromMeta).trim()) return String(fromMeta).trim()
  if ((user?.email || '').toLowerCase() === DEMO_EMAIL) return 'حساب تجريبي'
  return (user?.email || '').split('@')[0] || 'مزارع'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  // الصفحات الباقية لسه شغالة على بيانات تجريبية؛ هنا بنخلي اسم وإيميل المستخدم الحقيقي يظهروا فيها.
  // (المرحلة 3: هنشيل الجسر ده ونربط كل الصفحات بالداتابيز الحقيقية.)
  const applySession = useCallback((s) => {
    if (s?.user) {
      setMockIdentity({ email: s.user.email, full_name: displayNameOf(s.user) })
    }
    setSession(s || null)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let active = true

    realClient.auth.getSession().then(({ data }) => {
      if (!active) return
      applySession(data?.session)
      setLoading(false)
    }).catch(() => {
      if (active) setLoading(false)
    })

    // مهم: الدالة دي لازم تفضل متزامنة (من غير await ولا نداء Supabase جواها) عشان ما يحصلش تعليق.
    const { data: { subscription } } = realClient.auth.onAuthStateChange((_event, s) => {
      if (!active) return
      applySession(s)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [applySession])

  const signIn = useCallback(async (email, password) => {
    if (!isSupabaseConfigured) return { error: configError }
    const { data, error } = await realClient.auth.signInWithPassword({ email, password })
    if (error) return { error: arabicAuthError(error) }
    applySession(data.session)
    return { error: null }
  }, [applySession])

  const signUp = useCallback(async ({ fullName, email, password }) => {
    if (!isSupabaseConfigured) return { error: configError }
    const { data, error } = await realClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) return { error: arabicAuthError(error) }
    // لو تأكيد الإيميل مفعّل في Supabase، الإيميل المكرر بيرجع مستخدم بدون identities بدل خطأ
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { error: 'الإيميل ده مسجّل قبل كده. جرّب تسجيل الدخول.' }
    }
    if (data.session) {
      applySession(data.session)
      return { error: null, needsConfirmation: false }
    }
    return { error: null, needsConfirmation: true }
  }, [applySession])

  const demoLogin = useCallback(async () => {
    if (!DEMO_AVAILABLE) return { error: 'الحساب التجريبي غير مفعّل حالياً.' }
    return signIn(DEMO_EMAIL, DEMO_PASSWORD)
  }, [signIn])

  const signOut = useCallback(async () => {
    try {
      await realClient.auth.signOut({ scope: 'local' })
    } catch {
      /* حتى لو فشل الاتصال، هنكمل الخروج محلياً */
    }
    // إعادة تحميل كاملة عشان أي بيانات في الذاكرة (من الحساب السابق) تتمسح تماماً
    window.location.replace('/login')
  }, [])

  const user = session?.user || null
  const value = useMemo(() => ({
    session,
    user,
    loading,
    isDemo: Boolean(user && (user.email || '').toLowerCase() === DEMO_EMAIL),
    displayName: user ? displayNameOf(user) : '',
    signIn, signUp, demoLogin, signOut,
  }), [session, user, loading, signIn, signUp, demoLogin, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
