import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Honeypot, TextArea, TextField } from '../components/Field'
import { ApiError, api, type BookingConfig, type CreatedBooking, type Slot } from '../lib/api'
import { bodyTreatments, business, getService, massages, type Service } from '../lib/catalog'
import { addDays, clock, duration, longDate, money, parseISODate } from '../lib/format'
import { useSeo } from '../lib/seo'

type Step = 'service' | 'time' | 'details'
const STEPS: { key: Step; label: string }[] = [
  { key: 'service', label: 'Treatment' },
  { key: 'time', label: 'Date & time' },
  { key: 'details', label: 'Your details' },
]
const DAY_STRIP = 14

/* ---------- step 1: treatment + duration ---------- */

function ServiceStep({ service, minutes, onPick, onMinutes, onNext }: {
  service?: Service
  minutes?: number
  onPick: (s: Service) => void
  onMinutes: (m: number) => void
  onNext: () => void
}) {
  return (
    <div className="panel">
      <h2>Choose a treatment</h2>
      {[
        { title: 'Massages', list: massages },
        { title: 'Body treatments', list: bodyTreatments },
      ].map((g) => (
        <div className="pick-group" key={g.title}>
          <h3>{g.title}</h3>
          <div className="pick-list">
            {g.list.map((s) => (
              <div key={s.slug}>
                <button type="button" className="pick" aria-pressed={service?.slug === s.slug} aria-expanded={service?.slug === s.slug} onClick={() => onPick(s)}>
                  <img src={`/media/services/${s.image}-640.webp`} alt="" loading="lazy" />
                  <span>
                    <strong>{s.name}</strong>
                    <small>{s.options.map((o) => duration(o.minutes)).join(' · ')}</small>
                  </span>
                  <small>from {money(Math.min(...s.options.map((o) => o.price_cents)))}</small>
                </button>
                {service?.slug === s.slug && (
                  <div className="pick-detail">
                    <div className="options" role="group" aria-label={`Duration for ${s.name}`}>
                      {s.options.map((o) => (
                        <button key={o.minutes} type="button" className="option" aria-pressed={minutes === o.minutes} onClick={() => onMinutes(o.minutes)}>
                          <strong>{money(o.price_cents)}</strong>
                          <span>{duration(o.minutes)}</span>
                        </button>
                      ))}
                    </div>
                    {s.price_note && <p className="price-note" style={{ margin: '0.7rem 0 0' }}>{s.price_note}</p>}
                    <button className="btn btn--primary" type="button" disabled={!minutes} onClick={onNext} style={{ marginTop: '1rem' }}>
                      Continue
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="step-actions">
        <span />
        <button className="btn btn--primary" type="button" disabled={!service || !minutes} onClick={onNext}>
          Continue
        </button>
      </div>
    </div>
  )
}

/* ---------- step 2: date + time ---------- */

function TimeStep({ service, minutes, date, time, config, onDate, onTime, onBack, onNext, notice }: {
  service: Service
  minutes: number
  date: string
  time?: string
  config: BookingConfig
  onDate: (d: string) => void
  onTime: (t: string) => void
  onBack: () => void
  onNext: () => void
  notice?: string
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const ctrl = new AbortController()
    setSlots(null)
    setError('')
    const qs = new URLSearchParams({ service: service.slug, minutes: String(minutes), date })
    api<{ slots: Slot[] }>(`/api/availability?${qs}`, { signal: ctrl.signal })
      .then((r) => setSlots(r.slots))
      .catch((e: Error) => e.name !== 'AbortError' && setError(e.message))
    return () => ctrl.abort()
  }, [service.slug, minutes, date])

  const days = useMemo(() => {
    const out: string[] = []
    for (let i = 0; i < DAY_STRIP; i++) {
      const d = addDays(config.first_date, i)
      if (d > config.last_date) break
      out.push(d)
    }
    return out
  }, [config.first_date, config.last_date])

  const open = slots?.filter((s) => s.available) ?? []

  return (
    <div className="panel">
      <h2>Choose a date &amp; time</h2>
      {notice && (
        <div className="notice notice--error" role="alert" style={{ marginBottom: '1.2rem' }}>
          <p>{notice}</p>
        </div>
      )}

      <div className="days" role="group" aria-label="Date">
        {days.map((d) => {
          const dt = parseISODate(d)
          return (
            <button key={d} type="button" className="day" aria-pressed={d === date} onClick={() => onDate(d)} aria-label={longDate(d)}>
              <small>{dt.toLocaleDateString('en-US', { weekday: 'short' })}</small>
              <strong>{dt.getDate()}</strong>
              <small>{dt.toLocaleDateString('en-US', { month: 'short' })}</small>
            </button>
          )
        })}
      </div>
      <div className="field" style={{ maxWidth: 260, marginTop: '1rem' }}>
        <label htmlFor="other-date">Or pick another date</label>
        <input id="other-date" type="date" min={config.first_date} max={config.last_date} value={date} onChange={(e) => e.target.value && onDate(e.target.value)} />
      </div>

      <h3 style={{ marginTop: '1.8rem', fontSize: '1.3rem' }}>{longDate(date)}</h3>
      <div aria-live="polite" aria-busy={slots === null && !error}>
        {error && (
          <div className="notice notice--error" role="alert">
            <p>{error}</p>
          </div>
        )}
        {!error && slots === null && (
          <div className="slots" aria-label="Loading times">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 46 }} />
            ))}
          </div>
        )}
        {slots && open.length === 0 && (
          <div className="notice notice--info">
            <p>
              No times left on this day. Please try another date, or call us at{' '}
              <a className="link" href={`tel:${business.phone_e164}`}>{business.phone}</a> and we'll do our best to fit you in.
            </p>
          </div>
        )}
        {slots && open.length > 0 && (
          <div className="slots" role="group" aria-label="Available times">
            {slots.map((s) => (
              <button key={s.time} type="button" className="slot" disabled={!s.available} aria-pressed={s.time === time} onClick={() => onTime(s.time)}>
                {clock(s.time)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="step-actions">
        <button className="btn btn--ghost" type="button" onClick={onBack}>Back</button>
        <button className="btn btn--primary" type="button" disabled={!time || !slots?.find((s) => s.time === time && s.available)} onClick={onNext}>
          Continue
        </button>
      </div>
    </div>
  )
}

/* ---------- step 3: details ---------- */

const EMPTY = { name: '', email: '', phone: '', notes: '', website: '' }

type Details = typeof EMPTY

function DetailsStep({ form, setForm, busy, errors, message, onBack, onSubmit }: {
  form: Details
  setForm: (f: (prev: Details) => Details) => void
  busy: boolean
  errors: Record<string, string>
  message: string
  onBack: () => void
  onSubmit: () => void
}) {
  const set = (k: keyof Details) => (v: string) => setForm((f) => ({ ...f, [k]: v }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }
  return (
    <form className="panel form" onSubmit={submit} noValidate>
      <h2 style={{ marginBottom: 0 }}>Your details</h2>
      {message && (
        <div className="notice notice--error" role="alert">
          <p>{message}</p>
        </div>
      )}
      <TextField label="Full name" autoComplete="name" required value={form.name} onChange={(e) => set('name')(e.target.value)} error={errors.name} />
      <div className="form-row">
        <TextField label="Mobile phone" type="tel" autoComplete="tel" required value={form.phone} onChange={(e) => set('phone')(e.target.value)} error={errors.phone} hint="So we can reach you about your visit." />
        <TextField label="Email" type="email" autoComplete="email" required value={form.email} onChange={(e) => set('email')(e.target.value)} error={errors.email} />
      </div>
      <TextArea
        label="Anything we should know? (optional)"
        value={form.notes}
        onChange={(e) => set('notes')(e.target.value)}
        error={errors.notes}
        hint="Pressure preference, areas to focus on, pregnancy, allergies or health conditions."
        style={{ minHeight: 100 }}
      />
      <Honeypot value={form.website} onChange={set('website')} />
      <p className="hint" style={{ fontSize: '0.9rem', color: 'var(--muted)', margin: 0 }}>
        Payment is taken at the spa. Free cancellation up to 12 hours before your appointment. By booking you agree to our{' '}
        <Link className="link" to="/terms-and-conditions/" target="_blank">terms and cancellation policy</Link>.
      </p>
      <div className="step-actions" style={{ marginTop: '0.5rem' }}>
        <button className="btn btn--ghost" type="button" onClick={onBack}>Back</button>
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? 'Booking…' : 'Confirm booking'}
        </button>
      </div>
    </form>
  )
}

/* ---------- page ---------- */

export default function Appointment() {
  useSeo({ title: 'Book an Appointment', description: 'Book a massage or body treatment at Castle Spa & Massage in Las Vegas Chinatown. Choose your treatment and time online.' })
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const service = getService(params.get('service'))
  const minutesParam = Number(params.get('minutes'))
  const minutes = service?.options.some((o) => o.minutes === minutesParam) ? minutesParam : service?.options.length === 1 ? service.options[0].minutes : undefined
  const option = service?.options.find((o) => o.minutes === minutes)
  const time = params.get('time') ?? undefined
  const requested = (params.get('step') as Step) || 'service'
  const step: Step = !service || !minutes ? 'service' : requested === 'details' && !time ? 'time' : requested

  const [config, setConfig] = useState<BookingConfig | null>(null)
  const [configError, setConfigError] = useState('')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [timeNotice, setTimeNotice] = useState('')
  // lives here, not in DetailsStep, so going back a step keeps what was typed
  const [details, setDetails] = useState<Details>(EMPTY)

  useEffect(() => {
    api<BookingConfig>('/api/booking-config').then(setConfig).catch((e: Error) => setConfigError(e.message))
  }, [])

  const date = params.get('date') && config && params.get('date')! >= config.first_date && params.get('date')! <= config.last_date ? params.get('date')! : config?.first_date

  function update(next: Record<string, string | undefined>, push = false) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => (v === undefined ? p.delete(k) : p.set(k, v)))
    setParams(p, { replace: !push })
  }

  useEffect(() => {
    // On each step change keep the step indicator in view (matters on phones).
    // On the treatment step with one already chosen (e.g. arriving from
    // "Book Swedish Massage"), show that treatment's durations instead.
    const chosen = step === 'service' ? document.querySelector('.pick[aria-expanded="true"]') : null
    if (chosen) chosen.scrollIntoView({ block: 'center' })
    else document.getElementById('booking-top')?.scrollIntoView({ block: 'start' })
  }, [step])

  async function submit() {
    if (!service || !minutes || !date || !time) return
    setBusy(true)
    setErrors({})
    setMessage('')
    try {
      const b = await api<CreatedBooking>('/api/bookings', {
        method: 'POST',
        body: { service_slug: service.slug, minutes, date, time, ...details },
      })
      navigate(`/manage-booking/${b.manage_token}?new=1${b.confirmation_email ? '&emailed=1' : ''}`, { replace: true })
    } catch (err) {
      const e = err as ApiError
      if (e.status === 409) {
        setTimeNotice(e.message)
        update({ step: 'time', time: undefined }, true)
      } else {
        setErrors(e.fields)
        setMessage(e.message)
      }
    } finally {
      setBusy(false)
    }
  }

  const currentIndex = STEPS.findIndex((s) => s.key === step)

  return (
    <section className="section" style={{ paddingTop: 'clamp(2rem, 5vw, 3.5rem)' }}>
      <div className="container">
        <div id="booking-top" style={{ scrollMarginTop: 'calc(var(--header-h) + 1rem)' }}>
          <span className="eyebrow">Online booking</span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>Book an appointment</h1>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.key} aria-current={i === currentIndex ? 'step' : undefined} data-done={i < currentIndex ? 'true' : undefined}>
                {s.label}
              </li>
            ))}
          </ol>
        </div>

        {configError && (
          <div className="notice notice--error" role="alert" style={{ marginBottom: '1.5rem' }}>
            <p>{configError}</p>
          </div>
        )}

        <div className="booking">
          <div>
            {step === 'service' && (
              <ServiceStep
                service={service}
                minutes={minutes}
                onPick={(s) => update({ service: s.slug, minutes: s.options.length === 1 ? String(s.options[0].minutes) : undefined, time: undefined })}
                onMinutes={(m) => update({ minutes: String(m), time: undefined })}
                onNext={() => update({ step: 'time' }, true)}
              />
            )}
            {step === 'time' && service && minutes && (config && date ? (
              <TimeStep
                service={service}
                minutes={minutes}
                date={date}
                time={time}
                config={config}
                notice={timeNotice}
                onDate={(d) => update({ date: d, time: undefined })}
                onTime={(t) => {
                  setTimeNotice('')
                  update({ date, time: t })
                }}
                onBack={() => update({ step: 'service' }, true)}
                onNext={() => update({ step: 'details', date }, true)}
              />
            ) : (
              !configError && <div className="panel"><div className="skeleton" style={{ height: 320 }} /></div>
            ))}
            {step === 'details' && (
              <DetailsStep
                form={details}
                setForm={setDetails}
                busy={busy}
                errors={errors}
                message={message}
                onBack={() => update({ step: 'time' }, true)}
                onSubmit={submit}
              />
            )}
          </div>

          <aside className="panel summary" aria-label="Booking summary">
            <h2 style={{ fontSize: '1.5rem' }}>Your booking</h2>
            {service ? (
              <dl>
                <dt>Treatment</dt>
                <dd>{service.name}</dd>
                {minutes && (
                  <>
                    <dt>Duration</dt>
                    <dd>{duration(minutes)}</dd>
                  </>
                )}
                {step !== 'service' && date && (
                  <>
                    <dt>Date</dt>
                    <dd>{longDate(date)}</dd>
                  </>
                )}
                {time && step !== 'service' && (
                  <>
                    <dt>Time</dt>
                    <dd>{clock(time)}</dd>
                  </>
                )}
                {option && (
                  <>
                    <dt className="total">Price</dt>
                    <dd className="total">{money(option.price_cents)}</dd>
                  </>
                )}
              </dl>
            ) : (
              <p style={{ color: 'var(--muted)', margin: 0 }}>Choose a treatment to get started.</p>
            )}
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: '1.2rem 0 0' }}>
              Prefer to talk? Call <a className="link" href={`tel:${business.phone_e164}`}>{business.phone}</a>.
            </p>
          </aside>
        </div>
      </div>
    </section>
  )
}
