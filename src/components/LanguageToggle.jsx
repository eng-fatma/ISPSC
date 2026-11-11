import { useLanguage } from '../context/LanguageContext'

// زرار تبديل اللغة (عربي ⇄ English) — بنستخدمه في الصفحات اللي ملهاش Navbar زي صفحة الدخول
export default function LanguageToggle({ className = '' }) {
  const { lang, toggleLang, t } = useLanguage()
  return (
    <button
      type="button"
      className={`lang-toggle ${className}`.trim()}
      onClick={toggleLang}
      title={t('nav.switchLang')}
      aria-label={t('nav.switchLang')}
    >
      <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" />
        <path d="M2.5 10h15" />
        <path d="M10 2.5c2.2 2.3 3.3 4.8 3.3 7.5s-1.1 5.2-3.3 7.5c-2.2-2.3-3.3-4.8-3.3-7.5S7.8 4.8 10 2.5z" />
      </svg>
      <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
    </button>
  )
}
