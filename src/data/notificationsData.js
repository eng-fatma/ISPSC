// أيقونات SVG احترافية (Minimal Premium، نفس السمك والحجم) — لا إيموجي
// المفتاح هنا هو نفس قيمة عمود notifications.type في قاعدة البيانات
export const NOTIF_ICONS = {
  soil_alert: '<path d="M3 13h14M3 10h14M3 7h14"/><path d="M5 13v4M10 13v4M15 13v4"/>',
  disease_alert: '<circle cx="10" cy="10" r="6"/><path d="M7 8l1.5 1.5M11.5 8L13 9.5M7 12l1.5-1.5M11.5 12L13 10.5"/>',
  system: '<circle cx="10" cy="10" r="2.5"/><path d="M10 3v2M10 15v2M3 10h2M15 10h2M5 5l1.5 1.5M13.5 13.5L15 15M15 5l-1.5 1.5M6.5 13.5L5 15"/>',
  search: '<path d="M3 16V4M3 16h14"/><path d="M6 13l3-4 2 2 4-5"/>',
}

// قاموس أنواع الإشعارات — العقد الموحّد لكل الأدوار (مزارع/مستثمر/شركة/...)
// أي Trigger أو Edge Function هيكتب في notifications لازم يستخدم أحد القيم دي بالظبط في عمود type
export const NOTIFICATION_TYPE_META = {
  soil_alert:     { icon: 'soil_alert',     group: 'farming',   important: true,  actionLabel: 'عرض التوصية' },
  disease_alert:  { icon: 'disease_alert',  group: 'farming',   important: true,  actionLabel: 'تشخيص الحالة' },
  system:         { icon: 'system',         group: 'system',    important: false, actionLabel: 'فتح' },
}

// تبويبات الفلترة الجانبية
export const NOTIFICATION_GROUPS = [
  { id: 'all', label: 'الكل', icon: 'system' },
  { id: 'farming', label: 'الزراعة الذكية', icon: 'soil_alert' },
  { id: 'system', label: 'النظام', icon: 'system' },
]

// تفضيلات الإشعارات — واجهة فقط حالياً (نفس سلوك النسخة القديمة، مش متخزنة في الباك إند لسه)
export const NOTIFICATION_SETTINGS_OPTIONS = [
  { id: 'farming', label: 'إشعارات الزراعة' },
  { id: 'system', label: 'إشعارات النظام' },
]
