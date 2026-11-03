import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUserRole } from '../context/UserRoleContext';
import {
  Ruler, Puzzle, Sprout, Square,
  AlertTriangle, Calendar, MapPin, Clock,
  Plus, Pencil, CheckCircle2, X,
  Search, Wallet, Image as ImageIcon, FlaskConical,
  History, Upload, Layers
} from 'lucide-react';
import './MyFarmPage.css';
import LocationPickerMap from '../components/LocationPickerMap';

function getCurrentSeasonLabel() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 6) return 'صيفي';
  if (month >= 7 && month <= 10) return 'نيلي';
  return 'شتوي';
}

function normalizeArabicText(str) {
  return (str || '')
    .replace(/^ال/, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()
    .toLowerCase();
}

export default function MyFarmPage() {
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState([]);
  const [activeFarmId, setActiveFarmId] = useState(null);
  const [plots, setPlots] = useState([]);
  const [attentionPlotIds, setAttentionPlotIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [showEditFarm, setShowEditFarm] = useState(false);
  const [showAddPlot, setShowAddPlot] = useState(false);
  const [drawerPlot, setDrawerPlot] = useState(null);
  const [toast, setToast] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const activeFarm = farms.find(f => f.id === activeFarmId) || null;
  const { userRole } = useUserRole();

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const bumpRefresh = () => setRefreshTick(t => t + 1);

  const logHistoryEvent = async (farmId, plotId, eventType, title, description) => {
    await supabase.from('farm_history_events').insert({
      farm_id: farmId, plot_id: plotId || null, event_type: eventType, title, description,
    });
  };

  const loadFarms = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setError('يجب تسجيل الدخول');
      setLoading(false);
      return;
    }
    const { data, error: farmsError } = await supabase
      .from('farms')
      .select('*')
      .eq('owner_id', userData.user.id)
      .order('created_at', { ascending: true });

    if (farmsError) {
      setError('حدث خطأ أثناء تحميل بيانات الأرض');
      setLoading(false);
      return;
    }

    setFarms(data || []);
    if (data && data.length > 0) {
      setActiveFarmId(prev => prev || data[0].id);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadFarms(); }, [loadFarms]);

  const loadPlots = useCallback(async (farmId) => {
    if (!farmId) { setPlots([]); return; }
    const { data, error: plotsError } = await supabase
      .from('land_plots')
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: true });

    if (plotsError) { setError('حدث خطأ أثناء تحميل القطع الزراعية'); return; }
    setPlots(data || []);
  }, []);

  useEffect(() => {
    if (activeFarmId) loadPlots(activeFarmId);
  }, [activeFarmId, loadPlots, refreshTick]);

  // القطع اللي "تحتاج متابعة" تلقائياً — مبنية على مهام فات موعدها، مش تعديل يدوي على status
  useEffect(() => {
    (async () => {
      const plotIds = plots.map(p => p.id);
      if (plotIds.length === 0) { setAttentionPlotIds(new Set()); return; }
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('tasks').select('plot_id')
        .in('plot_id', plotIds).lt('scheduled_date', today).eq('status', 'قيد_الانتظار');
      setAttentionPlotIds(new Set((data || []).map(t => t.plot_id)));
    })();
  }, [plots, refreshTick]);

  const handleSwitchFarm = (farmId) => {
    if (farmId === activeFarmId) return;
    setTransitioning(true);
    setTimeout(() => { setActiveFarmId(farmId); setTransitioning(false); }, 220);
  };

  if (loading) {
    return <div className="myfarm-page"><MyFarmSkeleton /></div>;
  }

  if (error) {
    return (
      <div className="myfarm-page">
        <div className="myfarm-error-state">
          <AlertTriangle size={40} color="var(--mf-red)" />
          <p>{error}</p>
          <button className="myfarm-btn myfarm-btn-primary" onClick={loadFarms}>إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <div className="myfarm-page">
        <MyFarmEmptyState onFarmCreated={() => { loadFarms(); showToast('تم إنشاء الأرض بنجاح'); }} />
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="myfarm-page">
      <div className="myfarm-header">
        <div className="myfarm-header-top">
          <div className="myfarm-header-info">
            <h1>{activeFarm?.name || 'أرضي'}</h1>
            <div className="myfarm-header-meta">
              {activeFarm?.governorate && <span><MapPin size={14} /> {activeFarm.governorate}</span>}
              {activeFarm?.area_size && <span><Ruler size={14} /> {activeFarm.area_size} {activeFarm.area_unit}</span>}
              {activeFarm?.updated_at && (
                <span><Clock size={14} /> آخر تحديث: {new Date(activeFarm.updated_at).toLocaleDateString('ar-EG')}</span>
              )}
            </div>
          </div>
          <div className="myfarm-header-actions">
            <button className="myfarm-btn myfarm-btn-ghost" onClick={() => setShowEditFarm(true)}>
              <Pencil size={16} /> تعديل بيانات الأرض
            </button>
            <button
              className="myfarm-btn myfarm-btn-danger"
              onClick={async () => {
                if (!window.confirm(`متأكد إنك عايز تمسح "${activeFarm?.name}"؟ هيتمسح معاها كل القطع والمواسم والمصروفات المرتبطة بيها نهائياً، والعملية دي مش قابلة للتراجع.`)) return;
                const { error } = await supabase.from('farms').delete().eq('id', activeFarmId);
                if (error) { showToast('حدث خطأ أثناء حذف الأرض'); return; }
                showToast('تم حذف الأرض');
                setActiveFarmId(null);
                loadFarms();
              }}
            >
              <X size={16} /> حذف الأرض
            </button>
            <button className="myfarm-btn myfarm-btn-secondary" onClick={() => setShowAddPlot(true)}>
              <Plus size={16} /> إضافة قطعة
            </button>
            <button className="myfarm-btn myfarm-btn-primary" onClick={() => setShowAddFarm(true)}>
              <Plus size={16} /> إضافة أرض
            </button>
          </div>
        </div>

        {farms.length > 1 && (
          <div className="myfarm-tabs">
            {farms.map(farm => (
              <button key={farm.id} className={`myfarm-tab ${farm.id === activeFarmId ? 'myfarm-tab-active' : ''}`} onClick={() => handleSwitchFarm(farm.id)}>
                {farm.name}
              </button>
            ))}
            <button className="myfarm-tab myfarm-tab-add" onClick={() => setShowAddFarm(true)}><Plus size={16} /></button>
          </div>
        )}
      </div>

      <div className={`myfarm-content ${transitioning ? 'myfarm-content-transitioning' : ''}`}>
        {userRole === 'investor' ? (
          <InvestorFarmDetail farm={activeFarm} plots={plots} />
        ) : (
          <>
            <MyFarmSummary farm={activeFarm} plots={plots} attentionPlotIds={attentionPlotIds} />
            <MyFarmHealthStatus plots={plots} attentionPlotIds={attentionPlotIds} />
          </>
        )}

        <MyFarmPlotsSection
          plots={plots}
          attentionPlotIds={attentionPlotIds}
          onAddPlot={() => setShowAddPlot(true)}
          onOpenPlot={(plot) => setDrawerPlot(plot)}
        />

        <FarmHistorySection farmId={activeFarmId} refreshTick={refreshTick} />
      </div>

      {showAddFarm && (
        <FarmFormModal mode="add" onClose={() => setShowAddFarm(false)}
          onSaved={() => { setShowAddFarm(false); loadFarms(); showToast('تم إضافة الأرض بنجاح'); }} />
      )}

      {showEditFarm && activeFarm && (
        <FarmFormModal mode="edit" farm={activeFarm} onClose={() => setShowEditFarm(false)}
          onSaved={() => { setShowEditFarm(false); loadFarms(); showToast('تم تحديث بيانات الأرض'); }} />
      )}

      {showAddPlot && activeFarm && (
        <AddPlotModal farmId={activeFarm.id} defaultSoilType={activeFarm.soil_type} onClose={() => setShowAddPlot(false)}
          onSaved={async () => {
            setShowAddPlot(false);
            await loadPlots(activeFarm.id);
            await logHistoryEvent(activeFarm.id, null, 'قطعة_جديدة', 'إضافة قطعة زراعية جديدة', null);
            bumpRefresh();
            showToast('تم إضافة القطعة بنجاح');
          }} />
      )}

      {drawerPlot && (
        <PlotDrawer
          plot={drawerPlot}
          farmId={activeFarmId}
          onClose={() => setDrawerPlot(null)}
          onChanged={async () => { await loadPlots(activeFarmId); bumpRefresh(); }}
          showToast={showToast}
          logHistoryEvent={logHistoryEvent}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function Toast({ message, onClose }) {
  return (
    <div className="myfarm-toast">
      <CheckCircle2 size={18} />
      <span>{message}</span>
      <button onClick={onClose} className="myfarm-toast-close"><X size={14} /></button>
    </div>
  );
}

function MyFarmSkeleton() {
  return (
    <div className="myfarm-skeleton">
      <div className="myfarm-skeleton-header" />
      <div className="myfarm-skeleton-cards">
        {[1, 2, 3, 4].map(i => <div key={i} className="myfarm-skeleton-card" />)}
      </div>
    </div>
  );
}

function MyFarmEmptyState({ onFarmCreated }) {
  const [showModal, setShowModal] = useState(false);
  return (
    <div className="myfarm-empty-hero">
      <div className="myfarm-empty-icon-wrap"><Sprout size={48} color="var(--mf-green)" /></div>
      <h2>ابدأ رحلتك الزراعية</h2>
      <p>سجّل أرضك الأولى، وابدأ في متابعة قطعك ومواسمك ومصروفاتك من مكان واحد.</p>
      <button className="myfarm-btn myfarm-btn-primary myfarm-btn-large" onClick={() => setShowModal(true)}>
        <Plus size={18} /> إضافة أول أرض
      </button>
      {showModal && (
        <FarmFormModal mode="add" onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onFarmCreated(); }} />
      )}
    </div>
  );
}

function MyFarmSummary({ farm, plots, attentionPlotIds }) {
  const plantedCount = plots.filter(p => p.status === 'مزروعة').length;
  const emptyCount = plots.filter(p => p.status === 'فارغة' || !p.status).length;
  const needsAttentionCount = attentionPlotIds.size;
  const totalPlotsArea = plots.reduce((s, p) => s + Number(p.area_size || 0), 0);
  const unallocatedArea = Math.max(0, Number(farm?.area_size || 0) - totalPlotsArea);

  const cards = [
    { label: 'إجمالي المساحة', value: `${farm?.area_size ?? 0} ${farm?.area_unit ?? ''}`, Icon: Ruler },
    { label: 'عدد القطع', value: plots.length, Icon: Puzzle },
    { label: 'قطع مزروعة', value: plantedCount, Icon: Sprout },
    { label: 'قطع فارغة', value: emptyCount, Icon: Square },
    { label: 'مساحة غير مقسمة', value: `${unallocatedArea} ${farm?.area_unit ?? ''}`, Icon: Layers },
    { label: 'تحتاج متابعة', value: needsAttentionCount, Icon: AlertTriangle },
    { label: 'الموسم الحالي', value: farm?.current_crop || '—', Icon: Calendar },
  ];

  return (
    <div className="myfarm-summary-grid">
      {cards.map((card, i) => <CountCard key={i} {...card} />)}
    </div>
  );
}

function CountCard({ label, value, Icon }) {
  const [display, setDisplay] = useState(typeof value === 'number' ? 0 : value);
  useEffect(() => {
    if (typeof value !== 'number') { setDisplay(value); return; }
    let frame;
    const duration = 600;
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(value * progress));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div className="myfarm-count-card">
      <div className="myfarm-icon-chip">{Icon && <Icon size={20} />}</div>
      <div className="myfarm-count-value">{display}</div>
      <div className="myfarm-count-label">{label}</div>
    </div>
  );
}

function MyFarmHealthStatus({ plots, attentionPlotIds }) {
  const total = plots.length || 1;
  const stable = plots.length - attentionPlotIds.size;
  const healthPercent = plots.length === 0 ? 0 : Math.round((stable / total) * 100);

  let healthLabel = 'ممتاز';
  let healthClass = 'myfarm-health-good';
  if (plots.length === 0) { healthLabel = 'لا توجد قطع بعد'; healthClass = 'myfarm-health-warning'; }
  else if (healthPercent < 40) { healthLabel = 'يحتاج متابعة'; healthClass = 'myfarm-health-warning'; }
  else if (healthPercent < 75) { healthLabel = 'جيد'; healthClass = 'myfarm-health-ok'; }

  return (
    <div className="myfarm-health-card">
      <div className={`myfarm-health-ring ${healthClass}`}><span>{healthPercent}%</span></div>
      <div className="myfarm-health-info">
        <div className={`myfarm-health-label ${healthClass}`}>{healthLabel}</div>
        <p>{stable} قطعة مستقرة من إجمالي {plots.length} قطعة</p>
      </div>
    </div>
  );
}

function MyFarmPlotsSection({ plots, attentionPlotIds, onAddPlot, onOpenPlot }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('الكل');
  const [sortBy, setSortBy] = useState('name');

  const filtered = plots
    .filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    .filter(p => {
      if (filter === 'الكل') return true;
      if (filter === 'تحتاج_متابعة') return attentionPlotIds.has(p.id);
      return (p.status || 'فارغة') === filter;
    })
    .sort((a, b) => {
      if (sortBy === 'area') return (b.area_size || 0) - (a.area_size || 0);
      if (sortBy === 'updated') return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
      return (a.name || '').localeCompare(b.name || '');
    });

  return (
    <div className="myfarm-plots-preview">
      <div className="myfarm-plots-preview-header">
        <h3>القطع الزراعية</h3>
        <button className="myfarm-btn myfarm-btn-secondary" onClick={onAddPlot}><Plus size={16} /> إضافة قطعة</button>
      </div>

      {plots.length > 0 && (
        <div className="myfarm-plots-toolbar">
          <div className="myfarm-search-box">
            <Search size={16} />
            <input placeholder="ابحث باسم القطعة..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="myfarm-filter-chips">
            {['الكل', 'مزروعة', 'فارغة', 'تحتاج_متابعة'].map(f => (
              <button key={f} className={`myfarm-chip ${filter === f ? 'myfarm-chip-active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'تحتاج_متابعة' ? 'تحتاج متابعة' : f}
              </button>
            ))}
          </div>
          <select className="myfarm-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="name">ترتيب: الاسم</option>
            <option value="area">ترتيب: المساحة</option>
            <option value="updated">ترتيب: آخر تحديث</option>
          </select>
        </div>
      )}

      {plots.length === 0 ? (
        <div className="myfarm-plots-empty">
          <Square size={32} color="var(--mf-muted)" />
          <p>لسه معندكش أي قطعة مسجلة في الأرض دي.</p>
          <button className="myfarm-btn myfarm-btn-primary" onClick={onAddPlot}><Plus size={16} /> إضافة أول قطعة</button>
        </div>
      ) : (
        <div className="myfarm-plots-grid">
          {filtered.map(plot => (
            <div key={plot.id} className="myfarm-plot-card" onClick={() => onOpenPlot(plot)}>
              <div className="myfarm-plot-name">{plot.name}</div>
              <div className="myfarm-plot-meta">
                <span>{plot.area_size} {plot.area_unit}</span>
                <span>{plot.crop_name || 'بدون محصول حالياً'}</span>
              </div>
              <div className="myfarm-plot-badges">
                <span className={`myfarm-plot-status myfarm-plot-status-${plot.status || 'فارغة'}`}>
                  {plot.status || 'فارغة'}
                </span>
                {attentionPlotIds.has(plot.id) && (
                  <span className="myfarm-plot-attention-badge"><AlertTriangle size={12} /> تحتاج متابعة</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlotDrawer({ plot, farmId, onClose, onChanged, showToast, logHistoryEvent }) {
  const [tab, setTab] = useState('overview');
  const [season, setSeason] = useState(null);
  const [crop, setCrop] = useState(null);
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [loadingSeason, setLoadingSeason] = useState(true);

  const loadSeason = useCallback(async () => {
    setLoadingSeason(true);
    const { data } = await supabase
      .from('farm_seasons')
      .select('*')
      .eq('plot_id', plot.id)
      .is('end_date', null)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    setSeason(data || null);
    if (data?.crop_id) {
      const { data: cropData } = await supabase.from('crops').select('*').eq('id', data.crop_id).maybeSingle();
      setCrop(cropData || null);
    }
    setLoadingSeason(false);
  }, [plot.id]);

  useEffect(() => { loadSeason(); }, [loadSeason]);

  const handleDeletePlot = async () => {
    if (!window.confirm(`متأكد إنك عايز تمسح قطعة "${plot.name}"؟ هيتمسح معاها الموسم الحالي، سجل العمليات، المصروفات، الصور، وتحاليل التربة الخاصة بيها نهائياً.`)) return;
    const { error } = await supabase.from('land_plots').delete().eq('id', plot.id);
    if (error) { showToast('حدث خطأ أثناء حذف القطعة'); return; }
    showToast('تم حذف القطعة');
    onClose();
    onChanged();
  };

  const handleCancelSeason = async () => {
    if (!season) return;
    if (!window.confirm(`متأكد إنك عايز تلغي موسم "${season.crop_name}"؟ هيتمسح نهائياً وكأنه ما حصلش، وهتقدر تبدأ موسم جديد بمحصول مختلف فوراً.`)) return;
    await supabase.from('farm_seasons').delete().eq('id', season.id);
    await supabase.from('land_plots').update({
      crop_name: null, plant_date: null, status: 'فارغة', updated_at: new Date().toISOString(),
    }).eq('id', plot.id);
    showToast('تم إلغاء الموسم');
    await loadSeason();
    onChanged();
  };

  return (
    <div className="myfarm-drawer-overlay" onClick={onClose}>
      <div className="myfarm-drawer" onClick={e => e.stopPropagation()}>
        <div className="myfarm-drawer-header">
          <div>
            <h2>{plot.name}</h2>
            <span className={`myfarm-plot-status myfarm-plot-status-${plot.status || 'فارغة'}`}>{plot.status || 'فارغة'}</span>
          </div>
          <div className="myfarm-drawer-header-actions">
            <button className="myfarm-modal-close myfarm-modal-close-danger" onClick={handleDeletePlot} title="حذف القطعة"><X size={18} /></button>
            <button className="myfarm-modal-close" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="myfarm-drawer-tabs">
          {[
            { key: 'overview', label: 'نظرة عامة', Icon: Sprout },
            { key: 'operations', label: 'سجل العمليات', Icon: History },
            { key: 'expenses', label: 'المصروفات', Icon: Wallet },
            { key: 'photos', label: 'الصور', Icon: ImageIcon },
            { key: 'soil', label: 'تحليل التربة', Icon: FlaskConical },
          ].map(t => (
            <button key={t.key} className={`myfarm-drawer-tab ${tab === t.key ? 'myfarm-drawer-tab-active' : ''}`} onClick={() => setTab(t.key)}>
              <t.Icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        <div className="myfarm-drawer-body">
          {tab === 'overview' && (
            loadingSeason ? <div className="myfarm-drawer-loading">جاري التحميل...</div> :
            !season ? (
              <div className="myfarm-no-season-card">
                <Sprout size={32} color="var(--mf-green)" />
                <h4>القطعة دي لسه من غير موسم نشط</h4>
                <p>ابدأ موسم جديد عشان النظام يتابعلك المهام والري والتسميد تلقائياً.</p>
                <button className="myfarm-btn myfarm-btn-primary" onClick={() => setShowAddSeason(true)}>
                  <Plus size={16} /> بدء موسم جديد
                </button>
              </div>
            ) : (
              <SeasonProgressCard season={season} crop={crop} plotInfo={plot} onCancelSeason={handleCancelSeason} />
            )
          )}

          {tab === 'operations' && <PlotOperationsLog plotId={plot.id} />}
          {tab === 'expenses' && <PlotExpensesTab plotId={plot.id} farmId={farmId} seasonId={season?.id} showToast={showToast} />}
          {tab === 'photos' && <PlotPhotosTab plotId={plot.id} seasonId={season?.id} showToast={showToast} />}
          {tab === 'soil' && <PlotSoilTab plotId={plot.id} showToast={showToast} />}
        </div>
      </div>

      {showAddSeason && (
        <AddSeasonModal
          plotId={plot.id}
          farmId={farmId}
          onClose={() => setShowAddSeason(false)}
          onSaved={async () => {
            setShowAddSeason(false);
            await loadSeason();
            await onChanged();
            await logHistoryEvent(farmId, plot.id, 'موسم_جديد', `بدء موسم جديد في قطعة ${plot.name}`, null);
            showToast('تم بدء الموسم بنجاح، جاري إعداد خطة المتابعة تلقائياً');
          }}
        />
      )}
    </div>
  );
}

function SeasonProgressCard({ season, crop, plotInfo, onCancelSeason }) {
  const startDate = new Date(season.start_date);
  const today = new Date();
  const daysPassed = Math.max(0, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
  const totalDuration = crop?.total_growth_duration_days || 120;
  const progressPercent = Math.min(100, Math.round((daysPassed / totalDuration) * 100));
  const daysRemaining = Math.max(0, totalDuration - daysPassed);

  return (
    <div className="myfarm-season-card">
      <div className="myfarm-season-header">
        <div>
          <h4>{season.crop_name}</h4>
          <p>بدأ الموسم منذ {daysPassed} يوم</p>
        </div>
        <div className="myfarm-season-days-left">
          <strong>{daysRemaining}</strong>
          <span>يوم للحصاد</span>
        </div>
      </div>
      <div className="myfarm-progress-bar-track">
        <div className="myfarm-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="myfarm-season-progress-label">{progressPercent}% من الموسم</div>

      <div className="myfarm-season-meta-grid">
        <div><span>تاريخ الزراعة</span><strong>{startDate.toLocaleDateString('ar-EG')}</strong></div>
        <div><span>طريقة الزراعة</span><strong>{season.planting_method || '—'}</strong></div>
        <div><span>الهدف</span><strong>{season.purpose || '—'}</strong></div>
        <div><span>نظام الري</span><strong>{plotInfo.irrigation_type || '—'}</strong></div>
      </div>

      <button className="myfarm-cancel-season-btn" onClick={onCancelSeason}>
        <X size={14} /> إلغاء هذا الموسم (زرعت بالغلط)
      </button>
    </div>
  );
}

function PlotOperationsLog({ plotId }) {
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('agricultural_operations')
        .select('*')
        .eq('plot_id', plotId)
        .order('performed_at', { ascending: false });
      setOps(data || []);
      setLoading(false);
    })();
  }, [plotId]);

  if (loading) return <div className="myfarm-drawer-loading">جاري التحميل...</div>;
  if (ops.length === 0) return <div className="myfarm-drawer-empty">مفيش عمليات مسجلة على القطعة دي لحد دلوقتي.</div>;

  return (
    <div className="myfarm-ops-list">
      {ops.map(op => (
        <div key={op.id} className="myfarm-ops-item">
          <div className="myfarm-ops-dot" />
          <div>
            <div className="myfarm-ops-type">{op.operation_type}</div>
            <div className="myfarm-ops-date">{new Date(op.performed_at).toLocaleString('ar-EG')}</div>
            {op.notes && <div className="myfarm-ops-notes">{op.notes}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlotExpensesTab({ plotId, farmId, seasonId, showToast }) {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ category: 'بذور', amount: '', note: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('farm_expenses').select('*').eq('plot_id', plotId).order('created_at', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  }, [plotId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.amount) return;
    await supabase.from('farm_expenses').insert({
      farm_id: farmId, plot_id: plotId, season_id: seasonId || null,
      category: form.category, amount: parseFloat(form.amount), note: form.note,
    });
    setForm({ category: 'بذور', amount: '', note: '' });
    showToast('تم تسجيل المصروف');
    load();
  };

  const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  if (loading) return <div className="myfarm-drawer-loading">جاري التحميل...</div>;

  return (
    <div>
      <div className="myfarm-expenses-total">إجمالي مصروفات القطعة: <strong>{total.toLocaleString('ar-EG')} ج.م</strong></div>
      <form className="myfarm-inline-form" onSubmit={handleAdd}>
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
          <option>بذور</option><option>أسمدة</option><option>مبيدات</option><option>ري</option><option>عمالة</option><option>معدات</option><option>نقل</option><option>أخرى</option>
        </select>
        <input type="number" placeholder="المبلغ" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        <input placeholder="ملاحظة (اختياري)" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
        <button type="submit" className="myfarm-btn myfarm-btn-primary"><Plus size={14} /> إضافة</button>
      </form>
      <div className="myfarm-ops-list">
        {expenses.map(exp => (
          <div key={exp.id} className="myfarm-ops-item">
            <div className="myfarm-ops-dot myfarm-ops-dot-expense" />
            <div>
              <div className="myfarm-ops-type">{exp.category} — {Number(exp.amount).toLocaleString('ar-EG')} ج.م</div>
              <div className="myfarm-ops-date">{new Date(exp.created_at).toLocaleDateString('ar-EG')}</div>
              {exp.note && <div className="myfarm-ops-notes">{exp.note}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlotPhotosTab({ plotId, seasonId, showToast }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('plot_media').select('*').eq('plot_id', plotId).order('captured_at', { ascending: false });
    const withUrls = await Promise.all((data || []).map(async (item) => {
      const { data: signed } = await supabase.storage.from('plot-media').createSignedUrl(item.storage_path, 3600);
      return { ...item, url: signed?.signedUrl };
    }));
    setMedia(withUrls);
    setLoading(false);
  }, [plotId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const path = `${plotId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('plot-media').upload(path, file);
    if (uploadError) {
      showToast('حدث خطأ أثناء رفع الصورة');
      setUploading(false);
      return;
    }
    await supabase.from('plot_media').insert({ plot_id: plotId, season_id: seasonId || null, storage_path: path });
    setUploading(false);
    showToast('تم رفع الصورة بنجاح');
    load();
  };

  if (loading) return <div className="myfarm-drawer-loading">جاري التحميل...</div>;

  return (
    <div>
      <label className="myfarm-upload-btn">
        <Upload size={16} /> {uploading ? 'جاري الرفع...' : 'رفع صورة جديدة'}
        <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} hidden />
      </label>
      {media.length === 0 ? (
        <div className="myfarm-drawer-empty">مفيش صور مرفوعة لحد دلوقتي.</div>
      ) : (
        <div className="myfarm-photos-grid">
          {media.map(m => (
            <div key={m.id} className="myfarm-photo-item">
              {m.url && <img src={m.url} alt="" />}
              <span>{new Date(m.captured_at).toLocaleDateString('ar-EG')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlotSoilTab({ plotId, showToast }) {
  const [analyses, setAnalyses] = useState([]);
  const [form, setForm] = useState({ ph: '', ec: '', nitrogen: '', phosphorus: '', potassium: '', moisture_percent: '' });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('soil_analysis').select('*').eq('plot_id', plotId).order('analyzed_at', { ascending: false });
    setAnalyses(data || []);
    setLoading(false);
  }, [plotId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    await supabase.from('soil_analysis').insert({
      plot_id: plotId,
      ph: form.ph || null, ec: form.ec || null, nitrogen: form.nitrogen || null,
      phosphorus: form.phosphorus || null, potassium: form.potassium || null,
      moisture_percent: form.moisture_percent || null, source: 'يدوي',
    });
    setForm({ ph: '', ec: '', nitrogen: '', phosphorus: '', potassium: '', moisture_percent: '' });
    setShowForm(false);
    showToast('تم حفظ نتيجة التحليل');
    load();
  };

  if (loading) return <div className="myfarm-drawer-loading">جاري التحميل...</div>;

  return (
    <div>
      {!showForm ? (
        <button className="myfarm-btn myfarm-btn-secondary" onClick={() => setShowForm(true)}><Plus size={16} /> إضافة تحليل جديد</button>
      ) : (
        <form className="myfarm-soil-form" onSubmit={handleAdd}>
          <input type="number" step="0.1" placeholder="pH" value={form.ph} onChange={e => setForm({ ...form, ph: e.target.value })} />
          <input type="number" step="0.1" placeholder="EC" value={form.ec} onChange={e => setForm({ ...form, ec: e.target.value })} />
          <input type="number" step="0.1" placeholder="نيتروجين" value={form.nitrogen} onChange={e => setForm({ ...form, nitrogen: e.target.value })} />
          <input type="number" step="0.1" placeholder="فوسفور" value={form.phosphorus} onChange={e => setForm({ ...form, phosphorus: e.target.value })} />
          <input type="number" step="0.1" placeholder="بوتاسيوم" value={form.potassium} onChange={e => setForm({ ...form, potassium: e.target.value })} />
          <input type="number" step="0.1" placeholder="رطوبة %" value={form.moisture_percent} onChange={e => setForm({ ...form, moisture_percent: e.target.value })} />
          <button type="submit" className="myfarm-btn myfarm-btn-primary">حفظ</button>
        </form>
      )}

      {analyses.length === 0 ? (
        <div className="myfarm-drawer-empty">مفيش تحاليل مسجلة لحد دلوقتي.</div>
      ) : (
        <div className="myfarm-ops-list">
          {analyses.map(a => (
            <div key={a.id} className="myfarm-ops-item">
              <div className="myfarm-ops-dot" />
              <div>
                <div className="myfarm-ops-type">pH: {a.ph ?? '—'} | EC: {a.ec ?? '—'} | رطوبة: {a.moisture_percent ?? '—'}%</div>
                <div className="myfarm-ops-date">{new Date(a.analyzed_at).toLocaleDateString('ar-EG')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FarmHistorySection({ farmId, refreshTick }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    (async () => {
      if (!farmId) return;
      const { data } = await supabase.from('farm_history_events').select('*').eq('farm_id', farmId).order('event_date', { ascending: false }).limit(20);
      setEvents(data || []);
    })();
  }, [farmId, refreshTick]);

  if (events.length === 0) return null;

  return (
    <div className="myfarm-section">
      <h3 className="myfarm-section-title"><History size={18} /> تاريخ الأرض</h3>
      <div className="myfarm-history-timeline">
        {events.map(ev => (
          <div key={ev.id} className="myfarm-history-item">
            <div className="myfarm-history-dot" />
            <div>
              <div className="myfarm-history-title">{ev.title}</div>
              <div className="myfarm-history-date">{new Date(ev.event_date).toLocaleDateString('ar-EG')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FarmFormModal({ mode, farm, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: farm?.name || '', governorate: farm?.governorate || '',
    area_size: farm?.area_size || '', area_unit: farm?.area_unit || 'فدان', soil_type: farm?.soil_type || '',
    irrigation_system: farm?.irrigation_system || '', water_source: farm?.water_source || '',
    salinity: farm?.salinity ?? '', soil_quality: farm?.soil_quality || '',
    ph: farm?.ph ?? '', moisture_percent: farm?.moisture_percent ?? '', soil_temperature: farm?.soil_temperature ?? '',
    nitrogen: farm?.nitrogen ?? '', phosphorus: farm?.phosphorus ?? '', potassium: farm?.potassium ?? '',
    soil_analyzed_at: farm?.soil_analyzed_at || '',
    gps_lat: farm?.gps_lat ?? null, gps_lng: farm?.gps_lng ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const numOrNull = (v) => (v === '' ? null : parseFloat(v));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.area_size) { setFormError('من فضلك أدخل اسم الأرض والمساحة'); return; }
    if (mode !== 'edit' && (form.gps_lat == null || form.gps_lng == null)) {
      setFormError('من فضلك حدد موقع الأرض على الخريطة الأول');
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name, governorate: form.governorate, area_size: parseFloat(form.area_size),
      area_unit: form.area_unit, soil_type: form.soil_type,
      irrigation_system: form.irrigation_system || null,
      water_source: form.water_source || null,
      salinity: numOrNull(form.salinity),
      soil_quality: form.soil_quality || null,
      ph: numOrNull(form.ph),
      moisture_percent: numOrNull(form.moisture_percent),
      soil_temperature: numOrNull(form.soil_temperature),
      nitrogen: numOrNull(form.nitrogen),
      phosphorus: numOrNull(form.phosphorus),
      potassium: numOrNull(form.potassium),
      soil_analyzed_at: form.soil_analyzed_at || null,
      gps_lat: form.gps_lat,
      gps_lng: form.gps_lng,
    };

    if (mode === 'edit') {
      const { error } = await supabase.from('farms').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', farm.id);
      setSaving(false);
      if (error) { setFormError('حدث خطأ أثناء التعديل'); return; }
      onSaved(); return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('farms').insert({ owner_id: userData.user.id, ...payload });
    setSaving(false);
    if (error) { setFormError('حدث خطأ أثناء الحفظ'); return; }
    onSaved();
  };

  return (
    <>
    <div className="myfarm-modal-overlay" onClick={onClose}>
      <div className="myfarm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="myfarm-modal-header">
          <h3>{mode === 'edit' ? 'تعديل بيانات الأرض' : 'إضافة أرض جديدة'}</h3>
          <button className="myfarm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>اسم الأرض</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <label>المحافظة</label>
          <input value={form.governorate} onChange={e => setForm({ ...form, governorate: e.target.value })} />

          <label>موقع الأرض</label>
          <div className="myfarm-location-row">
            <button type="button" className="myfarm-location-btn" onClick={() => setShowLocationPicker(true)}>
              <MapPin size={15} />
              {form.gps_lat ? 'تعديل الموقع على الخريطة' : 'حدد موقع الأرض على الخريطة'}
            </button>
            {form.gps_lat && form.gps_lng && (
              <span className="myfarm-location-confirmed">✅ تم تحديد الموقع</span>
            )}
          </div>
          <div className="myfarm-form-row">
            <div>
              <label>المساحة</label>
              <input type="number" value={form.area_size} onChange={e => setForm({ ...form, area_size: e.target.value })} />
            </div>
            <div>
              <label>الوحدة</label>
              <select value={form.area_unit} onChange={e => setForm({ ...form, area_unit: e.target.value })}>
                <option value="فدان">فدان</option><option value="قيراط">قيراط</option><option value="متر مربع">متر مربع</option>
              </select>
            </div>
          </div>
          <label>نوع التربة</label>
          <input value={form.soil_type} onChange={e => setForm({ ...form, soil_type: e.target.value })} />

          <label>نظام الري (لكل الأرض)</label>
          <select value={form.irrigation_system} onChange={e => setForm({ ...form, irrigation_system: e.target.value })}>
            <option value="">اختر...</option>
            <option value="غمر">غمر</option>
            <option value="رش محوري">رش محوري</option>
            <option value="رش بالخراطيم">رش بالخراطيم</option>
            <option value="تنقيط سطحي">تنقيط سطحي</option>
            <option value="تنقيط تحت سطحي">تنقيط تحت سطحي</option>
            <option value="خطوط مطرية">خطوط مطرية (Furrow)</option>
            <option value="بعل / راحة على المطر">بعل / راحة على المطر</option>
            <option value="نظام هجين">نظام هجين (أكتر من طريقة)</option>
          </select>

          <button type="button" className="myfarm-toggle-advanced" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? 'إخفاء نتيجة تحليل التربة (اختياري)' : '+ إضافة نتيجة تحليل التربة (اختياري)'}
          </button>

          {showAdvanced && (
            <div className="myfarm-advanced-fields">
              <p className="myfarm-advanced-note">البيانات دي هتُستخدم لاحقاً تلقائياً في صفحة توقع المحاصيل من غير ما تكررها كل مرة.</p>

              <label>مصدر مياه الري (اختياري)</label>
              <input value={form.water_source} onChange={e => setForm({ ...form, water_source: e.target.value })} placeholder="مثال: نيل، بئر جوفي، ترعة" />

              <label>تاريخ آخر تحليل (اختياري)</label>
              <input type="date" value={form.soil_analyzed_at} onChange={e => setForm({ ...form, soil_analyzed_at: e.target.value })} />

              <div className="myfarm-form-row">
                <div>
                  <label>درجة الحموضة pH (اختياري)</label>
                  <input type="number" step="0.1" value={form.ph} onChange={e => setForm({ ...form, ph: e.target.value })} />
                </div>
                <div>
                  <label>الملوحة EC (اختياري)</label>
                  <input type="number" step="0.1" value={form.salinity} onChange={e => setForm({ ...form, salinity: e.target.value })} />
                </div>
              </div>

              <div className="myfarm-form-row">
                <div>
                  <label>نسبة رطوبة التربة % (اختياري)</label>
                  <input type="number" step="0.1" value={form.moisture_percent} onChange={e => setForm({ ...form, moisture_percent: e.target.value })} />
                </div>
                <div>
                  <label>درجة حرارة التربة °م (اختياري)</label>
                  <input type="number" step="0.1" value={form.soil_temperature} onChange={e => setForm({ ...form, soil_temperature: e.target.value })} />
                </div>
              </div>

              <div className="myfarm-form-row-3">
                <div>
                  <label>نيتروجين N (اختياري)</label>
                  <input type="number" step="0.1" value={form.nitrogen} onChange={e => setForm({ ...form, nitrogen: e.target.value })} />
                </div>
                <div>
                  <label>فوسفور P (اختياري)</label>
                  <input type="number" step="0.1" value={form.phosphorus} onChange={e => setForm({ ...form, phosphorus: e.target.value })} />
                </div>
                <div>
                  <label>بوتاسيوم K (اختياري)</label>
                  <input type="number" step="0.1" value={form.potassium} onChange={e => setForm({ ...form, potassium: e.target.value })} />
                </div>
              </div>

              <label>جودة التربة العامة (اختياري)</label>
              <input value={form.soil_quality} onChange={e => setForm({ ...form, soil_quality: e.target.value })} placeholder="مثال: جيدة، متوسطة، ضعيفة" />
            </div>
          )}

          {formError && <div className="myfarm-form-error">{formError}</div>}
          <div className="myfarm-modal-actions">
            <button type="button" className="myfarm-btn myfarm-btn-ghost" onClick={onClose}>إلغاء</button>
            <button type="submit" className="myfarm-btn myfarm-btn-primary" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          </div>
        </form>
      </div>
    </div>
    {showLocationPicker && (
      <LocationPickerMap
        initialLat={form.gps_lat}
        initialLng={form.gps_lng}
        onConfirm={(lat, lng) => {
          setForm({ ...form, gps_lat: lat, gps_lng: lng });
          setShowLocationPicker(false);
        }}
        onCancel={() => setShowLocationPicker(false)}
      />
    )}
    </>
  );
}

function AddPlotModal({ farmId, defaultSoilType, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', area_size: '', area_unit: 'فدان', land_type: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.area_size) { setFormError('من فضلك أدخل اسم القطعة والمساحة'); return; }
    setSaving(true);
    const { error } = await supabase.from('land_plots').insert({
      farm_id: farmId, name: form.name, area_size: parseFloat(form.area_size), area_unit: form.area_unit,
      land_type: form.land_type || defaultSoilType || null,
      status: 'فارغة',
    });
    setSaving(false);
    if (error) { setFormError('حدث خطأ أثناء الحفظ'); return; }
    onSaved();
  };

  return (
    <div className="myfarm-modal-overlay" onClick={onClose}>
      <div className="myfarm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="myfarm-modal-header">
          <h3>إضافة قطعة زراعية جديدة</h3>
          <button className="myfarm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>اسم القطعة</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div className="myfarm-form-row">
            <div>
              <label>المساحة</label>
              <input type="number" value={form.area_size} onChange={e => setForm({ ...form, area_size: e.target.value })} />
            </div>
            <div>
              <label>الوحدة</label>
              <select value={form.area_unit} onChange={e => setForm({ ...form, area_unit: e.target.value })}>
                <option value="فدان">فدان</option><option value="قيراط">قيراط</option><option value="متر مربع">متر مربع</option>
              </select>
            </div>
          </div>
          <label>نوع التربة (اختياري — لو فاضي هياخد نفس نوع تربة الأرض)</label>
          <input value={form.land_type} onChange={e => setForm({ ...form, land_type: e.target.value })} placeholder={defaultSoilType || 'نفس تربة الأرض'} />

          {formError && <div className="myfarm-form-error">{formError}</div>}
          <div className="myfarm-modal-actions">
            <button type="button" className="myfarm-btn myfarm-btn-ghost" onClick={onClose}>إلغاء</button>
            <button type="submit" className="myfarm-btn myfarm-btn-primary" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddSeasonModal({ plotId, farmId, onClose, onSaved }) {
  const [crops, setCrops] = useState([]);
  const [cropSearch, setCropSearch] = useState('');
  const [showAllCrops, setShowAllCrops] = useState(false);
  const [showCropList, setShowCropList] = useState(false);
  const [form, setForm] = useState({
    crop_id: '', crop_name: '', start_date: new Date().toISOString().slice(0, 10),
    planting_method: '', variety: '', purpose: 'للبيع', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('crops').select('id, name_ar, season_primary, season_secondary').order('name_ar');
      setCrops(data || []);
    })();
  }, []);

  const currentSeason = getCurrentSeasonLabel();

  const filteredCrops = crops
    .filter(c => showAllCrops || c.season_primary === currentSeason || c.season_secondary === currentSeason)
    .filter(c => !cropSearch || normalizeArabicText(c.name_ar).includes(normalizeArabicText(cropSearch)));

  const handleSelectCrop = (crop) => {
    setForm({ ...form, crop_id: crop.id, crop_name: crop.name_ar });
    setCropSearch(crop.name_ar);
    setShowCropList(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let finalCropId = form.crop_id;
    let finalCropName = form.crop_name;

    if (!finalCropId && cropSearch.trim()) {
      const match = crops.find(c => normalizeArabicText(c.name_ar) === normalizeArabicText(cropSearch));
      if (match) { finalCropId = match.id; finalCropName = match.name_ar; }
    }

    if (!finalCropId || !form.start_date) {
      setFormError('اختار المحصول من القايمة اللي بتظهر تحت مربع البحث، وحدد تاريخ الزراعة');
      return;
    }
    setForm(f => ({ ...f, crop_id: finalCropId, crop_name: finalCropName }));
    setSaving(true);

    const { data: plotData } = await supabase.from('land_plots').select('farm_id').eq('id', plotId).maybeSingle();
    const { data: farmData } = plotData ? await supabase.from('farms').select('irrigation_system').eq('id', plotData.farm_id).maybeSingle() : { data: null };

    const { error } = await supabase.from('farm_seasons').insert({
      farm_id: farmId, plot_id: plotId, crop_id: finalCropId,
      season_name: `موسم ${finalCropName}`, crop_name: finalCropName,
      start_date: form.start_date, planting_method: form.planting_method,
      variety: form.variety, purpose: form.purpose, notes: form.notes,
    });

    if (!error) {
      await supabase.from('land_plots').update({
        crop_name: finalCropName, plant_date: form.start_date, status: 'مزروعة',
        irrigation_type: farmData?.irrigation_system || null,
        updated_at: new Date().toISOString(),
      }).eq('id', plotId);
    }

    setSaving(false);
    if (error) { setFormError('حدث خطأ أثناء حفظ الموسم'); return; }
    onSaved();
  };

  return (
    <div className="myfarm-modal-overlay" onClick={onClose}>
      <div className="myfarm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="myfarm-modal-header">
          <h3>بدء موسم زراعي جديد</h3>
          <button className="myfarm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>المحصول (الموسم الحالي: {currentSeason})</label>
          <div className="myfarm-crop-search">
            <Search size={16} />
            <input
              placeholder="اكتب اسم المحصول... (مثال: رز، ارز، الأرز)"
              value={cropSearch}
              onChange={e => { setCropSearch(e.target.value); setShowCropList(true); setForm({ ...form, crop_id: '', crop_name: '' }); }}
              onFocus={() => setShowCropList(true)}
            />
          </div>
          {showCropList && (
            <div className="myfarm-crop-dropdown">
              {filteredCrops.length === 0 ? (
                <div className="myfarm-crop-dropdown-empty">مفيش نتائج مطابقة</div>
              ) : (
                filteredCrops.slice(0, 30).map(c => (
                  <button type="button" key={c.id} className="myfarm-crop-option" onClick={() => handleSelectCrop(c)}>
                    {c.name_ar}
                  </button>
                ))
              )}
            </div>
          )}
          <label className="myfarm-checkbox-label">
            <input type="checkbox" checked={showAllCrops} onChange={e => setShowAllCrops(e.target.checked)} />
            عرض كل المحاصيل (بما فيها الغير مناسبة للموسم الحالي)
          </label>

          <label>تاريخ الزراعة</label>
          <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />

          <label>طريقة الزراعة</label>
          <select value={form.planting_method} onChange={e => setForm({ ...form, planting_method: e.target.value })}>
            <option value="">اختر...</option>
            <option value="بذر مباشر">بذر مباشر</option>
            <option value="شتل">شتل</option>
          </select>

          <label>الصنف (اختياري)</label>
          <input value={form.variety} onChange={e => setForm({ ...form, variety: e.target.value })} />

          <label>الهدف من الزراعة</label>
          <select value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })}>
            <option value="للبيع">للبيع</option>
            <option value="للاستهلاك الشخصي">للاستهلاك الشخصي</option>
            <option value="للبيع وللاستهلاك">للبيع وللاستهلاك</option>
          </select>

          <label>ملاحظات (اختياري)</label>
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

          {formError && <div className="myfarm-form-error">{formError}</div>}

          <div className="myfarm-modal-actions">
            <button type="button" className="myfarm-btn myfarm-btn-ghost" onClick={onClose}>إلغاء</button>
            <button type="submit" className="myfarm-btn myfarm-btn-primary" disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'بدء الموسم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
  function InvestorFarmDetail({ farm, plots }) {
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState([]);
    const [revenue, setRevenue] = useState([]);
    const [seasons, setSeasons] = useState([]);

    useEffect(() => {
      (async () => {
        if (!farm?.id) { setLoading(false); return; }
        setLoading(true);
        const [expRes, revRes, seasonsRes] = await Promise.all([
          supabase.from('farm_expenses').select('*').eq('farm_id', farm.id),
          supabase.from('farm_revenue').select('*').eq('farm_id', farm.id),
          supabase.from('farm_seasons').select('*').eq('farm_id', farm.id),
        ]);
        setExpenses(expRes.data || []);
        setRevenue(revRes.data || []);
        setSeasons(seasonsRes.data || []);
        setLoading(false);
      })();
    }, [farm?.id]);

    if (!farm) return null;
    if (loading) return <div className="myfarm-drawer-loading">جاري تحميل بيانات الأرض...</div>;

    const totalPlotsArea = plots.reduce((s, p) => s + Number(p.area_size || 0), 0);
    const utilizationPercent = farm.area_size ? Math.min(100, Math.round((totalPlotsArea / farm.area_size) * 100)) : 0;

    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalRevenue = revenue.reduce((s, r) => s + Number(r.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const annualReturnPercent = totalExpenses > 0 ? Math.round((netProfit / totalExpenses) * 100) : null;

    const costByCategory = {};
    expenses.forEach(e => { costByCategory[e.category] = (costByCategory[e.category] || 0) + Number(e.amount || 0); });
    const laborCost = costByCategory['عمالة'] || 0;
    const irrigationCost = costByCategory['ري'] || 0;
    const fertilizerCost = costByCategory['أسمدة'] || costByCategory['سماد'] || 0;
    const pesticideCost = costByCategory['مبيدات'] || 0;

    const closedSeasons = seasons.filter(s => s.was_successful !== null && s.was_successful !== undefined);
    const successfulSeasons = seasons.filter(s => s.was_successful === true);
    const successRate = closedSeasons.length > 0 ? Math.round((successfulSeasons.length / closedSeasons.length) * 100) : null;
    const ratedSeasons = seasons.filter(s => s.rating);
    const avgRating = ratedSeasons.length > 0 ? (ratedSeasons.reduce((s, x) => s + Number(x.rating), 0) / ratedSeasons.length).toFixed(1) : null;

    const cards = [
      { label: 'نسبة استغلال الأرض', value: `${utilizationPercent}%` },
      { label: 'العائد السنوي', value: annualReturnPercent !== null ? `${annualReturnPercent}%` : '—' },
      { label: 'تكلفة التشغيل الإجمالية', value: `${totalExpenses.toLocaleString('ar-EG')} ج.م` },
      { label: 'تكلفة العمالة', value: `${laborCost.toLocaleString('ar-EG')} ج.م` },
      { label: 'تكلفة الري', value: `${irrigationCost.toLocaleString('ar-EG')} ج.م` },
      { label: 'تكلفة الأسمدة', value: `${fertilizerCost.toLocaleString('ar-EG')} ج.م` },
      { label: 'تكلفة المبيدات', value: `${pesticideCost.toLocaleString('ar-EG')} ج.م` },
      { label: 'كمية المياه المستهلكة', value: farm.water_usage_m3 ? `${farm.water_usage_m3} م³` : '—' },
      { label: 'صحة التربة', value: (farm.soil_health_score ?? null) !== null ? `${farm.soil_health_score}%` : '—' },
      { label: 'تقييم الموسم (متوسط)', value: avgRating ? `${avgRating} / 5` : '—' },
      { label: 'نسبة نجاح المواسم السابقة', value: successRate !== null ? `${successRate}%` : '—' },
      { label: 'توقع الأرباح القادمة', value: farm.expected_profit ? `${Number(farm.expected_profit).toLocaleString('ar-EG')} ج.م` : '—' },
    ];

    return (
      <div className="inv-farm-detail">
        <h3 className="myfarm-section-title">نظرة استثمارية على الأرض</h3>
        <div className="inv-farm-kpi-grid">
          {cards.map((c) => (
            <div className="inv-farm-kpi-card" key={c.label}>
              <span className="inv-farm-kpi-value">{c.value}</span>
              <span className="inv-farm-kpi-label">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }