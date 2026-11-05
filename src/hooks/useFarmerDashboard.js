import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { EGYPT_LOCATIONS } from '../data/weatherConfig'
import { fetchLatestNasaReading } from '../lib/nasaPower'
import { useNotifications } from './useNotifications'

export const DASHBOARD_LOADING_STAGES = [
  { key: 'auth', label: 'بنتأكد من حسابك' },
  { key: 'farms', label: 'بنجيب بيانات أراضيك' },
  { key: 'plots', label: 'بنجيب القطع والمحاصيل المسجلة' },
  { key: 'finance', label: 'بنجيب تحاليل التربة وسجل النشاط' },
  { key: 'tasks', label: 'بنجيب مهامك الزراعية' },
  { key: 'weather', label: 'بنجيب حالة الطقس الحالية' },
]

function firstText(...values) {
  return values.find((value) => value !== null && value !== undefined && String(value).trim() !== '') || ''
}

function findGovernorateLocation(name) {
  if (!name) return null
  const normalized = String(name).replace(/^ال/, '').trim().toLowerCase()
  return EGYPT_LOCATIONS.find((location) => {
    const candidate = location.name.replace(/^ال/, '').trim().toLowerCase()
    return candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate)
  }) || null
}

function formatRelativeTime(iso) {
  if (!iso) return ''
  const timestamp = new Date(iso).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'الآن'
  if (minutes < 60) return `منذ ${minutes} دقيقة`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days < 7) return `منذ ${days} يوم`
  return new Date(iso).toLocaleDateString('ar-EG')
}

function pickCropStatus(plot, overduePlotIds) {
  if (overduePlotIds.has(plot.id)) return 'يحتاج متابعة'
  if (plot.status) return plot.status
  if (plot.crop_status) return plot.crop_status
  return 'بدون حالة مسجلة'
}

async function readOptionalQuery(label, query, warnings) {
  const result = await query
  if (result.error) {
    warnings.push(`${label}: ${result.error.message}`)
    return []
  }
  return result.data || []
}

