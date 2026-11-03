// src/lib/mockData.js
// بيانات تجريبية ثابتة (Mock) لنسخة المزارع المستقلة — مفيش باك اند ولا قاعدة بيانات حقيقية.
// لما نربط باك اند حقيقي بعدين، هنشيل الملف ده وملف supabase.js التجريبي.

export const MOCK_USER = {
  id: 'u-farmer-0001',
  email: 'ahmed.mahmoud@ispsc.demo',
  user_metadata: { full_name: 'أحمد محمود', role: 'farmer' },
  created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
}

const DAY = 24 * 60 * 60 * 1000
const isoAgo = (days = 0, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600 * 1000).toISOString()
const dateOffset = (days) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10)

// ---------- المحاصيل ----------
// [id?, اسم عربي, إنجليزي, تصنيف, موسم رئيسي, موسم ثانوي, شهور الزراعة, شهور الحصاد,
//  حرارة مثالية صغرى, عظمى, أقصى تحمّل, رطوبة صغرى, عظمى, pH صغرى, عظمى,
//  تربة ممتازة, جيدة, مقبولة, سيئة, EC آمن, EC أقصى, انخفاض إنتاجية لكل EC, تحمل الملوحة,
//  مياه صغرى, عظمى (م³/فدان), طريقة الري, معمّر؟, مدة الحصاد (شهور),
//  سعر الطن, صافي ربح الفدان, إنتاجية الفدان (طن), تكلفة الفدان, قابل للتصدير, نصيحة, أمراض شائعة]
const CROP_ROWS = [
  ['148b1565-f6be-4a1a-8340-991089744734', 'القمح', 'Wheat', 'حبوب', 'شتوي', null, 'نوفمبر، ديسمبر', 'أبريل، مايو', 10, 24, 32, 40, 70, 6.0, 8.0, 'الطينية والطينية الطميية', 'الطميية', 'الرملية الطميية', 'الرملية الخشنة', 6, 8.5, 7, 'متوسط', 2200, 2800, 'ري بالغمر', false, 1, 9500, 14000, 2.8, 16000, false, 'ازرع في الميعاد من منتصف نوفمبر لنهاية ديسمبر، وقلّل الري قبل الحصاد بأسبوعين.', 'الصدأ الأصفر، التفحم، البياض الدقيقي'],
  ['5c14a649-c819-4a05-b65b-0f8a3da271b9', 'الطماطم', 'Tomato', 'خضر', 'صيفي', 'نيلي', 'فبراير، مارس، يوليو، أغسطس', 'مايو، يونيو، أكتوبر، نوفمبر', 18, 29, 35, 50, 75, 6.0, 7.5, 'الطميية الرملية', 'الطميية', 'الطينية الطميية', 'الطينية الثقيلة', 2.5, 5, 9, 'منخفض', 4500, 6000, 'ري بالتنقيط', false, 2, 8000, 65000, 25, 70000, true, 'استخدم الري بالتنقيط وسمّد على دفعات صغيرة، وراقب الذبابة البيضاء أسبوعيًا.', 'اللفحة المتأخرة، تجعد الأوراق الفيروسي، الذبابة البيضاء'],
  ['c9fd145b-5bb0-4267-965f-ab8fc1363125', 'الفول البلدي', 'Fava Bean', 'بقوليات', 'شتوي', null, 'أكتوبر، نوفمبر', 'مارس، أبريل', 12, 22, 30, 45, 70, 6.0, 8.0, 'الطينية الطميية', 'الطينية', 'الطميية', 'الرملية', 3, 5, 12, 'منخفض', 2000, 2600, 'ري بالغمر', false, 1, 17000, 20000, 1.5, 12000, false, 'ازرع على خطوط بعد معاملة التقاوي بالمطهّر، وتجنب الإفراط في الري.', 'صدأ الفول، التبقع الشوكولاتي، المنّ'],
  ['28c174ef-5fdb-4788-ba3f-5ac92c745b2c', 'البصل الفتيل (جاف)', 'Dry Onion', 'خضر', 'شتوي', null, 'أكتوبر، نوفمبر', 'مارس، أبريل', 12, 26, 33, 45, 70, 6.0, 7.5, 'الطميية الرملية', 'الطميية', 'الطينية الطميية', 'الطينية الثقيلة', 1.8, 4, 16, 'منخفض', 3000, 3600, 'ري بالتنقيط', false, 1, 7000, 55000, 18, 38000, true, 'اهتم بتسوية الأرض ونظافتها من الحشائش، ووقف الري قبل الحصاد بأسبوعين.', 'العفن الأبيض، البياض الزغبي، تربس البصل'],
  ['1d2267e7-9848-4852-beea-8964f54a1887', 'البصل الأخضر', 'Green Onion', 'خضر', 'شتوي', 'صيفي', 'سبتمبر، أكتوبر، نوفمبر', 'ديسمبر، يناير، فبراير', 12, 25, 32, 50, 75, 6.0, 7.5, 'الطميية الرملية', 'الطميية', 'الطينية الطميية', 'الطينية الثقيلة', 1.8, 4, 16, 'منخفض', 2500, 3000, 'ري بالرش', false, 1, 6500, 40000, 15, 30000, false, 'ازرع بكثافة عالية واروِ على فترات متقاربة لضمان نمو الأوراق.', 'البياض الزغبي، الصدأ'],
  ['243812cd-0f87-4366-9f12-b40cd8cf13c2', 'الذرة الشامية (بيضاء)', 'White Maize', 'حبوب', 'صيفي', 'نيلي', 'مايو، يونيو، يوليو', 'أغسطس، سبتمبر، أكتوبر', 20, 32, 40, 40, 70, 5.8, 7.5, 'الطميية', 'الطينية الطميية', 'الرملية الطميية', 'الملحية', 2.5, 5, 7, 'متوسط', 3500, 4200, 'ري بالغمر', false, 1, 6500, 25000, 3.5, 17000, false, 'سمّد النيتروجين على ثلاث دفعات، وراقب دودة الحشد الخريفية من أول أسبوعين.', 'دودة الحشد الخريفية، الذبول، التفحم'],
  ['b8df2ebb-38cb-4915-a7de-1c8a16ea8eeb', 'الذرة الشامية (صفراء)', 'Yellow Maize', 'حبوب', 'صيفي', 'نيلي', 'مايو، يونيو، يوليو', 'أغسطس، سبتمبر، أكتوبر', 20, 32, 40, 40, 70, 5.8, 7.5, 'الطميية', 'الطينية الطميية', 'الرملية الطميية', 'الملحية', 2.5, 5, 7, 'متوسط', 3500, 4200, 'ري بالغمر', false, 1, 7500, 30000, 3.8, 18000, false, 'اختر هجينًا مقاومًا للحشرات واحصد عند جفاف الكيزان تمامًا.', 'دودة الحشد الخريفية، الذبول'],
  [null, 'القطن', 'Cotton', 'محاصيل ألياف', 'صيفي', null, 'مارس، أبريل', 'سبتمبر، أكتوبر', 22, 32, 40, 40, 65, 6.0, 8.0, 'الطينية الطميية', 'الطينية', 'الطميية', 'الرملية الخشنة', 7.7, 9.6, 5, 'عالي', 4000, 4800, 'ري بالغمر', false, 2, 45000, 22000, 1.3, 20000, true, 'ازرع مبكرًا في مارس وراقب دودة اللوز بشكل أسبوعي.', 'دودة ورق القطن، دودة اللوز، الذبول الفيوزاريومي'],
  [null, 'قصب السكر', 'Sugarcane', 'محاصيل سكرية', 'صيفي', null, 'فبراير، مارس', 'يناير، فبراير، مارس', 22, 34, 40, 50, 80, 6.0, 8.0, 'الطينية', 'الطينية الطميية', 'الطميية', 'الرملية', 1.7, 3.4, 10, 'منخفض', 9000, 12000, 'ري بالغمر', true, 3, 1500, 38000, 50, 28000, false, 'يحتاج ريًا منتظمًا وتسميدًا غنيًا بالنيتروجين، ويفضل تغطية الأرض بالمخلفات.', 'التفحم، الصدأ، الحفار'],
  [null, 'الأرز', 'Rice', 'حبوب', 'صيفي', null, 'مايو، يونيو', 'سبتمبر، أكتوبر', 22, 32, 38, 60, 85, 5.5, 7.5, 'الطينية', 'الطينية الطميية', 'الطميية', 'الرملية', 3, 6, 12, 'متوسط', 9000, 12000, 'ري بالغمر', false, 1, 11000, 20000, 3.8, 22000, false, 'التزم بالمساحات المسموح بزراعتها من وزارة الري، وأعد استخدام مياه الصرف حيث أمكن.', 'اللفحة، عفن الغمد، دودة اللوز'],
  [null, 'البطاطس', 'Potato', 'خضر', 'نيلي', 'شتوي', 'أغسطس، سبتمبر، يناير', 'نوفمبر، ديسمبر، أبريل', 15, 24, 30, 55, 80, 5.5, 6.8, 'الرملية الطميية', 'الطميية', 'الطينية الطميية', 'الطينية الثقيلة', 1.7, 3.4, 12, 'منخفض', 3500, 4500, 'ري بالتنقيط', false, 1, 9000, 60000, 12, 65000, true, 'استخدم تقاوي معتمدة وأعطِ الأرض تقليبًا جيدًا قبل الزراعة.', 'اللفحة المتأخرة، العفن البني، الندوة المبكرة'],
  [null, 'الفلفل', 'Pepper', 'خضر', 'صيفي', 'نيلي', 'فبراير، مارس، أغسطس', 'مايو، يونيو، نوفمبر', 18, 30, 36, 50, 75, 6.0, 7.0, 'الطميية الرملية', 'الطميية', 'الطينية الطميية', 'الطينية الثقيلة', 1.5, 3, 14, 'منخفض', 3500, 4500, 'ري بالتنقيط', false, 3, 14000, 70000, 12, 60000, true, 'سمّد بالبوتاسيوم أثناء العقد، وراقب العنكبوت الأحمر والمنّ.', 'الذبول البكتيري، العنكبوت الأحمر، البياض الدقيقي'],
  [null, 'الخيار', 'Cucumber', 'خضر', 'صيفي', 'نيلي', 'فبراير، مارس، أغسطس، سبتمبر', 'مايو، يونيو، أكتوبر، نوفمبر', 18, 30, 36, 55, 80, 5.8, 7.0, 'الطميية الرملية', 'الطميية', 'الطينية الطميية', 'الطينية الثقيلة', 2.5, 3.5, 13, 'منخفض', 3000, 3800, 'ري بالتنقيط', false, 2, 8500, 45000, 14, 40000, true, 'علّق النباتات على شبكة لتقليل الأمراض وتحسين جودة الثمار.', 'البياض الزغبي، الذبول، المنّ'],
  [null, 'العنب', 'Grapes', 'فاكهة', 'صيفي', null, 'يناير، فبراير', 'يونيو، يوليو، أغسطس', 18, 32, 40, 40, 65, 6.0, 7.8, 'الطميية الرملية', 'الطميية', 'الرملية', 'الطينية الثقيلة', 1.5, 3, 9.6, 'متوسط', 4500, 6000, 'ري بالتنقيط', true, 3, 25000, 90000, 8, 80000, true, 'التقليم الجيد في الشتاء أساس الإنتاج، وراقب البياض الدقيقي في الربيع.', 'البياض الدقيقي، البياض الزغبي، العفن الرمادي'],
  [null, 'الموالح (برتقال)', 'Orange', 'فاكهة', 'دائم', null, 'فبراير، مارس', 'ديسمبر، يناير، فبراير', 15, 30, 38, 50, 75, 6.0, 7.5, 'الطميية', 'الطميية الرملية', 'الطينية الطميية', 'الطينية الثقيلة', 1.4, 2.5, 13, 'منخفض', 6000, 8000, 'ري بالتنقيط', true, 3, 9000, 85000, 12, 55000, true, 'الري المنتظم أهم عامل، وابتعد عن الملوحة العالية.', 'التصمغ، تقرح الموالح، الذبابة البيضاء'],
  [null, 'النخيل (البلح)', 'Date Palm', 'فاكهة', 'دائم', null, 'فبراير، مارس', 'سبتمبر، أكتوبر', 20, 38, 50, 25, 55, 7.0, 8.5, 'الرملية الطميية', 'الطميية', 'الطينية', 'الطينية الثقيلة جدًا', 6, 12, 5, 'عالي', 6000, 9000, 'ري بالغمر', true, 3, 22000, 80000, 4, 30000, true, 'يتحمل الملوحة والحرارة، فقط حافظ على التلقيح الجيد وتقليم السعف.', 'سوسة النخيل الحمراء، عفن القلب'],
  [null, 'الزيتون', 'Olive', 'فاكهة', 'دائم', null, 'فبراير، مارس', 'أكتوبر، نوفمبر', 15, 30, 40, 30, 60, 6.5, 8.5, 'الرملية الطميية', 'الطميية', 'الجيرية', 'الطينية الغدقة', 4, 8, 6, 'عالي', 3500, 5500, 'ري بالتنقيط', true, 2, 30000, 70000, 3.5, 35000, true, 'يتحمل الجفاف لكن الإنتاج يزيد بري منتظم، والتقليم بعد الحصاد.', 'ذبابة ثمار الزيتون، عين الطاووس'],
  [null, 'الفراولة', 'Strawberry', 'فاكهة', 'شتوي', null, 'سبتمبر، أكتوبر', 'ديسمبر، يناير، فبراير، مارس', 13, 24, 30, 60, 80, 5.5, 6.5, 'الرملية الطميية', 'الطميية', 'الطينية الطميية', 'الطينية', 1, 2, 18, 'منخفض', 3000, 4000, 'ري بالتنقيط', false, 4, 20000, 110000, 12, 90000, true, 'استخدم الأغطية البلاستيكية لتقليل الحشائش والحفاظ على نظافة الثمار.', 'العفن الرمادي، البياض الدقيقي، العنكبوت الأحمر'],
  [null, 'الثوم', 'Garlic', 'خضر', 'شتوي', null, 'أكتوبر، نوفمبر', 'أبريل، مايو', 12, 24, 32, 45, 70, 6.0, 7.5, 'الطميية', 'الطميية الرملية', 'الطينية الطميية', 'الطينية الثقيلة', 1.7, 3.4, 14, 'منخفض', 2800, 3500, 'ري بالتنقيط', false, 1, 28000, 90000, 5, 60000, true, 'اختر فصوصًا كبيرة سليمة، وقلّل الري قبل النضج لتحسين التخزين.', 'العفن الأبيض، الصدأ'],
  [null, 'البرسيم', 'Clover (Berseem)', 'علف', 'شتوي', null, 'أكتوبر، نوفمبر', 'ديسمبر، يناير، فبراير، مارس، أبريل', 10, 25, 32, 45, 75, 6.5, 8.0, 'الطينية الطميية', 'الطينية', 'الطميية', 'الرملية', 2, 4, 5, 'متوسط', 3000, 4000, 'ري بالغمر', false, 5, 1800, 15000, 40, 9000, false, 'استعمل بذورًا معتمدة وأكثر من الحشّات، وسمّد بالفوسفور في البداية.', 'العفن الجذري، الذبول'],
  [null, 'السمسم', 'Sesame', 'محاصيل زيتية', 'صيفي', null, 'مايو، يونيو', 'أغسطس، سبتمبر', 25, 35, 42, 40, 65, 5.5, 8.0, 'الطميية الرملية', 'الطميية', 'الرملية', 'الطينية الثقيلة', 2, 4, 8, 'متوسط', 1800, 2400, 'ري بالغمر', false, 1, 45000, 28000, 0.7, 12000, true, 'يتحمل الحرارة العالية لكنه يتأثر بزيادة الرطوبة وقت الإزهار.', 'الذبول، العفن الجذري'],
  [null, 'الخس', 'Lettuce', 'خضر', 'شتوي', null, 'سبتمبر، أكتوبر، نوفمبر', 'ديسمبر، يناير، فبراير', 10, 22, 28, 55, 80, 6.0, 7.0, 'الطميية', 'الطميية الرملية', 'الطينية الطميية', 'الطينية الثقيلة', 1.3, 2.5, 13, 'منخفض', 2200, 3000, 'ري بالرش', false, 1, 6000, 38000, 15, 28000, true, 'ازرع في الجو المعتدل وراقب الحشرات القارضة والمنّ.', 'البياض الزغبي، العفن الطري'],
  [null, 'الباذنجان', 'Eggplant', 'خضر', 'صيفي', 'نيلي', 'فبراير، مارس، يوليو', 'مايو، يونيو، أكتوبر، نوفمبر', 20, 30, 36, 50, 75, 5.5, 7.0, 'الطميية', 'الطميية الرملية', 'الطينية الطميية', 'الطينية الثقيلة', 1.5, 3, 7, 'متوسط', 3500, 4500, 'ري بالتنقيط', false, 3, 6500, 42000, 20, 36000, true, 'قلّم الأفرع السفلى واحصد بانتظام لتجنب تأخير النضج.', 'الذبول الفيوزاريومي، العنكبوت الأحمر'],
]

