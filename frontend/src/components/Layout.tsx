import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { business, fullAddress, mapsUrl } from '../lib/catalog'

const NAV = [
  { to: '/massages/', label: 'Massages' },
  { to: '/body-treatment/', label: 'Body Treatment' },
  { to: '/gift-cards/', label: 'Gift Cards' },
  { to: '/about-us/', label: 'About' },
  { to: '/location/', label: 'Visit' },
  { to: '/contact/', label: 'Contact' },
]

/** Scroll to top on page change, or to #anchor when the URL has one. */
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el) {
        // wait a frame so the target page has rendered
        requestAnimationFrame(() => el.scrollIntoView())
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="site-header__logo" aria-label={`${business.name} home`}>
          <img src="/media/brand/logo-dark.png" alt={business.name} width={121} height={44} />
        </Link>
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav id="site-nav" className="site-nav" aria-label="Main" data-open={open}>
          <ul>
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to}>{n.label}</NavLink>
              </li>
            ))}
          </ul>
          <Link to="/appointment/" className="btn btn--primary nav-book">
            Book now
          </Link>
        </nav>
        <Link to="/appointment/" className="btn btn--primary btn--sm site-header__book">
          Book now
        </Link>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div>
            <img className="site-footer__logo" src="/media/brand/logo-light.png" alt={business.name} width={170} height={62} loading="lazy" />
            <p>
              Massage and spa treatments in {business.neighbourhood}. {business.hours_note}
            </p>
          </div>
          <div>
            <h2>Visit</h2>
            <ul>
              <li>
                <a href={mapsUrl} target="_blank" rel="noreferrer">{fullAddress}</a>
              </li>
              <li><a href={`tel:${business.phone_e164}`}>{business.phone}</a></li>
              <li><a href={`mailto:${business.email}`}>{business.email}</a></li>
            </ul>
          </div>
          <div>
            <h2>Explore</h2>
            <ul>
              {NAV.map((n) => (
                <li key={n.to}><Link to={n.to}>{n.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Bookings</h2>
            <ul>
              <li><Link to="/appointment/">Book an appointment</Link></li>
              <li><Link to="/manage-booking/">Manage or cancel a booking</Link></li>
              <li><Link to="/frequently-asked-questions/">FAQs</Link></li>
              <li><Link to="/terms-and-conditions/">Terms &amp; policies</Link></li>
            </ul>
          </div>
        </div>
        <div className="site-footer__base">
          <span>© {new Date().getFullYear()} {business.name}</span>
          <span>{business.street}, {business.city}, {business.region} {business.postal_code}</span>
        </div>
      </div>
    </footer>
  )
}

export function Layout() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <ScrollManager />
      <Header />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
