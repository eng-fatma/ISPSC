// src/lib/presence.js
// نظام "متصل الآن" على مستوى الموقع كله — قناة Presence واحدة مشتركة بين كل الصفحات
// أي صفحة تقدر تسأل "مين متصل دلوقتي" من غير ما تعمل قناة جديدة لوحدها
import { supabase } from './supabase'

let channel = null
let subscribed = false
let pendingUserId = null
const listeners = new Set()

function notifyListeners() {
  listeners.forEach((cb) => cb())
}

function getChannel() {
  if (channel) return channel
  channel = supabase
    .channel('online-users', {
      config: { presence: { key: 'user_id' } },
    })
    .on('presence', { event: 'sync' }, notifyListeners)
    .on('presence', { event: 'join' }, notifyListeners)
    .on('presence', { event: 'leave' }, notifyListeners)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        subscribed = true
        if (pendingUserId) {
          channel.track({ user_id: pendingUserId, online_at: new Date().toISOString() })
        }
      }
    })
  return channel
}

// ينادَى مرة واحدة من AppShell لما مستخدم يدخل الموقع — يعلن إنه "متصل"
export function trackPresence(userId) {
  pendingUserId = userId
  const ch = getChannel()
  if (subscribed) {
    ch.track({ user_id: userId, online_at: new Date().toISOString() })
  }
}

// رجّع array فيها كل الـ user_id بتوع المتصلين دلوقتي
export function getOnlineUserIds() {
  if (!channel) return []
  const state = channel.presenceState()
  return Object.values(state)
    .flat()
    .map((p) => p.user_id)
}

// أي كومبوننت (زي صفحة الشات) يسجل نفسه عشان يتنده عليه لما حد يدخل/يخرج
export function onPresenceChange(callback) {
  getChannel()
  listeners.add(callback)
  return () => listeners.delete(callback)
}
