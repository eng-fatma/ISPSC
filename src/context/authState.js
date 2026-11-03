// src/context/authState.js
// الـ Context والـ hook وثوابت الحساب التجريبي (ملف منفصل عن الـ Provider عشان Fast Refresh يشتغل صح).
import { createContext, useContext } from 'react'

export const DEMO_EMAIL = (import.meta.env.VITE_DEMO_EMAIL || '').trim().toLowerCase()
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || ''
export const DEMO_AVAILABLE = Boolean(DEMO_EMAIL && DEMO_PASSWORD)

export const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth لازم يتستخدم جوه AuthProvider')
  return ctx
}
