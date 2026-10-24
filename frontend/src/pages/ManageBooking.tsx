import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { TextField } from '../components/Field'
import { ApiError, api, type PublicBooking } from '../lib/api'
import { business, fullAddress } from '../lib/catalog'
import { duration, money } from '../lib/format'
import { useSeo } from '../lib/seo'

/* ---------- lookup ---------- */

export function ManageLookup() {
  useSeo({ title: 'Manage Your Booking', description: 'View or cancel your Castle Spa & Massage appointment.' })
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setFields({})
    try {
      const r = await api<{ manage_token: string }>('/api/bookings/lookup', { method: 'POST', body: { code, email } })
      navigate(`/manage-booking/${r.manage_token}`)
    } catch (err) {
      const e = err as ApiError
      setError(e.message)
      setFields(e.fields)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section">
      <div className="narrow">
        <span className="eyebrow">Your appointment</span>
        <h1>Manage your booking</h1>
        <p className="lede">Enter the booking reference from your confirmation and the email you booked with.</p>
        <form className="panel form" onSubmit={submit} noValidate style={{ marginTop: '1.5rem' }}>
          {error && (
            <div className="notice notice--error" role="alert">
              <p>{error}</p>
            </div>
          )}
          <div className="form-row">
            <TextField label="Booking reference" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" placeholder="e.g. 7KQ2M9XA" required error={fields.code} />
            <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required error={fields.email} />
          </div>
          <div>
            <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Finding…' : 'Find my booking'}</button>
          </div>
        </form>
        <p style={{ marginTop: '1.5rem', color: 'var(--muted)' }}>
          Can't find your reference? Call us at <a className="link" href={`tel:${business.phone_e164}`}>{business.phone}</a>.
        </p>
      </div>
    </section>
  )
}

/* ---------- view / cancel ---------- */

function icsFor(b: PublicBooking): string {
  const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d+/, '').slice(0, 15) + 'Z'
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Castle Spa & Massage//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${b.code}@castlespalv.com`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.starts_at)}`,
    `DTEND:${stamp(b.ends_at)}`,
    `SUMMARY:${b.service_name} at ${business.name}`,
    `LOCATION:${fullAddress.replace(/,/g, '\\,')}`,
    `DESCRIPTION:Booking reference ${b.code}. Call ${business.phone} with any questions.`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

const STATUS_LABEL: Record<PublicBooking['status'], string> = {
  pending: 'Pending confirmation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'Missed',
}

export function ManageToken() {
  const { token = '' } = useParams()
  const [params] = useSearchParams()
  const isNew = params.get('new') === '1'
  const emailed = params.get('emailed') === '1'
  const [booking, setBooking] = useState<PublicBooking | null>(null)
  const title = booking?.status === 'cancelled' ? 'Booking Cancelled' : isNew ? 'Booking Confirmed' : 'Your Booking'
  useSeo({ title, noindex: true })
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    api<PublicBooking>(`/api/bookings/manage/${encodeURIComponent(token)}`)
      .then(setBooking)
      .catch((e: Error) => setError(e.message))
  }, [token])

  const icsHref = useMemo(() => (booking ? `data:text/calendar;charset=utf-8,${encodeURIComponent(icsFor(booking))}` : ''), [booking])

  async function cancel() {
    setBusy(true)
    setCancelError('')
    try {
      setBooking(await api<PublicBooking>(`/api/bookings/manage/${encodeURIComponent(token)}/cancel`, { method: 'POST' }))
      setConfirming(false)
    } catch (err) {
      setCancelError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <section className="section">
        <div className="narrow">
          <h1>Booking not found</h1>
          <div className="notice notice--error" role="alert"><p>{error}</p></div>
          <p style={{ marginTop: '1.5rem' }}>
            <Link className="btn btn--primary" to="/manage-booking/">Look up a booking</Link>
          </p>
        </div>
      </section>
    )
  }

  if (!booking) {
    return (
      <section className="section">
        <div className="narrow"><div className="skeleton" style={{ height: 360 }} aria-label="Loading booking" /></div>
      </section>
    )
  }

  const active = booking.status === 'confirmed' || booking.status === 'pending'
  const justCancelled = booking.status === 'cancelled'

  return (
    <section className="section">
      <div className="narrow">
        {isNew && active ? (
          <>
            <span className="eyebrow">Booking confirmed</span>
            <h1>You're booked, {booking.customer_name.split(' ')[0]}!</h1>
            <p className="lede">
              {emailed ? 'We have emailed your confirmation. ' : ''}Please keep your booking reference: you'll need it to manage your
              appointment.
            </p>
          </>
        ) : (
          <>
            <span className="eyebrow">Your appointment</span>
            <h1>{justCancelled ? 'Booking cancelled' : 'Your booking'}</h1>
          </>
        )}

        <div className="panel" style={{ marginTop: '1.5rem' }}>
          <p className="eyebrow" style={{ marginBottom: '0.2rem' }}>Booking reference</p>
          <p className="confirm-code">{booking.code}</p>
          <div className="summary" style={{ position: 'static' }}>
          <dl>
            <dt>Status</dt>
            <dd>{STATUS_LABEL[booking.status]}</dd>
            <dt>Treatment</dt>
            <dd>{booking.service_name}</dd>
            <dt>Duration</dt>
            <dd>{duration(booking.minutes)}</dd>
            <dt>When</dt>
            <dd>{booking.starts_local}</dd>
            <dt>Where</dt>
            <dd>{fullAddress}</dd>
            <dt className="total">Price</dt>
            <dd className="total">{money(booking.price_cents)}</dd>
          </dl>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '1rem' }}>Payment is taken at the spa.</p>

          {active && (
            <div className="step-actions">
              <a className="btn btn--ghost" href={icsHref} download={`castle-spa-${booking.code}.ics`}>Add to calendar</a>
              {booking.can_cancel && !confirming && (
                <button className="btn btn--ghost" type="button" onClick={() => setConfirming(true)} style={{ color: 'var(--danger)' }}>
                  Cancel booking
                </button>
              )}
            </div>
          )}

          {confirming && (
            <div className="notice notice--info" role="alertdialog" aria-labelledby="cancel-q" style={{ marginTop: '1.2rem' }}>
              <p id="cancel-q"><strong>Cancel this appointment?</strong> This can't be undone.</p>
              {cancelError && <p style={{ color: 'var(--danger)' }}>{cancelError}</p>}
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
                <button className="btn btn--primary btn--sm" type="button" onClick={cancel} disabled={busy}>
                  {busy ? 'Cancelling…' : 'Yes, cancel it'}
                </button>
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => setConfirming(false)} disabled={busy}>
                  Keep my booking
                </button>
              </div>
            </div>
          )}

          {active && !booking.can_cancel && (
            <div className="notice notice--info" style={{ marginTop: '1.2rem' }}>
              <p>
                Online cancellation closes {booking.cancel_cutoff_hours} hours before your appointment. To change or cancel, please call
                us at <a className="link" href={`tel:${business.phone_e164}`}>{business.phone}</a>.
              </p>
            </div>
          )}
        </div>

        <p style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link className="btn btn--primary" to="/appointment/">{justCancelled ? 'Book another time' : 'Book another treatment'}</Link>
          <Link className="btn btn--ghost" to="/location/">Directions</Link>
        </p>
      </div>
    </section>
  )
}
