import { Link } from 'react-router-dom'
import type { Service } from '../lib/catalog'
import { duration, money } from '../lib/format'
import { FaqList } from './FaqList'
import { Picture } from './Picture'

export function ServiceSection({ service }: { service: Service }) {
  const headingId = `${service.slug}-title`
  return (
    <section id={service.slug} className="svc" aria-labelledby={headingId}>
      <div className="container svc__grid">
        <div className="svc__media">
          <Picture name={`services/${service.image}`} alt={service.name} sizes="(min-width: 900px) 45vw, 100vw" />
        </div>
        <div>
          <h2 id={headingId}>{service.name}</h2>
          <p className="svc__tagline">{service.tagline}</p>
          <ul className="benefits" aria-label="Benefits">
            {service.benefits.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p>{service.description}</p>

          <ul className="prices" aria-label={`${service.name} prices`}>
            {service.options.map((o) => (
              <li key={o.minutes}>
                <span>{duration(o.minutes)}</span>
                <strong>{money(o.price_cents)}</strong>
              </li>
            ))}
            {service.addons?.map((a) => (
              <li key={a.name}>
                <span>{a.name}</span>
                <strong>+{money(a.price_cents)}</strong>
              </li>
            ))}
          </ul>
          {service.price_note && <p className="price-note">{service.price_note}</p>}

          <Link className="btn btn--primary" to={`/appointment/?service=${service.slug}`}>
            Book {service.name}
          </Link>

          <FaqList faqs={service.faqs} />
        </div>
      </div>
    </section>
  )
}