const CROPS = CROP_ROWS.map((r, i) => ({
  id: r[0] || `crop-${String(i + 1).padStart(3, '0')}`,
  name_ar: r[1], name_en: r[2], category: r[3], image_url: null,
  season_primary: r[4], season_secondary: r[5],
  planting_months: r[6], harvest_months: r[7],
  temp_min_ideal: r[8], temp_max_ideal: r[9], temp_max_tolerable: r[10],
  humidity_min: r[11], humidity_max: r[12], ph_min: r[13], ph_max: r[14],
  soil_best: r[15], soil_second: r[16], soil_third: r[17], soil_worst: r[18],
  ec_safe_limit: r[19], ec_max_acceptable: r[20], yield_drop_percent_per_ec: r[21], salinity_tolerance_level: r[22],
  water_need_min: r[23], water_need_max: r[24], irrigation_method: r[25],
  is_perennial: r[26], harvest_duration_months: r[27],
  price_avg_egp_ton: r[28], net_profit_egp_feddan: r[29], yield_avg_ton_feddan: r[30], cost_total_egp_feddan: r[31],
  is_exportable: r[32], strictly_avoid: null, success_tips: r[33], common_diseases: r[34],
  general_warnings: 'الأرقام تقريبية وتختلف حسب الصنف والمنطقة وموسم الزراعة — راجع مهندسًا زراعيًا قبل اتخاذ القرار.',
  created_at: isoAgo(200),
}))

