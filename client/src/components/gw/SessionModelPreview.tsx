interface Props {
  timelineDays: number
  cadenceDays: number
}

export function SessionModelPreview({ timelineDays, cadenceDays }: Props) {
  const total = cadenceDays > 0 ? Math.max(1, Math.floor(timelineDays / cadenceDays)) : 0
  const free = Math.min(4, total)
  const paid = Math.max(0, total - free)

  return (
    <div style={{
      background: '#EEF4FB',
      border: '0.5px solid #B5D4F4',
      borderRadius: 8,
      padding: '14px 16px',
      marginBottom: 20,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0C447C', marginBottom: 6 }}>
        {total} session{total !== 1 ? 's' : ''} over {timelineDays} days
      </div>
      <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.6 }}>
        Sessions 1–4 are free for both parties. {paid > 0
          ? `Billing starts at session 5 (${paid} paid session${paid !== 1 ? 's' : ''}).`
          : 'All sessions fall within the free tier.'}
      </div>
      <span style={{
        display: 'inline-block',
        marginTop: 8,
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 20,
        background: '#E1F5EE',
        color: '#085041',
      }}>
        Free to session {free}
      </span>
    </div>
  )
}
