import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { reportsApi } from '@/api/reports'
import type { ReportInference } from '@/types'
import { Folded } from '@/components/gw/ui'

interface Props {
  groundId: string
  inferences: ReportInference[]
}

/**
 * HAFSAH'S BUTTON-COUNT REVIEW (1 October 2026): THE HEADER ONLY OPENS AND CLOSES THIS PANEL.
 *
 * "Inferences we made" used to be its own hand-built button, with its own amber-boxed look - a
 * fourth control bolted onto a page that already carries one true action per section (Hafsah, 30
 * September: "no more buttons than the prototype's own version of that screen has"). A control
 * that only folds a section open or shut is the section's own fold, so this is now the shared
 * `Folded` part every other rebuilt page uses for the same job - a native disclosure, not a
 * button, so it is never counted as one. The two real actions inside it, "This is right" and
 * "Correct this", still do something (one drops a claim from the record, the other starts a
 * correction) and stay buttons.
 */
export function InferenceReviewPanel({ groundId, inferences }: Props) {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const active = inferences.filter(i => !dismissed.has(i.id))

  const clarifyMut = useMutation({
    mutationFn: (inferenceId: string) => reportsApi.startClarification(groundId, inferenceId),
    onSuccess: (data) => {
      navigate(`/checkin/${data.checkInId}?clarify=true`)
    },
  })

  if (active.length === 0) return null

  return (
    // GROUP 3'S REVIEW, BATCH A FAULT 6: "INFERENCES" IS JARGON. Said plainly instead.
    <Folded summary="What we worked out from what you said" note={active.length === 1 ? 'There is one for you to check.' : `There are ${active.length} for you to check.`}>
      <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: '0 0 12px', lineHeight: '21px' }}>
        These claims are not direct quotes from your session. They were inferred from what you said. If anything is not right, you can correct it through a short follow-up session.
      </p>

      {active.map((inf) => (
        <div key={inf.id} style={{ padding: '10px 0', borderTop: '1px solid var(--gw-border)' }}>
          <p style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: '20px', margin: '0 0 4px' }}>
            "{inf.text}"
          </p>
          <p style={{ fontSize: 12, color: 'var(--gw-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
            Inferred because: {inf.reason}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sec sm"
              onClick={() => setDismissed(prev => new Set([...prev, inf.id]))}
            >
              This is right
            </button>
            <button className="btn sec sm"
              onClick={() => clarifyMut.mutate(inf.id)}
              disabled={clarifyMut.isPending}
            >
              {clarifyMut.isPending ? 'Loading...' : 'Correct this'}
            </button>
          </div>
        </div>
      ))}
    </Folded>
  )
}
