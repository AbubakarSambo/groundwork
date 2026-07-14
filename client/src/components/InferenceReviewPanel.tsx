import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { reportsApi } from '@/api/reports'
import type { ReportInference } from '@/types'

interface Props {
  groundId: string
  inferences: ReportInference[]
}

export function InferenceReviewPanel({ groundId, inferences }: Props) {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)

  const active = inferences.filter(i => !dismissed.has(i.id))

  const clarifyMut = useMutation({
    mutationFn: (inferenceId: string) => reportsApi.startClarification(groundId, inferenceId),
    onSuccess: (data) => {
      navigate(`/checkin/${data.checkInId}?clarify=true`)
    },
  })

  if (active.length === 0) return null

  return (
    <div style={{ marginTop: 24, border: '1px solid #E8A94A', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', background: '#FDF3E3', border: 'none', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div>
          <span style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', fontWeight: 700, color: '#8A5C1A' }}>
            Inferences we made
          </span>
          <span style={{ fontSize: 11, color: '#8A5C1A', marginLeft: 8, opacity: 0.7 }}>
            {active.length} item{active.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#8A5C1A', opacity: 0.6 }}>{expanded ? '▲ hide' : '▼ review'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '4px 0 8px' }}>
          <p style={{ fontSize: 12, color: '#6B6560', padding: '8px 16px 12px', margin: 0, lineHeight: 1.6 }}>
            These claims are not direct quotes from your session. They were inferred from what you said. If anything is not right, you can correct it through a short follow-up session.
          </p>

          {active.map((inf) => (
            <div key={inf.id} style={{ padding: '10px 16px', borderTop: '1px solid #F0E8D8' }}>
              <p style={{ fontSize: 13, color: '#1A1916', lineHeight: 1.55, margin: '0 0 4px' }}>
                "{inf.text}"
              </p>
              <p style={{ fontSize: 11, color: '#9B9590', margin: '0 0 10px', lineHeight: 1.5 }}>
                Inferred because: {inf.reason}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setDismissed(prev => new Set([...prev, inf.id]))}
                  style={{
                    fontSize: 12, fontWeight: 600, color: '#085041',
                    background: '#E7F6EF', border: '1px solid #BFE6D4',
                    borderRadius: 7, padding: '5px 12px', cursor: 'pointer',
                  }}
                >
                  This is right
                </button>
                <button
                  onClick={() => clarifyMut.mutate(inf.id)}
                  disabled={clarifyMut.isPending}
                  style={{
                    fontSize: 12, fontWeight: 600, color: '#0C447C',
                    background: '#EEF4FB', border: '1px solid #B5D4F4',
                    borderRadius: 7, padding: '5px 12px', cursor: 'pointer',
                    opacity: clarifyMut.isPending ? 0.6 : 1,
                  }}
                >
                  {clarifyMut.isPending ? 'Loading...' : 'Correct this'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