const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'الشرقية', 'الدقهلية', 'الغربية', 'المنوفية', 'البحيرة', 'كفر الشيخ',
  'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا',
  'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح', 'شمال سيناء', 'جنوب سيناء',
].map((name, i) => ({ id: `gov-${String(i + 1).padStart(2, '0')}`, name_ar: name }))

const SOHAG_ID = GOVERNORATES.find((g) => g.name_ar === 'سوهاج').id

const DISTRICTS = [
  ...['سوهاج', 'أخميم', 'البلينا', 'المراغة', 'المنشأة', 'دار السلام', 'جرجا', 'جهينة', 'ساقلتة', 'طما', 'طهطا', 'العسيرات'].map((n, i) => ({ id: `dist-sohag-${i + 1}`, governorate_id: SOHAG_ID, name_ar: n })),
  ...['أسيوط', 'ديروط', 'القوصية', 'أبنوب', 'منفلوط'].map((n, i) => ({ id: `dist-asyut-${i + 1}`, governorate_id: GOVERNORATES.find((g) => g.name_ar === 'أسيوط').id, name_ar: n })),
  ...['المنيا', 'ملوي', 'مغاغة', 'سمالوط'].map((n, i) => ({ id: `dist-minya-${i + 1}`, governorate_id: GOVERNORATES.find((g) => g.name_ar === 'المنيا').id, name_ar: n })),
  ...['قنا', 'نجع حمادي', 'دشنا', 'قوص'].map((n, i) => ({ id: `dist-qena-${i + 1}`, governorate_id: GOVERNORATES.find((g) => g.name_ar === 'قنا').id, name_ar: n })),
]

