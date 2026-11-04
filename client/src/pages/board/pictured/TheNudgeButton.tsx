import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { boardApi, type ANudgeServed } from '@/api/board'

/**
 * "NUDGE PETER" (api engagement/the-leads-own-nudge.ts). Drawn only where the server served `nudge` to the lead who runs the check-in,
 * with the direct morning on; the route refuses anybody else whatever is drawn here. Pressed once, it says what became of it in a
 * sentence ("Nudged at 15:30", or why nothing was sent and to call instead), and the board is read again.
 */
export function TheNudgeButton({ groundId, nudge }: { groundId: string; nudge: ANudgeServed }) {
  const qc = useQueryClient()
  const [said, setSaid] = useState<string | null>(null)
  const go = useMutation({
    mutationFn: () => boardApi.nudge(groundId, nudge.participantId),
    onSuccess: (r) => {
      setSaid(r.says)
      qc.invalidateQueries({ queryKey: ['board', groundId] })
    },
    onError: () => setSaid(`The nudge to ${nudge.firstName} could not be sent. Try again, or call ${nudge.firstName}.`),
  })
  if (nudge.nudgedAt) return <span className="pb-nudged" data-nudged={nudge.participantId}>{nudge.says}</span>
  if (said) return <span className="pb-nudged" role="status" data-nudged={nudge.participantId}>{said}</span>
  return (
    <button type="button" className="btn pb-nudge" disabled={go.isPending} onClick={() => go.mutate()} data-nudge={nudge.participantId}>
      {go.isPending ? `Nudging ${nudge.firstName}` : nudge.says}
    </button>
  )
}
