// src/components/DeviceLinkSection.jsx
// محتوى قسم "ربط بجهاز التحليل" في صفحة الإعدادات: حالتين (مفيش جهاز / فيه جهاز مربوط).
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FARMS } from '../data/farmsData'
import {
  useLinkedDevice, updateLinkedDevice, clearLinkedDevice, makeDemoReading,
} from '../lib/linkedDevice'
import './DeviceLinkSection.css'

const SYNC_MS = 1200 // مدة المزامنة الشكلية — TODO: Backend Integration: المزامنة الفعلية مع الجهاز
const LOW_BATTERY = 20

// "منذ 5 دقائق" بالعربي
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'الآن'
  const fmt = (n) => n.toLocaleString('ar-EG')
  if (minutes < 60) return `منذ ${fmt(minutes)} دقيقة`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `منذ ${fmt(hours)} ساعة`
  return `منذ ${fmt(Math.floor(hours / 24))} يوم`
}

const fmtNum = (n, digits = 0) => n.toLocaleString('ar-EG', { maximumFractionDigits: digits })

function DeviceLinkSection() {
  const navigate = useNavigate()
  const device = useLinkedDevice()

  const [syncing, setSyncing] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const syncTimer = useRef(null)
  useEffect(() => () => clearTimeout(syncTimer.current), [])

  /* ===== مفيش جهاز مربوط ===== */
  if (!device) {
    return (
      <div className="dls-empty">
        <p className="section-note">اربط جهاز ISPSC Pro عشان نتائج تحليل التربة توصل لحسابك تلقائيًا.</p>
        <button type="button" className="btn-premium secondary" onClick={() => navigate('/device')}>ربط جهاز</button>
      </div>
    )
  }

  /* ===== فيه جهاز مربوط ===== */
  const lowBattery = device.battery <= LOW_BATTERY

  function sync() {
    if (syncing || !device.online) return
    setSyncing(true)
    // TODO: Backend Integration — هنا بيتم طلب آخر قراءة من الجهاز عن طريق السيرفر
    syncTimer.current = setTimeout(() => {
      updateLinkedDevice({ lastSyncAt: new Date().toISOString(), reading: makeDemoReading() })
      setSyncing(false)
    }, SYNC_MS)
  }

  function startRename() { setNameDraft(device.name); setRenaming(true) }
  function saveRename(e) {
    e?.preventDefault()
    const name = nameDraft.trim()
    if (name) updateLinkedDevice({ name }) // TODO: Backend Integration: حفظ الاسم على السيرفر
    setRenaming(false)
  }

  function unlink() {
    // TODO: Backend Integration — فك الربط من الحساب (حذف device_id ↔ user_id)
    clearLinkedDevice()
    setConfirmUnlink(false)
  }

  return (
    <div className="dls-card">
      <div className="dls-head">
        <div className="dls-title">
          {renaming ? (
            <form className="dls-rename" onSubmit={saveRename}>
              <input
                type="text"
                value={nameDraft}
                maxLength={30}
                autoFocus
                aria-label="اسم الجهاز"
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setRenaming(false) }}
              />
              <button type="submit" className="dls-mini primary">حفظ</button>
              <button type="button" className="dls-mini" onClick={() => setRenaming(false)}>إلغاء</button>
            </form>
          ) : (
            <>
              <strong>{device.name}</strong>
              <small dir="ltr">{device.id}</small>
            </>
          )}
        </div>
        <span className={`dls-pill ${device.online ? 'online' : 'offline'}`}>
          <i /> {device.online ? 'متصل' : 'غير متصل'}
        </span>
      </div>

      <div className="dls-rows">
        <div>
          <span>البطارية</span>
          <strong className={lowBattery ? 'warn' : ''}>{fmtNum(device.battery)}٪{lowBattery ? ' — اشحنه قريبًا' : ''}</strong>
        </div>
        <div><span>آخر مزامنة</span><strong>{timeAgo(device.lastSyncAt)}</strong></div>
        <div>
          <span>الأرض المرتبطة</span>
          <select
            value={device.farmId ?? ''}
            aria-label="الأرض المرتبطة بالجهاز"
            onChange={(e) => updateLinkedDevice({ farmId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">غير محددة</option>
            {FARMS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {device.reading && (
        <>
          <div className="dls-sub">آخر قراءة للتربة <small>({timeAgo(device.reading.at)} · قراءة تجريبية)</small></div>
          <div className="dls-reading">
            <div><strong>{fmtNum(device.reading.moisture)}٪</strong><span>الرطوبة</span></div>
            <div><strong>{fmtNum(device.reading.temperature, 1)}°م</strong><span>الحرارة</span></div>
            <div><strong>{fmtNum(device.reading.salinity, 1)}</strong><span>الملوحة dS/m</span></div>
          </div>
        </>
      )}

      <div className="setting-item-row dls-auto">
        <span>مزامنة تلقائية</span>
        <label className="toggle-switch">
          <input type="checkbox" checked={device.autoSync} onChange={() => updateLinkedDevice({ autoSync: !device.autoSync })} />
          <span className="toggle-slider" />
        </label>
      </div>

      {confirmUnlink ? (
        <div className="dls-confirm" role="alert">
          <p>متأكد إنك عايز تفصل الجهاز؟ النتائج القديمة هتفضل محفوظة، بس الجهاز مش هيبعت نتائج جديدة لحسابك.</p>
          <div className="dls-actions">
            <button type="button" className="btn-danger" onClick={unlink}>تأكيد الفصل</button>
            <button type="button" className="btn-premium secondary" onClick={() => setConfirmUnlink(false)}>إلغاء</button>
          </div>
        </div>
      ) : (
        <div className="dls-actions">
          <button type="button" className="btn-premium secondary" onClick={sync} disabled={syncing || !device.online}>
            {syncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
          </button>
          <button type="button" className="btn-premium secondary" onClick={startRename} disabled={renaming}>إعادة تسمية</button>
          <button type="button" className="btn-premium secondary" onClick={() => navigate('/device')}>صفحة الجهاز</button>
          <button type="button" className="dls-unlink" onClick={() => setConfirmUnlink(true)}>فصل الجهاز</button>
        </div>
      )}
    </div>
  )
}

export default DeviceLinkSection