import { MARKETING_URL } from '@/lib/marketing'

interface Props {
  height?: number
  color?: string
  /**
   * THE MARK IS THE WAY HOME. Her rule: "the groundwork logo and icon are meant to always take you
   * back to the marketing page."
   *
   * It is on by default and wraps the mark in a link, because every place this appears is a place
   * somebody might want to leave from - the invite, the join, the sign-in link, the entry chat. It
   * was previously a bare `<svg>` in `Arrival`, so the one page a stranger reaches first had a logo
   * that did nothing when clicked.
   *
   * Turn it off only where the mark sits INSIDE something already clickable, so as not to nest two
   * links.
   */
  linkToMarketing?: boolean
}

export function GroundworkLogo({ height = 28, color = 'var(--gw-navy)', linkToMarketing = true }: Props) {
  // Aspect ratio derived from the logo mark: bars + wordmark
  // Bars section: 3 bars widening downward, centered
  // Wordmark: "GROUNDWORK" wide-tracked caps below
  const w = height * 3.4
  const barsH = height * 0.52   // bars take ~52% of total height
  const barH  = barsH / 5       // each bar is 1 unit, gaps are 1 unit each (3 bars + 2 gaps = 5)
  const gap   = barH
  const cx    = w / 2

  // Bar widths: 40%, 62%, 84% of total width
  const bw = [w * 0.40, w * 0.62, w * 0.84]

  // Text sits below bars
  const textY = barsH + height * 0.22

  const mark = (
    <svg
      width={w}
      height={height}
      viewBox={`0 0 ${w} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Groundwork"
      role="img"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Top bar - narrowest */}
      <rect x={cx - bw[0] / 2} y={0}              width={bw[0]} height={barH} rx={barH * 0.15} fill={color} />
      {/* Middle bar */}
      <rect x={cx - bw[1] / 2} y={barH + gap}     width={bw[1]} height={barH} rx={barH * 0.15} fill={color} />
      {/* Bottom bar - widest */}
      <rect x={cx - bw[2] / 2} y={(barH + gap) * 2} width={bw[2]} height={barH} rx={barH * 0.15} fill={color} />

      {/* Wordmark */}
      <text
        x={cx}
        y={textY}
        textAnchor="middle"
        dominantBaseline="hanging"
        fill={color}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize={height * 0.26}
        letterSpacing={height * 0.06}
      >
        GROUNDWORK
      </text>
    </svg>
  )
  if (!linkToMarketing) return mark
  return (
    <a href={MARKETING_URL} style={{ display: 'inline-flex', textDecoration: 'none' }} title="Groundwork">
      {mark}
    </a>
  )
}
