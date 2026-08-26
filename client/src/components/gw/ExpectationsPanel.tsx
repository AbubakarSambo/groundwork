import { useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { personLabel } from '@/lib/utils'
import { Sec } from '@/components/gw/kit'

/**
 * WHAT THIS CHECK-IN EXPECTS OF EACH PERSON, IN PLAIN VIEW. GW-EXP-2.
 *
 * Expectations are not typed into this page. They come out of the lead's own check-in, which is the
 * interview where they say what the whole thing is aiming at and then, person by person, what they
 * expect - and get asked whether that person actually knows.
 *
 * PUBLISHING THEM IS THE MECHANISM, NOT THE DISPLAY. A private expectation cannot make anybody aware
 * of anything, so this panel is the thing that closes the founding failure:
 *
 *     "I was measured on a queue and judged on judgement, and only one of those was said."
 *
 * WHY THE AWARENESS LINE IS SHOWN TO THE PERSON IT IS ABOUT. It is the lead's own statement about
 * their own conduct, made in their own session. Concealing "you were never told" from the person who
 * was not told would defeat the entire point, and it is not a judgement of them.
 *
 * NOBODY EDITS ANYTHING HERE. One person states expectations; a party neither agrees to nor rewrites
 * theirs. Where somebody disagrees, that goes through the chat where it is probed and recorded, which
 * is why there is no control on this panel at all.
 */

type Objective = {
  text: string | null
  authoredBy: 'lead' | 'self' | null
  seenBySubject: boolean
  awareness: 'TOLD' | 'NOT_TOLD' | 'UNSURE' | 'NOT_ASKED' | null
  awarenessDetail: string | null
  /** GW-EXP-3. Null while they have not said what doing well looks like to them. */
  alignment: 'ALIGNS' | 'DIFFERS' | 'CANNOT_TELL' | null
  alignmentNote: string | null
  /** GW-EXP-7. Their own words objecting to this expectation, said in their own check-in. */
  objection: string | null
} | null

interface Party {
  id: string
  userId?: string | null
  managingOnly?: boolean
  objective?: Objective
  [k: string]: any
}

/**
 * WHETHER THE TWO VIEWS CONNECT. GW-EXP-3.
 *
 * The finding the product was built on. One side is what the lead expects; the other is what this
 * person said doing well looks like, in their own words. Neither is wrong, and this never says which.
 *
 * `null` is "not yet said", NOT agreement - an absent view is not a matching one. And CANNOT_TELL is
 * shown as plainly as the other two, because it is the honest answer much of the time and hiding it
 * would push the read towards inventing a verdict.
 */
function alignmentLine(o: NonNullable<Objective>): { label: string; note: string | null; tone: 'good' | 'gap' | 'quiet' } {
  switch (o.alignment) {
    case 'ALIGNS':
      return { label: 'This matches what they said doing well looks like', note: o.alignmentNote, tone: 'good' }
    case 'DIFFERS':
      return { label: 'They described doing well differently', note: o.alignmentNote, tone: 'gap' }
    case 'CANNOT_TELL':
      return { label: 'Whether these connect cannot be told from what has been said', note: o.alignmentNote, tone: 'quiet' }
    default:
      return { label: 'They have not said what doing well looks like to them yet', note: null, tone: 'quiet' }
  }
}

/** What the lead said about whether this person knows. Neutral wording: this is not a telling-off. */
function awarenessLine(o: NonNullable<Objective>): { text: string; tone: 'plain' | 'gap' } | null {
  switch (o.awareness) {
    case 'TOLD':
      return { text: o.awarenessDetail?.trim() || 'The lead says this has been said directly.', tone: 'plain' }
    case 'NOT_TOLD':
      return {
        text: o.awarenessDetail?.trim()
          ? `Not yet said directly. The lead's words: "${o.awarenessDetail.trim()}"`
          : 'Not yet said directly, on the lead’s own account.',
        tone: 'gap',
      }
    case 'UNSURE':
      return { text: 'The lead is not sure whether this has been said.', tone: 'gap' }
    default:
      /** NOT_ASKED or null: the question never came up. Saying nothing beats implying an answer. */
      return null
  }
}

export function ExpectationsPanel({
  groundId,
  parties,
  viewerUserId,
}: {
  groundId: string
  parties: Party[]
  /** So this person's own row can be marked as shown, and only their own. */
  viewerUserId?: string | null
}) {
  const withExpectations = (parties ?? []).filter((p) => !p.managingOnly && p.objective?.text?.trim())

  const markShown = useMutation({
    mutationFn: () => groundsApi.markMyExpectationShown(groundId),
  })

  /**
   * FIRED ONCE, FROM THE VIEW THAT ACTUALLY RENDERS IT.
   *
   * `seenBySubject` is what stops somebody being read against an expectation they have never laid eyes
   * on. My first attempt flipped it on the ground fetch, which happens from every tab - so it would
   * have marked an expectation seen for a person who never opened this view. A guard on the read path
   * caught that, correctly.
   */
  const fired = useRef(false)
  const mine = withExpectations.find((p) => !!viewerUserId && p.userId === viewerUserId)
  useEffect(() => {
    if (fired.current) return
    if (!mine || mine.objective?.seenBySubject) return
    fired.current = true
    markShown.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine?.id, mine?.objective?.seenBySubject])

  if (withExpectations.length === 0) {
    return (
      <div style={{ marginBottom: 22 }}>
        <Sec title="What is expected of each person" src="from the lead's own check-in" />
        <div style={{ background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '13px 15px', fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
          Nothing yet. These come out of the lead's own check-in, where they are asked what this is
          aiming at and then what they expect of each person. Until that happens, everyone is working
          to their own read of it.
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 22 }}>
      <Sec title="What is expected of each person" src="from the lead's own check-in" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {withExpectations.map((p) => {
          const o = p.objective!
          const line = awarenessLine(o)
          const isMine = !!viewerUserId && p.userId === viewerUserId
          return (
            <div
              key={p.id}
              style={{
                background: 'white',
                border: `1px solid ${isMine ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
                borderRadius: 8,
                padding: '13px 15px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-dark)' }}>
                  {isMine ? 'You' : personLabel(p as any)}
                </span>
                {o.authoredBy === 'self' && (
                  /** Rows from before one person owned expectations. Their own words are stronger, not weaker. */
                  <span style={{ fontSize: 10.5, color: 'var(--gw-green-t)', background: 'var(--gw-green-bg)', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
                    in their own words
                  </span>
                )}
              </div>

              <div style={{ fontSize: 13.5, color: 'var(--gw-text)', lineHeight: 1.6 }}>{o.text}</div>

              {/*
                THE OBJECTION, ABOVE THE READS AND IN THEIR OWN WORDS. GW-EXP-7.
                
                First of the three, because it is the only one somebody said ON PURPOSE. The awareness
                line is the lead's account and the alignment line is inferred from two statements; this
                is a person telling you the expectation is wrong, and burying it under two machine reads
                would recreate the imbalance it exists to fix.
                
                It does not change the expectation - one person still owns that. It makes the
                disagreement as visible as a revision, so the lead answers it instead of never hearing it.
              */}
              {o.objection?.trim() && (
                <div style={{ marginTop: 9, paddingLeft: 10, borderLeft: '2px solid var(--gw-amber-b)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 2 }}>
                    {isMine ? 'You said this is not right' : 'They said this is not right'}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.55, fontStyle: 'italic' }}>
                    &ldquo;{o.objection.trim()}&rdquo;
                  </div>
                </div>
              )}

              {line && (
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.55,
                    marginTop: 7,
                    color: line.tone === 'gap' ? 'var(--gw-amber-t)' : 'var(--gw-sub)',
                  }}
                >
                  {line.text}
                </div>
              )}

              {/*
                The alignment read, under the awareness line, because they answer two different
                questions in the order a person asks them: do they know, and do we mean the same thing.
              */}
              {(() => {
                const a = alignmentLine(o)
                return (
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: '1px solid var(--gw-border)',
                      fontSize: 12,
                      lineHeight: 1.55,
                      color:
                        a.tone === 'good' ? 'var(--gw-green-t)'
                        : a.tone === 'gap' ? 'var(--gw-amber-t)'
                        : 'var(--gw-muted)',
                    }}
                  >
                    <span style={{ fontWeight: a.tone === 'quiet' ? 400 : 600 }}>{a.label}</span>
                    {a.note && <span style={{ color: 'var(--gw-sub)' }}> {a.note}</span>}
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.55, marginTop: 9 }}>
        {/*
          The one sentence that has to be here. Somebody reading their own expectation for the first
          time needs to know both that they cannot edit it and that they are not stuck with it.
        */}
        Everyone in this check-in sees the same list. Nobody edits it here: if something is wrong or
        has changed, say so in your check-in and it is probed and recorded there.
      </div>
    </div>
  )
}
