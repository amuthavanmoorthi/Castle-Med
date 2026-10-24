// Single source of truth shared with the API (backend/app/data/catalog.json).
import raw from '../../../backend/app/data/catalog.json'

export type Category = 'massage' | 'body'

export interface Option {
  minutes: number
  price_cents: number
}

export interface Faq {
  q: string
  a: string
}

export interface Service {
  slug: string
  category: Category
  name: string
  tab: string
  tagline: string
  benefits: string[]
  description: string
  options: Option[]
  units: number
  image: string
  faqs: Faq[]
  price_note?: string
  addons?: { name: string; price_cents: number }[]
}

export interface Business {
  name: string
  phone: string
  phone_e164: string
  email: string
  street: string
  city: string
  region: string
  postal_code: string
  neighbourhood: string
  hours_note: string
  lat: number
  lon: number
}

const catalog = raw as { business: Business; services: Service[] }

export const business = catalog.business
export const services = catalog.services
export const massages = services.filter((s) => s.category === 'massage')
export const bodyTreatments = services.filter((s) => s.category === 'body')

export function getService(slug: string | null | undefined): Service | undefined {
  return services.find((s) => s.slug === slug)
}

export const fullAddress = `${business.street}, ${business.city}, ${business.region} ${business.postal_code}`
export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business.name}, ${fullAddress}`)}`
