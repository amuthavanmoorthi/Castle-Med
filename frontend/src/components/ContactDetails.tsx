import { business, fullAddress, mapsUrl } from '../lib/catalog'

export function ContactDetails() {
  return (
    <div className="info-strip">
      <div>
        <h3>Call</h3>
        <p><a className="link" href={`tel:${business.phone_e164}`}>{business.phone}</a></p>
      </div>
      <div>
        <h3>Email</h3>
        <p><a className="link" href={`mailto:${business.email}`}>{business.email}</a></p>
      </div>
      <div>
        <h3>Visit</h3>
        <p>
          <a className="link" href={mapsUrl} target="_blank" rel="noreferrer">{fullAddress}</a>
          <br />
          {business.neighbourhood}
        </p>
      </div>
      <div>
        <h3>Hours</h3>
        <p>{business.hours_note}</p>
      </div>
    </div>
  )
}
