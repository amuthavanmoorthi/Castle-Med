import { terms } from '../lib/policies'
import { useSeo } from '../lib/seo'

export default function Terms() {
  useSeo({ title: 'Terms and Conditions', description: 'Booking, cancellation, refund, gift card and conduct policies for Castle Spa & Massage.' })
  return (
    <section className="section">
      <div className="narrow prose">
        <span className="eyebrow">Policies</span>
        <h1>Terms and Conditions</h1>
        {terms.map((t) => (
          <div key={t.title}>
            <h2>{t.title}</h2>
            <p>{t.body}</p>
          </div>
        ))}
        <p style={{ marginTop: '2rem' }}>
          By booking an appointment or purchasing a service from Castle Spa &amp; Massage, you agree to abide by these terms and
          conditions. Thank you for choosing Castle Spa &amp; Massage. We look forward to serving you!
        </p>
      </div>
    </section>
  )
}
