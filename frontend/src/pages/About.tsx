import { Link } from 'react-router-dom'
import { PageHero } from '../components/PageHero'
import { Picture } from '../components/Picture'
import { useSeo } from '../lib/seo'

export default function About() {
  useSeo({
    title: 'About Us',
    description: 'Castle Spa & Massage is a relaxation and rejuvenation sanctuary in the heart of Las Vegas Chinatown, with tailored spa and massage services.',
  })
  return (
    <>
      <PageHero image="hero/about" eyebrow="Our story" title="Serenity found">
        Our goal is to be the best relaxation and rejuvenation center in the area.
      </PageHero>

      <section className="section">
        <div className="container split">
          <div>
            <span className="eyebrow">Castle Spa &amp; Massage</span>
            <h2>A world of serenity and luxury</h2>
            <p className="lede">
              Nestled in the vibrant heart of Las Vegas' Chinatown, Castle Spa &amp; Massage invites you to indulge in a world of
              serenity and luxury.
            </p>
            <p>
              Our skilled therapists provide tailored spa and massage services, perfect for relieving stress and rejuvenating your
              body and mind. Experience the art of relaxation with our expert treatments, designed to leave you blissfully refreshed
              and ready to take on the world.
            </p>
          </div>
          <div className="split__media">
            <Picture name="feature/oils" alt="Massage oils and botanicals" sizes="(min-width: 900px) 45vw, 100vw" />
          </div>
        </div>
      </section>

      <section className="section section--mist">
        <div className="container split split--reverse">
          <div>
            <h2>Your spa sanctuary</h2>
            <p className="lede">
              Step into our sanctuary of relaxation and rejuvenation, where every visit promises tranquility and renewal.
            </p>
            <p>
              From soothing massages to luxurious spa treatments, we offer a haven to unwind and revitalize your senses. Discover
              serenity with us and experience the ultimate escape from the everyday hustle and bustle.
            </p>
            <Link className="btn btn--primary" to="/appointment/">Book an appointment</Link>
          </div>
          <div className="split__media">
            <Picture name="feature/couple" alt="Couple relaxing together" sizes="(min-width: 900px) 45vw, 100vw" />
          </div>
        </div>
      </section>
    </>
  )
}
