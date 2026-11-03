// src/lib/deviceBle.js
// الاتصال بجهاز تحليل التربة ISPSC عن طريق Web Bluetooth (بلوتوث BLE من المتصفح).
// لازم الـ UUID هنا يطابق اللي في الفيرموير (firmware/ISPSC_SoilSensor/ISPSC_SoilSensor.ino).
//
// شكل الرسالة (18 byte، Little-Endian):
//  [0] النسخة=1  [1] الحالة  [2-3] رقم القراءة  [4-5] الرطوبة×10  [6-7] الحرارة×10 (بإشارة)
//  [8-9] EC µS/cm  [10-11] pH×100  [12-13] N  [14-15] P  [16-17] K     (0xFFFF = قيمة غير متاحة)

export const BLE_SERVICE_UUID = '6e1a0001-4c3b-4b8e-9d52-1f5a7c0b9a10'
export const BLE_SOIL_CHAR_UUID = '6e1a0002-4c3b-4b8e-9d52-1f5a7c0b9a10'
export const PACKET_LEN = 18
export const PACKET_VERSION = 1
export const SOIL_STATUS = { OK: 0, DETECTING: 1, READ_FAILED: 2 }

// هل المتصفح يقدر يتصل ببلوتوث؟ (Chrome/Edge على الكمبيوتر، Chrome على الأندرويد، وعلى https أو localhost فقط)
export function getBleSupport() {
  if (typeof navigator === 'undefined' || !navigator.bluetooth) {
    const insecure = typeof window !== 'undefined' && window.isSecureContext === false
    return { ok: false, reason: insecure ? 'insecure' : 'unsupported' }
  }
  return { ok: true, reason: null }
}

// قيمة واحدة: لو غير متاحة أو خارج المدى المعقول بترجع null (أمان ضد رسائل تالفة)
function pick(raw, scale, min, max, digits) {
  if (raw === 0xffff) return null
  const v = raw / scale
  if (v < min || v > max) return null
  const f = 10 ** digits
  return Math.round(v * f) / f
}

// بيفك رسالة الجهاز. بيرجّع null لو الرسالة مش بالشكل المتوقع.
export function decodeSoilPacket(input) {
  let view
  if (input instanceof DataView) view = input
  else if (input?.buffer instanceof ArrayBuffer) view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  else if (input instanceof ArrayBuffer) view = new DataView(input)
  else return null
  if (view.byteLength !== PACKET_LEN || view.getUint8(0) !== PACKET_VERSION) return null

  const status = view.getUint8(1)
  const tempRaw = view.getInt16(6, true)
  const ecRaw = view.getUint16(8, true)
  const packet = {
    status,
    seq: view.getUint16(2, true),
    moisture: pick(view.getUint16(4, true), 10, 0, 100, 1),
    temperature: tempRaw === -32768 ? null : pick(tempRaw, 10, -40, 85, 1),
    ec: ecRaw === 0xffff || ecRaw > 20000 ? null : ecRaw, // µS/cm
    ecDsm: ecRaw === 0xffff || ecRaw > 20000 ? null : Math.round(ecRaw / 10) / 100, // dS/m (الوحدة اللي بيستخدمها الموقع)
    ph: pick(view.getUint16(10, true), 100, 0, 14, 2),
    n: pick(view.getUint16(12, true), 1, 0, 5000, 0),
    p: pick(view.getUint16(14, true), 1, 0, 5000, 0),
    k: pick(view.getUint16(16, true), 1, 0, 5000, 0),
    at: Date.now(),
  }
  packet.hasData = [packet.moisture, packet.temperature, packet.ec, packet.ph, packet.n, packet.p, packet.k].some((x) => x !== null)
  return packet
}

// متوسط مجموعة قراءات (هنستخدمه عند الحفظ لتقليل أخطاء القياس)
const AVG_FIELDS = [['moisture', 1], ['temperature', 1], ['ec', 0], ['ph', 2], ['n', 0], ['p', 0], ['k', 0]]
export function averageReadings(list) {
  const out = {}
  for (const [key, digits] of AVG_FIELDS) {
    const vals = list.map((r) => r?.[key]).filter((x) => typeof x === 'number')
    const f = 10 ** digits
    out[key] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * f) / f : null
  }
  out.ecDsm = out.ec === null ? null : Math.round(out.ec / 10) / 100
  out.count = list.length
  return out
}

