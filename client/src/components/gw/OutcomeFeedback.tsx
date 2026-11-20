import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { outcomeFeedbackApi } from '@/api/feedback'
import { Panel } from './ui'

/**
 * DID THIS FEEL FAIR? MOVED FROM THE DEAD REPORT BODY TO THE BOARD, WHERE A CLOSED CHECK-IN
 * ACTUALLY READS.
 *
 * The only question that tells anyone whether Groundwork worked, and until the resolution flow was
 * wired up there was no way for a party to answer it. Both verbs of `/grounds/:id/outcome-feedback`
 * existed on the API and nothing called either, which means `avgFairnessRate` in the outcome-
 * learning summary has been averaging an empty set since it was written.
 *
 * This used to live on `ReportBody`, the Report tab's old body, which nothing has rendered since
 * the tab became a list of sessions. The board is where everyone reads how a closed check-in ended
 * (`ResolutionPanel` at `board-top`), so the question that follows that reading belongs right under
 * it rather than on a tab nobody opens after the fact.
 *
 * Three deliberate choices, carried over unchanged:
 *
 * ASKED ONLY AFTER THE GROUND CLOSES. Asking mid-ground is asking someone to rate a conversation
 * they are still inside, and it would also tell them the process is over when it is not.
 *
 * THE ANSWER IS CHANGEABLE. The endpoint upserts, so a party who felt one way on the day and
 * another a week later can say so. A first impression locked in forever is a worse record than a
 * revisable one.
 *
 * "NO" IS AS EASY TO PRESS AS "YES". Both are plain buttons of equal weight, neither the page's one
 * navy button - this pair's whole point is a green and an amber of equal visual weight, neither one
 * styled as the board's primary action.
 */
export function OutcomeFeedback({ groundId }: { groundId: string }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')

  const { data: mine } = useQuery({
    queryKey: ['outcome-feedback', groundId],
    queryFn: () => outcomeFeedbackApi.mine(groundId),
    retry: false,
  })

  const submit = useMutation({
    mutationFn: (feltFair: boolean) => outcomeFeedbackApi.submit(groundId, feltFair, note.trim() || undefined),
    onSuccess: () => {
      toast.success('Thank you.')
      setNote('')
      qc.invalidateQueries({ queryKey: ['outcome-feedback', groundId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not record that. Please try again.'),
  })

  const answered = !!mine

  return (
    <Panel>
      {answered && (
        <div className="gwui-fs-13 gwui-mb-10">
          You said this {mine!.feltFair ? 'felt fair' : 'did not feel fair'}.
          {mine!.note && <span className="gwui-ink-sub"> "{mine!.note}"</span>}
          <span className="gwui-ink-muted"> You can change that below.</span>
        </div>
      )}

      {/* Plain: no label above it and no privacy line under it (audit of the check-in pages, 15 November 2026, row 25). Who sees the answer is the backend's rule. */}
      <p className="gwui-fs-13 gwui-mb-10" style={{ fontWeight: 700 }}>Did this feel fair?</p>

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        maxLength={2000}
        rows={2}
        placeholder="Anything to add?"
        className="gwui-rule gwui-fs-13 gwui-pt-8 gwui-pb-8 gwui-pl-10 gwui-pr-10 gwui-mb-10"
        style={{ width: '100%', boxSizing: 'border-box', borderRadius: 7, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
      />

      <div className="gwui-gap-8" style={{ display: 'flex' }}>
        <button
          disabled={submit.isPending}
          onClick={() => submit.mutate(true)}
          className="gwui-rule-green-soft gwui-fs-13 gwui-ink-green gwui-pt-8 gwui-pb-8 gwui-pl-16 gwui-pr-16"
          style={{ fontWeight: 700, background: 'var(--gw-green-bg)', borderRadius: 8, cursor: submit.isPending ? 'wait' : 'pointer', fontFamily: 'inherit' }}
        >
          {submit.isPending && submit.variables === true ? 'Saving…' : 'It felt fair'}
        </button>
        <button
          disabled={submit.isPending}
          onClick={() => submit.mutate(false)}
          className="gwui-rule-amber-soft gwui-fs-13 gwui-ink-amber gwui-pt-8 gwui-pb-8 gwui-pl-16 gwui-pr-16"
          style={{ fontWeight: 700, background: 'var(--gw-amber-bg)', borderRadius: 8, cursor: submit.isPending ? 'wait' : 'pointer', fontFamily: 'inherit' }}
        >
          {submit.isPending && submit.variables === false ? 'Saving…' : 'It did not'}
        </button>
      </div>
    </Panel>
  )
}
