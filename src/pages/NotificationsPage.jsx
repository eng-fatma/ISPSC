import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications'
import {
  NOTIFICATION_GROUPS, NOTIFICATION_TYPE_META, NOTIF_ICONS,
} from '../data/notificationsData'
import './NotificationsPage.css'

const FALLBACK_META = { icon: 'system', group: 'system', important: false, actionLabel: 'فتح' }

function metaFor(type) {
  return NOTIFICATION_TYPE_META[type] || FALLBACK_META
}

function timeAgo(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days < 7) return `منذ ${days} يوم`
  return new Date(iso).toLocaleDateString('ar-EG')
}

function NotifIcon({ name, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: NOTIF_ICONS[name] || '' }}
    />
  )
}

function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, loading, unreadCount, markRead, markAllRead } = useNotifications()

  const [activeGroup, setActiveGroup] = useState('all')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setEntered(true), 50)
      return () => clearTimeout(t)
    }
  }, [loading])

  const filtered = useMemo(() => {
    let list = notifications
    if (activeGroup !== 'all') {
      list = list.filter((n) => metaFor(n.type).group === activeGroup)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (n) => n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q)
      )
    }
    return list
  }, [notifications, activeGroup, searchQuery])

  const newCount = unreadCount
  const importantCount = notifications.filter((n) => metaFor(n.type).important).length
  const actionCount = notifications.filter((n) => !n.is_read && metaFor(n.type).group !== 'system').length

  function openNotification(notif) {
    if (!notif.is_read) markRead(notif.id)
    if (notif.action_path) navigate(notif.action_path)
  }

    if (loading) {
    return (
      <div className="notif-page">
        <div className="notif-skeleton-hero" />
        <div className="notif-skeleton-stats">
          <div className="notif-skeleton-stat" />
          <div className="notif-skeleton-stat" />
          <div className="notif-skeleton-stat" />
          <div className="notif-skeleton-stat" />
        </div>
        <div className="notif-skeleton-layout">
          <div className="notif-skeleton-sidebar" />
          <div className="notif-skeleton-list">
            <div className="notif-skeleton-card" />
            <div className="notif-skeleton-card" />
            <div className="notif-skeleton-card" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`notif-page ${entered ? 'entered' : ''}`}>
      <div className="notif-hero">
        <div className="notif-hero-glow"></div>
        <div className="notif-hero-content">
          <h1>مركز التنبيهات الذكية</h1>
          <p>كل التحديثات المهمة الخاصة بزراعتك وخدماتك في مكان واحد</p>
        </div>
        <div className="notif-hero-actions">
          <div className={`notif-search-wrap ${searchOpen ? 'open' : ''}`}>
            <button className="notif-search-btn" onClick={() => setSearchOpen((v) => !v)}>
              <NotifIcon name="search" className="notif-action-icon" />
            </button>
            <input
              className="notif-search-input"
              placeholder="ابحث عن: تمويل، شركة، تحليل، رسالة، محصول..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="notif-mark-read-btn" onClick={markAllRead}>تحديد الكل كمقروء</button>
        </div>
      </div>

      <div className="notif-stats-grid">
        <div className="notif-stat-card" style={{ transitionDelay: '0.05s' }}>
          <div className="notif-stat-value">{newCount}</div>
          <div className="notif-stat-label">إشعار جديد</div>
        </div>
        <div className="notif-stat-card" style={{ transitionDelay: '0.12s' }}>
          <div className="notif-stat-value">{actionCount}</div>
          <div className="notif-stat-label">طلبات تحتاج إجراء</div>
        </div>
        <div className="notif-stat-card" style={{ transitionDelay: '0.26s' }}>
          <div className="notif-stat-value">{importantCount}</div>
          <div className="notif-stat-label">تنبيهات مهمة</div>
        </div>
      </div>

      <div className="notif-layout">
        <div className="notif-sidebar">
          {NOTIFICATION_GROUPS.map((g) => (
            <button
              key={g.id}
              className={`notif-cat-item ${activeGroup === g.id ? 'active' : ''}`}
              onClick={() => setActiveGroup(g.id)}
            >
              <NotifIcon name={g.icon} className="notif-cat-icon" />
              <span>{g.label}</span>
            </button>
          ))}
        </div>

        <div className="notif-list">
          {filtered.length === 0 && (
            <div className="notif-empty">
              <div className="notif-empty-icon">
                <svg viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M30 50V25M30 25c0-12-9-18-18-18 0 12 6 18 18 18zM30 25c0-12 9-18 18-18 0 12-6 18-18 18z" />
                </svg>
              </div>
              <p>كل شيء مستقر حالياً</p>
              <button onClick={() => navigate('/dashboard')}>العودة للوحة التحكم</button>
            </div>
          )}

          {filtered.map((notif, i) => {
            const meta = metaFor(notif.type)
            return (
              <div
                key={notif.id}
                className={`notif-card ${meta.important ? 'critical' : 'normal'} ${notif.is_read ? 'read' : 'unread'}`}
                style={{ transitionDelay: `${i * 0.06}s` }}
                onClick={() => openNotification(notif)}
              >
                <div className="notif-card-icon-wrap">
                  <NotifIcon name={meta.icon} className="notif-card-icon" />
                </div>
                <div className="notif-card-body">
                  <div className="notif-card-top">
                    <span className="notif-card-title">{notif.title}</span>
                    {!notif.is_read && <span className="notif-badge-new">جديد</span>}
                    {meta.important && <span className="notif-badge-important">مهم</span>}
                  </div>
                  {notif.body && <p className="notif-card-desc">{notif.body}</p>}
                  <div className="notif-card-bottom">
                    <span className="notif-card-time">{timeAgo(notif.created_at)}</span>
                    {notif.action_path && (
                      <button className="notif-card-action" onClick={(e) => { e.stopPropagation(); openNotification(notif) }}>
                        {meta.actionLabel} ←
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

export default NotificationsPage
