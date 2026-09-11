import { useState, useEffect } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { conversationApi } from '@/api/conversation'
import { outcomeFeedbackApi } from '@/api/feedback'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { alignmentLabel, alignmentShort } from '@/lib/alignment'
import { whyYouCannotSeeThis, whatWentWrong } from './why-you-cannot-see-this'
import { personLabel, participantLabel } from '@/lib/utils'
import { Sec } from '@/components/gw/kit'
import { InferenceReviewPanel } from '@/components/InferenceReviewPanel'
import { WhatToWalkInWith } from '@/components/gw/WhatToWalkInWith'
import { splitOutWhatWasWorkedOut } from '@/lib/which-of-this-was-worked-out'
import { VennIcon } from '@/components/gw/VennIcon'
import { participantRequestsApi } from '@/api/participantRequests'
import type { ResolutionState } from '@/api/resolution'
import { closedByLine, openStatusLine } from '@/lib/who-closes-this'
import { looksLikeAnAddress, NOT_AN_ADDRESS } from '@/components/gw/an-address-that-can-receive-mail'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

type ViewTab = 'shared' | 'own'

/**
 * A THIRD COPY OF THIS TYPE USED TO LIVE HERE, AND IT WAS MISSING THE FIELD THAT MATTERS. W-UX-R.
 *
 * Hand-written, without `leadDecides`, so this page could not respect who actually closes a ground -
 * and rendered the both-must-agree tally on every scenario. `ResolutionState` from `@/api/resolution`
 * is the one shape the endpoint returns.
 */
type ResolutionStatus = ResolutionState & { groundStatus: string }

function ResolutionSection({ groundId, resolutionState }: { groundId: string; resolutionState?: string | null }) {
  const { data } = useQuery({
    queryKey: ['resolution', groundId],
    queryFn: () => apiClient.get<ResolutionStatus>(`/grounds/${groundId}/resolution`).then(r => r.data),
    retry: false,
  })
  const isClosed = data?.groundStatus === 'RESOLVED' || data?.groundStatus === 'CLOSED'

  /**

   * NOTHING SET IS ONE LINE, NOT A PANEL.

   *

   * This drew a full section - a heading, a "Current status" label and a sentence saying there

   * was nothing - near the top of a report a lead scrolls 856px to read. A panel that says it

   * has nothing to say takes the same space as one that does.

   *

   * It comes back whole the moment there is a resolution to show, which is when the lead is

   * being asked to act on it. Same rule as the stat tiles: a count of nothing does not get a

   * tile, and the signal returns the moment there is one.

   */

  if (!resolutionState && !data?.resolution) {

    return (

      <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', padding: '2px 0' }}>

        Resolution · not set yet

      </div>

    )

  }


  return (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
      <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 10 }}>Resolution</div>
      {resolutionState && (
        <div style={{ marginBottom: data ? 12 : 0 }}>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)', display: 'block', marginBottom: 2 }}>Agreed at the start</span>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{resolutionState}</div>
        </div>
      )}
      {data && (
        <div>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)', display: 'block', marginBottom: 6 }}>Current status</span>
          {isClosed && data.resolution ? (
            <div style={{ background: 'var(--gw-green-bg)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-green-t)' }}>Closed: {data.resolution.endState}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-green-t-soft)', marginTop: 2 }}>{closedByLine(data)}</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13, marginBottom: 8 }}>{openStatusLine(data)}</div>
              {/*
                THE PER-PARTY TALLY BELONGS ONLY WHERE EVERY ANSWER IS ACTUALLY AWAITED.
                
                On a lead-decides ground it was actively misleading: a contractor sat in this list
                marked "Not yet" against their own renewal, which reads as the org waiting on their
                agreement for something the server closes on the lead alone. What the other parties
                are owed here is to SEE the outcome coming, which the options above give them - not a
                row implying a vote they do not have.
              */}
              {!data.leadDecides && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.confirmations.map((c) => (
                    <div key={c.participantId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 10px', background: 'var(--gw-paper-2)', borderRadius: 6 }}>
                      <span>{c.label}</span>
                      <span style={{ color: c.confirmed ? 'var(--gw-green-t)' : 'var(--gw-muted)', fontWeight: 600 }}>{c.confirmed ? c.endState : 'Not yet'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * The five-band ladder that used to sit here - Unresolved, Mixed, Emerging,
 * Clear, Aligned, with a filled "n of 5" - is gone. Two reasons, and the second
 * is the one that mattered.
 *
 * It read as a grade. The landing page says twice that this product does not
 * score or rate, and a five-step bar with four segments lit is a score whatever
 * the words on it say. A person opening their own report should not meet a
 * number that looks like a mark out of five.
 *
 * And three of the five bands were invented. The report holds exactly two
 * things: `agreements` and `divergences`. "Emerging" and "Mixed" were thresholds
 * picked here in the client to fill a scale that the record cannot support -
 * d <= 2 was a design decision, not a finding. So the page now says what the
 * report actually holds, and when it holds nothing it says nothing. That last
 * part is the point: an empty report used to render as a full ladder.
 */

/**
 * DID THIS FEEL FAIR?
 *
 * The only question that tells anyone whether Groundwork worked, and until now
 * there was no way for a party to answer it. Both verbs of
 * `/grounds/:id/outcome-feedback` existed on the API and nothing called either,
 * which means `avgFairnessRate` in the outcome-learning summary has been
 * averaging an empty set since it was written.
 *
 * Three deliberate choices:
 *
 * ASKED ONLY AFTER THE GROUND CLOSES. Asking mid-ground is asking someone to
 * rate a conversation they are still inside, and it would also tell them the
 * process is over when it is not.
 *
 * THE ANSWER IS CHANGEABLE. The endpoint upserts, so a party who felt one way on
 * the day and another a week later can say so. A first impression locked in
 * forever is a worse record than a revisable one.
 *
 * "NO" IS AS EASY TO PRESS AS "YES". Both are plain buttons of equal weight. A
 * feedback control that makes the negative answer the effortful one collects
 * flattery, and flattery here would quietly corrupt the one number that says
 * whether any of this is working.
 */
function OutcomeFeedbackSection({ groundId, closed }: { groundId: string; closed: boolean }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')

  const { data: mine } = useQuery({
    queryKey: ['outcome-feedback', groundId],
    queryFn: () => outcomeFeedbackApi.mine(groundId),
    enabled: closed,
    retry: false,
  })

  const submit = useMutation({
    mutationFn: (feltFair: boolean) => outcomeFeedbackApi.submit(groundId, feltFair, note.trim() || undefined),
    onSuccess: () => {
      toast.success('Thank you - that is recorded.')
      setNote('')
      qc.invalidateQueries({ queryKey: ['outcome-feedback', groundId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not record that. Please try again.'),
  })

  if (!closed) return null

  const answered = !!mine

  return (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
      <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 10 }}>
        This check-in has closed
      </div>

      {answered && (
        <div style={{ fontSize: 13, marginBottom: 10 }}>
          You said this process {mine!.feltFair ? 'felt fair' : 'did not feel fair'}.
          {mine!.note && <span style={{ color: 'var(--gw-sub)' }}> "{mine!.note}"</span>}
          <span style={{ color: 'var(--gw-muted)' }}> You can change that below.</span>
        </div>
      )}

      <div style={{ fontSize: 13.5, marginBottom: 8, lineHeight: 1.55 }}>
        Did this process feel fair, and grounded in what was actually said?
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 10, lineHeight: 1.5 }}>
        Your answer is not shown to the other parties.
      </div>

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        maxLength={2000}
        rows={2}
        placeholder="Anything you want to add (optional)"
        style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '8px 10px', borderRadius: 7, border: '1px solid #D6D2CA', fontFamily: 'inherit', outline: 'none', resize: 'vertical', marginBottom: 10 }}
      />

      <div style={{ display: 'flex', gap: 8 }}>
        {/* Equal weight, deliberately. See the note above. */}
        <button
          disabled={submit.isPending}
          onClick={() => submit.mutate(true)}
          style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-green-t)', background: 'var(--gw-green-bg)', border: '1px solid #BFE3D3', borderRadius: 8, padding: '8px 16px', cursor: submit.isPending ? 'wait' : 'pointer', fontFamily: 'inherit' }}
        >
          {submit.isPending && submit.variables === true ? 'Saving…' : 'It felt fair'}
        </button>
        <button
          disabled={submit.isPending}
          onClick={() => submit.mutate(false)}
          style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '1px solid #F0DCB4', borderRadius: 8, padding: '8px 16px', cursor: submit.isPending ? 'wait' : 'pointer', fontFamily: 'inherit' }}
        >
          {submit.isPending && submit.variables === false ? 'Saving…' : 'It did not'}
        </button>
      </div>
    </div>
  )
}

function PatternBlock({ label, content, dark, inferences }: { label: string; content: string; dark?: boolean; inferences?: Array<{ id: string; text: string }> | null }) {
  /*
   * WHICH OF THIS NOBODY ACTUALLY SAID.
   *
   * This block reads as settled fact throughout, and some of it is: somebody wrote it in their own
   * account. The rest the model worked out across two accounts. Both were set identically, so the
   * person a report is about could end up arguing with a sentence nobody had written.
   *
   * The concluded ones are underlined and carry the words, so it is legible without colour and
   * without hovering. Anything the model did not mark, or marked with a paraphrase that is not in
   * the body verbatim, is left as ordinary text - see the matching note in the rule.
   */
  const pieces = splitOutWhatWasWorkedOut(content, inferences)
  const anyWorkedOut = pieces.some(p => p.workedOut)
  return (
    <div style={{ background: dark ? 'var(--gw-green-t)' : 'var(--gw-dark)', color: '#fff', borderRadius: 8, padding: '15px 17px', marginBottom: 16 }}>
      <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-green-b)', fontWeight: 700, marginBottom: 8 }}>
        {label}
      </div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,.93)' }}>
        {pieces.map((piece, i) => piece.workedOut ? (
          <span
            key={i}
            style={{
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textDecorationColor: 'var(--gw-green-b)',
              textUnderlineOffset: 3,
            }}
          >{piece.text}</span>
        ) : <span key={i}>{piece.text}</span>)}
      </p>
      {anyWorkedOut && (
        <div style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.5, color: 'rgba(255,255,255,.72)' }}>
          Underlined: worked out from what people wrote, not stated by anyone. You can correct it below.
        </div>
      )}
    </div>
  )
}

