// src/components/LocationPickerMap.jsx
// اختيار موقع حقيقي على خريطة حقيقية — دبوس قابل للسحب + الدوس في أي مكان يحرّكه
// مفيش أي API Key مدفوع هنا: الخريطة نفسها OpenStreetMap (مجاني تمامًا زي باقي الموقع)
// وتحديد "موقعي الحالي" بيستخدم GPS/الموقع الحقيقي بتاع جهاز المستخدم عن طريق متصفحه (مجاني برضه، من غير أي خدمة خارجية مدفوعة)
import { useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, LayersControl, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Check, X, LocateFixed } from 'lucide-react'
import './LocationPickerMap.css'

const { BaseLayer } = LayersControl

const EGYPT_CENTER = [26.8, 30.8]

const PIN_ICON = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

// كومبوننت داخلي بيسجل ضغطات المستخدم على الخريطة وينقل الدبوس لمكان الضغطة
function ClickToMove({ onMove }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function LocationPickerMap({
  initialLat,
  initialLng,
  onConfirm,
  onCancel,
  title = 'حدد موقع الأرض على الخريطة',
  hint = 'دوس في أي مكان على الخريطة عشان تحرّك الدبوس، أو اسحب الدبوس نفسه لغاية ما يظبط بالظبط على شكل أرضك.',
}) {
  const hasInitial = typeof initialLat === 'number' && typeof initialLng === 'number'
  const [position, setPosition] = useState(
    hasInitial ? { lat: initialLat, lng: initialLng } : { lat: EGYPT_CENTER[0], lng: EGYPT_CENTER[1] }
  )
  const [locating, setLocating] = useState(false)
  const markerRef = useRef(null)
  const mapRef = useRef(null)

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current
      if (marker) {
        const latlng = marker.getLatLng()
        setPosition({ lat: latlng.lat, lng: latlng.lng })
      }
    },
  }

  const handleClickMove = useCallback((lat, lng) => {
    setPosition({ lat, lng })
  }, [])

  function useMyRealLocation() {
    if (!navigator.geolocation) {
      alert('المتصفح ده مش بيدعم تحديد الموقع الحقيقي (GPS)')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setPosition({ lat: latitude, lng: longitude })
        mapRef.current?.flyTo([latitude, longitude], 16)
        setLocating(false)
      },
      () => {
        alert('مقدرناش نحدد موقعك — تأكد إنك موافق على إذن الموقع في المتصفح')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="location-picker-overlay">
      <div className="location-picker-box">
        <div className="location-picker-header">
          <h3>{title}</h3>
          <button className="location-picker-close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <p className="location-picker-hint">
          {hint}
        </p>

        <div className="location-picker-map-wrap">
          <MapContainer
            center={[position.lat, position.lng]}
            zoom={hasInitial ? 15 : 6}
            className="location-picker-map"
            ref={mapRef}
          >
            <LayersControl position="topright">
              <BaseLayer checked name="قمر صناعي">
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Tiles &copy; Esri — Esri, Maxar, Earthstar Geographics"
                  maxZoom={19}
                />
              </BaseLayer>
              <BaseLayer name="خريطة الشوارع">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
              </BaseLayer>
            </LayersControl>
            <ClickToMove onMove={handleClickMove} />
            <Marker
              position={[position.lat, position.lng]}
              draggable
              icon={PIN_ICON}
              eventHandlers={eventHandlers}
              ref={markerRef}
            />
          </MapContainer>

          <button className="location-picker-locate-btn" onClick={useMyRealLocation} disabled={locating}>
            <LocateFixed size={16} />
            {locating ? 'جاري تحديد موقعك...' : 'استخدم موقعي الحالي'}
          </button>
        </div>

        <div className="location-picker-coords">
          خط العرض: {position.lat.toFixed(6)} — خط الطول: {position.lng.toFixed(6)}
        </div>

        <div className="location-picker-actions">
          <button className="location-picker-btn location-picker-btn-ghost" onClick={onCancel}>
            إلغاء
          </button>
          <button
            className="location-picker-btn location-picker-btn-primary"
            onClick={() => onConfirm(position.lat, position.lng)}
          >
            <Check size={16} />
            تأكيد الموقع
          </button>
        </div>
      </div>
    </div>
  )
}

export default LocationPickerMap
