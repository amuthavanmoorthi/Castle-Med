import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { TextArea, TextField } from '../../components/Field'
import { ApiError, api, type Slot } from '../../lib/api'
import { business, services } from '../../lib/catalog'
import { addDays, clock, duration, longDate, money, toISODate } from '../../lib/format'
import { useSeo } from '../../lib/seo'

const TOKEN_KEY = 'castle_admin'

interface AdminBooking {
  id: number
  code: string
  service_name: string
  minutes: number
  price_cents: number
  starts_at: string
  starts_local: string
  customer_name: string
  customer_email: string
  customer_phone: string
  notes: string
  status: string
  source: string
}

interface Message {
  id: number
  name: string
  email: string
  phone: string
  message: string
  status: string
  created_at: string
}

interface Block {
  id: number
  starts_local: string
  ends_local: string
  reason: string
}

interface PageOf<T> {
  items: T[]
  total: number
}

type Call = <T>(path: string, opts?: Parameters<typeof api>[1]) => Promise<T>

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'var(--forest)',
  pending: '#8a6d1d',
  completed: 'var(--muted)',
  cancelled: 'var(--danger)',
  no_show: 'var(--danger)',
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="pill" style={{ color: STATUS_STYLE[status] ?? 'inherit', borderColor: 'currentColor' }}>
      {status.replace('_', ' ')}
    </span>
  )
}

/* ---------- login ---------- */

function Login({ onToken }: { onToken: (t: string) => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await api<{ token: string }>('/api/admin/login', { method: 'POST', body: { password } })
      onToken(r.token)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="section">
      <div className="narrow" style={{ maxWidth: 440 }}>
        <span className="eyebrow">Staff</span>
        <h1>Sign in</h1>
        <form className="panel form" onSubmit={submit}>
          {error && <div className="notice notice--error" role="alert"><p>{error}</p></div>}
          <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
          <div><button className="btn btn--primary" disabled={busy || !password}>{busy ? 'Signing in…' : 'Sign in'}</button></div>
        </form>
      </div>
    </section>
  )
}

/* ---------- schedule (one day) ---------- */

function BookingRow({ b, call, onChange }: { b: AdminBooking; call: Call; onChange: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = async (status: string) => {
    if (status === 'cancelled' && !window.confirm(`Cancel ${b.customer_name}'s booking? The customer will be emailed if mail is set up.`)) return
    setBusy(true)
    setError('')
    try {
      await call(`/api/admin/bookings/${b.id}`, { method: 'PATCH', body: { status } })
      onChange()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const active = b.status === 'confirmed' || b.status === 'pending'
  return (
    <tr>
      <td data-label="Time"><strong>{b.starts_local.split(' at ')[1]}</strong><br /><small>{duration(b.minutes)}</small></td>
      <td data-label="Guest">
        <strong>{b.customer_name}</strong><br />
        <a className="link" href={`tel:${b.customer_phone.replace(/[^\d+]/g, '')}`}>{b.customer_phone}</a><br />
        <small>{b.customer_email}</small>
      </td>
      <td data-label="Treatment">{b.service_name}<br /><small>{money(b.price_cents)} · {b.code}{b.source === 'staff' ? ' · by staff' : ''}</small>
        {b.notes && <p className="admin-note">{b.notes}</p>}
      </td>
      <td data-label="Status"><StatusPill status={b.status} />{error && <p className="error">{error}</p>}</td>
      <td data-label="Actions">
        {active && (
          <div className="admin-actions">
            <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => set('completed')}>Done</button>
            <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => set('no_show')}>No-show</button>
            <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => set('cancelled')} style={{ color: 'var(--danger)' }}>Cancel</button>
          </div>
        )}
      </td>
    </tr>
  )
}

function BookingTable({ rows, call, reload }: { rows: AdminBooking[]; call: Call; reload: () => void }) {
  if (!rows.length) return <p className="notice notice--info">No bookings.</p>
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr><th>Time</th><th>Guest</th><th>Treatment</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
        </thead>
        <tbody>
          {rows.map((b) => <BookingRow key={b.id} b={b} call={call} onChange={reload} />)}
        </tbody>
      </table>
    </div>
  )
}