// ---------- المستخدمين (بروفايلات) ----------
const PROFILES = [
  {
    id: MOCK_USER.id, role: 'farmer', full_name: 'أحمد محمود', phone: '01012345678',
    bio: 'مزارع من سوهاج، أزرع القمح والطماطم والذرة، وأهتم بالزراعة الذكية وترشيد المياه.',
    governorate: 'سوهاج', center: 'طهطا', avatar_url: '', cover_url: '',
    notification_settings: { muted: false, smart_farming: true, system: true },
    live_lat: null, live_lng: null, live_updated_at: null, is_working: false, last_seen_at: isoAgo(0, 0), created_at: isoAgo(120),
  },
]

// ---------- الأراضي والقطع ----------
const FARM1 = 'farm-0001', FARM2 = 'farm-0002'
const PLOT1 = 'plot-0001', PLOT2 = 'plot-0002', PLOT3 = 'plot-0003', PLOT4 = 'plot-0004', PLOT5 = 'plot-0005'
const WHEAT_ID = '148b1565-f6be-4a1a-8340-991089744734'
const TOMATO_ID = '5c14a649-c819-4a05-b65b-0f8a3da271b9'
const MAIZE_ID = '243812cd-0f87-4366-9f12-b40cd8cf13c2'

const FARMS = [
  {
    id: FARM1, owner_id: MOCK_USER.id, name: 'أرض الكوثر', governorate: 'سوهاج', area_size: 5, area_unit: 'فدان',
    soil_type: 'طينية', irrigation_system: 'ري بالتنقيط', water_source: 'مياه جوفية (بئر)', salinity: 1.8,
    soil_quality: 'جيدة', ph: 7.4, moisture_percent: 32, soil_temperature: 24, nitrogen: 45, phosphorus: 22, potassium: 180,
    soil_analyzed_at: dateOffset(-20), gps_lat: 26.5560, gps_lng: 31.6948, soil_health_score: 78,
    water_usage_m3: 3200, expected_profit: 185000, created_at: isoAgo(110), updated_at: isoAgo(5),
  },
  {
    id: FARM2, owner_id: MOCK_USER.id, name: 'أرض الصحراء الجديدة', governorate: 'سوهاج', area_size: 3, area_unit: 'فدان',
    soil_type: 'رملية طميية', irrigation_system: 'ري بالتنقيط', water_source: 'مياه جوفية (بئر)', salinity: 2.6,
    soil_quality: 'متوسطة', ph: 7.8, moisture_percent: 18, soil_temperature: 27, nitrogen: 30, phosphorus: 15, potassium: 140,
    soil_analyzed_at: dateOffset(-45), gps_lat: 26.3380, gps_lng: 31.8910, soil_health_score: 64,
    water_usage_m3: 1900, expected_profit: 90000, created_at: isoAgo(80), updated_at: isoAgo(12),
  },
]

