import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ContactDetails } from '../components/ContactDetails'
import { Picture } from '../components/Picture'
import { ServiceCard } from '../components/ServiceCard'
import { bodyTreatments, business, massages } from '../lib/catalog'
import { useSeo } from '../lib/seo'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

function HeroMedia() {
  const reduced = usePrefersReducedMotion()
  if (reduced) return <img className="hero__media" src="/media/video/hero-poster.webp" alt="" />
  return (
    <video className="hero__media" autoPlay muted loop playsInline preload="metadata" poster="/media/video/hero-poster.webp" aria-hidden="true">
      <source src="/media/video/hero-mobile.mp4" type="video/mp4" media="(max-width: 700px) and (orientation: portrait)" />
      <source src="/media/video/hero-desktop.mp4" type="video/mp4" />
    </video>
  )
}

const SPACE = [
  { name: 'space/lobby', caption: 'Reception' },
  { name: 'space/rooms', caption: 'Treatment rooms' },
  { name: 'space/twin-tubs', caption: 'Hot spring baths' },
  { name: 'space/tub', caption: 'Private soaking tub' },
]

export default function Home() {
  useSeo({
    title: 'Castle Spa & Massage | Massage & Spa in Las Vegas Chinatown',
    description:
      'Couples, aromatherapy, deep tissue, Swedish and CBD massage plus hot spring and Sand & Foam body treatments in Las Vegas Chinatown. Book online.',
  })

  return (
    <>
      <section className="hero">
        <HeroMedia />
        <div className="hero__content">
          <h1 className="sr-only">{business.name}</h1>
          <img className="hero__logo" src="/media/brand/logo-light.png" alt="" width={420} height={152} />
          <p>A luxurious escape for relaxation and rejuvenation in the heart of Las Vegas Chinatown.</p>
          <div className="hero__actions">
            <Link to="/appointment/" className="btn btn--light">Book now</Link>
            <Link to="/massages/" className="btn btn--ghost">View the menu</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div className="split__media">
            <Picture name="hero/home" alt="Guest relaxing during a massage at Castle Spa" sizes="(min-width: 900px) 45vw, 100vw" />
          </div>
          <div>
            <span className="eyebrow">Castle Spa &amp; Massage</span>
            <h2>Relax &amp; rejuvenate: your spa sanctuary</h2>
            <p className="lede">
              Castle Spa and Massage, located in Las Vegas' Chinatown, offers a luxurious escape for relaxation and rejuvenation.
              With personalized treatments and skilled therapists, guests indulge in blissful pampering tailored to their needs.
            </p>
            <p>
              From Couples Massage to innovative treatments like Sand &amp; Foam, Castle Spa promises an exceptional experience,
              leaving guests refreshed and ready to conquer the day.
            </p>
            <Link to="/appointment/" className="btn btn--primary">Book an appointment</Link>
          </div>
        </div>
      </section>

      <section className="section section--mist" aria-labelledby="massages-title">
        <div className="container">
          <div className="center">
            <span className="eyebrow">Service menu</span>
            <h2 id="massages-title">Massages</h2>
            <p className="lede">Indulge in a luxury breeze of relaxation, tailored to you by our skilled therapists.</p>
          </div>
          <div className="card-grid" style={{ marginTop: '2.5rem' }}>
            {massages.map((s) => (
              <ServiceCard key={s.slug} service={s} />
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="body-title">
        <div className="container">
          <div className="center">
            <span className="eyebrow">Service menu</span>
            <h2 id="body-title">Body treatments</h2>
            <p className="lede">Hot spring bathing, infrared light therapy, detox and our signature Sand &amp; Foam.</p>
          </div>
          <div className="card-grid" style={{ marginTop: '2.5rem' }}>
            {bodyTreatments.map((s) => (
              <ServiceCard key={s.slug} service={s} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--mist" aria-labelledby="space-title">
        <div className="container">
          <div className="center" style={{ marginBottom: '2.5rem' }}>
            <span className="eyebrow">Our space</span>
            <h2 id="space-title">Step into the sanctuary</h2>
            <p className="lede">
              Every visit promises tranquility and renewal: a haven to unwind and escape the everyday hustle and bustle.
            </p>
          </div>
          <div className="gallery">
            {SPACE.map((p) => (
              <figure key={p.name}>
                <Picture name={p.name} alt={p.caption} widths={[640]} sizes="(min-width: 800px) 25vw, 50vw" />
                <figcaption>{p.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split split--reverse">
          <div className="split__media">
            <Picture name="gift/card-teal" alt="Castle Spa gift card" sizes="(min-width: 900px) 45vw, 100vw" />
          </div>
          <div>
            <span className="eyebrow">Gift cards</span>
            <h2>The gift of relaxation</h2>
            <p className="lede">
              When in doubt what to buy as a gift, this is the best option. Our gift cards can be used for all of our services, and
              you can personalize them with a message.
            </p>
            <Link to="/gift-cards/" className="btn btn--primary">About gift cards</Link>
          </div>
        </div>
      </section>

      <section className="section section--mist section--tight" aria-label="Contact details">
        <div className="container">
          <ContactDetails />
        </div>
      </section>

      <section className="section cta-band">
        <div className="narrow">
          <h2>Ready to unwind?</h2>
          <p className="lede">Choose your treatment and a time that suits you. It only takes a minute.</p>
          <Link to="/appointment/" className="btn btn--light">Book now</Link>
        </div>
      </section>
    </>
  )
}
