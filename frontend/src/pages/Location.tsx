import { Link } from 'react-router-dom'
import { ContactDetails } from '../components/ContactDetails'
import { MapEmbed } from '../components/MapEmbed'
import { PageHero } from '../components/PageHero'
import { cancellationPolicy, refundPolicy } from '../lib/policies'
import { useSeo } from '../lib/seo'

export default function Location() {
  useSeo({
    title: 'Location & Hours',
    description: 'Find Castle Spa & Massage at 5980 Spring Mountain Road #3, Las Vegas, NV 89146, in Las Vegas Chinatown. Open 7 days, by appointment.',
  })
  return (
    <>
      <PageHero image="hero/visit" eyebrow="Visit us" title="Location">
        In the heart of Las Vegas Chinatown. Open for appointments only.
      </PageHero>
      <section className="section">
        <div className="container">
          <ContactDetails />
          <div style={{ marginTop: '2.5rem' }}>
            <MapEmbed />
          </div>
          <p style={{ marginTop: '2rem' }}>
            <Link className="btn btn--primary" to="/appointment/">Book an appointment</Link>
          </p>
        </div>
      </section>
      <section className="section section--mist">
        <div className="narrow prose">
          <h2 style={{ marginTop: 0 }}>Cancellation policy</h2>
          <p>
            We understand that plans can change, and sometimes appointments need to be cancelled or rescheduled. To accommodate our
            clients and ensure fairness to our therapists, we have the following policy in place:
          </p>
          <ul>
            {cancellationPolicy.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p>If you need to cancel or reschedule, please contact us as soon as possible to avoid any fees.</p>
          <h2>No refund policy</h2>
          <p>{refundPolicy}</p>
          <p>
            <Link className="link" to="/terms-and-conditions/">Read our full terms and conditions</Link>
          </p>
        </div>
      </section>
    </>
  )
}
