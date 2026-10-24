interface Props {
  /** path under /media without extension, e.g. "services/couples" */
  name: string
  alt: string
  sizes?: string
  /** widths built by tools/build_media.py; small originals only have 640 */
  widths?: number[]
  className?: string
  eager?: boolean
}

export function Picture({ name, alt, sizes = '100vw', widths = [640, 1280, 1920], className, eager = false }: Props) {
  const srcSet = widths.map((w) => `/media/${name}-${w}.webp ${w}w`).join(', ')
  return (
    <img
      src={`/media/${name}.webp`}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : undefined}
    />
  )
}
