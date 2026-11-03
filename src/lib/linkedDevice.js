// src/lib/linkedDevice.js
// حالة "جهاز التحليل المربوط" — مشتركة بين صفحة الجهاز (/device) وصفحة الإعدادات.
// TODO: Backend Integration — دلوقتي الحالة بتتخزّن في المتصفح (localStorage) كمحاكاة.
// لما الباك يجهز: كل دالة هنا تتحول لطلب للسيرفر (جدول أجهزة: device_id ↔ user_id)، والواجهة مش هتتغيّر.
import { useMemo, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'ispsc_linked_device'
const CHANGE_EVENT = 'ispsc-linked-device-change'

function readRaw() {
  try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
}

function emitChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function getLinkedDevice() {
  const raw = readRaw()
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

// قراءة تجريبية للتربة — TODO: Backend Integration: القراءة الحقيقية بتيجي من الجهاز عن طريق السيرفر
export function makeDemoReading() {
  const rand = (min, max, digits = 1) => Number((min + Math.random() * (max - min)).toFixed(digits))
  return {
    moisture: rand(18, 35, 0), // رطوبة التربة %
    temperature: rand(20, 30), // حرارة التربة °م
    salinity: rand(1, 3), // الملوحة dS/m
    at: new Date().toISOString(),
  }
}

// بيبني بيانات الجهاز المربوط من الجهاز اللي المستخدم اختاره في صفحة البحث
export function createLinkedDevice(found) {
  const now = new Date().toISOString()
  return {
    id: found.id,
    name: found.name,
    linkedAt: now,
    online: true,
    battery: 82, // TODO: Backend Integration — من الجهاز
    lastSyncAt: now,
    autoSync: true,
    farmId: null, // الأرض اللي الجهاز مربوط بيها (اختياري)
    reading: makeDemoReading(),
  }
}

export function saveLinkedDevice(device) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(device)) } catch { /* التخزين مش متاح */ }
  emitChange()
}

export function updateLinkedDevice(patch) {
  const current = getLinkedDevice()
  if (!current) return
  saveLinkedDevice({ ...current, ...patch })
}

export function clearLinkedDevice() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* التخزين مش متاح */ }
  emitChange()
}

function subscribe(callback) {
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', callback) // لو اتغيّر من تاب تاني
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

// Hook: بيرجّع الجهاز المربوط (أو null) وبيتحدّث لوحده لما يتغيّر
export function useLinkedDevice() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null)
  return useMemo(() => {
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }, [raw])
}