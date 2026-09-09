/**
 * THE REVEAL, WHICH THE SERVER HAS ALWAYS EXPECTED AND NO SCREEN OFFERED.
 *
 * A participant who is not the initiator gets a stub — `{ activated: false }` and no content —
 * until they call `POST /grounds/:id/report/activate`. The comment on the server says "the client
 * shows the Reveal button". Nothing in the client called `reportsApi.activate`: the page fell
 * through to its no-report branch and told them the report "appears once everybody has checked
 * in", which is both untrue at that point (everybody has) and unactionable. Thirteen of the
 * hundred audited journeys met this; the audit's runner pressed the endpoint directly, which is
 * precisely what a person cannot do.
 *
 * The exchange is the point of the product, so the wording carries it: their account and the other
 * side's are shown to each other at the same moment, and this is the moment they agree to that.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { reportsApi } from '@/api/reports'

/**
 * WHAT TO SAY WHEN THE REVEAL DID NOT GO THROUGH.
 *
 * A function rather than a line inside `onError`, so it can be tested for the thing that matters:
 * that somebody is told nothing was revealed. Driving a rejected mutation through the test runner
 * asserts the same sentence far less directly and fails for reasons that are about the runner.
 */
export function whatToSayIfItDidNotOpen(e: unknown): string {
  const said = (e as any)?.response?.data?.message
  if (typeof said === 'string' && said.trim()) return said
  return 'That did not go through. Nothing has been revealed — try again.'
}

export function TheReveal({ groundId }: { groundId: string }) {
  const qc = useQueryClient()
  const [failed, setFailed] = useState<string>('')

  const reveal = useMutation({
    mutationFn: () => reportsApi.activate(groundId),
    onSuccess: () => {
      setFailed('')
      /* Both, because the ground's own view of who has revealed changes too. */
      qc.invalidateQueries({ queryKey: ['report', groundId] })
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
    },
    onError: (e: unknown) => setFailed(whatToSayIfItDidNotOpen(e)),
  })

  return (
    <div style={{ maxWidth: 460, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--gw-navy)' }}>Everybody has checked in</div>
      <div style={{ fontSize: 13.5, color: 'var(--gw-sub)', lineHeight: 1.65 }}>
        The shared record is written and waiting. It opens for both sides at the same moment, so
        nobody reads the other's account before their own is in — which is what makes it worth
        reading. Your own answers are already saved and nothing here changes them.
      </div>
      <button
        onClick={() => reveal.mutate()}
        disabled={reveal.isPending}
        style={{
          padding: '11px 24px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white',
          fontSize: 14, fontWeight: 700, border: 'none', cursor: reveal.isPending ? 'default' : 'pointer',
          fontFamily: 'inherit', opacity: reveal.isPending ? 0.65 : 1,
        }}
      >
        {reveal.isPending ? 'Opening…' : 'Show me the shared record'}
      </button>
      {failed && <div className="gw-er" style={{ fontSize: 12.5 }}>{failed}</div>}
      <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.5 }}>
        This cannot be undone, and it does not release anything you have not already said.
      </div>
    </div>
  )
}
