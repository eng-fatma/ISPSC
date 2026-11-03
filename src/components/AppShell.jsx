import { useState, useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import PageTransition from './PageTransition'

import AppNavbar from './AppNavbar'
import Sidebar from './Sidebar'
import { supabase } from '../lib/supabase'
import { trackPresence } from '../lib/presence'
import './AppShell.css'

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const scrollYRef = useRef(0)

  // متصل الآن + آخر ظهور — على مستوى الموقع كله، مش صفحة بعينها
  useEffect(() => {
    let heartbeatInterval

    async function startPresence() {
      const { data } = await supabase.auth.getUser()
      const uid = data?.user?.id
      if (!uid) return

      trackPresence(uid)
      supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', uid)

      heartbeatInterval = setInterval(() => {
        supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', uid)
      }, 25000)
    }

    startPresence()

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval)
    }
  }, [])

  useEffect(() => {
    if (sidebarOpen) {
      scrollYRef.current = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollYRef.current}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollYRef.current)
    }
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className="app-shell">
      <AppNavbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="app-body">
        <Sidebar isOpen={sidebarOpen} />
        {sidebarOpen && (
          <div className="app-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}
        <main className="app-main">
                    <PageTransition><Outlet /></PageTransition>

        </main>
      </div>
    </div>
  )
}

export default AppShell