/**
 * WHAT THE GROUND CAN TELL YOU - the section the server has been building and nobody could read.
 * W14-1.
 *
 * `what-a-leader-can-weigh.ts` has produced this for months: the lead's own words for what doing
 * well means, what the record actually holds against those words, and - the part that earns the
 * section - **the standards nothing in twelve weeks ever reached**. Absence is invisible to a
 * person reading prose, and it is usually the thing the decision turns on.
 *
 * The client rendered none of it. `ConfDots` was deleted for being unimported when it was really
 * the display half of this, which is the mistake that started this wave.
 *
 * THREE RULES FROM THE MODULE'S OWN DESIGN NOTES, KEPT HERE:
 *  - it is material, not a verdict, and it carries that sentence rather than implying it
 *  - it does not exist before the closing session, because a "what to weigh" panel visible from
 *    week two turns every visit into an evaluation
 *  - the specificity score is NOT in it. It measures how somebody writes, and using it as a
 *    proxy for how they work is the quiet unfairness this product exists to prevent
 */
/**
 * WHERE THE RECORD IS THIN, AND WHAT WOULD FIRM IT UP. W14-1.
 *
 * `harder-to-fool.ts` finds the soft spots in each account - a whole account nothing else
 * reaches, a claim resting on one session, a standard with no document behind it - and the
 * service guarantees that a spot never travels without `wouldRaiseIt`, the thing that would
 * settle it. Both computed, neither shown.
 *
 * THIS IS ABOUT THE PICTURE, NOT THE PERSON, and the wording follows `confidence-in-the-picture`
 * exactly: "we are not confident this part of the picture is complete" rather than "low
 * specificity", because the same measurement attached to a human being is a verdict. A record
 * can be thin. A person cannot be thin.
 *
 * Lead only: the service computes it under `if (viewerIsLead)` and returns nothing otherwise, so
 * this cannot render for anybody else even if it were placed wrongly.
 */
function WhereTheRecordIsThin({ spots, nameFor }: {
  spots: Record<string, { spot: string; line: string; wouldRaiseIt: string }[]>
  nameFor: (participantId: string) => string
}) {
  const people = Object.entries(spots).filter(([, list]) => list.length)
  if (!people.length) return null
  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 8, padding: '15px 17px', marginBottom: 16, background: 'var(--gw-paper)' }}>
      <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-sub)', fontWeight: 700, marginBottom: 4 }}>
        Where this picture is thin
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
        Not a mark on anybody. It is what the record cannot yet support, and what would settle it.
      </div>
      {people.map(([participantId, list]) => (
        <div key={participantId} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 4 }}>
            In what {nameFor(participantId)} said
          </div>
          {list.map((s, i) => (
            <div key={i} style={{ borderLeft: '3px solid var(--gw-border)', paddingLeft: 10, marginBottom: 7 }}>
              <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6 }}>{s.line}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55, marginTop: 2 }}>
                What would settle it: {s.wouldRaiseIt}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * `[INFERRED: ...]` IS MACHINERY, AND IT REACHED THE READER. W14-1.
 *
 * The engine marks anything it concluded rather than heard with `[INFERRED: <reason>]` - a good
 * rule, and `board/reads.ts` and the conversation service both strip it before use. The weigh
 * section did not, so a lead's "what you said doing well means" list contained:
 *
 *   "him deciding anything without checking with me first [INFERRED: Implied that success is
 *    seeing him act with independent judgment]"
 *
 * Seen the moment it was rendered for the first time.
 *
 * NOT STRIPPED SILENTLY. Deleting the marker would present an inference as a quotation, in the
 * one section whose whole promise is the lead's own words. It is split out and labelled, so the
 * line reads as what it is and the reason stays available.
 */
function splitInference(text: string): { text: string; inferred: string | null } {
  const m = text.match(/\s*\[INFERRED:\s*([^\]]*)\]\s*/i)
  if (!m) return { text, inferred: null }
  return { text: text.replace(m[0], ' ').trim(), inferred: (m[1] || '').trim() || 'inferred from what was said' }
}

function WhatTheGroundCanTellYou({ section, note, restedOn, startedAt }: {
  section: {
    whatYouSaidGoodMeans: { text: string; session: number }[]
    whatTheRecordHolds: { kind: string; text: string; session: number }[]
    whatNobodyHasEvidenceFor: string[]
    /**
     * THE SECTION'S OWN NOTE, which was being dropped.
     *
     * `whatALeaderCanWeigh` computes a note about THIS ground - "three things you said mattered
     * were never reached by anybody's account" - and the page rendered only the standing caveat
     * that ships beside it. Two notes doing different jobs: one says what this record cannot
     * answer, the other says what the section is not. Losing the first left a lead reading a list
     * of unmet standards with no sentence telling them what that does and does not mean.
     *
     * Found by reading the assembled section off her real closed ground rather than the fixture.
     */
    note?: string
  }
  note: string
  /**
   * WHAT IT RESTED ON, from the baseline the lead stated at the start.
   *
   * A list of standards with no sight of the conditions they depended on invites the reading this
   * product exists to prevent: a missed outcome looks like somebody underperforming, when the thing
   * that had to be true was never in their hands. Shown only when the lead named some.
   */
  restedOn?: string[]
  startedAt?: { text: string; session: number }[]
}) {
  const rows: { h: string; items: string[]; empty?: string }[] = [
    { h: 'What you said doing well means', items: section.whatYouSaidGoodMeans.map(s => s.text) },
    { h: 'What people have said about that', items: section.whatTheRecordHolds.map(e => e.text), empty: 'Nobody has spoken to it yet.' },
    {
      /* It lists standards nobody's account reached, not things nobody can prove - the section's
         own note says "never reached by anybody's account". The old heading described a different
         section and carried the courtroom register besides. */
      h: 'What nobody mentioned',
      items: section.whatNobodyHasEvidenceFor,
      empty: 'Everything you named was reached by something somebody said.',
    },
  ]
  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 8, padding: '15px 17px', marginBottom: 16, background: 'var(--gw-paper)' }}>
      <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-sub)', fontWeight: 700, marginBottom: 10 }}>
        What this check-in can tell you
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 4 }}>{r.h}</div>
          {r.items.length ? (
            <ul style={{ margin: 0, paddingLeft: 17, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {r.items.map((t, j) => {
                const { text, inferred } = splitInference(t)
                return (
                  <li key={j} style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6 }}>
                    {text}
                    {inferred && (
                      <span
                        title={inferred}
                        style={{ marginLeft: 6, fontSize: 11, color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}
                      >
                        inferred
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <div style={{ fontSize: 12.5, color: 'var(--gw-muted)', lineHeight: 1.6 }}>{r.empty}</div>
          )}
        </div>
      ))}
      {/**
        * WHERE THIS STOOD AT THE START, and it is only ever sent once there is a later session to
        * hold it against. The server decides that, not this component: `canShowMovement` refuses to
        * call one session a movement, so an early report simply has no `whereThisStarted` to render
        * and this block does not appear. Nothing here re-derives that rule or works around it.
        */}
      {startedAt && startedAt.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 4 }}>Where this stood at the start</div>
          <ul style={{ margin: 0, paddingLeft: 17, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {startedAt.map((s, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6 }}>
                {s.text}
                {/* A line added later is a fact about later, and the distance is the finding. */}
                {s.session > 1 && (
                  <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}> · added at session {s.session}</span>
                )}
              </li>
            ))}
          </ul>
          <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', lineHeight: 1.55, marginTop: 5 }}>
            Written at the beginning and left as it was. Read what people shared above against it.
          </div>
        </div>
      )}
      {restedOn && restedOn.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 4 }}>What you said it rested on</div>
          <ul style={{ margin: 0, paddingLeft: 17, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {restedOn.map((c, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6 }}>{c}</li>
            ))}
          </ul>
          <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', lineHeight: 1.55, marginTop: 5 }}>
            These were not in their hands. Read anything unmet above against them first.
          </div>
        </div>
      )}

      {/* This ground's own reading of its gaps, then the standing caveat. Both ship with the
          section and they say different things. */}
      {section.note && (
        <div style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.6, borderTop: '1px solid var(--gw-border)', paddingTop: 9 }}>
          {section.note}
        </div>
      )}
      <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', lineHeight: 1.6, borderTop: section.note ? 'none' : '1px solid var(--gw-border)', paddingTop: section.note ? 6 : 9 }}>
        {note}
      </div>
    </div>
  )
}