export function useFarmerDashboard() {
  const { notifications, loading: notificationsLoading } = useNotifications()
    const [dashboard, setDashboard] = useState({
    loading: true,
    stage: 'auth',
    error: '',
    warnings: [],
    displayName: '',
    farms: [],
    plots: [],
    tasks: [],
    activities: [],
    soil: null,
    weather: null,
    weatherLoading: false,
  })
  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    // silent: تحديث من غير ما الشاشة تظهر كأنها بتحمّل من الأول (بنستخدمه بعد "تم" على مهمة)
    if (!silent) setDashboard((previous) => ({ ...previous, loading: true, stage: 'auth', error: '', warnings: [] }))


    const { data: userData, error: userError } = await supabase.auth.getUser()
    const user = userData?.user
    if (userError || !user) {
      setDashboard((previous) => ({
        ...previous,
        loading: false,
        error: 'محتاج تسجل دخول عشان نقدر نعرض بيانات مزرعتك.',
      }))
      return
    }

        const warnings = []
    const displayName = firstText(
      user.user_metadata?.full_name,
      user.user_metadata?.fullName,
      user.email?.split('@')[0],
      'مزارع'
    ).split(' ')[0]

    setDashboard((previous) => ({ ...previous, stage: 'farms', displayName }))

    const farmsResult = await supabase
      .from('farms')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })

    if (farmsResult.error) {
      setDashboard((previous) => ({
        ...previous,
        loading: false,
        displayName,
        error: `تعذر تحميل الأراضي: ${farmsResult.error.message}`,
      }))
      return
    }
    
    const farms = farmsResult.data || []
    const farmIds = farms.map((farm) => farm.id).filter(Boolean)
    setDashboard((previous) => ({ ...previous, stage: 'plots' }))
    const plotRows = farmIds.length > 0      ? await readOptionalQuery(
        'القطع الزراعية',
        supabase.from('land_plots').select('*').in('farm_id', farmIds).order('created_at', { ascending: true }),
        warnings
      )
      : []
        const plotIds = plotRows.map((plot) => plot.id).filter(Boolean)
    setDashboard((previous) => ({ ...previous, stage: 'finance' }))

    const [historyRows, soilRows] = farmIds.length > 0
      ? await Promise.all([
        readOptionalQuery('سجل النشاط', supabase.from('farm_history_events').select('*').in('farm_id', farmIds).order('created_at', { ascending: false }).limit(8), warnings),
        plotIds.length > 0
          ? readOptionalQuery('تحاليل التربة', supabase.from('soil_analysis').select('*').in('plot_id', plotIds).order('analyzed_at', { ascending: false }), warnings)
          : Promise.resolve([]),
      ])
      : [[], []]

    setDashboard((previous) => ({ ...previous, stage: 'tasks' }))
    const taskRows = plotIds.length > 0
      ? await readOptionalQuery(
        'المهام الزراعية',
        supabase.from('tasks').select('*').in('plot_id', plotIds).neq('status', 'مكتمل').order('scheduled_date', { ascending: true }).limit(12),
        warnings
      )
      : []

    const overduePlotIds = new Set(
      taskRows
        .filter((task) => task.scheduled_date && new Date(task.scheduled_date) < new Date() && !['مكتمل', 'completed', 'done'].includes(task.status))
        .map((task) => task.plot_id)
        .filter(Boolean)
    )

    const plots = plotRows.map((plot) => ({
      ...plot,
      displayCrop: firstText(plot.crop_name, plot.crop, 'بدون محصول مسجل'),
      displayStatus: pickCropStatus(plot, overduePlotIds),
    }))

    const plotNameById = new Map(plotRows.map((plot) => [plot.id, plot.name]))
    const todayIso = new Date().toISOString().slice(0, 10)
    const tasks = taskRows.slice(0, 4).map((task) => ({
      id: task.id,
      label: firstText(task.title, task.name, task.description, 'مهمة زراعية'),
      done: ['مكتمل', 'completed', 'done'].includes(task.status) || Boolean(task.completed_at),
      date: task.scheduled_date || null,
      plotName: plotNameById.get(task.plot_id) || '',
      overdue: Boolean(task.scheduled_date && task.scheduled_date < todayIso),
    }))

    const activities = historyRows.map((event) => ({
      id: `history-${event.id}`,
      text: firstText(event.title, event.description, 'تحديث على مزرعتك'),
      time: formatRelativeTime(event.created_at || event.event_at),
    }))

    const soil = soilRows[0] || farms.find((farm) => farm.soil_health_score != null || farm.soil_quality) || null

    setDashboard((previous) => ({ ...previous, stage: 'weather' }))

        setDashboard((previous) => ({ ...previous, stage: 'weather' }))

    let weather = null
    const weatherFarm = farms.find((farm) => farm.gps_lat != null && farm.gps_lng != null) || farms.find((farm) => farm.governorate)
    const location = weatherFarm?.gps_lat != null && weatherFarm?.gps_lng != null
      ? { latitude: weatherFarm.gps_lat, longitude: weatherFarm.gps_lng, exact: true, name: weatherFarm.governorate }
      : findGovernorateLocation(weatherFarm?.governorate)
        ? { ...findGovernorateLocation(weatherFarm.governorate), latitude: findGovernorateLocation(weatherFarm.governorate).lat, longitude: findGovernorateLocation(weatherFarm.governorate).lng, exact: false }
        : null

    if (location) {
      try {
        // آخر قراءة فعلية من NASA POWER (نفس أسماء الحقول القديمة، فالواجهة مش بتتغير)
        const reading = await fetchLatestNasaReading({ lat: location.latitude, lng: location.longitude })
        weather = {
          ...reading,
          locationName: location.name || weatherFarm?.governorate || 'موقع الأرض',
          exact: location.exact,
        }
      } catch (error) {
        warnings.push(`الطقس: ${error.message}`)
      }
    }

        setDashboard({
      loading: false,
      stage: 'done',
      error: '',
      warnings,
      displayName,
      farms,
      plots,
      tasks,
      activities,
      soil,
      weather,
      weatherLoading: false,
    })
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { loadDashboard() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadDashboard])

  // تعليم مهمة إنها اتعملت. RLS على جدول tasks هي اللي بتضمن إن المزارعة تعدّل مهامها هي بس
  const completeTask = useCallback(async (taskId) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'مكتمل', completed_at: new Date().toISOString() })
      .eq('id', taskId)
      .select('id')
    if (error || !data || data.length === 0) {
      return { ok: false, message: error?.message || 'مش مسموح تعدّلي المهمة دي، أو اتمسحت.' }
    }
    await loadDashboard({ silent: true })
    return { ok: true }
  }, [loadDashboard])

  const unreadNotifications = notifications.filter((notification) => !notification.is_read)
  const allAlerts = notifications.slice(0, 4)

  return {
    ...dashboard,
    loading: dashboard.loading || notificationsLoading,
    notifications,
    unreadNotifications,
    allAlerts,
    refresh: loadDashboard,
    completeTask,
  }
}