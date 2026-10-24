import type { Faq } from '../lib/catalog'

export function FaqList({ faqs, title = 'FAQs' }: { faqs: Faq[]; title?: string | null }) {
  if (!faqs.length) return null
  return (
    <div className="faq">
      {title && <h3>{title}</h3>}
      {faqs.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  )
}
