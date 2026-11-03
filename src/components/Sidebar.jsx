import { Link, useLocation } from 'react-router-dom'
import { useUserRole } from '../context/UserRoleContext'
import { SIDEBAR_GROUPS, ROUTE_MAP, ICONS } from '../data/sidebarGroups'
import './Sidebar.css'

function SidebarIcon({ name }) {
  return (
    <svg className="sidebar-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS[name] || '' }} />
  )
}

function Sidebar({ isOpen }) {
  const { userRole } = useUserRole()
  const location = useLocation()
  
  // تحديث المسارات لضمان وجود صفحة الإعدادات بشكل مستقل
  const updatedRouteMap = { ...ROUTE_MAP, settings: '/settings' }
  const groups = SIDEBAR_GROUPS[userRole] || []

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-scroll">
        {groups.map((group) => (
          <div className="sidebar-group" key={group.label}>
            <div className="sidebar-group-label">{group.label}</div>
            {group.items.map((item) => {
              const path = updatedRouteMap[item.id] || '#'
              // استخدام === لضمان عدم تداخل الإضاءة بين المسارات المتشابهة
              const isActive = location.pathname === path
              return (
                <Link
                  key={item.id}
                  to={path}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                >
                  <SidebarIcon name={item.id} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </div>
    </aside>
  )
}

export default Sidebar
