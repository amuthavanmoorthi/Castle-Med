import { useEffect, useMemo, useState } from 'react'
import { PageHero } from '../components/PageHero'
import { ServiceSection } from '../components/ServiceSection'
import { bodyTreatments, massages, type Category } from '../lib/catalog'
import { useSeo } from '../lib/seo'

const COPY: Record<Category, { title: string; hero: string; seo: string; intro: string }> = {
  massage: {
    title: 'Massages',
    hero: 'hero/massages',
    seo: 'Aromatherapy, Castle, Couples, Deep Tissue, Shiatsu, Pregnancy, Slimming, Sports/Thai, Swedish and CBD massage in Las Vegas Chinatown. Prices and online booking.',
    intro: 'We elevate your experience as you relax and rejuvenate with personalized service from our professional team.',
  },
  body: {
    title: 'Body Treatment',
    hero: 'hero/body',
    seo: 'Detox, Hot Spring bathing, Infrared Light Therapy, Luxe Sand & Foam and Sand & Foam body treatments in Las Vegas Chinatown. Prices and online booking.',
    intro: 'Detox, hot spring bathing, infrared light and our signature foam treatments: renew your body from head to toe.',
  },
}

/** Highlights the chip of the section currently on screen. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-35% 0px -55% 0px' },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [ids])
  return active
}

export default function ServiceMenu({ category }: { category: Category }) {
  const list = category === 'massage' ? massages : bodyTreatments
  const copy = COPY[category]
  useSeo({ title: `${copy.title} Menu & Prices`, description: copy.seo })
  const ids = useMemo(() => list.map((s) => s.slug), [list])
  const active = useActiveSection(ids)

  return (
    <>
      <PageHero image={copy.hero} eyebrow="Service menu" title={copy.title}>
        {copy.intro}
      </PageHero>
      <nav className="menu-nav" aria-label={`${copy.title} on this page`}>
        <div className="container">
          <ul>
            {list.map((s) => (
              <li key={s.slug}>
                <a className="chip" href={`#${s.slug}`} aria-current={active === s.slug ? 'true' : undefined}>
                  {s.tab}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      {list.map((s) => (
        <ServiceSection key={s.slug} service={s} />
      ))}
    </>
  )
}
