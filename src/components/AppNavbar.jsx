import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useNotifications } from '../hooks/useNotifications'
import { useAuth } from '../context/authState'
import { useLanguage } from '../context/LanguageContext'
import logoSmall from '../assets/logo-small.png'
import './AppNavbar.css'

function BellIcon() { return (<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2a5 5 0 00-5 5v3.5L3 14h14l-2-3.5V7a5 5 0 00-5-5z" /><path d="M8 17a2 2 0 004 0" /></svg>) }
function StarIcon() { return (<svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" stroke="none"><path d="M10 1.5l2.47 5.5 6.03.53-4.56 4 1.36 5.93L10 14.6l-5.3 2.86 1.36-5.93-4.56-4 6.03-.53z" /></svg>) }
function SunIcon() { return (<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="3.5" /><path d="M10 2v2M10 16v2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M2 10h2M16 10h2M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4" /></svg>) }
function MoonIcon() { return (<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 11.5A7 7 0 018.5 3 7 7 0 1017 11.5z" /></svg>) }

function GlobeIcon() { return (<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7.5" /><path d="M2.5 10h15" /><path d="M10 2.5c2.2 2.3 3.3 4.8 3.3 7.5s-1.1 5.2-3.3 7.5c-2.2-2.3-3.3-4.8-3.3-7.5S7.8 4.8 10 2.5z" /></svg>) }

function LogoutIcon() { return (<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H4.5A1.5 1.5 0 003 4.5v11A1.5 1.5 0 004.5 17H8" /><path d="M13 6l4 4-4 4" /><path d="M17 10H8" /></svg>) }

function AppNavbar({ onToggleSidebar }) {
  const { unreadCount } = useNotifications()
  const { signOut } = useAuth()
  const { lang, toggleLang, t, td } = useLanguage()
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [theme, setTheme] = useState(() => localStorage.getItem('ispsc_theme') || 'light')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const fullName = user.user_metadata?.full_name || user.user_metadata?.fullName || user.email.split('@')[0]
        setDisplayName(fullName.split(' ')[0])

        const { data: profileData } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
        if (profileData?.avatar_url) setAvatarUrl(profileData.avatar_url)
      }
    }
    getUserData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.fullName || session.user.email.split('@')[0]
        setDisplayName(fullName.split(' ')[0])
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('ispsc_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <nav className="app-nav">
      <button className="app-nav-burger" onClick={onToggleSidebar}>☰</button>
      <div className="app-nav-logo">
        <img src={logoSmall} alt="ISPSC" className="app-nav-logo-img" />
        <div className="app-nav-logo-txt">IS<span>PSC</span></div>
      </div>
      <div className="app-nav-spacer"></div>

      <button
        type="button"
        className="app-nav-lang"
        onClick={toggleLang}
        title={t('nav.switchLang')}
        aria-label={t('nav.switchLang')}
      >
        <GlobeIcon />
        <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
      </button>

      <button className="app-nav-bell" onClick={() => navigate('/alerts')} title={t('nav.alerts')}>
        <BellIcon />
        {unreadCount > 0 && (
          <span className="app-nav-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      <div className="app-nav-account" ref={menuRef}>
        <button className="app-nav-user" onClick={() => setMenuOpen((v) => !v)}>
          <div className="app-nav-av">
            {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : (displayName ? displayName.charAt(0).toUpperCase() : 'U')}
          </div>
          <div className="app-nav-role">{displayName ? td(displayName) : t('nav.user')}</div>
        </button>

        {menuOpen && (
          <div className="app-account-menu">
            <Link to="/points" className="app-account-menu-item" onClick={() => setMenuOpen(false)}><StarIcon /> {t('nav.stars')}</Link>
            <button className="app-account-menu-item" onClick={toggleTheme}>{theme === 'dark' ? <SunIcon /> : <MoonIcon />} {theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}</button>
            <div className="app-account-menu-divider" />
            <button className="app-account-menu-item app-account-menu-danger" onClick={() => { setMenuOpen(false); signOut() }}><LogoutIcon /> {t('nav.logout')}</button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default AppNavbar