const PLOTS = [
  { id: PLOT1, farm_id: FARM1, name: 'القطعة الشمالية', area_size: 2, area_unit: 'فدان', land_type: 'طينية', status: 'مزروعة', crop_name: 'القمح', plant_date: dateOffset(-35), irrigation_type: 'ري بالتنقيط', notes: 'قطعة منتظمة وقريبة من البئر.', created_at: isoAgo(100), updated_at: isoAgo(35) },
  { id: PLOT2, farm_id: FARM1, name: 'القطعة الشرقية', area_size: 2, area_unit: 'فدان', land_type: 'طينية', status: 'مزروعة', crop_name: 'الطماطم', plant_date: dateOffset(-48), irrigation_type: 'ري بالتنقيط', notes: 'تحتاج متابعة أسبوعية للآفات.', created_at: isoAgo(99), updated_at: isoAgo(48) },
  { id: PLOT3, farm_id: FARM1, name: 'القطعة الجنوبية', area_size: 1, area_unit: 'فدان', land_type: 'طينية', status: 'فارغة', crop_name: null, plant_date: null, irrigation_type: null, notes: null, created_at: isoAgo(98), updated_at: isoAgo(60) },
  { id: PLOT4, farm_id: FARM2, name: 'القطعة الأولى', area_size: 2, area_unit: 'فدان', land_type: 'رملية طميية', status: 'مزروعة', crop_name: 'الذرة الشامية (بيضاء)', plant_date: dateOffset(-110), irrigation_type: 'ري بالتنقيط', notes: null, created_at: isoAgo(78), updated_at: isoAgo(110) },
  { id: PLOT5, farm_id: FARM2, name: 'القطعة الثانية', area_size: 1, area_unit: 'فدان', land_type: 'رملية طميية', status: 'فارغة', crop_name: null, plant_date: null, irrigation_type: null, notes: null, created_at: isoAgo(77), updated_at: isoAgo(77) },
]

