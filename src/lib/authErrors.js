// src/lib/authErrors.js
// بيحوّل أخطاء Supabase (إنجليزي) لرسائل عربي مفهومة للمزارع.
// ملاحظة أمان: رسالة "الإيميل أو كلمة السر غلط" واحدة في الحالتين عشان محدش يعرف إيميلات الناس المسجّلة.
export function arabicAuthError(error) {
  if (!error) return ''
  const code = String(error.code || '').toLowerCase()
  const msg = String(error.message || '').toLowerCase()
  const status = error.status

  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'الإيميل أو كلمة السر غير صحيحة.'
  }
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) {
    return 'الإيميل ده مسجّل قبل كده. جرّب تسجيل الدخول.'
  }
  if (code === 'weak_password' || msg.includes('password should be') || msg.includes('weak password')) {
    return 'كلمة السر ضعيفة. لازم 8 حروف على الأقل وفيها حروف وأرقام.'
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'لازم تأكد الإيميل الأول من الرسالة اللي وصلتلك.'
  }
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || status === 429 || msg.includes('rate limit') || msg.includes('too many')) {
    return 'محاولات كتير في وقت قصير. استنى شوية وحاول تاني.'
  }
  if (code === 'signup_disabled' || msg.includes('signups not allowed')) {
    return 'إنشاء حسابات جديدة متوقف حالياً.'
  }
  if (code === 'validation_failed' || code === 'email_address_invalid' || msg.includes('invalid email') || msg.includes('unable to validate email')) {
    return 'الإيميل مش مكتوب صح. راجعه وحاول تاني.'
  }
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) {
    return 'مفيش اتصال بالسيرفر. اتأكد من الإنترنت وحاول تاني.'
  }
  return 'حصلت مشكلة غير متوقعة. حاول تاني بعد شوية.'
}
