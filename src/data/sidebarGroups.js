// أيقونات SVG موحدة (نفس الحجم 20×20، نفس السمك 1.8، أسلوب واحد) — لا إيموجي
export const ICONS = {
  dashboard: '<path d="M3 9.5L10 4l7 5.5V17a1 1 0 01-1 1h-4v-5H8v5H4a1 1 0 01-1-1V9.5z"/>',
  alerts: '<path d="M10 2a5 5 0 00-5 5v3.5L3 14h14l-2-3.5V7a5 5 0 00-5-5z"/><path d="M8 17a2 2 0 004 0"/>',
  predict: '<path d="M3 14l4-5 3 3 4-6 3 4"/><circle cx="3" cy="14" r="1"/><circle cx="7" cy="9" r="1"/><circle cx="10" cy="12" r="1"/><circle cx="14" cy="6" r="1"/><circle cx="17" cy="10" r="1"/>',
  map: '<path d="M3 5l4-1 6 1 4-1v11l-4 1-6-1-4 1V5z"/><path d="M7 4v11M13 5v11"/>',
  library: '<path d="M3 4h6v12H3V4zM11 4h6v12h-6V4z"/>',
  satellite: '<path d="M5 11l4-4 6 6-4 4-6-6z"/><path d="M3 3l3 3M14 14l3 3"/><circle cx="14" cy="6" r="2"/>',
  device: '<rect x="3" y="3" width="14" height="9" rx="1"/><path d="M7 16h6M10 12v4"/>',
  chatbot: '<rect x="4" y="6" width="12" height="9" rx="2"/><path d="M10 6V3M7 10v1M13 10v1"/>',
  profile: '<circle cx="10" cy="6.5" r="3"/><path d="M4 17c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5"/>',
  settings: '<circle cx="10" cy="10" r="2.5"/><path d="M10 3v2M10 15v2M3 10h2M15 10h2M5 5l1.5 1.5M13.5 13.5L15 15M15 5l-1.5 1.5M6.5 13.5L5 15"/>',
  myFarm: '<path d="M3 17l4-9 3 5 3-7 4 12"/><path d="M3 17h14"/>',
  seasons: '<path d="M4 10a6 6 0 0110-4.2M16 10a6 6 0 01-10 4.2"/><path d="M14 4v2.5H11.5M6 16v-2.5H8.5"/>',
  analysis: '<path d="M8 3h4M9 3v5l-4.5 7.5A1.5 1.5 0 006 18h8a1.5 1.5 0 001.3-2.5L11 8V3"/><path d="M7 13h6"/>',
  wealth: '<ellipse cx="10" cy="6" rx="6" ry="2.5"/><path d="M4 6v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V6"/><path d="M4 10v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4"/>',
}

export const SIDEBAR_GROUPS = {
  farmer: [
    {
      label: 'الرئيسية',
      items: [
        { id: 'dashboard', label: 'لوحة التحكم' },
        { id: 'alerts', label: 'التنبيهات ' },
        { id: 'myFarm', label: 'أرضي' },
      ],
    },
    {
      label: 'الزراعة الذكية',
      items: [
        { id: 'predict', label: 'توقع المحاصيل' },
        { id: 'map', label: 'الخريطة الزراعية' },
        { id: 'library', label: 'مكتبة المحاصيل' },
        { id: 'satellite', label: 'مراقبة الأقمار الصناعية' },
        { id: 'device', label: 'جهاز التحليل' },
        { id: 'chatbot', label: 'المساعد الزراعي الذكي' },
      ],
    },
    {
      label: 'الحساب والإدارة',
      items: [
        { id: 'settings', label: 'الإعدادات' },
      ],
    },
  ],
}

export const ROUTE_MAP = {
  dashboard: '/dashboard', alerts: '/alerts', myFarm: '/my-farm',
  predict: '/predict', map: '/map', library: '/library', satellite: '/satellite',
  device: '/device', chatbot: '/chatbot',
  settings: '/settings',
  seasons: '/seasons', wealth: '/wealth', analysis: '/analysis',
}
