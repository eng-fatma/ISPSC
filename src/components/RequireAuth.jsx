// src/components/RequireAuth.jsx
// حارس الموقع: أي صفحة جواه ما تفتحش غير لو المستخدم مسجّل دخول، وإلا بيروح لصفحة /login.
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/authState'

export default function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="page-loading" role="status" aria-live="polite">
        <div>جاري التحقق من حسابك…</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}
