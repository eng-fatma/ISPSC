import { supabase as real } from './supabaseClient'
import { supabase as mock } from './supabase.mock'

const REAL_TABLES = new Set([
  'profiles', 'chat_conversations', 'chat_messages',
  'farms', 'land_plots', 'soil_analysis',
  'crops', 'farm_seasons', 'tasks', 'agricultural_operations', 'farm_history_events',
  'farm_expenses', 'farm_revenue',
  // المرحلة 6
  'market_prices', 'crop_prediction_runs', 'crop_prediction_results',
  // المرحلة 5
  'notifications', 'plot_media',
])
const REAL_BUCKETS = new Set(['chat-images', 'plot-media', 'avatars', 'covers'])
const REAL_RPCS = new Set(['save_crop_prediction_run'])

// قنوات Realtime: الإشعارات بس حقيقية. باقي القنوات (زي online-users) لسه mock.
const REAL_CHANNEL_PREFIXES = ['notifications-']
const channelOwner = new WeakMap() // بيفتكر القناة اتعملت من أنهي عميل عشان removeChannel يمسحها من نفس العميل

export const supabase = new Proxy(mock, {
  get(target, prop) {
    if (prop === 'from') return (table) => (REAL_TABLES.has(table) ? real : mock).from(table)
    if (prop === 'rpc') return (fn, args, options) => (REAL_RPCS.has(fn) ? real : mock).rpc(fn, args, options)
    if (prop === 'storage') return { from: (bucket) => (REAL_BUCKETS.has(bucket) ? real : mock).storage.from(bucket) }
    if (prop === 'channel') {
      return (name, opts) => {
        const client = REAL_CHANNEL_PREFIXES.some((p) => String(name).startsWith(p)) ? real : mock
        const ch = client.channel(name, opts)
        if (ch && (typeof ch === 'object' || typeof ch === 'function')) channelOwner.set(ch, client)
        return ch
      }
    }
    if (prop === 'removeChannel') {
      return (ch) => {
        const client = (ch && (typeof ch === 'object' || typeof ch === 'function') && channelOwner.get(ch)) || mock
        return client.removeChannel(ch)
      }
    }
    if (prop === 'auth' || prop === 'functions') return real[prop]
    const value = target[prop]
    return typeof value === 'function' ? value.bind(target) : value
  },
})