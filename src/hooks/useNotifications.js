import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

// هوك واحد مشترك للتنبيهات — يستخدمه الجرس في الـNavbar وصفحة /alerts مع بعض
export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const userIdRef = useRef(null)

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    userIdRef.current = user.id
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) setNotifications(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    let channel
    let cancelled = false

    async function setupRealtime() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => setNotifications((prev) => [payload.new, ...prev])
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => setNotifications((prev) => prev.map((n) => (n.id === payload.new.id ? payload.new : n)))
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id))
        )
        .subscribe()
    }

    setupRealtime()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }, [])

  const markAllRead = useCallback(async () => {
    if (!userIdRef.current) return
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userIdRef.current).eq('is_read', false)
  }, [])

  const deleteOne = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }, [])

  const deleteRead = useCallback(async () => {
    if (!userIdRef.current) return
    setNotifications((prev) => prev.filter((n) => !n.is_read))
    await supabase.from('notifications').delete().eq('user_id', userIdRef.current).eq('is_read', true)
  }, [])

  const deleteAll = useCallback(async () => {
    if (!userIdRef.current) return
    setNotifications([])
    await supabase.from('notifications').delete().eq('user_id', userIdRef.current)
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return {
    notifications, loading, unreadCount,
    markRead, markAllRead, deleteOne, deleteRead, deleteAll,
    refresh: fetchNotifications,
  }
}