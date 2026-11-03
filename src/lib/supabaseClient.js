// src/lib/supabaseClient.js
// عميل Supabase الحقيقي. المفتاح هنا publishable/anon (عام ومصمم يظهر في المتصفح)؛ الحماية الفعلية من RLS في الداتابيز.
// ممنوع تحط هنا secret ولا service_role ولا مفاتيح Gemini/Groq أبداً.
import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// بيفك الجزء الأوسط من مفتاح JWT القديم عشان نعرف دوره (anon ولا service_role)
function jwtRole(key) {
  try {
    const part = key.split('.')[1]
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json).role || null
  } catch {
    return null
  }
}

function validate() {
  if (!url || !anonKey) return 'ملف .env ناقص: لازم VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.'
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
    return 'VITE_SUPABASE_URL لازم يكون رابط المشروع بالشكل https://xxxx.supabase.co (مش مفتاح).'
  }
  if (anonKey.startsWith('sb_secret_') || jwtRole(anonKey) === 'service_role') {
    return 'VITE_SUPABASE_ANON_KEY فيه مفتاح سري! لازم المفتاح العام (sb_publishable_...) بس. غيّر المفتاح السري من Supabase فوراً.'
  }
  return null
}

export const configError = validate()
export const isSupabaseConfigured = configError === null

// لو الإعداد غلط منعمل createClient بقيم وهمية عشان التطبيق ما يقعش، والشاشة بتوضح المشكلة.
export const supabase = createClient(
  isSupabaseConfigured ? url : 'http://localhost:54321',
  isSupabaseConfigured ? anonKey : 'missing-anon-key',
)