const SEASONS = [
  { id: 'season-0001', farm_id: FARM1, plot_id: PLOT1, crop_id: WHEAT_ID, season_name: 'موسم القمح', crop_name: 'القمح', start_date: dateOffset(-35), end_date: null, planting_method: 'تسطير', variety: 'سخا 95', purpose: 'بيع', was_successful: null, rating: null, created_at: isoAgo(35) },
  { id: 'season-0002', farm_id: FARM1, plot_id: PLOT2, crop_id: TOMATO_ID, season_name: 'موسم الطماطم', crop_name: 'الطماطم', start_date: dateOffset(-48), end_date: null, planting_method: 'شتلات', variety: 'جاكلين', purpose: 'بيع', was_successful: null, rating: null, created_at: isoAgo(48) },
  { id: 'season-0003', farm_id: FARM2, plot_id: PLOT4, crop_id: MAIZE_ID, season_name: 'موسم الذرة', crop_name: 'الذرة الشامية (بيضاء)', start_date: dateOffset(-110), end_date: null, planting_method: 'تسطير', variety: 'هجين ثلاثي', purpose: 'علف وبيع', was_successful: null, rating: null, created_at: isoAgo(110) },
  { id: 'season-0000', farm_id: FARM1, plot_id: PLOT3, crop_id: '28c174ef-5fdb-4788-ba3f-5ac92c745b2c', season_name: 'موسم البصل الماضي', crop_name: 'البصل الفتيل (جاف)', start_date: dateOffset(-300), end_date: dateOffset(-170), planting_method: 'شتلات', variety: 'جيزة 6', purpose: 'بيع', was_successful: true, rating: 4, created_at: isoAgo(300) },
]

const TASKS = [
  { id: 'task-0001', plot_id: PLOT1, season_id: 'season-0001', title: 'ري قطعة القمح', task_type: 'ري', description: 'رية المحاياة للقمح.', scheduled_date: dateOffset(-2), status: 'قيد_الانتظار', priority: 'عالية', data_confidence: 'مؤكد', created_at: isoAgo(10) },
  { id: 'task-0002', plot_id: PLOT2, season_id: 'season-0002', title: 'رش مبيد وقائي للطماطم', task_type: 'مكافحة', description: 'رش وقائي ضد الذبابة البيضاء.', scheduled_date: dateOffset(0), status: 'قيد_الانتظار', priority: 'عالية', data_confidence: 'مؤكد', created_at: isoAgo(9) },
  { id: 'task-0003', plot_id: PLOT1, season_id: 'season-0001', title: 'تسميد نيتروجيني للقمح', task_type: 'تسميد', description: 'الدفعة الثانية من اليوريا.', scheduled_date: dateOffset(2), status: 'قيد_الانتظار', priority: 'متوسطة', data_confidence: 'مرجّح', created_at: isoAgo(8) },
  { id: 'task-0004', plot_id: PLOT2, season_id: 'season-0002', title: 'تسميد بوتاسيوم للطماطم', task_type: 'تسميد', description: 'سماد بوتاسيومي مع مياه الري.', scheduled_date: dateOffset(4), status: 'قيد_الانتظار', priority: 'متوسطة', data_confidence: 'مرجّح', created_at: isoAgo(7) },
  { id: 'task-0005', plot_id: PLOT4, season_id: 'season-0003', title: 'حصاد الذرة', task_type: 'حصاد', description: 'الحصاد عند جفاف الكيزان.', scheduled_date: dateOffset(6), status: 'قيد_الانتظار', priority: 'عالية', data_confidence: 'مؤكد', created_at: isoAgo(6) },
  { id: 'task-0006', plot_id: PLOT2, season_id: 'season-0002', title: 'تعليق الشتلات', task_type: 'خدمة', description: 'ربط النباتات على الأسلاك.', scheduled_date: dateOffset(-8), status: 'منفذة', priority: 'متوسطة', data_confidence: 'مؤكد', completed_at: isoAgo(8), created_at: isoAgo(20) },
]

