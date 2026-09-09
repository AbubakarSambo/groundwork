import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { conversationApi } from '@/api/conversation'

/**
 * THE LINES TAKEN FROM WHAT YOU SAID, AS ROWS, WITH ONE PRESS TO SAY ONE IS WRONG.
 *
 * Nine model extractors write these rows and every engine, the confidence read, the tiles and the
 * lead's probe list count them as record. The person never saw them as rows - only the text, on the
 * shared report, under their name, with nothing saying it was extracted rather than typed. If the
 * extraction was wrong nothing downstream could tell.
 *
 * This is the smallest change that makes that wall visible: your own rows, on your own half,
 * labelled as what they are, and one press that stops a row counting. Nothing is deleted; the row
 * stays here struck through, with the dispute beside it, and every count leaves it out.
 */
export interface MyRow {
  id: string
  type: string
  text: string
  disputedAt: string | null
  checkInId: string | null
  sessionNumber: number | null
}

const KIND: Record<string, string> = {
  INTENT: 'what you are working on', COMMITMENT: 'a commitment', ASK: 'something you asked for',
  WORRY: 'a worry', TENSION: 'a tension', SUCCESS_DEFINITION: 'what good looks like',
  TIMEFRAME: 'a timeframe', TOLERANCE: 'a tolerance', OPERATING_DIFFERENCE: 'how this is actually done',
}

export function WhatWasTakenFromWhatYouSaid({ rows, groundId, sessionNumber }: {
  rows?: MyRow[] | null
  groundId: string
  /** Only this session\'s rows are shown here; the page is about one session. */
  sessionNumber: number
}) {
  const qc = useQueryClient()
  const dispute = useMutation({
    mutationFn: ({ checkInId, id }: { checkInId: string; id: string }) => conversationApi.disputeEntry(checkInId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', groundId] })
      qc.invalidateQueries({ queryKey: ['session-shaped-report', groundId] })
      toast.success('Noted. That line no longer counts. It stays here so the dispute is on record too.')
    },
    onError: () => toast.error('That did not go through. Nothing has changed.'),
  })
  const mine = (rows ?? []).filter(r => r.sessionNumber === sessionNumber && r.checkInId)
  if (!mine.length) return null

  return (
    <section style={{ marginTop: 16 }}>
      <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 4 }}>
        Lines taken from what you said
      </div>
      <p style={{ margin: '0 0 8px', fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.55, maxWidth: '68ch' }}>
        Not what you typed. What the product took from it, and what every count on this page is built
        from. If one is not what you said, say so and it stops counting.
      </p>
      <div style={{ display: 'grid', gap: 6 }}>
        {mine.map(r => (
          <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 12.5, lineHeight: 1.55 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: r.disputedAt ? 'var(--gw-muted)' : 'var(--gw-text)', textDecoration: r.disputedAt ? 'line-through' : 'none' }}>{r.text}</span>
              <span style={{ color: 'var(--gw-muted)', fontSize: 11, marginLeft: 8 }}>{KIND[r.type] ?? r.type.toLowerCase()}</span>
              {r.disputedAt && <span style={{ color: 'var(--gw-muted)', fontSize: 11, marginLeft: 8 }}>you said this is not what you said</span>}
            </div>
            {!r.disputedAt && (
              <button
                onClick={() => dispute.mutate({ checkInId: r.checkInId!, id: r.id })}
                disabled={dispute.isPending}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 11.5, color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
              >
                Not what I said
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
