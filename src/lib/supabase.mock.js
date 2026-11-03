// src/lib/supabase.mock.js
// عميل Supabase تجريبي (Mock) شغال بالكامل في الذاكرة — مفيش اتصال بأي سيرفر.
// بيدعم نفس الأوامر اللي الصفحات بتستخدمها (from/select/insert/update/delete/rpc/auth/storage/channel)
// عشان الصفحات تفضل زي ما هي بالظبط من غير أي تعديل في الكود بتاعها.
// أي بيانات بتتضاف أو تتعدل بتفضل لحد ما تعمل Refresh للصفحة، وبعدها بترجع للبيانات الأصلية.
import { seedDb, MOCK_USER } from './mockData'

const db = seedDb()

// ---------- أدوات مساعدة ----------
const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`)
const nowIso = () => new Date().toISOString()
const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)))
const tick = () => new Promise((resolve) => setTimeout(resolve, 60)) // تأخير بسيط يحاكي الشبكة

// علاقات الجداول (بديل الـ foreign keys): الجدول.اسم_العلاقة → طريقة الربط
const RELATIONS = {
  'farms.land_plots': { table: 'land_plots', many: true, local: 'id', foreign: 'farm_id' },
  'tasks.land_plots': { table: 'land_plots', many: false, local: 'plot_id', foreign: 'id' },
}

// قيم افتراضية عند الإضافة (بتحاكي defaults قاعدة البيانات)
const INSERT_DEFAULTS = {
  farms: () => ({ created_at: nowIso(), updated_at: nowIso() }),
  land_plots: () => ({ created_at: nowIso(), updated_at: nowIso() }),
  farm_seasons: () => ({ created_at: nowIso(), end_date: null }),
  tasks: () => ({ created_at: nowIso(), status: 'قيد_الانتظار' }),
  agricultural_operations: () => ({ performed_at: nowIso() }),
  farm_expenses: () => ({ created_at: nowIso() }),
  farm_revenue: () => ({ recorded_at: nowIso() }),
  farm_history_events: () => ({ created_at: nowIso(), event_date: nowIso() }),
  soil_analysis: () => ({ analyzed_at: nowIso() }),
  plot_media: () => ({ captured_at: nowIso() }),
  notifications: () => ({ created_at: nowIso(), is_read: false }),
  chat_conversations: () => ({ created_at: nowIso() }),
  chat_messages: () => ({ created_at: nowIso() }),
}

function compare(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'ar')
}

// تحليل نص select الخاص بالعلاقات المضمّنة مثل: "*, land_plots(name)" أو "profiles!fk(full_name)"
function parseRelations(selectStr) {
  const rels = []
  if (!selectStr) return rels
  let depth = 0
  let token = ''
  const tokens = []
  for (const ch of selectStr) {
    if (ch === '(') depth += 1
    if (ch === ')') depth -= 1
    if (ch === ',' && depth === 0) { tokens.push(token.trim()); token = '' } else token += ch
  }
  if (token.trim()) tokens.push(token.trim())
  for (const tk of tokens) {
    const idx = tk.indexOf('(')
    if (idx === -1) continue
    let name = tk.slice(0, idx).trim()
    if (name.includes(':')) name = name.split(':')[1]
    if (name.includes('!')) name = name.split('!')[0]
    rels.push(name)
  }
  return rels
}

function attachRelations(table, rows, selectStr) {
  const rels = parseRelations(selectStr)
  if (!rels.length) return rows
  return rows.map((row) => {
    const out = { ...row }
    for (const rel of rels) {
      const def = RELATIONS[`${table}.${rel}`]
      if (!def) { out[rel] = null; continue }
      const target = db[def.table] || []
      if (def.many) out[rel] = target.filter((r) => r[def.foreign] === row[def.local]).map(clone)
      else out[rel] = clone(target.find((r) => r[def.foreign] === row[def.local]) || null)
    }
    return out
  })
}

// تحليل فلتر or: "a.eq.1,b.eq.2"
function parseOr(expr) {
  return expr.split(',').map((part) => {
    const [col, op, ...rest] = part.split('.')
    return { col, op, val: rest.join('.') }
  })
}

function matchOp(rowVal, op, val) {
  switch (op) {
    case 'eq': return String(rowVal) === String(val)
    case 'neq': return String(rowVal) !== String(val)
    case 'gt': return compare(rowVal, val) > 0
    case 'gte': return compare(rowVal, val) >= 0
    case 'lt': return rowVal != null && compare(rowVal, val) < 0
    case 'lte': return rowVal != null && compare(rowVal, val) <= 0
    case 'is': return val === null ? rowVal == null : rowVal === val
    case 'in': return Array.isArray(val) && val.map(String).includes(String(rowVal))
    default: return true
  }
}

class Query {
  constructor(table) {
    this.table = table
    this.action = 'select'
    this.selectStr = '*'
    this.filters = []
    this.orders = []
    this.limitN = null
    this.mode = 'many' // many | single | maybe
    this.payload = null
    this.returning = false
    this.countMode = null
    this.headOnly = false
  }

  select(str = '*', opts = {}) {
    if (this.action === 'select') this.selectStr = str
    else { this.returning = true; this.selectStr = str }
    if (opts.count) this.countMode = opts.count
    if (opts.head) this.headOnly = true
    return this
  }
  insert(payload) { this.action = 'insert'; this.payload = payload; return this }
  update(payload) { this.action = 'update'; this.payload = payload; return this }
  upsert(payload) { this.action = 'upsert'; this.payload = payload; return this }
  delete() { this.action = 'delete'; return this }

  eq(col, val) { this.filters.push((r) => matchOp(r[col], 'eq', val)); return this }
  neq(col, val) { this.filters.push((r) => matchOp(r[col], 'neq', val)); return this }
  gt(col, val) { this.filters.push((r) => matchOp(r[col], 'gt', val)); return this }
  gte(col, val) { this.filters.push((r) => matchOp(r[col], 'gte', val)); return this }
  lt(col, val) { this.filters.push((r) => matchOp(r[col], 'lt', val)); return this }
  lte(col, val) { this.filters.push((r) => matchOp(r[col], 'lte', val)); return this }
  is(col, val) { this.filters.push((r) => matchOp(r[col], 'is', val)); return this }
  in(col, vals) { this.filters.push((r) => matchOp(r[col], 'in', vals)); return this }
  not(col, op, val) { this.filters.push((r) => !matchOp(r[col], op, val)); return this }
  ilike(col, pattern) {
    const needle = String(pattern).replace(/%/g, '').toLowerCase()
    this.filters.push((r) => String(r[col] ?? '').toLowerCase().includes(needle))
    return this
  }
  like(col, pattern) { return this.ilike(col, pattern) }
  or(expr) {
    const conds = parseOr(expr)
    this.filters.push((r) => conds.some((c) => matchOp(r[c.col], c.op, c.val)))
    return this
  }
  order(col, opts = {}) { this.orders.push({ col, asc: opts.ascending !== false }); return this }
  limit(n) { this.limitN = n; return this }
  range(from, to) { this.limitN = to - from + 1; return this }
  single() { this.mode = 'single'; return this }
  maybeSingle() { this.mode = 'maybe'; return this }

  async execute() {
    await tick()
    const table = db[this.table]
    if (!table) return { data: null, error: { message: `الجدول ${this.table} غير موجود في النسخة التجريبية`, code: 'MOCK_NO_TABLE' } }
    const matches = (r) => this.filters.every((f) => f(r))

    if (this.action === 'insert' || this.action === 'upsert') {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((p) => {
        const defaults = INSERT_DEFAULTS[this.table] ? INSERT_DEFAULTS[this.table]() : {}
        return { id: newId(), ...defaults, ...clone(p) }
      })
      const inserted = []
      for (const row of rows) {
        const existingIdx = this.action === 'upsert' ? table.findIndex((r) => r.id === row.id) : -1
        if (existingIdx >= 0) { table[existingIdx] = { ...table[existingIdx], ...row }; inserted.push(table[existingIdx]) } else { table.push(row); inserted.push(row) }
      }
      if (!this.returning) return { data: null, error: null }
      return this.shape(attachRelations(this.table, inserted, this.selectStr).map(clone))
    }

    if (this.action === 'update') {
      const changed = []
      for (const row of table) {
        if (matches(row)) { Object.assign(row, clone(this.payload)); changed.push(row) }
      }
      if (!this.returning) return { data: null, error: null }
      return this.shape(changed.map(clone))
    }

    if (this.action === 'delete') {
      const removed = table.filter(matches)
      db[this.table] = table.filter((r) => !matches(r))
      // حذف تتابعي بسيط (بديل ON DELETE CASCADE)
      if (this.table === 'farms') {
        const plotIds = db.land_plots.filter((p) => removed.some((f) => f.id === p.farm_id)).map((p) => p.id)
        db.land_plots = db.land_plots.filter((p) => !removed.some((f) => f.id === p.farm_id))
        db.farm_seasons = db.farm_seasons.filter((s) => !removed.some((f) => f.id === s.farm_id))
        db.tasks = db.tasks.filter((t) => !plotIds.includes(t.plot_id))
        db.farm_expenses = db.farm_expenses.filter((e) => !removed.some((f) => f.id === e.farm_id))
        db.farm_revenue = db.farm_revenue.filter((e) => !removed.some((f) => f.id === e.farm_id))
        db.farm_history_events = db.farm_history_events.filter((e) => !removed.some((f) => f.id === e.farm_id))
      }
      if (this.table === 'land_plots') {
        db.farm_seasons = db.farm_seasons.filter((s) => !removed.some((p) => p.id === s.plot_id))
        db.tasks = db.tasks.filter((t) => !removed.some((p) => p.id === t.plot_id))
      }
      return this.returning ? this.shape(removed.map(clone)) : { data: null, error: null }
    }

    // select
    let rows = table.filter(matches)
    const count = rows.length
    for (const o of [...this.orders].reverse()) rows = [...rows].sort((a, b) => (o.asc ? 1 : -1) * compare(a[o.col], b[o.col]))
    if (this.limitN != null) rows = rows.slice(0, this.limitN)
    if (this.headOnly) return { data: null, count, error: null }
    const result = this.shape(attachRelations(this.table, rows, this.selectStr).map(clone))
    if (this.countMode) result.count = count
    return result
  }

  shape(rows) {
    if (this.mode === 'many') return { data: rows, error: null }
    if (rows.length === 1) return { data: rows[0], error: null }
    if (this.mode === 'maybe' && rows.length === 0) return { data: null, error: null }
    return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } }
  }

  then(resolve, reject) { return this.execute().then(resolve, reject) }
}

// ---------- الدوال البعيدة (RPC) ----------
const RPC = {
  get_farms_directory: () => [],
  save_crop_prediction_run: () => newId(),
}

// ---------- التخزين (الصور) ----------
const blobUrls = new Map()
function storageBucket(bucket) {
  return {
    upload: async (path, file) => {
      await tick()
      try { if (file && typeof URL !== 'undefined' && URL.createObjectURL) blobUrls.set(`${bucket}/${path}`, URL.createObjectURL(file)) } catch { /* تجاهل */ }
      return { data: { path }, error: null }
    },
    getPublicUrl: (path) => ({ data: { publicUrl: blobUrls.get(`${bucket}/${path}`) || '' } }),
    createSignedUrl: async (path) => ({ data: { signedUrl: blobUrls.get(`${bucket}/${path}`) || '' }, error: null }),
    remove: async () => ({ data: [], error: null }),
  }
}

// ---------- القنوات اللحظية (Realtime) — شكلية فقط ----------
function makeChannel() {
  const ch = {
    on: () => ch,
    subscribe: (cb) => { if (typeof cb === 'function') setTimeout(() => cb('SUBSCRIBED'), 0); return ch },
    track: async () => 'ok',
    untrack: async () => 'ok',
    presenceState: () => ({}),
    unsubscribe: async () => 'ok',
  }
  return ch
}

// ---------- المساعد الذكي (دالة السيرفر) — رد تجريبي ثابت ----------
const BOT_REPLY = 'ده رد تجريبي من المساعد الزراعي. في النسخة الحقيقية هترد عليك بتحليل مفصل لحالة محصولك حسب الصورة والبيانات اللي بتبعتها. نصيحة عامة: راقب رطوبة التربة والآفات أسبوعيًا، وسمّد على دفعات صغيرة بدل دفعة واحدة كبيرة.'

if (typeof window !== 'undefined' && !window.__ispscFetchPatched) {
  window.__ispscFetchPatched = true
  const realFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || ''
    if (url.includes('/functions/v1/chat-assistant')) {
      await new Promise((resolve) => setTimeout(resolve, 700))
      return new Response(JSON.stringify({ reply: BOT_REPLY }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return realFetch(input, init)
  }
}

// ---------- الواجهة العامة (نفس شكل supabase-js) ----------
const session = { access_token: 'mock-token', user: MOCK_USER }

export const supabase = {
  from: (table) => new Query(table),
  rpc: async (name, args = {}) => {
    await tick()
    const fn = RPC[name]
    if (!fn) return { data: null, error: { message: `الدالة ${name} غير موجودة في النسخة التجريبية` } }
    try { return { data: clone(fn(args)), error: null } } catch (err) { return { data: null, error: { message: err.message } } }
  },
  auth: {
    getUser: async () => ({ data: { user: MOCK_USER }, error: null }),
    getSession: async () => ({ data: { session }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { user: MOCK_USER, session }, error: null }),
    updateUser: async ({ data } = {}) => {
      if (data) Object.assign(MOCK_USER.user_metadata, data)
      return { data: { user: MOCK_USER }, error: null }
    },
  },
  storage: { from: storageBucket },
  channel: () => makeChannel(),
  removeChannel: async () => 'ok',
}


// جسر مؤقت (المرحلة 1): بيخلي اسم وإيميل المستخدم الحقيقي يظهروا في الصفحات اللي لسه على بيانات تجريبية.
// الـ id بيفضل زي ما هو عشان البيانات التجريبية تفضل شغالة. بيتشال في المرحلة 3.
export function setMockIdentity({ email, full_name } = {}) {
  if (email) MOCK_USER.email = email
  if (full_name) {
    MOCK_USER.user_metadata.full_name = full_name
    const me = (db.profiles || []).find((p) => p.id === MOCK_USER.id)
    if (me) me.full_name = full_name
  }
}