const OPERATIONS = [
  { id: 'op-0001', season_id: 'season-0001', plot_id: PLOT1, task_id: null, operation_type: 'زراعة', performed_by: MOCK_USER.id, performed_at: isoAgo(35), notes: 'زراعة القمح بالتسطير.' },
  { id: 'op-0002', season_id: 'season-0002', plot_id: PLOT2, task_id: 'task-0006', operation_type: 'خدمة', performed_by: MOCK_USER.id, performed_at: isoAgo(8), notes: 'تم تعليق الشتلات.' },
]

const EXPENSES = [
  { id: 'exp-0001', farm_id: FARM1, plot_id: PLOT1, season_id: 'season-0001', category: 'تقاوي', amount: 4500, note: 'تقاوي قمح سخا 95', created_at: isoAgo(36) },
  { id: 'exp-0002', farm_id: FARM1, plot_id: PLOT1, season_id: 'season-0001', category: 'أسمدة', amount: 3800, note: 'يوريا وسوبر فوسفات', created_at: isoAgo(30) },
  { id: 'exp-0003', farm_id: FARM1, plot_id: PLOT2, season_id: 'season-0002', category: 'شتلات', amount: 9000, note: 'شتلات طماطم جاكلين', created_at: isoAgo(49) },
  { id: 'exp-0004', farm_id: FARM1, plot_id: PLOT2, season_id: 'season-0002', category: 'مبيدات', amount: 5200, note: 'مبيدات وقائية', created_at: isoAgo(20) },
  { id: 'exp-0005', farm_id: FARM1, plot_id: null, season_id: null, category: 'عمالة', amount: 7000, note: 'عمالة يومية', created_at: isoAgo(15) },
  { id: 'exp-0006', farm_id: FARM2, plot_id: PLOT4, season_id: 'season-0003', category: 'كهرباء ومياه', amount: 3500, note: 'تشغيل البئر', created_at: isoAgo(40) },
]

const REVENUES = [
  { id: 'rev-0001', farm_id: FARM1, source: 'بيع بصل الموسم الماضي', amount: 52000, quantity_ton: 8, buyer_name: 'تاجر سوق سوهاج', recorded_at: isoAgo(160) },
  { id: 'rev-0002', farm_id: FARM2, source: 'بيع علف أخضر', amount: 12000, quantity_ton: 6, buyer_name: 'مزرعة مواشي', recorded_at: isoAgo(70) },
]

const HISTORY = [
  { id: 'hist-0001', farm_id: FARM1, plot_id: PLOT2, event_type: 'task', title: 'تم تعليق شتلات الطماطم', description: 'اكتمل تعليق الشتلات في القطعة الشرقية.', event_date: isoAgo(8), created_at: isoAgo(8) },
  { id: 'hist-0002', farm_id: FARM1, plot_id: PLOT1, event_type: 'season', title: 'بدء موسم القمح', description: 'زراعة القمح (سخا 95) في القطعة الشمالية.', event_date: isoAgo(35), created_at: isoAgo(35) },
  { id: 'hist-0003', farm_id: FARM1, plot_id: null, event_type: 'soil', title: 'تحليل تربة جديد', description: 'تم تسجيل تحليل تربة لأرض الكوثر.', event_date: isoAgo(20), created_at: isoAgo(20) },
  { id: 'hist-0004', farm_id: FARM2, plot_id: PLOT4, event_type: 'season', title: 'بدء موسم الذرة', description: 'زراعة الذرة البيضاء في القطعة الأولى.', event_date: isoAgo(110), created_at: isoAgo(110) },
]