// نافذة اختيار الجهاز (بيفتحها المتصفح نفسه، ولازم تتندهه من ضغطة زرار)
export function pickSoilDevice() {
  return navigator.bluetooth.requestDevice({
    filters: [{ services: [BLE_SERVICE_UUID] }, { namePrefix: 'ISPSC' }],
    optionalServices: [BLE_SERVICE_UUID],
  })
}

// بيتصل بالجهاز ويشترك في القراءات. بيرجّع { device, close() }
export async function openSoilConnection(device, { onPacket, onDisconnected }) {
  let closed = false
  let characteristic = null
  const onValue = (e) => {
    const packet = decodeSoilPacket(e.target.value)
    if (packet) onPacket(packet)
  }
  const onGattDisconnected = () => { if (!closed) onDisconnected?.() }

  device.addEventListener('gattserverdisconnected', onGattDisconnected)
  const cleanup = () => {
    closed = true
    device.removeEventListener('gattserverdisconnected', onGattDisconnected)
    try { characteristic?.removeEventListener('characteristicvaluechanged', onValue) } catch { /* تجاهل */ }
    try { if (device.gatt?.connected) device.gatt.disconnect() } catch { /* تجاهل */ }
  }

  try {
    const server = await device.gatt.connect()
    const service = await server.getPrimaryService(BLE_SERVICE_UUID)
    characteristic = await service.getCharacteristic(BLE_SOIL_CHAR_UUID)
    characteristic.addEventListener('characteristicvaluechanged', onValue)
    await characteristic.startNotifications()
    try {
      const first = decodeSoilPacket(await characteristic.readValue())
      if (first) onPacket(first)
    } catch { /* مش مشكلة: القراءات هتيجي بالإشعارات */ }
  } catch (err) {
    cleanup()
    throw err
  }
  return { device, close: cleanup }
}

// بيحوّل أخطاء المتصفح لرسالة عربي. cancelled=true معناها المستخدم قفل نافذة الاختيار (مش خطأ).
export function describeBleError(err) {
  const name = err?.name || ''
  const msg = String(err?.message || '')
  const detail = `${name}: ${msg}`.slice(0, 200) // السبب الفني الحقيقي (بيظهر صغير تحت الرسالة)
  if (name === 'NotFoundError' && /cancel/i.test(msg)) return { cancelled: true, message: '', detail }
  if (name === 'NotFoundError' && /adapter|bluetooth.*(off|unavailable|not available)/i.test(msg)) {
    return { cancelled: false, detail, message: 'البلوتوث مقفول أو مش متاح في جهازك. شغّله وحاول تاني.' }
  }
  if (name === 'NotFoundError' && /denied|permission/i.test(msg)) {
    return { cancelled: false, detail, message: 'المتصفح مش مدّي الموقع صلاحية البحث عن أجهزة البلوتوث. اضغط على أيقونة القفل جنب الرابط واسمح بالبلوتوث، وحاول تاني.' }
  }
  if (name === 'NotFoundError' && /no (services|characteristics) matching/i.test(msg)) {
    return { cancelled: false, detail, message: 'اتلاقى جهاز بس مش بيقدّم خدمة ISPSC. اتأكد إن آخر كود مرفوع على الـ ESP32.' }
  }
  if (name === 'NotFoundError') {
    return { cancelled: false, detail, message: 'مالقيناش جهاز ISPSC. اتأكد إن الجهاز شغال وقريب منك وحاول تاني.' }
  }
  if (name === 'SecurityError' || name === 'NotAllowedError') {
    return { cancelled: false, detail, message: 'المتصفح منع الاتصال بالبلوتوث. اسمح بالإذن من إعدادات الموقع وحاول تاني.' }
  }
  if (name === 'NetworkError') {
    return { cancelled: false, detail, message: 'ما قدرناش نتصل بالجهاز. قرّبه منك واتأكد إنه شغال ومش متصل بجهاز تاني.' }
  }
  if (name === 'NotSupportedError') {
    return { cancelled: false, detail, message: 'الجهاز ده مش جهاز تحليل ISPSC أو محتاج تحديث للبرنامج الداخلي.' }
  }
  return { cancelled: false, detail, message: 'حصلت مشكلة في الاتصال بالجهاز. حاول تاني.' }
}