function Schedule({ call }: { call: Call }) {
  const [day, setDay] = useState(toISODate(new Date()))
  const [rows, setRows] = useState<AdminBooking[] | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => {
    setError('')
    call<PageOf<AdminBooking>>(`/api/admin/bookings?from=${day}&to=${day}&page_size=200`)
      .then((r) => setRows(r.items))
      .catch((e: Error) => setError(e.message))
  }, [call, day])
  useEffect(load, [load])
  return (
    <>
      <div className="admin-toolbar">
        <button className="btn btn--ghost btn--sm" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day">‹</button>
        <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Day" />
        <button className="btn btn--ghost btn--sm" onClick={() => setDay(addDays(day, 1))} aria-label="Next day">›</button>
        <button className="btn btn--ghost btn--sm" onClick={() => setDay(toISODate(new Date()))}>Today</button>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{longDate(day)}</h2>
      </div>
      {error && <div className="notice notice--error"><p>{error}</p></div>}
      {rows ? <BookingTable rows={rows} call={call} reload={load} /> : <div className="skeleton" style={{ height: 200 }} />}
    </>
  )
}

function Search({ call }: { call: Call }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState<AdminBooking[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const load = useCallback(() => {
    const qs = new URLSearchParams({ page_size: '100' })
    if (q.trim()) qs.set('q', q.trim())
    if (status) qs.set('status', status)
    if (!q.trim() && !status) qs.set('from', toISODate(new Date()))
    setError('')
    call<PageOf<AdminBooking>>(`/api/admin/bookings?${qs}`)
      .then((r) => { setRows(r.items); setTotal(r.total) })
      .catch((e: Error) => setError(e.message))
  }, [call, q, status])
  // load once on open; after that only the Search button reloads
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <form className="admin-toolbar" onSubmit={(e) => { e.preventDefault(); load() }}>
        <input type="search" placeholder="Name, phone, email or reference" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search bookings" style={{ minWidth: 260 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          {['confirmed', 'pending', 'completed', 'cancelled', 'no_show'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button className="btn btn--primary btn--sm">Search</button>
        <small style={{ color: 'var(--muted)' }}>{!q && !status ? 'Showing upcoming' : `${total} found`}</small>
      </form>
      {error && <div className="notice notice--error"><p>{error}</p></div>}
      {rows ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>When</th><th>Guest</th><th>Treatment</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td data-label="When">{b.starts_local}</td>
                  <td data-label="Guest"><strong>{b.customer_name}</strong><br /><small>{b.customer_phone} · {b.customer_email}</small></td>
                  <td data-label="Treatment">{b.service_name} ({duration(b.minutes)})<br /><small>{b.code}</small></td>
                  <td data-label="Status"><StatusPill status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="notice notice--info">Nothing found.</p>}
        </div>
      ) : <div className="skeleton" style={{ height: 200 }} />}
    </>
  )
}

/* ---------- messages ---------- */

