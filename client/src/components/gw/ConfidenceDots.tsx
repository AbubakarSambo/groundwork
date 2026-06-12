interface Props {
  score: number
  size?: 'sm' | 'lg'
  showLabel?: boolean
}

const COLORS: Record<number, string> = {
  1: '#9B9590',
  2: '#9B9590',
  3: '#5DCAA5',
  4: '#0C447C',
  5: '#0C447C',
}

export function ConfidenceDots({ score, size = 'sm', showLabel = false }: Props) {
  const px = size === 'lg' ? 14 : 8
  const gap = size === 'lg' ? 6 : 3
  const clamp = Math.max(0, Math.min(5, score))

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      {[1, 2, 3, 4, 5].map(n => (
        <div
          key={n}
          style={{
            width: px,
            height: px,
            borderRadius: '50%',
            background: n <= clamp ? COLORS[clamp] ?? '#9B9590' : '#E2E0DB',
            transition: 'background .3s',
            flexShrink: 0,
          }}
        />
      ))}
      {showLabel && (
        <span style={{ fontSize: size === 'lg' ? 14 : 11, color: 'var(--gw-sub)', marginLeft: 4 }}>
          {clamp}/5
        </span>
      )}
    </div>
  )
}
