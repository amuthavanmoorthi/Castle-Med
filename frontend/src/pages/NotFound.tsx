import { Link } from 'react-router-dom'
import { useSeo } from '../lib/seo'

export default function NotFound() {
  useSeo({ title: 'Page not found', noindex: true })
  return (
    <section className="section">
      <div className="narrow center">
        <span className="eyebrow">404</span>
        <h1>We couldn't find that page</h1>
        <p className="lede">It may have moved when we refreshed our website.</p>
        <p style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn btn--primary" to="/">Home</Link>
          <Link className="btn btn--ghost" to="/massages/">Massage menu</Link>
        </p>
      </div>
    </section>
  )
}
