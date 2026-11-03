import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import './LibraryPage.css'

const IconLeaf = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M8 32c0-14 8-22 22-22 0 14-8 22-22 22z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M8 32c4-8 10-14 18-18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
)

function LibraryPage() {
  const [crops, setCrops] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('الكل')
  const [seasonFilter, setSeasonFilter] = useState('الكل')
  const [selectedCrop, setSelectedCrop] = useState(null)

    useEffect(() => {
    async function fetchCrops() {
      const { data, error } = await supabase.from('crops').select('*').order('name_ar', { ascending: true })
      if (!error) setCrops(data || [])
      setLoading(false)
    }
    fetchCrops()
  }, [])

  useEffect(() => {
    if (!selectedCrop) return
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [selectedCrop])

  const categories = useMemo(() => ['الكل', ...new Set(crops.map((c) => c.category).filter(Boolean))], [crops])
  const seasons = useMemo(() => ['الكل', ...new Set(crops.map((c) => c.season_primary).filter(Boolean))], [crops])

  const filtered = crops.filter((c) => {
    const matchesSearch = !search ||
      c.name_ar?.includes(search) ||
      c.name_en?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'الكل' || c.category === categoryFilter
    const matchesSeason = seasonFilter === 'الكل' || c.season_primary === seasonFilter
    return matchesSearch && matchesCategory && matchesSeason
  })

  return (
    <div className="library-page">
      <div className="library-header">
        <div className="library-breadcrumb">الرئيسية / مكتبة المحاصيل</div>
        <h1>مكتبة المحاصيل</h1>
        <p>معلومات تفصيلية دقيقة عن {crops.length || 99} محصول مناسب للزراعة في مصر</p>
      </div>

      <div className="library-controls">
        <input
          className="library-search"
          placeholder="ابحث بالاسم العربي أو الإنجليزي..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="library-filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="library-filter-select" value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}>
          {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="library-grid">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="library-card skeleton-card"></div>)}
        </div>
      ) : (
        <>
          <p className="library-results-count">{filtered.length} محصول</p>
          <div className="library-grid">
            {filtered.map((crop) => (
              <div className="library-card" key={crop.id} onClick={() => setSelectedCrop(crop)}>
                <div className="library-card-image">
                  {crop.image_url ? <img src={crop.image_url} alt={crop.name_ar} loading="lazy" /> : <IconLeaf />}
                  {crop.category && <span className="library-card-badge">{crop.category}</span>}
                </div>
                <div className="library-card-body">
                  <div className="library-card-name">{crop.name_ar}</div>
                  <div className="library-card-name-en">{crop.name_en}</div>
                  <div className="library-card-meta">
                    <span>{crop.season_primary || '—'}</span>
                    {crop.price_avg_egp_ton && <span>{Number(crop.price_avg_egp_ton).toLocaleString('ar-EG')} ج/طن</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && <p className="library-no-results">مفيش محاصيل مطابقة للبحث ده</p>}
        </>
      )}

      {selectedCrop && (
        <div className="library-modal-overlay" onClick={() => setSelectedCrop(null)}>
          <div className="library-modal" onClick={(e) => e.stopPropagation()}>
            <button className="library-modal-close" onClick={() => setSelectedCrop(null)}>✕</button>

            <div className="library-modal-hero">
              {selectedCrop.image_url ? <img src={selectedCrop.image_url} alt={selectedCrop.name_ar} /> : <IconLeaf />}
            </div>

            <h2>{selectedCrop.name_ar}</h2>
            <p className="library-modal-subtitle">{selectedCrop.name_en} {selectedCrop.category ? `· ${selectedCrop.category}` : ''}</p>

            <div className="library-modal-grid">
              <InfoBlock label="الموسم" value={selectedCrop.season_primary} />
              <InfoBlock label="درجة الحرارة المثالية" value={selectedCrop.temp_min_ideal != null ? `${selectedCrop.temp_min_ideal}° - ${selectedCrop.temp_max_ideal}°` : null} />
              <InfoBlock label="أفضل نوع تربة" value={selectedCrop.soil_best} />
              <InfoBlock label="مدى الحموضة (pH)" value={selectedCrop.ph_min != null ? `${selectedCrop.ph_min} - ${selectedCrop.ph_max}` : null} />
              <InfoBlock label="احتياج المياه (م³/فدان)" value={selectedCrop.water_need_min != null ? `${selectedCrop.water_need_min} - ${selectedCrop.water_need_max}` : null} />
              <InfoBlock label="طريقة الري" value={selectedCrop.irrigation_method} />
              <InfoBlock label="أشهر الزراعة" value={selectedCrop.planting_months} />
              <InfoBlock label="أشهر الحصاد" value={selectedCrop.harvest_months} />
              <InfoBlock label="الإنتاجية المتوسطة" value={selectedCrop.yield_avg_ton_feddan != null ? `${selectedCrop.yield_avg_ton_feddan} طن/فدان` : null} />
              <InfoBlock label="السعر المتوسط" value={selectedCrop.price_avg_egp_ton != null ? `${Number(selectedCrop.price_avg_egp_ton).toLocaleString('ar-EG')} ج/طن` : null} />
              <InfoBlock label="صافي الربح المتوقع" value={selectedCrop.net_profit_egp_feddan != null ? `${Number(selectedCrop.net_profit_egp_feddan).toLocaleString('ar-EG')} ج/فدان` : null} />
              <InfoBlock label="قابل للتصدير" value={selectedCrop.is_exportable ? 'نعم' : 'لا'} />
            </div>

            {selectedCrop.common_diseases && (
              <div className="library-modal-section">
                <h3>الأمراض الشائعة</h3>
                <p>{selectedCrop.common_diseases}</p>
              </div>
            )}
            {selectedCrop.success_tips && (
              <div className="library-modal-section">
                <h3>نصائح النجاح</h3>
                <p>{selectedCrop.success_tips}</p>
              </div>
            )}
            {selectedCrop.general_warnings && (
              <div className="library-modal-section warning">
                <h3>تحذيرات عامة</h3>
                <p>{selectedCrop.general_warnings}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoBlock({ label, value }) {
  if (!value) return null
  return (
    <div className="info-block">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  )
}

export default LibraryPage