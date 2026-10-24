import type { ReactNode } from 'react'
import { Picture } from './Picture'

export function PageHero({ image, eyebrow, title, children }: { image: string; eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <section className="page-hero">
      <Picture name={image} alt="" eager />
      <div className="container page-hero__content">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
    </section>
  )
}
