interface Props {
  height?: number
  color?: string
}

export function GroundworkLogo({ height = 28, color = '#0C447C' }: Props) {
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

  return (
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
}
