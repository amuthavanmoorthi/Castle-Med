import { useState, type FormEvent } from 'react'
import { ContactDetails } from '../components/ContactDetails'
import { Honeypot, TextArea, TextField } from '../components/Field'
import { ApiError, api } from '../lib/api'
import { business } from '../lib/catalog'
import { useSeo } from '../lib/seo'

const EMPTY = { name: '', email: '', phone: '', message: '', website: '' }

export default function Contact() {
  useSeo({ title: 'Contact Us', description: 'Questions about a treatment, gift card or booking? Send Castle Spa & Massage a message or call 702-565-5980.' })
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const set = (k: keyof typeof EMPTY) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (state === 'sent') setState('idle') // a new message clears the old thank-you
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setState('sending')
    setErrors({})
    try {
      await api('/api/contact', { method: 'POST', body: form })
      setForm(EMPTY)
      setState('sent')
    } catch (err) {
      const e = err as ApiError
      setErrors(e.fields ?? {})
      setErrorMsg(e.message)
      setState('error') // keep what they typed
    }
  }

  return (
    <section className="section">
      <div className="container split" style={{ alignItems: 'start' }}>
        <div>
          <span className="eyebrow">Get in touch</span>
          <h1>Contact us</h1>
          <p className="lede">
            Questions about a treatment, a gift card or your booking? Send us a message and we'll get back to you. For anything
            urgent, please call.
          </p>
          <div style={{ marginTop: '2rem' }}>
            <ContactDetails />
          </div>
        </div>

        <form className="panel form" onSubmit={submit} noValidate>
          <h2 style={{ marginBottom: 0 }}>Send a message</h2>
          <div aria-live="polite">
            {state === 'sent' && (
              <div className="notice notice--ok" role="status">
                <p>Thank you, your message has been sent. We'll reply as soon as we can.</p>
              </div>
            )}
            {state === 'error' && (
              <div className="notice notice--error" role="alert">
                <p>{errorMsg}</p>
                <p>
                  Your message is still here, so you can try again, or email us at{' '}
                  <a className="link" href={`mailto:${business.email}`}>{business.email}</a>.
                </p>
              </div>
            )}
          </div>
          <TextField label="Name" name="name" autoComplete="name" required value={form.name} onChange={(e) => set('name')(e.target.value)} error={errors.name} />
          <div className="form-row">
            <TextField label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => set('email')(e.target.value)} error={errors.email} />
            <TextField label="Phone (optional)" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set('phone')(e.target.value)} error={errors.phone} />
          </div>
          <TextArea label="Message" name="message" required value={form.message} onChange={(e) => set('message')(e.target.value)} error={errors.message} />
          <Honeypot value={form.website} onChange={set('website')} />
          <div>
            <button className="btn btn--primary" type="submit" disabled={state === 'sending'}>
              {state === 'sending' ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
