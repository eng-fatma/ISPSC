import { Routes, Route, Navigate } from 'react-router-dom'

// نسخة المزارع المستقلة — بدون تسجيل دخول ولا باك اند. كل البيانات تجريبية (Mock).
import AppShell from './components/AppShell'
import RequireAuth from './components/RequireAuth'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import MapPage from './pages/MapPage'
import LibraryPage from './pages/LibraryPage'
import PointsPage from './pages/PointsPage'
import SatellitePage from './pages/SatellitePage'
import PriceForecastPage from './pages/PriceForecastPage'
import NotificationsPage from './pages/NotificationsPage'
import MyFarmPage from './pages/MyFarmPage'
import DevicePage from './pages/DevicePage'
import ChatbotPage from './pages/ChatbotPage'
import DeviceLinkStubPage from './pages/DeviceLinkStubPage'
import SeasonsPage from './pages/SeasonsPage'
import WealthPage from './pages/WealthPage'
import AnalysisPage from './pages/AnalysisPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/predict" element={<PriceForecastPage />} />
        <Route path="/points" element={<PointsPage />} />
        <Route path="/satellite" element={<SatellitePage />} />
        <Route path="/alerts" element={<NotificationsPage />} />
        <Route path="/my-farm" element={<MyFarmPage />} />
        <Route path="/device" element={<DevicePage />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/settings/link-device" element={<DeviceLinkStubPage />} />
        <Route path="/seasons" element={<SeasonsPage />} />
        <Route path="/wealth" element={<WealthPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
      </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
export default App
