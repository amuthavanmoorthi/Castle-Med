import { business, mapsUrl } from '../lib/catalog'

// OpenStreetMap: free, no API key, and frameable. (Google's keyless
// maps?output=embed URL now returns 404 and refuses framing.)
export function MapEmbed() {
  const { lat, lon } = business
  const d = 0.005
  const bbox = [lon - d, lat - d * 0.6, lon + d, lat + d * 0.6].join(',')
  return (
    <figure style={{ margin: 0 }}>
      <iframe
        className="map"
        title={`Map showing ${business.name}`}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lon}`}
        loading="lazy"
      />
      <figcaption style={{ marginTop: '0.6rem', fontSize: '0.9rem' }}>
        <a className="link" href={mapsUrl} target="_blank" rel="noreferrer">Open in Google Maps for directions</a>
      </figcaption>
    </figure>
  )
}
