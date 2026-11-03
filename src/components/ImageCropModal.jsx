import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { getCroppedImageBlob } from '../utils/cropImage'
import './ImageCropModal.css'

// aspect: 1 للصورة الشخصية (مربع) — 3.2 لصورة الغلاف (16:5 تقريباً)
function ImageCropModal({ imageSrc, aspect, outputWidth, outputHeight, onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixelsValue) => {
    setCroppedAreaPixels(croppedAreaPixelsValue)
  }, [])

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    setSaving(true)
    const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, outputWidth, outputHeight)
    setSaving(false)
    onConfirm(blob)
  }

  return (
    <div className="crop-modal-overlay">
      <div className="crop-modal-box">
        <h3>حدد جزء الصورة</h3>
        <div className="crop-area-wrapper">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={aspect === 1 ? 'round' : 'rect'}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="crop-zoom-row">
          <span>تكبير</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </div>
        <div className="crop-actions-row">
          <button type="button" className="crop-cancel-btn" onClick={onCancel} disabled={saving}>إلغاء</button>
          <button type="button" className="crop-confirm-btn" onClick={handleConfirm} disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'تأكيد واستخدام الصورة'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImageCropModal