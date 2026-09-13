import { useState } from 'react'
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
  /** A document you can see states this. */
  documented?: boolean
  /** A document you can see states it differently. Yours stays yours; this is beside it. */
  documentSays?: string | null
}

const KIND: Record<string, string> = {
  INTENT: 'what you are working on', COMMITMENT: 'a commitment', ASK: 'something you asked for',
  /* A thing that happened. Without it this row read as the raw enum. */
  PROGRESS: 'something you got done',
  WORRY: 'a worry', TENSION: 'a tension', SUCCESS_DEFINITION: 'what good looks like',
  TIMEFRAME: 'a timeframe', TOLERANCE: 'a tolerance', OPERATING_DIFFERENCE: 'how this is actually done',
}

export function WhatWasTakenFromWhatYouSaid({ rows, groundId, sessionNumber }: {
  rows?: MyRow[] | null
  groundId: string
  /** Only this session\'s rows are shown here; the page is about one session. */
  sessionNumber: number
}) {
  const [disputing, setDisputing] = useState(false)
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
      {/* Eleven identical 'Not what I said' buttons made the one that mattered invisible. One control opens them. */}
      <p style={{ margin: '0 0 8px', fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.55, maxWidth: '68ch' }}>
        Not what you typed. What the product took from it, and what every count on this page is built from.{' '}
        {!disputing ? (
          <button type="button" onClick={() => setDisputing(true)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11.5, color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
            Something here is not what I said
          </button>
        ) : 'Pick the line, and it stops counting.'}
      </p>
      <div style={{ display: 'grid', gap: 6 }}>
        {mine.map((r, i) => {
        /*
         * THE SAME DOCUMENT DISAGREEING TWICE IS ONE FACT, NOT TWO. On a closing report the lead's
         * own plan contradicted their own summary on two lines running, and the same paragraph of
         * explanation printed under each. Said once, on the first line it applies to.
         */
        const saidBefore = mine.slice(0, i).some(x => !x.disputedAt && x.documentSays === r.documentSays)
        return (
          <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 12.5, lineHeight: 1.55 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: r.disputedAt ? 'var(--gw-muted)' : 'var(--gw-text)', textDecoration: r.disputedAt ? 'line-through' : 'none' }}>{r.text}</span>
              {/* A visible separator, not only a margin: read back off the page as "refers into.what you are working on". */}
              <span style={{ color: 'var(--gw-muted)', fontSize: 11, marginLeft: 8 }}>· {KIND[r.type] ?? r.type.toLowerCase()}</span>
              {r.disputedAt && <span style={{ color: 'var(--gw-muted)', fontSize: 11, marginLeft: 8 }}>· you said this is not what you said</span>}
              {!r.disputedAt && r.documented && <span style={{ color: 'var(--gw-green-t)', fontSize: 11, marginLeft: 8 }}>· backed by a document</span>}
              {!r.disputedAt && r.documentSays && !saidBefore && (
                <div style={{ fontSize: 12, color: 'var(--gw-amber-t)', marginTop: 3, lineHeight: 1.5 }}>
                  A document you can see reads differently: “{r.documentSays}”. Yours stands as you said it; your next check-in will ask which is current.
                </div>
              )}
            </div>
            {!r.disputedAt && disputing && (
              <button
                onClick={() => dispute.mutate({ checkInId: r.checkInId!, id: r.id })}
                disabled={dispute.isPending}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 11.5, color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
              >
                Not what I said
              </button>
            )}
          </div>
        )})}
      </div>
    </section>
  )
}
