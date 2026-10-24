import { FaqList } from '../components/FaqList'
import { PageHero } from '../components/PageHero'
import { Picture } from '../components/Picture'
import { business } from '../lib/catalog'
import { giftCardFaqs } from '../lib/policies'
import { useSeo } from '../lib/seo'

export default function GiftCards() {
  useSeo({
    title: 'Gift Cards',
    description: 'Give the gift of relaxation with a Castle Spa & Massage gift card, available as a physical card or an e-gift card with a personal message.',
  })
  return (
    <>
      <PageHero image="gift/card-desk" eyebrow="A gift that gives and gives" title="Gift Cards">
        One card gives a world of choice. Perfect for any occasion.
      </PageHero>

      <section className="section">
        <div className="container">
          <div className="card-grid">
            {[
              { t: 'Easy to give', d: 'An electronic gift card can be sent in a couple of clicks, the fastest delivery possible.' },
              { t: 'Any amount', d: 'Choose the amount you wish and it will be applied to the gift card.' },
              { t: 'Personalized', d: 'Add a personal message: warm, funny, just as you wish.' },
            ].map((b) => (
              <div className="panel" key={b.t}>
                <h3>{b.t}</h3>
                <p style={{ margin: 0, color: 'var(--muted)' }}>{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--mist">
        <div className="container split">
          <div className="split__media">
            <Picture name="gift/card-stone" alt="Castle Spa physical gift card" sizes="(min-width: 900px) 45vw, 100vw" />
          </div>
          <div>
            <h2>Physical or e-gift card</h2>
            <p className="lede">
              Choose a physical gift card to hand over in person, or an e-gift card delivered by email with your personalized
              message.
            </p>
            <p>To buy a gift card, call or visit us and we will prepare it for you.</p>
            <p style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a className="btn btn--primary" href={`tel:${business.phone_e164}`}>Call {business.phone}</a>
              <a className="btn btn--ghost" href={`mailto:${business.email}?subject=Gift%20card`}>Email us</a>
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="narrow">
          <h2>Gift card questions</h2>
          <FaqList faqs={giftCardFaqs} title={null} />
        </div>
      </section>
    </>
  )
}
