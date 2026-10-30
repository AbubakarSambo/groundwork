import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { conversationApi } from '@/api/conversation'
import './ui/gw-ui.css'

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
  /** What this line is called, filled in by the server from the record: "This is something you got done." only when it holds. */
  typeSays?: string | null
}

/**
 * WHAT KIND OF LINE THIS IS, AS A SENTENCE. Was a bare noun phrase ("something you asked for")
 * stitched to the quote and to "backed by a document" with a "·" and no space before it - "by 9
 * October.· something you asked for· backed by a document" (U.9 re-review, item A). Each is now
 * "This is {phrase}.", its own sentence.
 */
export const KIND: Record<string, string> = {
  INTENT: 'This is what you are working on.', COMMITMENT: 'This is a commitment.', ASK: 'This is something you asked for.',
  /* A thing that happened. Without it this row read as the raw enum. */
  PROGRESS: 'This is something you got done.',
  WORRY: 'This is a worry.', TENSION: 'This is a tension.', SUCCESS_DEFINITION: 'This is what good looks like.',
  TIMEFRAME: 'This is a timeframe.', TOLERANCE: 'This is what you can live with.', OPERATING_DIFFERENCE: 'This is how this is actually done.',
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
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-sub-d)', marginBottom: 4 }}>
        Lines taken from what you said
      </div>
      {/* Eleven identical 'Not what I said' buttons made the one that mattered invisible. One control opens them. */}
      <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--gw-muted)', lineHeight: '19px', maxWidth: '68ch' }}>
        These lines are what Groundwork took from what you wrote. Every count on this page is built from them.{' '}
        {!disputing ? (
          /*
           * HAFSAH'S BUTTON-COUNT REVIEW (1 October 2026): THIS ONLY OPENS THE "NOT WHAT I SAID"
           * LINKS BESIDE EACH ROW BELOW - IT NEVER NAVIGATES AND NEVER SENDS ANYTHING ITSELF. A
           * boxed button here read as a second real action beside the page's own "Correct it", so
           * it is now the shared quiet-text-link style (`.gwui-plain-link`), the same look it
           * already had, just no longer counted as a second button.
           */
          <button type="button" onClick={() => setDisputing(true)} className="gwui-plain-link">
            Something here isn’t right
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
          <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 12, lineHeight: '19px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: r.disputedAt ? 'var(--gw-muted)' : 'var(--gw-text)', textDecoration: r.disputedAt ? 'line-through' : 'none' }}>{r.text}</span>
              {/*
                U.9 RE-REVIEW, ITEM A: A SENTENCE, NOT A ROW OF "·" JOINS.
                "by 9 October.· something you asked for· backed by a document" read as a table row
                with a missing space. Each fact is now its own sentence, in its own block below the
                quote.
              */}
              <div style={{ color: 'var(--gw-muted)', fontSize: 11, marginTop: 2 }}>
                {r.typeSays ?? KIND[r.type] ?? `This is ${r.type.toLowerCase().replace(/_/g, ' ')}.`}
                {!r.disputedAt && r.documented && ' A document backs it.'}
                {r.disputedAt && ' You said this is not what you said.'}
              </div>
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
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
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
