import { Link } from 'react-router-dom'
import { FaqList } from '../components/FaqList'
import { services } from '../lib/catalog'
import { bookingFaqs, giftCardFaqs } from '../lib/policies'
import { useSeo } from '../lib/seo'

export default function FaqPage() {
  useSeo({ title: 'Frequently Asked Questions', description: 'Answers about booking, cancellations, gift cards and every massage and body treatment at Castle Spa & Massage.' })
  return (
    <section className="section">
      <div className="narrow">
        <span className="eyebrow">Help</span>
        <h1>Frequently asked questions</h1>
        <p className="lede">
          Can't find your answer? <Link className="link" to="/contact/">Send us a message</Link> or call us.
        </p>

        <h2 style={{ marginTop: '2.5rem' }}>Bookings &amp; policies</h2>
        <FaqList faqs={bookingFaqs} title={null} />

        <h2 style={{ marginTop: '2.5rem' }}>Gift cards</h2>
        <FaqList faqs={giftCardFaqs} title={null} />

        <h2 style={{ marginTop: '2.5rem' }}>Treatments</h2>
        {services.map((s) => (
          <FaqList key={s.slug} faqs={s.faqs} title={s.name} />
        ))}
      </div>
    </section>
  )
}
