const MARKETING_URL = 'https://myground.work'

export function GwBrand({ color = 'var(--gw-navy)', size = 15 }: { color?: string; size?: number }) {
  return (
    <a
      href={MARKETING_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{ fontSize: size, fontWeight: 700, color, letterSpacing: '-.02em', textDecoration: 'none', cursor: 'pointer' }}
    >
      Groundwork
    </a>
  )
}

export function GwLogoLink() {
  return (
    <a
      href={MARKETING_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="gw-logo"
      style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
    >
      Groundwork
    </a>
  )
}
