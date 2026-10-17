import { createDemoState } from '../data/demoData.js'

export const STORAGE_KEY = 'frontier-business-os:v1'

export function createId(prefix = 'record') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function isUsableState(value) {
  return value && value.version === 1 && Array.isArray(value.tenants) && Array.isArray(value.customers)
}

export function loadState() {
  if (typeof window === 'undefined') return createDemoState()
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : null
    return isUsableState(parsed) ? parsed : createDemoState()
  } catch {
    return createDemoState()
  }
}

export function saveState(state) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetState() {
  const next = createDemoState()
  saveState(next)
  return next
}
