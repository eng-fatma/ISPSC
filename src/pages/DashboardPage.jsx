import { useUserRole } from '../context/UserRoleContext'
import FarmerDashboardLive from './FarmerDashboardLive'

function DashboardPage() {
  const { userRole } = useUserRole()

  if (userRole === 'farmer') {
    return <FarmerDashboardLive />
  }

  return (
    <div>
      <h1>لوحة التحكم</h1>
      <p>مرحباً بك، دورك الحالي: {userRole}</p>
    </div>
  )
}

export default DashboardPage