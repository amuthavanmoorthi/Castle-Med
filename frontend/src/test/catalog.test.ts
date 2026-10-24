import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { bodyTreatments, massages, services } from '../lib/catalog'

// vitest runs from frontend/; jsdom makes import.meta.url an http URL
const media = resolve(process.cwd(), 'public/media')

describe('catalog', () => {
  it('has the menu from the live site', () => {
    expect(massages).toHaveLength(10)
    expect(bodyTreatments).toHaveLength(5)
  })

  it('has unique slugs and sane prices', () => {
    expect(new Set(services.map((s) => s.slug)).size).toBe(services.length)
    for (const s of services) {
      expect(s.options.length).toBeGreaterThan(0)
      for (const o of s.options) {
        expect(o.minutes).toBeGreaterThan(0)
        expect(o.price_cents % 100).toBe(0)
      }
    }
  })

  it('has a built image for every service', () => {
    for (const s of services) {
      expect(existsSync(`${media}/services/${s.image}.webp`), s.slug).toBe(true)
      expect(existsSync(`${media}/services/${s.image}-640.webp`), s.slug).toBe(true)
    }
  })
})
