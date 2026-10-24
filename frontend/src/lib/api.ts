import { business } from './catalog'

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string | null
  signal?: AbortSignal
}

export async function api<T>(path: string, { method = 'GET', body, token, signal }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, signal, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new ApiError(0, `We couldn't reach our booking system. Please check your connection, or call us at ${business.phone}.`)
  }

  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : `Something went wrong. Please call us at ${business.phone}.`
    throw new ApiError(res.status, detail, data.fields ?? {})
  }
  return data as T
}

export interface Slot {
  time: string
  available: boolean
}

export interface BookingConfig {
  first_date: string
  last_date: string
  slot_interval_minutes: number
  min_notice_minutes: number
  cancel_cutoff_hours: number
  timezone: string
  phone: string
}

export interface PublicBooking {
  code: string
  service_slug: string
  service_name: string
  minutes: number
  price_cents: number
  starts_at: string
  ends_at: string
  starts_local: string
  customer_name: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  can_cancel: boolean
  cancel_cutoff_hours: number
}

export interface CreatedBooking extends PublicBooking {
  manage_token: string
  confirmation_email: boolean
}
