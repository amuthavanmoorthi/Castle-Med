import { Link } from 'react-router-dom'
import type { Service } from '../lib/catalog'
import { fromPrice } from '../lib/format'
import { Picture } from './Picture'

export function ServiceCard({ service }: { service: Service }) {
  const page = service.category === 'massage' ? '/massages/' : '/body-treatment/'
  const mins = service.options.map((o) => o.minutes)
  return (
    <Link to={`${page}#${service.slug}`} className="svc-card">
      <Picture name={`services/${service.image}`} alt="" sizes="(min-width: 1180px) 280px, (min-width: 600px) 45vw, 100vw" />
      <div className="svc-card__body">
        <h3>{service.name}</h3>
        <div className="svc-card__meta">
          <span>
            {mins.length > 1 ? `${Math.min(...mins)}-${Math.max(...mins)}` : mins[0]} min
          </span>
          <span>
            from <strong>{fromPrice(service)}</strong>
          </span>
        </div>
      </div>
    </Link>
  )
}