function AreaBlock({ title, observation, whyItMatters, recommendedMove, reached, note }: {
  title: string
  observation?: string
  whyItMatters?: string
  recommendedMove?: string
  reached?: boolean
  note?: string
}) {
  return (
    <div style={{
      border: '1px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 10,
      borderLeft: `3px solid ${reached ? 'var(--gw-green-b)' : 'var(--gw-amber-b)'}`,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {note && <div style={{ fontSize: 12.5, color: 'var(--gw-sub)' }}>{note}</div>}
      {observation && (
        <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 7 }}>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)', display: 'block', marginBottom: 1 }}>What we noticed</span>
          {observation}
        </div>
      )}
      {whyItMatters && (
        <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 7 }}>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)', display: 'block', marginBottom: 1 }}>Why it matters</span>
          {whyItMatters}
        </div>
      )}
      {recommendedMove && (
        <div style={{ background: 'var(--gw-green-bg)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--gw-green-t)', lineHeight: 1.5 }}>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-green-t)', opacity: 0.75, display: 'block', marginBottom: 2 }}>What to do next</span>
          {recommendedMove}
        </div>
      )}
    </div>
  )
}

function HonestClose({ aligned, open, revisit, risk }: {
  aligned?: string; open?: string; revisit?: string; risk?: string
}) {
  const cells = [
    { label: 'Aligned', value: aligned, bg: 'var(--gw-green-bg)', color: 'var(--gw-green-t)' },
    { label: 'Open',    value: open,    bg: 'var(--gw-amber-bg)', color: 'var(--gw-amber-t)' },
    { label: 'Revisit', value: revisit, bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
    { label: 'Risk',    value: risk,    bg: 'var(--gw-clay-bg)', color: 'var(--gw-clay)' },
  ]
  const visible = cells.filter(c => c.value)
  if (visible.length === 0) return null
  return (
    <div>
      {/* An eighth copy of the same label, written inline. Same heading, same source now. */}
      <Sec title="An honest close" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cells.map(cell => cell.value ? (
          <div key={cell.label} style={{ borderRadius: 8, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--gw-text)', background: cell.bg }}>
            <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: 3, color: cell.color }}>{cell.label}</span>
            {cell.value}
          </div>
        ) : null)}
      </div>
    </div>
  )
}

function Bullet({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 9, fontSize: 13, lineHeight: 1.55, marginBottom: 7 }}>
      <span style={{ flexShrink: 0, marginTop: '.55em', width: 5, height: 5, borderRadius: '50%', background: 'var(--gw-green-b)', display: 'inline-block' }} />
      <span>{text}</span>
    </div>
  )
}

/**
 * THE REPORT'S HEADINGS ARE THE BOARD'S HEADINGS NOW. W14-8.
 *
 * This was a hand-rolled div: 10.5px, .09em, muted, no semantics. The kit's `Sec` - lifted out of
 * BoardPage, which is the best-written page in the product - is 12.5px, .4px, sub, and an actual
 * `<h2>`. Two components doing one job, one of them slightly worse, on the document this whole
 * system exists to produce.
 *
 * Kept as a named wrapper rather than swapping thirteen call sites to `<Sec title=...>`, because the
 * children form reads better in the middle of this page's markup and the point was to share the
 * hierarchy, not to churn the file. What changed is where the values come from.
 */
function SecH({ children }: { children: React.ReactNode }) {
  return <Sec title={String(children)} />
}

