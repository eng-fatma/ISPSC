export const FARMS = [
  {
    id: 1, name: 'أرض الشرقية', location: 'الشرقية - مصر', totalArea: '12 فدان',
    lastUpdate: 'منذ 3 أيام', currentSeason: 'قمح 2026',
    gps: '30.7128° N, 31.5017° E', soilType: 'طمية', salinity: '2.1 dS/m',
    soilQuality: 'جيدة', waterSource: 'نهري', irrigationSystem: 'تنقيط',
    ownedSince: '2020', notes: 'أرض موروثة، مقسمة على 3 قطع رئيسية',
    plots: [
      { id: 'A', name: 'قطعة A', area: '4 فدان', crop: 'قمح', plantDate: '2025-11-01', cropAge: '3 أشهر', status: 'جيد', irrigationType: 'تنقيط', landType: 'أرض مفتوحة' },
      { id: 'B', name: 'قطعة B', area: '5 فدان', crop: 'ذرة شامية', plantDate: '2025-05-01', cropAge: 'منتهي', status: 'متوسط', irrigationType: 'رش', landType: 'أرض مفتوحة' },
      { id: 'C', name: 'قطعة C', area: '3 فدان', crop: 'طماطم', plantDate: '2026-01-15', cropAge: 'شهر', status: 'يحتاج متابعة', irrigationType: 'تنقيط', landType: 'صوبة' },
    ],
    seasons: [
      { id: 1, season: 'صيف 2025', crop: 'ذرة شامية', area: '5 فدان', startDate: '2025-05-01', endDate: '2025-09-01', production: '8 طن', expenses: 35000, revenue: 90000, closed: true },
      { id: 2, season: 'شتاء 2024', crop: 'قمح', area: '4 فدان', startDate: '2024-11-01', endDate: '2025-04-01', production: '14 طن', expenses: 28000, revenue: 84000, closed: true },
    ],
    history: [
      { year: '2024', crop: 'قمح' },
      { year: '2025', crop: 'ذرة شامية' },
      { year: '2026', crop: 'طماطم وقمح' },
    ],
    expenses: [
      { category: 'بذور', amount: 8000 },
      { category: 'سماد', amount: 12000 },
      { category: 'مبيدات', amount: 5000 },
      { category: 'عمالة', amount: 15000 },
      { category: 'ري', amount: 6000 },
      { category: 'معدات', amount: 4000 },
      { category: 'نقل', amount: 3000 },
    ],
    alerts: [
      { id: 1, title: 'احتياج ري في قطعة C', severity: 'medium', desc: 'رطوبة التربة في قطعة C أقل من المعدل المثالي للطماطم' },
    ],
  },
  {
    id: 2, name: 'أرض الإسماعيلية', location: 'الإسماعيلية - مصر', totalArea: '6 فدان',
    lastUpdate: 'منذ أسبوع', currentSeason: 'فراولة 2026',
    gps: '30.5965° N, 32.2715° E', soilType: 'رملية', salinity: '1.4 dS/m',
    soilQuality: 'ممتازة', waterSource: 'جوفي', irrigationSystem: 'تنقيط',
    ownedSince: '2022', notes: 'أرض مستصلحة حديثاً، تجربة زراعة الفراولة لأول مرة',
    plots: [
      { id: 'A', name: 'قطعة A', area: '6 فدان', crop: 'فراولة', plantDate: '2025-10-01', cropAge: '4 أشهر', status: 'جيد', irrigationType: 'تنقيط', landType: 'أرض مفتوحة' },
    ],
    seasons: [],
    history: [{ year: '2022', crop: 'برسيم' }, { year: '2023', crop: 'فول سوداني' }],
    expenses: [
      { category: 'بذور', amount: 6000 },
      { category: 'سماد', amount: 7000 },
      { category: 'ري', amount: 4000 },
    ],
    alerts: [],
  },
  {
    id: 3, name: 'أرض الدقهلية', location: 'الدقهلية - مصر', totalArea: '8 فدان',
    lastUpdate: 'منذ شهر', currentSeason: 'أرز 2025',
    gps: '31.0364° N, 31.3807° E', soilType: 'طينية ثقيلة', salinity: '3.0 dS/m',
    soilQuality: 'متوسطة', waterSource: 'نهري', irrigationSystem: 'غمر',
    ownedSince: '2018', notes: 'أرض مناسبة جداً لزراعة الأرز',
    plots: [
      { id: 'A', name: 'قطعة A', area: '8 فدان', crop: 'أرز', plantDate: '2025-06-01', cropAge: '4 أشهر', status: 'جيد', irrigationType: 'غمر', landType: 'أرض مفتوحة' },
    ],
    seasons: [
      { id: 1, season: 'صيف 2024', crop: 'أرز', area: '8 فدان', startDate: '2024-06-01', endDate: '2024-10-01', production: '28 طن', expenses: 52000, revenue: 140000, closed: true },
    ],
    history: [{ year: '2023', crop: 'أرز' }, { year: '2024', crop: 'أرز' }],
    expenses: [
      { category: 'بذور', amount: 9000 },
      { category: 'سماد', amount: 14000 },
      { category: 'عمالة', amount: 18000 },
    ],
    alerts: [
      { id: 1, title: 'ارتفاع الحرارة المتوقع', severity: 'high', desc: 'موجة حر متوقعة الأسبوع القادم قد تؤثر على نضج الأرز' },
    ],
  },
]