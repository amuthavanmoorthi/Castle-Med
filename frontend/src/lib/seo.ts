import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE = 'https://castlespalv.com'

function setMeta(selector: string, attr: 'name' | 'rel', key: string, value: string, prop: 'content' | 'href' = 'content') {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = document.createElement(attr === 'rel' ? 'link' : 'meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute(prop, value)
}

/** Per-page title, description, canonical URL and robots directive. */
export function useSeo({ title, description, noindex = false }: { title: string; description?: string; noindex?: boolean }) {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = title.includes('Castle') ? title : `${title} | Castle Spa & Massage`
    if (description) setMeta('meta[name="description"]', 'name', 'description', description)
    setMeta('link[rel="canonical"]', 'rel', 'canonical', SITE + pathname, 'href')
    setMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
  }, [title, description, noindex, pathname])
}
