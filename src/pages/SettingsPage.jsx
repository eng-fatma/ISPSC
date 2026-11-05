import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ImageCropModal from '../components/ImageCropModal'
import AccordionItem from '../components/AccordionItem'
import DeviceLinkSection from '../components/DeviceLinkSection'
import { IconBell, IconDevice } from '../components/SettingsIcons'
import './SettingsPage.css'

const IconPencil = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M10.5 2l2.5 2.5-8 8-3 .5.5-3 8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
)

const NOTIF_TYPES = [
  { key: 'smart_farming', label: 'إشعارات الزراعة الذكية' },
  { key: 'system', label: 'إشعارات النظام' },
]

function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [message, setMessage] = useState(null)

  const [profile, setProfile] = useState({
    full_name: '', phone: '', bio: '', governorate: '', center: '',
    avatar_url: '', cover_url: '',
    notification_settings: { muted: false, smart_farming: true, system: true }
  })
  const [editField, setEditField] = useState(null)
  const [tempValue, setTempValue] = useState('')

  const [cropTarget, setCropTarget] = useState(null)
  const [cropImageSrc, setCropImageSrc] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        setUserEmail(user.email)
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile({
          full_name: user.user_metadata?.full_name || data?.full_name || '',
          phone: data?.phone || '',
          bio: data?.bio || '',
          governorate: data?.governorate || '',
          center: data?.center || '',
          avatar_url: data?.avatar_url || '',
          cover_url: data?.cover_url || '',
          notification_settings: data?.notification_settings || {
            muted: false, smart_farming: true, companies: true, system: true
          }
        })
      }
      setLoading(false)
    }
    init()
  }, [])

  async function persistProfile(patch) {
    const updated = { ...profile, ...patch }
    setProfile(updated)
    // update مش upsert: جدول profiles مفيهوش سياسة insert، والصف بيتعمل بالـ trigger وقت التسجيل
    const { data, error } = await supabase.from('profiles').update({
      full_name: updated.full_name,
      phone: updated.phone,
      bio: updated.bio,
      governorate: updated.governorate,
      center: updated.center,
      avatar_url: updated.avatar_url,
      cover_url: updated.cover_url,
      notification_settings: updated.notification_settings
    }).eq('id', userId).select('id')
    if (error || !data || data.length === 0) {
      setMessage({ type: 'error', text: 'فشل الحفظ: ' + (error?.message || 'مفيش بروفايل للحساب ده في قاعدة البيانات') })
      return false
    }
    return true
  }

  function startEdit(field, currentValue) { setEditField(field); setTempValue(currentValue || '') }

  async function saveFieldEdit() {
    const fieldMap = { name: 'full_name', phone: 'phone', governorate: 'governorate', center: 'center' }
    const dbField = fieldMap[editField]
    if (editField === 'name') await supabase.auth.updateUser({ data: { full_name: tempValue } })
    const saved = await persistProfile({ [dbField]: tempValue })
    setEditField(null)
    if (saved) setMessage({ type: 'success', text: 'تم الحفظ' })
  }

  function handleFileSelect(e, target) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setCropImageSrc(reader.result); setCropTarget(target) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleCropConfirm(blob) {
    if (!userId) return
    setUploadingImage(true)
    const bucket = cropTarget === 'avatar' ? 'avatars' : 'covers'
    const filePath = `${userId}/${cropTarget}.jpg`
    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' })
    if (uploadError) {
      setMessage({ type: 'error', text: 'فشل رفع الصورة: ' + uploadError.message })
      setUploadingImage(false); setCropTarget(null); return
    }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)
    const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`
    const fieldName = cropTarget === 'avatar' ? 'avatar_url' : 'cover_url'
    const saved = await persistProfile({ [fieldName]: freshUrl })
    setUploadingImage(false); setCropTarget(null)
    if (saved) setMessage({ type: 'success', text: 'تم تحديث الصورة بنجاح' })
  }

  async function toggleMuteAll() {
    const ns = { ...profile.notification_settings, muted: !profile.notification_settings.muted }
    await persistProfile({ notification_settings: ns })
  }
  async function toggleNotifType(key) {
    const ns = { ...profile.notification_settings, [key]: !profile.notification_settings[key] }
    await persistProfile({ notification_settings: ns })
  }
  if (loading) return <div className="settings-container"><p>جاري التحميل...</p></div>

  return (
    <div className="settings-container premium-settings accordion-page">
      <div className="settings-header">
        <h1>إعدادات الحساب</h1>
        <p>قم بتخصيص هويتك الرقمية على منصة ISPSC</p>
      </div>

      {message && <div className={`save-message ${message.type}`}>{message.text}</div>}

      <div className="identity-card">
        <div className="identity-cover" style={{ backgroundImage: profile.cover_url ? `url(${profile.cover_url})` : 'none' }}>
          {!profile.cover_url && <span className="no-cover-text">لا توجد صورة غلاف</span>}
          <label className="cover-edit-fab"><IconPencil />
            <input type="file" accept="image/*" hidden onChange={(e) => handleFileSelect(e, 'cover')} />
          </label>
        </div>
        <div className="identity-body">
          <div className="identity-avatar">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="avatar" /> : <span>{(profile.full_name || 'م').charAt(0)}</span>}
            <label className="avatar-edit-fab"><IconPencil />
              <input type="file" accept="image/*" hidden onChange={(e) => handleFileSelect(e, 'avatar')} />
            </label>
          </div>

          <div className="identity-fields">
            <EditableRow label="الاسم" value={profile.full_name} editing={editField === 'name'}
              onEdit={() => startEdit('name', profile.full_name)} tempValue={tempValue} setTempValue={setTempValue}
              onSave={saveFieldEdit} onCancel={() => setEditField(null)} />
            <EditableRow label="رقم الهاتف" value={profile.phone} editing={editField === 'phone'}
              onEdit={() => startEdit('phone', profile.phone)} tempValue={tempValue} setTempValue={setTempValue}
              onSave={saveFieldEdit} onCancel={() => setEditField(null)} />
            <EditableRow label="المحافظة" value={profile.governorate} editing={editField === 'governorate'}
              onEdit={() => startEdit('governorate', profile.governorate)} tempValue={tempValue} setTempValue={setTempValue}
              onSave={saveFieldEdit} onCancel={() => setEditField(null)} />
            <EditableRow label="المركز / القرية" value={profile.center} editing={editField === 'center'}
              onEdit={() => startEdit('center', profile.center)} tempValue={tempValue} setTempValue={setTempValue}
              onSave={saveFieldEdit} onCancel={() => setEditField(null)} />
              <div className="editable-row">
              <span className="editable-label">البريد الإلكتروني</span>
              <div className="editable-value-row">
                <span className="editable-value">{userEmail}</span>
              </div>
            </div>

            <div className="editable-row">
              <span className="editable-label">نبذة شخصية</span>
              <textarea className="bio-inline-input" rows="2" value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                onBlur={() => persistProfile({ bio: profile.bio })} placeholder="اكتب نبذة عنك..." />
            </div>
          </div>
        </div>
      </div>

      <div className="accordion-list">
        <AccordionItem icon={<IconDevice />} title="ربط بجهاز التحليل">
          <DeviceLinkSection />
        </AccordionItem>

        <AccordionItem icon={<IconBell />} title="الإشعارات">
          <div className="setting-item-row bordered-bottom">
            <strong>كتم جميع الإشعارات</strong>
            <label className="toggle-switch">
              <input type="checkbox" checked={profile.notification_settings.muted} onChange={toggleMuteAll} />
              <span className="toggle-slider"></span>
            </label>
          </div>
          {NOTIF_TYPES.map((n) => (
            <div className="setting-item-row" key={n.key}>
              <span>{n.label}</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={profile.notification_settings[n.key]} disabled={profile.notification_settings.muted}
                  onChange={() => toggleNotifType(n.key)} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          ))}
        </AccordionItem>
      </div>

      {cropTarget && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          aspect={cropTarget === 'avatar' ? 1 : 3.2}
          outputWidth={cropTarget === 'avatar' ? 400 : 1200}
          outputHeight={cropTarget === 'avatar' ? 400 : 375}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropTarget(null)}
        />
      )}
      {uploadingImage && <div className="upload-loading-overlay">جاري رفع الصورة...</div>}
    </div>
  )
}

function EditableRow({ label, value, editing, onEdit, tempValue, setTempValue, onSave, onCancel }) {
  return (
    <div className="editable-row">
      <span className="editable-label">{label}</span>
      {editing ? (
        <div className="editable-inline-edit">
          <input type="text" value={tempValue} onChange={(e) => setTempValue(e.target.value)} autoFocus />
          <button type="button" className="save-inline-btn" onClick={onSave}>حفظ التغييرات</button>
          <button type="button" className="cancel-inline-btn" onClick={onCancel}>إلغاء</button>
        </div>
      ) : (
        <div className="editable-value-row">
          <span className="editable-value">{value || 'غير محدد'}</span>
          <button type="button" className="icon-btn" onClick={onEdit}><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M10.5 2l2.5 2.5-8 8-3 .5.5-3 8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg></button>
        </div>
      )}
    </div>
  )
}

export default SettingsPage