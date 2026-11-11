import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { translations, dataTermsEn } from '../i18n/translations'

const STORAGE_KEY = 'ispsc_lang'
const SUPPORTED = ['ar', 'en']

const LanguageContext = createContext(null)

function readInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (SUPPORTED.includes(saved)) return saved
  } catch { /* localStorage مش متاح */ }
  return 'ar'
}

// يطبّق اللغة والاتجاه على <html> — ده اللي بيقلب الصفحة كلها من RTL إلى LTR
function applyToDocument(lang) {
  const root = document.documentElement
  root.setAttribute('lang', lang)
  root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(readInitialLang)

  useEffect(() => {
    applyToDocument(lang)
    try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* ignore */ }
  }, [lang])

  const toggleLang = useCallback(() => {
    setLang((current) => (current === 'ar' ? 'en' : 'ar'))
  }, [])

  // t('key', { n: 3 }) — بيرجع النص باللغة الحالية، ولو المفتاح ناقص بيرجع للعربي ثم للمفتاح نفسه
  const t = useCallback((key, vars) => {
    let text = translations[lang]?.[key] ?? translations.ar[key] ?? key
    if (vars) {
      Object.entries(vars).forEach(([name, value]) => {
        text = text.replaceAll(`{${name}}`, String(value))
      })
    }
    return text
  }, [lang])

  // td('أسيوط') — يترجم قيمة جاية من الداتا (محافظة/حالة/وحدة…) لو موجودة في القاموس، وإلا يرجّعها زي ما هي
  const td = useCallback((text) => {
    if (lang === 'ar' || text == null) return text
    const key = String(text).trim()
    return dataTermsEn[key] ?? text
  }, [lang])

  // rel(iso) — وقت نسبي ("منذ 5 دقائق" / "5 min ago") باللغة الحالية
  const rel = useCallback((iso) => {
    if (!iso) return ''
    const ts = new Date(iso).getTime()
    if (!Number.isFinite(ts)) return ''
    const minutes = Math.max(0, Math.floor((Date.now() - ts) / 60000))
    if (minutes < 1) return t('time.now')
    if (minutes < 60) return t('time.min', { n: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('time.hour', { n: hours })
    const days = Math.floor(hours / 24)
    if (days < 7) return t('time.day', { n: days })
    return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')
  }, [lang, t])

  const value = useMemo(() => ({
    lang,
    isRTL: lang === 'ar',
    locale: lang === 'ar' ? 'ar-EG' : 'en-US',
    setLang,
    toggleLang,
    t,
    td,
    rel,
  }), [lang, toggleLang, t, td, rel])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}