function Messages({ call, onRead }: { call: Call; onRead: () => void }) {
  const [filter, setFilter] = useState('new')
  const [rows, setRows] = useState<Message[] | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => {
    call<PageOf<Message>>(`/api/admin/messages?page_size=100${filter ? `&status=${filter}` : ''}`)
      .then((r) => setRows(r.items))
      .catch((e: Error) => setError(e.message))
  }, [call, filter])
  useEffect(load, [load])
  const set = async (id: number, status: string) => {
    await call(`/api/admin/messages/${id}`, { method: 'PATCH', body: { status } })
    load()
    onRead()
  }
  return (
    <>
      <div className="admin-toolbar" role="group" aria-label="Filter">
        {[['new', 'New'], ['read', 'Read'], ['archived', 'Archived'], ['', 'All']].map(([v, l]) => (
          <button key={l} className="chip" aria-pressed={filter === v} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>
      {error && <div className="notice notice--error"><p>{error}</p></div>}
      {rows === null ? <div className="skeleton" style={{ height: 200 }} /> : !rows.length ? <p className="notice notice--info">No messages.</p> : (
        <div className="admin-cards">
          {rows.map((m) => (
            <article key={m.id} className="panel">
              <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <strong>{m.name}</strong>
                  <br />
                  <a className="link" href={`mailto:${m.email}`}>{m.email}</a>
                  {m.phone && <> · <a className="link" href={`tel:${m.phone.replace(/[^\d+]/g, '')}`}>{m.phone}</a></>}
                </div>
                <small style={{ color: 'var(--muted)' }}>{new Date(m.created_at + 'Z').toLocaleString()}</small>
              </header>
              <p style={{ whiteSpace: 'pre-wrap', margin: '1rem 0' }}>{m.message}</p>
              <div className="admin-actions">
                {m.status !== 'read' && <button className="btn btn--ghost btn--sm" onClick={() => set(m.id, 'read')}>Mark read</button>}
                {m.status !== 'archived' && <button className="btn btn--ghost btn--sm" onClick={() => set(m.id, 'archived')}>Archive</button>}
                {m.status !== 'new' && <button className="btn btn--ghost btn--sm" onClick={() => set(m.id, 'new')}>Mark new</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}

/* ---------- closures ---------- */

function Closures({ call }: { call: Call }) {
  const [rows, setRows] = useState<Block[] | null>(null)
  const [form, setForm] = useState({ date: toISODate(new Date()), start: '', end: '', reason: '' })
  const [error, setError] = useState('')
  const load = useCallback(() => {
    call<Block[]>('/api/admin/blocked-times').then(setRows).catch((e: Error) => setError(e.message))
  }, [call])
  useEffect(load, [load])
  async function add(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await call('/api/admin/blocked-times', {
        method: 'POST',
        body: { date: form.date, start: form.start || '00:00', end: form.end || '24:00', reason: form.reason },
      })
      setForm((f) => ({ ...f, start: '', end: '', reason: '' }))
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }
  return (
    <>
      <p className="lede" style={{ fontSize: '1rem' }}>Block out holidays or busy periods. Online booking hides these times. Leave the times empty to close the whole day.</p>
      <form className="admin-toolbar" onSubmit={add}>
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label="Date" required />
        <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} aria-label="From" />
        <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} aria-label="Until" />
        <input placeholder="Reason (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} aria-label="Reason" />
        <button className="btn btn--primary btn--sm">Add closure</button>
      </form>
      {error && <div className="notice notice--error"><p>{error}</p></div>}
      {rows && (rows.length ? (
        <ul className="admin-list">
          {rows.map((b) => (
            <li key={b.id}>
              <span><strong>{b.starts_local}</strong> to <strong>{b.ends_local}</strong>{b.reason && ` · ${b.reason}`}</span>
              <button className="btn btn--ghost btn--sm" onClick={() => call(`/api/admin/blocked-times/${b.id}`, { method: 'DELETE' }).then(load)}>Remove</button>
            </li>
          ))}
        </ul>
      ) : <p className="notice notice--info">No upcoming closures.</p>)}
    </>
  )
}

/* ---------- staff booking ---------- */

function NewBooking({ call, onCreated }: { call: Call; onCreated: () => void }) {
  const [slug, setSlug] = useState(services[0].slug)
  const svc = services.find((s) => s.slug === slug)!
  const [minutes, setMinutes] = useState(svc.options[0].minutes)
  const [date, setDate] = useState(toISODate(new Date()))
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [time, setTime] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    setTime('')
    setSlots(null)
    call<{ slots: Slot[] }>(`/api/admin/availability?service=${slug}&minutes=${minutes}&date=${date}`).then((r) => setSlots(r.slots)).catch(() => setSlots([]))
  }, [call, slug, minutes, date])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    setMsg(null)
    try {
      const b = await call<AdminBooking>('/api/admin/bookings', { method: 'POST', body: { service_slug: slug, minutes, date, time, ...form } })
      setMsg({ ok: true, text: `Booked ${b.customer_name}: ${b.service_name}, ${b.starts_local}. Reference ${b.code}.` })
      onCreated()
      setForm({ name: '', phone: '', email: '', notes: '' })
      setTime('')
      setSlots(null)
      call<{ slots: Slot[] }>(`/api/admin/availability?service=${slug}&minutes=${minutes}&date=${date}`).then((r) => setSlots(r.slots))
    } catch (err) {
      const e = err as ApiError
      setErrors(e.fields)
      setMsg({ ok: false, text: e.message })
    }
  }

  return (
    <form className="form" onSubmit={submit} style={{ maxWidth: 760 }}>
      <p className="lede" style={{ fontSize: '1rem' }}>For phone and walk-in bookings. The minimum-notice rule doesn't apply, but capacity does.</p>
      {msg && <div className={`notice ${msg.ok ? 'notice--ok' : 'notice--error'}`} role="status"><p>{msg.text}</p></div>}
      <div className="form-row">
        <div className="field">
          <label htmlFor="nb-svc">Treatment</label>
          <select id="nb-svc" value={slug} onChange={(e) => { const s = services.find((x) => x.slug === e.target.value)!; setSlug(s.slug); setMinutes(s.options[0].minutes) }}>
            {services.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="nb-min">Duration</label>
          <select id="nb-min" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {svc.options.map((o) => <option key={o.minutes} value={o.minutes}>{duration(o.minutes)}, {money(o.price_cents)}</option>)}
          </select>
        </div>
      </div>
      <div className="field" style={{ maxWidth: 240 }}>
        <label htmlFor="nb-date">Date</label>
        <input id="nb-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </div>
      <div className="slots" role="group" aria-label="Time">
        {slots === null ? <div className="skeleton" style={{ height: 46, gridColumn: '1 / -1' }} /> : slots.map((s) => (
          <button type="button" key={s.time} className="slot" disabled={!s.available} aria-pressed={time === s.time} onClick={() => setTime(s.time)}>{clock(s.time)}</button>
        ))}
      </div>
      {errors.time && <p className="error">{errors.time}</p>}
      <div className="form-row">
        <TextField label="Guest name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
        <TextField label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} required />
      </div>
      <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} required hint="Needed for the confirmation and so the guest can manage the booking." />
      <TextArea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ minHeight: 80 }} />
      <div><button className="btn btn--primary" disabled={!time}>Create booking</button></div>
    </form>
  )
}

/* ---------- shell ---------- */

const TABS = [
  { key: 'schedule', label: 'Schedule' },
  { key: 'new', label: 'New booking' },
  { key: 'search', label: 'All bookings' },
  { key: 'messages', label: 'Messages' },
  { key: 'closures', label: 'Closures' },
] as const

export default function Admin() {
  useSeo({ title: 'Staff', noindex: true })
  const [token, setToken] = useState<string | null>(() => {
    try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null }
  })
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('schedule')
  const [summary, setSummary] = useState<{ today: number; upcoming: number; new_messages: number } | null>(null)

  const logout = useCallback(() => {
    try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* storage blocked */ }
    setToken(null)
  }, [])

  const call: Call = useCallback(
    async (path, opts) => {
      try {
        return await api(path, { ...opts, token })
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) logout()
        throw e
      }
    },
    [token, logout],
  ) as Call

  const refreshSummary = useCallback(() => {
    if (token) call<typeof summary>('/api/admin/summary').then(setSummary).catch(() => undefined)
  }, [call, token])
  useEffect(refreshSummary, [refreshSummary, tab])

  if (!token) {
    return <Login onToken={(t) => { try { sessionStorage.setItem(TOKEN_KEY, t) } catch { /* ignore */ } setToken(t) }} />
  }

  return (
    <section className="section" style={{ paddingTop: '2rem' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <span className="eyebrow">{business.name}</span>
            <h1 style={{ fontSize: '2.2rem', margin: 0 }}>Bookings</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <Link className="btn btn--ghost btn--sm" to="/">View site</Link>
            <button className="btn btn--ghost btn--sm" onClick={logout}>Sign out</button>
          </div>
        </div>

        {summary && (
          <div className="admin-stats">
            <div><strong>{summary.today}</strong><span>today</span></div>
            <div><strong>{summary.upcoming}</strong><span>upcoming</span></div>
            <div><strong>{summary.new_messages}</strong><span>new messages</span></div>
          </div>
        )}

        <div className="admin-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className="chip" aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
              {t.key === 'messages' && summary?.new_messages ? ` (${summary.new_messages})` : ''}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {tab === 'schedule' && <Schedule call={call} />}
          {tab === 'new' && <NewBooking call={call} onCreated={refreshSummary} />}
          {tab === 'search' && <Search call={call} />}
          {tab === 'messages' && <Messages call={call} onRead={refreshSummary} />}
          {tab === 'closures' && <Closures call={call} />}
        </div>
      </div>
    </section>
  )
}