// #1b/#1c: hiddenContributors is computed server-side (reports.service.ts
// REPORT_SCHEMA) but was never rendered anywhere - dead data. Surfaces it here
// with a role-appropriate action: the initiator can add the person directly
// (the ground already exists at this point, unlike the pre-ground entry
// flow); a participant cannot add anyone themselves, so they get the
// existing ParticipantRequest flow instead, which the initiator already has
// an approval UI for (GroundAdminPage.tsx pendingRequests).
function HiddenContributorsSection({
  groundId,
  contributors,
  isInitiator,
}: {
  groundId: string
  contributors: { label: string; evidence: string }[]
  isInitiator: boolean
}) {
  const [openFor, setOpenFor] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState<Set<string>>(new Set())

  const addParticipant = useMutation({
    mutationFn: (vars: { key: string; email: string; note: string }) =>
      groundsApi.addParticipant(groundId, { email: vars.email, note: vars.note }),
    onSuccess: (_data, vars) => {
      setDone(prev => new Set(prev).add(vars.key))
      setOpenFor(null)
      toast.success('Invited.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not add them. Try again.'),
  })

  const requestAddition = useMutation({
    mutationFn: (vars: { key: string; requestedEmail: string; requestedName?: string; reason: string }) =>
      participantRequestsApi.create(groundId, { requestedEmail: vars.requestedEmail, requestedName: vars.requestedName, reason: vars.reason }),
    onSuccess: (_data, vars) => {
      setDone(prev => new Set(prev).add(vars.key))
      setOpenFor(null)
      /* "the initiator" is the schema's word for this person, not one anybody says out loud.
         The server already tells people "the lead" when it refuses them,
         so this matches that rather than adding a fifth way to name the same person. */
      toast.success('Request sent to the lead.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not send the request. Try again.'),
  })

  if (contributors.length === 0) return null

  return (
    <div style={{ marginTop: 16, background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 8, padding: '12px 14px' }}>
      <SecH>People who may be missing</SecH>
      <div style={{ fontSize: 12.5, color: '#4A5568', lineHeight: 1.55, marginBottom: 10 }}>
        The record references people who are not themselves a party on this check-in.
      </div>
      {contributors.map((c, i) => {
        const key = `${i}-${c.label}`
        return (
          <div key={key} style={{ padding: '9px 0', borderTop: i > 0 ? '1px solid var(--gw-blue-bg)' : undefined }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 2 }}>{c.label}</div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.45, marginBottom: 6 }}>{c.evidence}</div>
            {done.has(key) ? (
              <div style={{ fontSize: 11.5, color: 'var(--gw-green-t)', fontWeight: 600 }}>{isInitiator ? '✓ Invited' : '✓ Request sent'}</div>
            ) : openFor === key ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  type="email" autoFocus placeholder="their@email.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--gw-blue-b)', fontSize: 12.5, fontFamily: 'inherit', outline: 'none' }}
                />
                {!isInitiator && (
                  <input
                    type="text" placeholder="Their name (optional)"
                    value={name} onChange={e => setName(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--gw-blue-b)', fontSize: 12.5, fontFamily: 'inherit', outline: 'none' }}
                  />
                )}
                {!isInitiator && (
                  <textarea
                    placeholder="Why should they be added?"
                    value={reason} onChange={e => setReason(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--gw-blue-b)', fontSize: 12.5, fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: 44 }}
                  />
                )}
                {emailError && <div className="gw-er" role="alert">{emailError}</div>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => {
                      /* It used to return in silence, so a typo was indistinguishable from success. */
                      if (!looksLikeAnAddress(email)) { setEmailError(NOT_AN_ADDRESS); return }
                      setEmailError('')
                      if (isInitiator) {
                        addParticipant.mutate({ key, email: email.trim(), note: c.evidence })
                      } else {
                        requestAddition.mutate({ key, requestedEmail: email.trim(), requestedName: name.trim() || undefined, reason: reason.trim() || c.evidence })
                      }
                    }}
                    disabled={addParticipant.isPending || requestAddition.isPending}
                    style={{ flex: 1, padding: '7px 12px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {isInitiator ? 'Add them' : 'Send request'}
                  </button>
                  <button
                    onClick={() => { setOpenFor(null); setEmail(''); setName(''); setReason('') }}
                    style={{ padding: '7px 12px', borderRadius: 6, background: 'none', border: '1px solid var(--gw-blue-b)', color: 'var(--gw-sub)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setOpenFor(key); setEmail(''); setName(''); setReason(c.evidence) }}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
              >
                {isInitiator ? 'Add them' : 'Request they be added'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * ONE REPORT, NOT TWO A CLICK APART.
 *
 * This was a whole page of its own, reached from a button on the Report tab that said "View the full
 * shared report". So the product held two reports about the same check-in - a summary on the tab and
 * the real thing on a page - with no way to know which one you had read, and the page carried its own
 * dark header and its own back-link because it did not know it was part of a check-in.
 *
 * The content is unchanged. What changed is that it renders in the tab, and the standalone route
 * redirects there, so there is one report and one way to reach it.
 *
 * `embedded` drops only the page chrome: the full-bleed wrapper, and the dark header whose job was to
 * say which check-in you were looking at and offer a way back. Inside the tab, the page around it
 * already says both.
 */

export function ReportBody({
  groundId,
  embedded = false,
  reportExists,
}: {
  groundId?: string
  embedded?: boolean
  /**
   * WHETHER THERE IS A REPORT TO FETCH, WHEN THE CALLER ALREADY KNOWS.
   *
   * `GET /grounds/:id/report` answers 404 for "no report yet" and must keep doing so - the same 404
   * covers a check-in that does not exist and one that is not yours, so the three cannot be told
   * apart (GW-PRI-04). The cost is a red 404 in the console on every check-in without a report.
   *
   * A page that renders this inside a check-in already holds `ground.report` and can say. Standalone
   * at `/grounds/:id/report` there is no ground in hand, so it is left undefined and asked for.
   *
   * OMITTED MEANS ASK. Only an explicit `false` holds the request back, so no caller is changed by
   * not knowing about this.
   */
  reportExists?: boolean
}) {
  /** Embedded, the id comes from the page around it; standalone, from the route. */
  const params = useParams<{ id: string }>()
  const id = groundId ?? params.id
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [tab, setTab] = useState<ViewTab>('shared')

  const { data: ground, isLoading: gl, error: groundError, refetch: refetchGround } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
  })

  /**
   * A report that is out of date says so.
   *
   * Synthesis runs after a check-in finishes, so for a minute or two the page
   * shows the PREVIOUS report with no sign of it. Someone who has just spent
   * twenty minutes correcting their account opens this, sees the old version,
   * and reasonably concludes the correction was thrown away. Showing that it is
   * still updating - and refreshing until it is - costs nothing and prevents
   * exactly that.
   */
  const [reportIsStale, setReportIsStale] = useState(false)

  /*
   * A REPORT BEING WRITTEN IS WORTH WAITING FOR, SO THE PAGE WAITS.
   *
   * The server now says which of three situations a missing report is in, and one of them —
   * "everybody has answered and it is being written" — resolves on its own in under a minute. The
   * page said so and then did nothing, so the person who had just finished sat looking at a
   * sentence that never changed and had to guess that a reload was the move. Fifty-six of the
   * hundred audited journeys waited through this; the audit's runner polled, which is exactly what
   * a person cannot do.
   *
   * Only for that one message. A report nobody has answered for is not coming in a minute, and
   * polling it would be a spinner with no end.
   */
  const [waitingForItToBeWritten, setWaitingForItToBeWritten] = useState(false)

  const { data: report, isLoading: rl, error: reportError } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(id!),
    enabled: !!id && reportExists !== false,
    retry: false,
    refetchInterval: reportIsStale || waitingForItToBeWritten ? 5000 : false,
  })

  useEffect(() => {
    const said = (reportError as any)?.response?.data?.message
    setWaitingForItToBeWritten(typeof said === 'string' && /being written/i.test(said))
  }, [reportError])

  // Someone finished a check-in after this report was written, so what is on
  // screen predates their account.
  useEffect(() => {
    /*
     * WHEN IT WAS LAST WRITTEN, NOT WHEN THE ROW WAS MADE.
     *
     * This read `createdAt`, and regeneration upserts the report rather than replacing it - so that
     * timestamp stays at first generation for ever. The moment anybody checked in again, "someone
     * has checked in since this was written, you are reading the previous version" became
     * permanently true, and the page polled every five seconds for as long as it believed it. Seen
     * on a real check-in, still showing the banner over a report that had already refreshed.
     *
     * `createdAt` is the fallback for a report written before the column existed.
     */
    const writtenAt = (report as any)?.updatedAt ?? (report as any)?.createdAt
    const generatedAt = writtenAt ? new Date(writtenAt).getTime() : 0
    const newest = (ground?.checkIns ?? [])
      .map((c) => (c.completedAt ? new Date(c.completedAt).getTime() : 0))
      .reduce((m, t) => Math.max(m, t), 0)
    setReportIsStale(!!generatedAt && newest > generatedAt)
  }, [report, ground])

  // Self-correction: revisit a completed session to correct or add to it. The backend
  // (startSelfCorrectionSession) opens a fresh session in correction mode; the corrected
  // record flows into the next report synthesis. The original session is preserved, not
  // overwritten. Only available on your OWN completed session that no later session builds on.
  const correctSession = useMutation({
    mutationFn: (sessionNumber: number) => reportsApi.startSelfCorrection(id!, sessionNumber),
    onSuccess: (data) => navigate(`/checkin/${data.checkInId}`),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not start a correction session. Please try again.'),
  })

  /**
   * The caller's OWN sessions, so the page can offer them their own record.
   *
   * `/my-checkin-status` resolves the participant from the caller's user id, so
   * this cannot be pointed at another party - which is why it is safe to run on
   * a page both parties open. It is also the only way to get the check-in ids
   * needed for the download below; the shared report itself does not carry them,
   * and it should not.
   */
  const { data: myStatus } = useQuery({
    queryKey: ['my-checkin-status', id],
    queryFn: () => groundsApi.getMyCheckinStatus(id!),
    enabled: !!id,
    retry: false,
  })

  /**
   * "This record is yours. It is portable and permanent" - which the panel below
   * has said all along, with no way to take it anywhere. The endpoint existed
   * and nothing called it. Owner-only, enforced server-side.
   */
  const downloadRecord = useMutation({
    mutationFn: (checkInId: string) => conversationApi.download(checkInId),
    /* Under a claim that the record is portable and permanent, nothing said a file was produced. */
    onSuccess: () => toast.success('Your record is downloading.'),
    onError: () => toast.error('Could not download that record. Please try again.'),
  })

  const PAGE_STYLE: React.CSSProperties = {
    minHeight: '100vh',
    background: 'var(--gw-bg)',
    color: 'var(--gw-text)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    lineHeight: 1.55,
    WebkitFontSmoothing: 'antialiased',
  }

  if (gl || rl) {
    return (
      <div style={{ ...PAGE_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading report…</div>
      </div>
    )
  }

  if (!ground) {
    /*
     * WHICH OF THE THREE THIS IS. A 500, a check-in you are not on, and a link that is out of date
     * all rendered "Report not found." — see why-you-cannot-see-this.ts. The one that mattered
     * most was the 500: telling somebody their record is missing when the server broke.
     */
    const why = whyYouCannotSeeThis(whatWentWrong(groundError))
    return (
      <div style={{ ...PAGE_STYLE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', maxWidth: 420, textAlign: 'center', lineHeight: 1.6 }}>{why.say}</div>
        <div style={{ display: 'flex', gap: 14 }}>
          {why.canRetry && (
            <button onClick={() => refetchGround()} style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Try again</button>
          )}
          <button onClick={() => navigate(-1)} style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Go back</button>
        </div>
      </div>
    )
  }

  /*
   * THERE IS NO REVEAL. "Report updates as people check in, that's all it is."
   *
   * A branch here returned a whole screen instead of the report whenever the server said
   * `activated: false`, and the server no longer says it - the gate that produced it is gone from
   * reports.service.get(), because it withheld nothing (the per-session read handed the same
   * person the same content one request later) and made the product tell somebody their session
   * had produced nothing when it had produced a full three-party synthesis.
   */
  if (!report || (!(report as any).sharedPicture && !(report as any).forming)) {
    return (
      <div style={{ ...PAGE_STYLE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        {/*
          IT SAID "once at least one person has checked in" TO SOMEBODY WHO HAD.
          This is the SHARED report, which needs every party in before it can show
          where people agree and where they differ - so the old sentence was measuring the
          wrong thing, and on a ground where session 1 was complete it read as the
          product having lost the check-in.
        */}
        {/*
          WHAT THE SERVER SAID, WHERE IT SAID SOMETHING. The API now distinguishes "nobody has
          answered", "somebody has not finished" and "it is being written right now" — and the
          third is the one people met, pressing straight through from the end of their own
          session. Falling back to the general sentence keeps this honest where it said nothing.
        */}
        <div style={{ fontSize: 13, color: 'var(--gw-muted)', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
          {whatWentWrong(reportError).message && !Array.isArray(whatWentWrong(reportError).message)
            ? whatWentWrong(reportError).message
            : 'The shared report appears once everybody has checked in. Your own record is on your check-in page in the meantime.'}
        </div>
        {waitingForItToBeWritten && (
          /* Not decoration: without it the sentence above is indistinguishable from a page that
             has given up, which is what sends somebody looking for the reload button. */
          <div role="status" aria-live="polite" style={{ fontSize: 12, color: 'var(--gw-muted)' }}>
            Checking again every few seconds — this page will show it the moment it is there.
          </div>
        )}
        <button onClick={() => navigate(-1)} style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Go back</button>
      </div>
    )
  }

  const isForming = !report.releasedAt

  const staleBanner = reportIsStale ? (
    <div role="status" aria-live="polite" style={{ fontSize: 12.5, color: '#5A4A1A', background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 12, padding: '9px 12px', marginBottom: 14, lineHeight: 1.5 }}>
      Someone has checked in since this was written, so it is being updated now. What you are reading is the previous version. It will refresh on its own.
    </div>
  ) : null
  const progress = (report as any).sessionProgress as
    | { sessionNumber: number; total: number; completed: number; requestingUserIsMissing: boolean }
    | null
    | undefined
  /**
   * WHO DECLINED, SAID OUT LOUD. Her decision: "Round completes, report names the decline."
   *
   * A round with a decline in it now finishes and releases, which it never could before - so without
   * this the report would go out presenting three accounts as though only three people were ever
   * asked. Naming it is the difference between a record and an edited one.
   *
   * Labels come from the server, through the same `labelsForParties` map the rest of the report is
   * written in, so a viewer who is not entitled to somebody's real name sees their role here too.
   */
  const declined = ((report as any).declined ?? []) as { participantId: string; label: string }[]

  const myParticipant = (ground.participants ?? []).find((p: any) => p.userId === user?.id)
  const isAdmin = myParticipant?.partyType === 'INITIATOR'
  // The participant's own latest COMPLETED session - the one self-correction targets.
  const myCompletedSessions = (((myParticipant as any)?.checkIns ?? []) as any[])
    .filter((c) => c.status === 'COMPLETED')
    .map((c) => c.sessionNumber as number)
  const myLatestCompletedSession = myCompletedSessions.length ? Math.max(...myCompletedSessions) : null
  const backUrl = isAdmin ? `/grounds/${id}` : `/grounds/${id}/p`

  const adminParty = (ground.participants ?? []).find((p: any) => p.partyType === 'INITIATOR')
  const partParty = (ground.participants ?? []).find((p: any) => p.partyType !== 'INITIATOR')
  // Real name if given, else roleAsDescribed, else a neutral descriptor -
  // never the bare role word ("Admin"/"Participant") and never a raw email
  // local-part, both of which read as a label rather than a person.
  /* The fallback is rendered, so it has to read like something a person would say. The bare
     'the initiator' below, in `personFor`, is a KEY the model emits and is matched, never shown. */
  const adminHandle = adminParty ? participantLabel(adminParty) : 'the lead'

  /**
   * A role label as the report stores it, turned into whoever it stands for.
   *
   * "the initiator" is the fallback label for a party with no `roleAsDescribed` - a schema word,
   * shown to a reader beside a real job title. Anything that is already a role somebody described
   * ("Renewals owner") is theirs and stays as it is.
   */
  const personFor = (label: string): string => {
    if (!label) return label
    const l = label.trim().toLowerCase()
    if (l === 'the initiator') return adminHandle
    if (l === 'the participant' || l === 'the other party') return partHandle
    return label
  }
  const partHandle = partParty ? participantLabel(partParty) : 'the other party'

  const agreements = report.agreements ?? []
  const divergences = report.divergences ?? []
  const parties = ((report.engagement ?? {}) as any).parties as { contributed?: boolean }[] | undefined
  const contributedParties = parties?.filter((p) => p.contributed).length ?? 2
  /* How many are still to check in - said as a number, because "the second" on a four-person
     check-in with three outstanding was wrong by two. */
  const outstandingParties = parties ? Math.max(0, parties.length - contributedParties) : 0
  const stillToCheckIn = outstandingParties === 0
    ? 'One person has checked in so far. The next is what makes it a comparison.'
    : outstandingParties === 1
      ? 'One person has checked in so far. One more is still to check in, and that is what makes it a comparison.'
      : `One person has checked in so far. ${outstandingParties} more are still to check in, and that is what makes it a comparison.`
  // Null when the report names nothing, and the header renders nothing in that
  // case rather than a reassuring placeholder.
  const read = agreements.length + divergences.length > 0
    ? { agreed: agreements.length, open: divergences.length }
    : null
  const statusLabel = alignmentLabel(read)
  const statusShort = alignmentShort(read)

  const eng = (report.engagement ?? {}) as any
  const areas: any[] = eng.areas ?? []
  const hasAreas = areas.length > 0

  const honestClose = eng.honestClose ?? {
    aligned: agreements.length > 0 ? agreements.slice(0, 2).join('. ') : undefined,
    open: divergences.length > 0 ? divergences.map((d: any) => d.topic).join('. ') : undefined,
    revisit: report.centralQuestion || undefined,
    risk: undefined,
  }

  const solo = report.soloArtifact
  const releasedDate = report.releasedAt
    ? whenItWas(report.releasedAt, 'full')
    : null

  /**
   * Agreement is two-sided. If only one party has an account on record, the
   * report can say what that account holds but cannot call any of it agreed -
   * there is nothing yet for it to agree WITH. The old ladder handled this by
   * capping the bar at "Clear", which still read as four-fifths of the way to
   * aligned. Saying it in words is the honest version.
   */
  const oneSided = contributedParties < 2

  /**
   * "NOTHING TO REPORT ON YET", PRINTED ON A REPORT.
   *
   * Read off a live forming report: this line sat under the check-in's name with the shared
   * picture, the central question and the honest close all rendered below it. It is gated on
   * `statusLabel` - the ALIGNMENT status, which is empty until the report names an area the
   * accounts agree or differ on, and a one-sided report never names one. So the branch fires on
   * exactly the report it is most wrong about.
   *
   * A report with one account in it has plenty to say. What it cannot do is compare, and the
   * one-sided line below already says that.
   */
  const sessionPhrase = !statusLabel
    ? (oneSided
      ? stillToCheckIn
      : 'Everyone has answered. This has not yet named an area they agree or differ on.')
    : oneSided
      ? stillToCheckIn
      : divergences.length === 0
        ? 'You see this the same way.'
        : 'Where you see it differently is below, most important first.'

  /*
   * WHAT THIS RECORD RESTS ON.
   *
   * The audit attached sixteen documents across a hundred journeys and found one report of a
   * hundred and forty-five that mentioned a document at all — so somebody who attached a contract
   * and answered questions about it had no sign from the record that it was ever read. The server
   * computes this list from the rows rather than asking the model to remember, and honours the
   * same visibility rule the documents list does.
   */
  const restsOn = (report as any).restsOn as
    | { documents: { fileName: string; whose: string; read: boolean }[]; otherPartiesHave: number; nothing?: string }
    | undefined

  const body = (
    <>
      {restsOn && restsOn.documents.length > 0 && (
        <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 14, fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>What this record rests on</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--gw-sub)' }}>
            {restsOn.documents.map(d => (
              <li key={d.fileName} style={{ marginBottom: 3 }}>
                <span style={{ color: 'var(--gw-text)' }}>{d.fileName}</span> — {d.whose}
                {d.read ? ', and it was read' : '. Nothing has read it yet'}
              </li>
            ))}
          </ul>
          {restsOn.otherPartiesHave > 0 && (
            <div style={{ color: 'var(--gw-muted)', marginTop: 6, fontSize: 12.5 }}>
              {restsOn.otherPartiesHave === 1
                ? 'One more document was attached as somebody\'s own evidence, which stays with them.'
                : `${restsOn.otherPartiesHave} more documents were attached as people's own evidence, which stay with them.`}
            </div>
          )}
        </div>
      )}

      {/* FORMING BANNER - the picture updates as people check in; this isn't
          the final, mutually-revealed report yet. */}
      {declined.length > 0 && (
        <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderLeft: '3px solid var(--gw-amber-b)', borderRadius: 8, padding: '12px 14px', marginBottom: 14, fontSize: 13, lineHeight: 1.65, color: 'var(--gw-text)' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {declined.length === 1
              ? `${declined[0].label} declined to take part in this session.`
              : `${declined.map(d => d.label).join(', ')} declined to take part in this session.`}
          </div>
          <div style={{ color: 'var(--gw-sub)' }}>
            {/*
              The second sentence is the load-bearing one. A reader who sees a name under "declined"
              will otherwise fill the gap themselves, and the whole standing of this report is that it
              does not do that either.
            */}
            What follows is built from what people actually wrote. It does not infer anything about
            {declined.length === 1 ? ' the one that was not.' : ' the ones that were not.'}
          </div>
        </div>
      )}

      {isForming && progress && (
        <div role="status" aria-live="polite" style={{ background: 'var(--gw-amber-bg)', borderBottom: '1px solid #F0DDB0' }}>
          <div style={{ maxWidth: 1040, margin: '0 auto', padding: '12px 20px', fontSize: 13, color: 'var(--gw-amber-t)' }}>
            {/* The unit, named: without "for session N" this read as "3 of 5 have ever taken part". */}
            <strong>Picture forming</strong> - {progress.completed} of {progress.total} checked in for session {progress.sessionNumber}.
            {progress.requestingUserIsMissing ? ' You haven\'t checked in yet for this session - that\'s part of what\'s still missing.' : ' This updates as more people check in.'}
          </div>
        </div>
      )}

      {/*
        * THE METHOD, BEHIND A LINE, INSTEAD OF ABOVE THE FINDING.
        *
        * These three panels explain how Groundwork writes reports in general. They are true and
        * worth keeping. They were also the first thing on the page, in three columns, above a
        * reveal-status box and a stale-version banner - so roughly the top quarter of a report was
        * about reports, and the reader reached "4 agreed, 1 still open" by scrolling past an
        * explanation of what that sentence would mean.
        *
        * Somebody reading their second report does not need the manual again, and somebody reading
        * their first needs it after they have seen the thing it describes. Same words, same place in
        * the flow, closed until asked for.
        */}
      {/* LEGEND */}
      <section style={{ background: 'white', borderBottom: '1px solid var(--gw-border)' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 20px' }}>
          <details className="gw-legend">
            <summary>How this report is put together</summary>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              // This said "every report OPENS with what runs across everyone's answers".
              // It does not any more, and a legend that describes a different page is worse
              // than no legend. W13-7.
              { h: 'What is open, first', p: "Every report leads with what is still unresolved and what everyone already agrees on. The full read of what runs across everyone's answers follows it." },
              // This used to promise "a recommended move" for every area. The
              // engine has never produced one: a divergence carries a topic,
              // each party's position, the evidence behind it, and what is at
              // stake if it holds. Naming those four is honest and is also the
              // more useful claim - the move is the reader's to make.
              { h: 'What matters most, first', p: 'Every gap names each side\'s position, the evidence behind it, and what is at stake if it holds. The most significant comes first.' },
              { h: 'Honest closes', p: 'Decisions rarely finish clean. Each report names what is aligned, what is open, what to revisit, and what risk remains.' },
            ].map((cell, i) => (
              <div key={i} style={{ padding: '18px 22px', borderRight: i < 2 ? '1px solid var(--gw-border)' : 'none' }}>
                <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 7 }}>{cell.h}</div>
                <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{cell.p}</div>
              </div>
            ))}
          </div>
          </details>
        </div>
      </section>

      {/* BODY */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '34px 20px 60px' }}>

        {/* Session header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-navy)' }}>
            {ground.label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.01em', margin: '4px 0 2px' }}>
            {sessionPhrase}
          </div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>{releasedDate ? `Released ${releasedDate}` : 'Still forming - not yet released'}</div>
        </div>

        {/*
          * THE END STATE IS FOR THE PEOPLE WHO DECIDE IT, AND NOBODY ELSE. Her call.
          *
          * How a ground ends - keep, restructure, let go, renew, separate - is a management decision.
          * Showing it on the shared report meant the person it is ABOUT read the menu their own
          * outcome was being chosen from, which is the same harm as asking for it at creation, just
          * later. On a new hire ground that menu included "Let them go".
          *
          * `isAdmin` here means the ground's INITIATOR (the lead). `user.role === 'ADMIN'` is the org
          * admin. Everybody else sees the report without it - they still get the full shared picture,
          * the gaps, and what is at stake, which is what the report is actually for.
        */}
        {(isAdmin || user?.role === 'ADMIN') && (
          <ResolutionSection groundId={id!} resolutionState={(ground as any).resolutionState} />
        )}

        <OutcomeFeedbackSection
          groundId={id!}
          closed={(ground as any).status === 'RESOLVED' || (ground as any).status === 'CLOSED'}
        />

        {/* Cards - the toggle above picks which one shows; without a solo
            report to toggle to, the shared report is the only thing here. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>

          {/* SHARED / GROUND REPORT CARD */}
          {(!solo || tab === 'shared') && (
          <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>
            {/**
              * THE REPORT BEGINS ONCE.
              *
              * Standalone at `/grounds/:id/report` this line IS the beginning - nothing above it says
              * whose check-in this is, so it stays there.
              *
              * Embedded, it is the second beginning. Measured on a real released report: the page header
              * already names the check-in, the session and that the report went out, and then 856px lower
              * this starts again with "Groundwork report for Lena Lead". A reader who has scrolled a full
              * screen to reach the findings does not need to be told again which check-in they opened.
              */}
            {!embedded && (
              <div style={{ padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--gw-navy)', color: '#fff' }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>Groundwork report</span>
                <span style={{ fontSize: 11, opacity: 0.82 }}>for {adminHandle}</span>
              </div>
            )}
            <div style={{ padding: '16px 18px 18px' }}>

              {/*
                THE PROSE MOVED TO THE END. W13-7.

                The report opened with a paragraph and the board opened with what differs -
                and the board is the better-written document, while the report is the product.
                A person opening this wants to know what is unresolved, not to read a summary
                first and find the gaps three screens down.

                So the order is now: where things stand, what is still open, what is agreed,
                and then the full account. Nothing is removed; the paragraph is the fuller
                read for somebody who wants it after the sharp part.
              */}
              {/* Where things stand. Rendered only when the report holds
                  something - an empty report says nothing here rather than
                  reassuring anyone. */}
              {statusLabel && (
                <div style={{ marginBottom: 16 }}>
                  <SecH>Where things stand</SecH>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>
                    {oneSided ? `${agreements.length + divergences.length} areas on record` : statusLabel}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 2, lineHeight: 1.5 }}>
                    {sessionPhrase}
                  </div>
                </div>
              )}

              {/* What's still open */}
              {divergences.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <SecH>What's still open</SecH>
                  {hasAreas
                    ? areas.filter((a: any) => !a.reached).map((area: any, i: number) => (
                        <AreaBlock key={i} title={area.title} observation={area.observation} whyItMatters={area.whyItMatters} recommendedMove={area.recommendedMove} />
                      ))
                    : divergences.map((d: any, i: number) => (
                        // The engine now emits these ranked, most significant
                        // first, so render order is the ranking - no re-sorting
                        // here. `atStake` is what happens to the work if the gap
                        // holds; it is omitted when the record could not support
                        // saying anything, so it is conditional on being present.
                        <AreaBlock
                          key={i}
                          title={d.topic}
                          observation={d.positions.map((p: any) => p.view).join(' ')}
                          whyItMatters={d.atStake}
                        />
                      ))
                  }
                </div>
              )}

              {/* LEADERSHIP GAPS, WHICH NOTHING HAS EVER RENDERED.
                  The synthesis routes findings here deliberately - a deferred
                  conversation, a commitment nobody was held to, work not handed
                  over, a contribution not seen - and its own prompt says the two
                  surfaces are "read on different surfaces for different
                  purposes". Nothing implemented the second surface. The API
                  returned them to every party and this page referenced the field
                  nowhere, so the most sensitive thing the synthesis produces was
                  being handed to five colleagues by an endpoint nobody was
                  reading.

                  The API side is fixed - they reach the lead only now. This is
                  the surface that was missing. Shown to the lead, framed as
                  something about how the work was led rather than a judgement on
                  the person leading it, because that is what the prompt is
                  instructed to produce and the framing has to match or the whole
                  thing reads as an appraisal. */}
              {isAdmin && Array.isArray((report as any).leadershipGaps) && (report as any).leadershipGaps.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <SecH>Worth your attention as the person leading this</SecH>
                  <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
                    Only you see this part. It is about how the work was led, not about anyone in it, and nobody is quoted or named.
                  </div>
                  {(report as any).leadershipGaps.map((g: any, i: number) => (
                    <AreaBlock
                      key={i}
                      title={g.pattern ?? g.title ?? 'A pattern in how this ran'}
                      observation={g.observation ?? g.text ?? ''}
                      whyItMatters={g.atStake ?? g.whyItMatters}
                      recommendedMove={g.recommendedMove}
                    />
                  ))}
                </div>
              )}

              {/* Alignment reached */}
              {agreements.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <SecH>Alignment reached</SecH>
                  {hasAreas
                    ? areas.filter((a: any) => a.reached).map((area: any, i: number) => (
                        <AreaBlock key={i} title={area.title} note={area.note} reached />
                      ))
                    : agreements.map((a: string, i: number) => (
                        <div key={i} style={{ border: '1px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 10, borderLeft: '3px solid var(--gw-green-b)' }}>
                          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)' }}>{a}</div>
                        </div>
                      ))
                  }
                </div>
              )}

              <HonestClose aligned={honestClose.aligned} open={honestClose.open} revisit={honestClose.revisit} risk={honestClose.risk} />

              {(report as any).postReportGuide && (
                <WhatToWalkInWith guide={(report as any).postReportGuide} />
              )}

              {/*
                The lead's weigh section, before the full account and after the gaps. W14-1.
                Lead only, and only once the ground is closing - the server returns nothing
                before that, so this renders when it has something and never otherwise.
              */}
              {isAdmin && (report as any).softSpots && (
                <WhereTheRecordIsThin
                  spots={(report as any).softSpots}
                  nameFor={(pid) => {
                    const p: any = (ground.participants ?? []).find((x: any) => x.id === pid)
                    return p ? participantLabel(p) : 'a participant'
                  }}
                />
              )}

              {isAdmin && (report as any).whatTheGroundCanTellYou && (
                <WhatTheGroundCanTellYou
                  section={(report as any).whatTheGroundCanTellYou}
                  note={(report as any).whatTheGroundCanTellYouNote}
                  restedOn={(report as any).whatItRestedOn}
                  startedAt={(report as any).whereThisStarted}
                />
              )}

              {/* The full account, after the sharp part. W13-7. */}
              <PatternBlock label="What we heard" content={report.sharedPicture} inferences={report.inferences} />

              {report.centralQuestion && (
                <div style={{ marginTop: 16, background: 'var(--gw-blue-bg)', borderRadius: 8, padding: '10px 12px' }}>
                  <SecH>What comes next</SecH>
                  <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6 }}>{report.centralQuestion}</div>
                </div>
              )}

              {Array.isArray((report as any).engagement?.hiddenContributors) && (report as any).engagement.hiddenContributors.length > 0 && (
                <HiddenContributorsSection groundId={id!} contributors={(report as any).engagement.hiddenContributors} isInitiator={isAdmin} />
              )}

              {/* CLOSING SESSION: the choice now in front of the parties. Neutral
                  framing - the report never recommends; the resolution step is
                  where the parties choose together. */}
              {(report as any).finalSynthesis?.closingComplete && (
                <div style={{ marginTop: 16, background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 8, padding: '12px 14px' }}>
                  <SecH>This is closing</SecH>
                  <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, marginBottom: 8 }}>
                    Everyone has answered. The choice now in front of you, together:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {((report as any).finalSynthesis.endStates ?? []).map((es: any) => (
                      <span key={es.value} style={{ fontSize: 12, fontWeight: 600, background: 'white', border: '1px solid var(--gw-amber-b-soft)', color: 'var(--gw-amber-t)', borderRadius: 20, padding: '4px 12px' }}>{es.label}</span>
                    ))}
                  </div>
                  <button onClick={() => navigate(`/grounds/${id}`)} style={{ padding: '9px 16px', borderRadius: 7, background: 'var(--gw-amber-t)', color: 'white', border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Propose the end state →
                  </button>
                </div>
              )}

              {/* ARC ADVISORY - initiator/org-admin surface only (the server
                  strips arcSignals for participants). A reviewer flag, not a
                  verdict. */}
              {Array.isArray((report as any).arcAdvisories) && (report as any).arcAdvisories.length > 0 && (
                <div style={{ marginTop: 12, background: '#FBF3F3', border: '1px solid #E8C4C4', borderRadius: 8, padding: '12px 14px' }}>
                  <SecH>For your review - record shape</SecH>
                  {((report as any).arcAdvisories as any[]).map(a => (
                    <div key={a.participantId} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-red-t)' }}>{personLabel(a)}</div>
                      <div style={{ fontSize: 12.5, color: '#5A2A2A', lineHeight: 1.55 }}>{a.note}</div>
                      {(a.features ?? []).map((f: string, i: number) => (
                        <div key={i} style={{ fontSize: 11.5, color: '#7A4B4B', lineHeight: 1.5, marginTop: 2 }}>· {f}</div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Visible Updates trail (Honest Corrections): a self-correction
                  session shows up here as a flagged, dated entry instead of
                  being silently blended into the report above. No correction
                  TEXT is shown - only who, when, and whether it happened
                  after that party had already signed off. */}
              {Array.isArray((report as any).updates) && (report as any).updates.length > 0 && (
                <div style={{ marginTop: 12, background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px' }}>
                  <SecH>Updates</SecH>
                  {((report as any).updates as any[]).map((u, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, padding: '4px 0' }}>
                      <div style={{ fontSize: 12.5, color: 'var(--gw-text)' }}>
                        {personLabel(u)} updated what they said
                        {u.completedAt ? ` on ${whenItWas(u.completedAt, 'full')}` : ''}
                      </div>
                      {u.isPostSignOff && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>
                          Updated after sign-off
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {/* PARTICIPANT / OWN REPORT CARD */}
          {solo && tab === 'own' && (
            <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--gw-green-t)', color: '#fff' }}>
                {/* "Contributor report" was a third word for a thing the tab
                    above already calls your report and the rest of the product
                    calls a participant. One noun per thing. W8-47. */}
                <span style={{ fontSize: 13, fontWeight: 800 }}>Your report</span>
                <span style={{ fontSize: 11, opacity: 0.82 }}>for {partHandle}</span>
              </div>
              <div style={{ padding: '16px 18px 18px' }}>

                <PatternBlock label="What your contribution reveals" content={solo.summary} dark />

                {solo.whatToCarry && (
                  <div style={{ marginBottom: 16 }}>
                    <SecH>What to carry forward</SecH>
                    <Bullet text={solo.whatToCarry} />
                  </div>
                )}

                {divergences.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <SecH>Questions worth resolving</SecH>
                    {divergences.map((d: any, i: number) => (
                      <Bullet key={i} text={`What would alignment on ${d.topic.toLowerCase()} look like to you?`} />
                    ))}
                  </div>
                )}

                {statusShort && <div style={{ marginBottom: 16 }}>
                  <SecH>Where this has got to</SecH>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{statusShort}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 2, lineHeight: 1.5 }}>
                    {sessionPhrase}
                  </div>
                </div>}

                <div style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.55 }}>
                  This record is yours. It is portable and permanent. You can add this check-in to your Groundwork profile.
                  {/* The sentence above claims portability, so give them the file.
                      Completed sessions only - there is nothing settled to take
                      away from a session still in progress. */}
                  {(myStatus?.checkIns ?? []).some(c => c.completedAt) && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>Download:</span>
                      {(myStatus?.checkIns ?? [])
                        .filter(c => c.completedAt)
                        .map(c => (
                          <button
                            key={c.id}
                            disabled={downloadRecord.isPending && downloadRecord.variables === c.id}
                            onClick={() => downloadRecord.mutate(c.id)}
                            style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-navy)', background: 'white', border: '1px solid #D6D2CA', borderRadius: 12, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                            title={`Download your session ${c.sessionNumber} record as a text file`}
                            aria-label={`Download your session ${c.sessionNumber} record`}
                          >
                            Session {c.sessionNumber}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Who is on record + how specific each account was (#33). */}
        {Array.isArray(eng.parties) && eng.parties.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 10 }}>On record</div>
            <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>
              {eng.parties.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderBottom: i < eng.parties.length - 1 ? '1px solid var(--gw-bg)' : 'none', background: 'white' }}>
                  {/*
                    * A LABEL IS NOT A PERSON. The row read "the initiator" beside "Renewals owner".
                    *
                    * Reports are stored without names on purpose: the model never receives one, and
                    * parties reach it as role labels. `applyNames` puts the names back on the way
                    * out - but it walks `engagement` with `walkTextOnly`, deliberately, because
                    * `specificitySignal` is KEYED by those labels and rewriting a key would break
                    * the lookup. So `parties[].label` stays raw, correctly, as an identifier.
                    *
                    * The mistake was rendering the identifier. This page already knows the people -
                    * it resolves `adminHandle` and `partHandle` from the same participants a few
                    * hundred lines up - so the label is resolved here, where a name is wanted, and
                    * left alone in the payload, where it is a key.
                    */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)' }}>{personFor(p.label)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>
                      {!p.contributed
                        ? 'not yet checked in'
                        : p.recordEntries > 0
                        ? `${p.sessions ?? 0} session${(p.sessions ?? 0) !== 1 ? 's' : ''}`
                        : 'checked in, no record'}
                    </span>
                    {/*
                      * A GRADE ON A NAMED COLLEAGUE, ON THE PAGE EVERYONE READS.
                      *
                      * This was a colour-coded badge - green, blue, amber - sitting beside a
                      * person's name: "Lena Lead · 1 session · moderate specificity". The only
                      * explanation was a `title` attribute, which most people never see and no
                      * screen reader announces by default. Read on the page it says: here is how
                      * well your colleague did.
                      *
                      * The report's own promise is that it shows where people agree and where they differ,
                      * never anybody's raw answers. How concrete one person was is neither: it is
                      * an assessment of them, published to the people they work with.
                      *
                      * Nothing is lost by taking it off this page. Each person keeps their own
                      * specificity in My record, privately, where it is written as something to
                      * act on - "your answers are getting more specific as this goes on" - rather
                      * than a mark their colleagues can read.
                      *
                      * Who checked in and how many sessions they are on stays. That is a fact
                      * about participation, not a judgement about a person.
                      */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.inferences && report.inferences.length > 0 && (
          <InferenceReviewPanel groundId={id!} inferences={report.inferences} />
        )}

        {/* Always-visible correction affordance (#21): the per-claim "Correct this"
            only appears when there are inferred claims, so make correction discoverable. */}
        <div style={{ marginTop: 24, background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 4 }}>Something not right in this report?</div>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: myLatestCompletedSession != null ? 12 : 0 }}>
            {report.inferences && report.inferences.length > 0
              ? 'Inferred claims above have a "Correct this" button that opens a short follow-up to fix that specific claim. '
              : ''}
            {myLatestCompletedSession != null
              ? 'For anything else you said, revisit your last session below. It opens a short follow-up that corrects or adds to your record. Your original answers are kept as they were, and the update flows into the next report.'
              : 'To correct something you said, reopen a session you have already finished here.'}
          </div>
          {myLatestCompletedSession != null && (
            <button
              onClick={() => correctSession.mutate(myLatestCompletedSession)}
              disabled={correctSession.isPending}
              style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--gw-navy)', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: correctSession.isPending ? 'wait' : 'pointer', fontFamily: 'inherit' }}
            >
              {correctSession.isPending ? 'Starting…' : 'Revisit my last session to correct it →'}
            </button>
          )}
        </div>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--gw-border)', fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.6 }}>
          This report is permanent. Everybody in this check-in keeps their copy.
        </div>
      </div>
    </>
  )

  /** In the tab, the surrounding page is the chrome. */
  if (embedded) return <div>{staleBanner}{body}</div>

  return (
    <div style={PAGE_STYLE}>
      {staleBanner && <div style={{ maxWidth: 1040, margin: '0 auto', padding: '14px 20px 0' }}>{staleBanner}</div>}
      {/* HEADER */}
      <header style={{ background: 'var(--gw-dark)', color: '#fff', padding: '40px 0 34px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 20px' }}>
          <button
            onClick={() => navigate(backUrl)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.55)', fontSize: 13, fontFamily: 'inherit', padding: 0, marginBottom: 22, display: 'block' }}
          >
            ← Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ background: 'white', borderRadius: 4, padding: '3px 4px', display: 'inline-flex' }}><VennIcon size={24} /></span>
            {/*
              THE HEADER SAID "Shared report" WHILE YOU WERE READING YOUR OWN.
              The toggle below switches the body between two genuinely different
              documents, and the eyebrow, the headline and the summary above it
              never changed - so the page insisted it was the shared report on both
              settings. Hafsah: "i dont know if its our shared report or my report".
              Whichever one is on screen now says so, in all three places.
            */}
            <span style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gw-green-b)', fontWeight: 700 }}>
              {tab === 'own' ? 'Your report, private to you' : 'Shared report'}
            </span>
          </div>
          <h1 style={{ fontSize: 30, lineHeight: 1.1, letterSpacing: '-.02em', margin: '0 0 12px', fontWeight: 800 }}>
            {tab === 'own' ? 'What you said.' : "Where everyone agrees and where they differ."}
          </h1>
          {/*
            THE HERO WAS STILL THE PROSE. W13-7, second half.

            I reordered the card below so what is unresolved comes before the summary, updated
            the legend to match, and the page still OPENED with the same paragraph - because this
            block prints `sharedPicture` too. Half a fix, and the half a person sees first.

            Found by opening the page rather than by the source-order test I had just written,
            which is the rule this plan keeps re-learning.

            The hero now says what the report holds: how many areas are open, how many agreed.
            The paragraph is in the card, once, where the reorder put it.
          */}
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.72)', maxWidth: 640, margin: 0 }}>
            {tab === 'own'
              ? 'Only you can see this. It is built from what you said, and nobody else reads your words.'
              : divergences.length + agreements.length > 0
                ? `${divergences.length} ${divergences.length === 1 ? 'thing is' : 'things are'} still open. ${agreements.length} ${agreements.length === 1 ? 'is' : 'are'} agreed.`
                : 'Everyone has checked in. This is what runs across what they said.'}
          </p>
          <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              ground.label,
              adminHandle,
              partParty ? partHandle : null,
              releasedDate ? `Released ${releasedDate}` : 'Still forming',
            ].filter(Boolean).map(pill => (
              <span key={pill as string} style={{ fontSize: 12, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 20, padding: '5px 12px', color: 'rgba(255,255,255,.9)' }}>
                {pill}
              </span>
            ))}
          </div>

          {/* OWN / SHARED TOGGLE - always visible so it's clear these are two
              distinct reports, not one merged document. */}
          {solo && (
            <div style={{ marginTop: 24, display: 'inline-flex', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 10, padding: 3, gap: 2 }}>
              {(['shared', 'own'] as ViewTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    fontSize: 13, fontWeight: 700, padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: tab === t ? '#fff' : 'transparent',
                    color: tab === t ? 'var(--gw-dark)' : 'rgba(255,255,255,.75)',
                  }}
                >
                  {t === 'shared' ? 'Shared report' : 'Your report'}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      {body}
    </div>
  )
}

/**
 * The old route. Kept as a redirect rather than deleted, because links to it exist in email and in
 * people's history, and a dead link to somebody's report is worse than an extra hop.
 */
export function ReportPage() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/grounds/${id}?tab=report`} replace />
}