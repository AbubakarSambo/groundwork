interface Props {
  scores: number[]
  labels: string[]
}

const COLOR: Record<number, string> = { 1: '#9B9590', 2: '#9B9590', 3: '#5DCAA5', 4: '#0C447C', 5: '#0C447C' }

export function ConfidenceTrendChart({ scores, labels }: Props) {
  if (scores.length === 0) return null
  const maxH = 72

  return (
    <div style={{
      background: 'white',
      border: '0.5px solid #E2E0DB',
      borderRadius: 8,
      padding: '14px',
      marginTop: 20,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
        Confidence trend
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: maxH + 24 }}>
        {scores.map((s, i) => {
          const clamp = Math.max(1, Math.min(5, s))
          const h = Math.round((clamp / 5) * maxH)
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{ fontSize: 10, color: '#9B9590' }}>{clamp}/5</div>
              <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: COLOR[clamp] ?? '#9B9590', height: h, transition: 'height .5s ease' }} />
              <div style={{ fontSize: 10, color: 'var(--gw-sub)' }}>{labels[i] ?? `S${i + 1}`}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
