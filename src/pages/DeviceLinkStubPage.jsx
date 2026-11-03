// src/pages/DeviceLinkStubPage.jsx
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconDevice } from '../components/SettingsIcons'
import './DeviceLinkStubPage.css'

function DeviceLinkStubPage() {
  const navigate = useNavigate()
  return (
    <div className="device-stub-page">
      <button className="device-stub-back" onClick={() => navigate(-1)}>
        <IconArrowLeft /> رجوع
      </button>
      <div className="device-stub-content">
        <div className="device-stub-icon"><IconDevice /></div>
        <h2>ربط جهاز التحليل</h2>
        <p>هذه الميزة قيد التطوير حالياً — هتقدر تربط جهاز ISPSC Pro لتحليل التربة بحسابك من هنا قريباً.</p>
      </div>
    </div>
  )
}

export default DeviceLinkStubPage