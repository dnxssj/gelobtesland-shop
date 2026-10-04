import { supabase } from './supabase'

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase ist nicht konfiguriert.')
  return supabase
}

export function formatMoney(value, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(Number(value || 0))
}

export function formatDate(value, options = {}) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', ...options }).format(new Date(value))
}

export const ORDER_STATUS = {
  pending: 'Offen',
  paid: 'Bezahlt',
  processing: 'In Bearbeitung',
  shipped: 'Versendet',
  delivered: 'Zugestellt',
  cancelled: 'Storniert',
  refunded: 'Erstattet',
}

export const PAYMENT_STATUS = {
  pending: 'Offen',
  paid: 'Bezahlt',
  expired: 'Abgelaufen',
  failed: 'Fehlgeschlagen',
  refunded: 'Erstattet',
}

export function statusLabel(status) {
  return ORDER_STATUS[status] || status || '—'
}