const SOIL = [
  { id: 'soil-0001', plot_id: PLOT1, ph: 7.4, ec: 1.8, nitrogen: 45, phosphorus: 22, potassium: 180, moisture_percent: 32, source: 'يدوي', analyzed_at: isoAgo(20) },
  { id: 'soil-0002', plot_id: PLOT2, ph: 7.2, ec: 1.6, nitrogen: 40, phosphorus: 25, potassium: 170, moisture_percent: 30, source: 'جهاز ISPSC', analyzed_at: isoAgo(14) },
  { id: 'soil-0003', plot_id: PLOT4, ph: 7.8, ec: 2.6, nitrogen: 30, phosphorus: 15, potassium: 140, moisture_percent: 18, source: 'يدوي', analyzed_at: isoAgo(45) },
]

// ---------- التنبيهات ----------
const NOTIFICATIONS = [
  { id: 'n-0001', user_id: MOCK_USER.id, type: 'soil_alert', title: 'رطوبة التربة منخفضة في قطعة القمح', body: 'رطوبة القطعة الشمالية أقل من المعدل المناسب، يُنصح بالري خلال 24 ساعة.', is_read: false, action_path: '/my-farm', created_at: isoAgo(0, 2) },
  { id: 'n-0002', user_id: MOCK_USER.id, type: 'disease_alert', title: 'احتمال ظهور الذبابة البيضاء', body: 'الطقس الحالي مناسب لانتشار الذبابة البيضاء في الطماطم. افحص الأوراق السفلية.', is_read: false, action_path: '/chatbot', created_at: isoAgo(0, 6) },
  { id: 'n-0008', user_id: MOCK_USER.id, type: 'system', title: 'مرحبًا بك في ISPSC', body: 'ابدأ بإضافة أرضك الأولى وتجربة توقع المحاصيل الذكي.', is_read: true, action_path: '/my-farm', created_at: isoAgo(30) },
]

// ---------- محادثات المساعد الذكي ----------
const CHAT_CONVERSATIONS = [
  { id: 'cc-0001', user_id: MOCK_USER.id, title: 'ورق الطماطم بيصفر', created_at: isoAgo(2) },
  { id: 'cc-0002', user_id: MOCK_USER.id, title: 'مواعيد زراعة القمح', created_at: isoAgo(9) },
]
const CHAT_MESSAGES = [
  { id: 'cm-0001', conversation_id: 'cc-0001', role: 'user', content: 'ورق الطماطم عندي بيصفر من تحت، إيه السبب؟', image_url: null, created_at: isoAgo(2) },
  { id: 'cm-0002', conversation_id: 'cc-0001', role: 'assistant', content: 'اصفرار الأوراق السفلية غالبًا بيكون نقص نيتروجين أو زيادة ري. افحص رطوبة التربة وراجع برنامج التسميد، ولو فيه بقع بنية يبقى احتمال مرض فطري. ابعت لي صورة للورقة أقدر أساعدك أكتر.', image_url: null, created_at: isoAgo(2) },
  { id: 'cm-0003', conversation_id: 'cc-0002', role: 'user', content: 'أنسب ميعاد لزراعة القمح في سوهاج؟', image_url: null, created_at: isoAgo(9) },
  { id: 'cm-0004', conversation_id: 'cc-0002', role: 'assistant', content: 'في الصعيد أنسب ميعاد من منتصف نوفمبر لنهاية ديسمبر، والتبكير أو التأخير الكبير بيقلل الإنتاجية.', image_url: null, created_at: isoAgo(9) },
]

// ---------- أسعار السوق ----------
const MARKET_PRICES = CROPS.map((c, i) => ({
  crop_id: c.id,
  predicted_price_egp_ton: Math.round(c.price_avg_egp_ton * (1 + ((i % 5) - 2) * 0.03)),
  prediction_confidence: i % 3 === 0 ? 'مرتفعة' : 'متوسطة',
}))

export function seedDb() {
  const clone = (x) => JSON.parse(JSON.stringify(x))
  return {
    profiles: clone(PROFILES),
    farms: clone(FARMS),
    land_plots: clone(PLOTS),
    farm_seasons: clone(SEASONS),
    tasks: clone(TASKS),
    agricultural_operations: clone(OPERATIONS),
    farm_expenses: clone(EXPENSES),
    farm_revenue: clone(REVENUES),
    farm_history_events: clone(HISTORY),
    soil_analysis: clone(SOIL),
    plot_media: [],
    crops: clone(CROPS),
    notifications: clone(NOTIFICATIONS),
    chat_conversations: clone(CHAT_CONVERSATIONS),
    chat_messages: clone(CHAT_MESSAGES),
    governorates: clone(GOVERNORATES),
    districts: clone(DISTRICTS),
    market_prices: clone(MARKET_PRICES),
   
  }
}
