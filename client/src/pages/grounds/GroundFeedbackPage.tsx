import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { billingApi } from '@/api'
import { groundsApi } from '@/api'

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 28,
            padding: '2px 4px',
            color: (hovered || value) >= star ? '#E8A94A' : '#C9C5BF',
            transition: 'color 0.1s',
            lineHeight: 1,
          }}
          aria-label={`${star} star`}
        >
          {(hovered || value) >= star ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}

export function GroundFeedbackPage() {
  const { groundId } = useParams<{ groundId: string }>()
  const navigate = useNavigate()

  const [rating, setRating] = useState(0)
  const [whatWorked, setWhatWorked] = useState('')
  const [whatDidnt, setWhatDidnt] = useState('')
  const [wouldUseAgain, setWouldUseAgain] = useState<'yes' | 'no' | null>(null)

  // Check ground status
  const { data: ground, isLoading: groundLoading } = useQuery({
    queryKey: ['ground', groundId],
    queryFn: () => groundsApi.get(groundId!),
    enabled: !!groundId,
  })

  // Check if feedback already submitted
  const { data: existingFeedback, isLoading: feedbackLoading } = useQuery({
    queryKey: ['ground-feedback', groundId],
    queryFn: () => billingApi.getFeedback(groundId!),
    enabled: !!groundId,
  })

  const submit = useMutation({
    mutationFn: () => {
      if (!groundId) throw new Error('No ground ID')
      return billingApi.submitFeedback(groundId, {
        rating,
        whatWorked: whatWorked.trim() || undefined,
        whatDidnt: whatDidnt.trim() || undefined,
        wouldUseAgain: wouldUseAgain === 'yes',
      })
    },
    onSuccess: () => {
      toast.success('Thank you.')
      navigate(`/grounds/${groundId}`)
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.')
    },
  })

  const isLoading = groundLoading || feedbackLoading

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>
      </div>
    )
  }

  // Redirect if ground isn't resolved or feedback already given
  if (ground && ground.status !== 'RESOLVED' && ground.status !== 'CLOSED') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 8, padding: '40px 32px', maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginBottom: 16 }}>
            Feedback is only available once a ground is resolved.
          </div>
          <button className="gw-btn" onClick={() => navigate(`/grounds/${groundId}`)}>
            Back to ground
          </button>
        </div>
      </div>
    )
  }

  if (existingFeedback) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 8, padding: '40px 32px', maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Feedback recorded</div>
          <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginBottom: 20 }}>
            You have already shared feedback for this ground. Thank you.
          </div>
          <button className="gw-btn" onClick={() => navigate(`/grounds/${groundId}`)}>
            Back to ground
          </button>
        </div>
      </div>
    )
  }

  const canSubmit = rating > 0 && wouldUseAgain !== null && !submit.isPending

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">Groundwork</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>Feedback</div>
        </div>
        <button className="gw-back" onClick={() => navigate(`/grounds/${groundId}`)}>← Ground</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>
        <div className="gw-ttl" style={{ marginBottom: 4 }}>How did this resolve?</div>
        <div className="gw-sub-t">Your feedback makes the product better.</div>

        <form
          onSubmit={(e) => { e.preventDefault(); submit.mutate() }}
          style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
        >
          {/* Star rating */}
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
              Overall rating <span style={{ color: 'var(--gw-red-t)' }}>*</span>
            </div>
            <StarRating value={rating} onChange={setRating} />
            {rating > 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 6 }}>
                {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}
              </div>
            )}
          </div>

          {/* What worked */}
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 8 }}>
            <div className="gw-fld" style={{ marginBottom: 0 }}>
              <label className="gw-label" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                What worked? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea
                className="gw-ta"
                rows={3}
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                placeholder="What did Groundwork do well in this situation?"
                style={{ marginTop: 4 }}
              />
            </div>
          </div>

          {/* What didn't */}
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 8 }}>
            <div className="gw-fld" style={{ marginBottom: 0 }}>
              <label className="gw-label" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                What didn't? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea
                className="gw-ta"
                rows={3}
                value={whatDidnt}
                onChange={(e) => setWhatDidnt(e.target.value)}
                placeholder="What fell short or could be improved?"
                style={{ marginTop: 4 }}
              />
            </div>
          </div>

          {/* Would use again */}
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
              Would you use Groundwork for this type of situation again? <span style={{ color: 'var(--gw-red-t)' }}>*</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['yes', 'no'] as const).map((v) => (
                <label
                  key={v}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 14px',
                    borderRadius: 5,
                    border: `1px solid ${wouldUseAgain === v ? '#0C447C' : '#E2E0DB'}`,
                    background: wouldUseAgain === v ? '#EEF4FB' : 'white',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    color: wouldUseAgain === v ? '#0C447C' : 'var(--gw-text)',
                    transition: 'all 0.1s',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="radio"
                    name="wouldUseAgain"
                    value={v}
                    checked={wouldUseAgain === v}
                    onChange={() => setWouldUseAgain(v)}
                    style={{ accentColor: '#0C447C' }}
                  />
                  {v === 'yes' ? 'Yes' : 'No'}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="gw-btn"
            disabled={!canSubmit}
            style={{ marginTop: 4 }}
          >
            {submit.isPending ? 'Submitting…' : 'Submit feedback'}
          </button>
        </form>
      </div>
    </div>
  )
}
