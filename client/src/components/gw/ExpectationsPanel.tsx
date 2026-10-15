import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { peopleLabels, atTheStart } from '@/lib/utils'
import { scrollToId } from '@/lib/scroll-to'
import { toast } from 'sonner'
import { whereItStands } from './where-a-promise-stands'
import { WhatSuccessLooksLikeFor } from './WhatSuccessLooksLike'

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

/**
 * HOW THE PRIMITIVE READS ON SCREEN.
 *
 * The kind is shown as the team's own noun, not the enum. The check is the line that matters most:
 * "nothing checkable yet" is said out loud rather than hidden, because an unmeasurable sentence
 * sitting silently on somebody's record is what makes it look like a target they failed.
 */
const KIND_WORD: Record<string, string> = {
  TODO: 'to-do',
  COMMITMENT: 'commitment',
  TARGET: 'target',
  GOAL: 'goal',
  SUCCESS_DEFINITION: 'what success looks like',
  ROLE_EXPECTATION: 'role expectation',
  REFERENCE: 'reference',
}
const CHECK_WORD: Record<string, string> = {
  DONE_OR_NOT: 'done or not',
  A_NUMBER: 'a number crosses a line',
  A_JUDGEMENT: 'a judgement',
  NOT_CHECKABLE: 'nothing checkable yet',
}

/**
 * "HOW WE'D KNOW: A NUMBER CROSSES A LINE" WAS A LABEL JOINED TO A PHRASE WITH A COLON, NOT A
 * SENTENCE (group 3's review, batch A fault 6). Each check kind now reads as its own sentence.
 */
const CHECK_SENTENCE: Record<string, string> = {
  DONE_OR_NOT: 'You will know this is done because it either happens or it does not.',
  A_NUMBER: 'You will know this is done when a number crosses a line.',
  A_JUDGEMENT: 'Whether this is done is a judgement call.',
  NOT_CHECKABLE: 'There is nothing checkable here yet.',
}

/**
 * "BY: BY 20 DECEMBER" AND "BY: THE SAME DAY" WERE A LABEL JOINED TO WHAT SOMEBODY SAID WITH A
 * COLON, SOMETIMES DOUBLING THE WORD "BY" (fault 6). `dueSaid` is the person's own words and
 * sometimes already starts with "by" - stripped here so the sentence never reads "by by 20
 * December".
 */
function dueSentence(dueSaid: string): string {
  const said = dueSaid.replace(/^\s*by\s+/i, '').trim()
  return `It is due ${said}.`
}

type Objective = {
  id: string
  text: string | null
  kind?: string | null
  check?: string | null
  dueKind?: string | null
  dueSaid?: string | null
  /** Their words read as a date, where they carried one. Null is the common case. */
  dueDate?: string | null
  /** OPEN, MET, DROPPED, CHANGED. */
  status?: string | null
  authoredBy: 'lead' | 'self' | null
  seenBySubject: boolean
  awareness: 'TOLD' | 'NOT_TOLD' | 'UNSURE' | 'NOT_ASKED' | null
  awarenessDetail: string | null
  /** GW-EXP-3. Null while they have not said what doing well looks like to them. */
  alignment: 'ALIGNS' | 'DIFFERS' | 'CANNOT_TELL' | null
  alignmentNote: string | null
  /** GW-EXP-7. Their own words objecting to this expectation, said in their own check-in. */
  objection: string | null
  /**
   * REFERENCE only. Where it is tracked, what it said when somebody looked, and when that was.
   * Never a copy of the tracker's state - see TrackedElsewhere.
   */
  trackedUrl?: string | null
  lastSeenState?: string | null
  lastSeenAt?: string | null
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
function alignmentLine(
  o: NonNullable<Objective>,
  /**
   * WHOSE ROW THIS IS. Every line here referred to a third person - "they have not said what doing
   * well looks like to them" - and the row above it is labelled "You". So the one page a person
   * reads about their own work talked about them as though they were not in the room, twice.
   *
   * Invisible in the code, where "they" reads as perfectly sensible prose. Obvious the moment you
   * look at the rendered row with the heading directly above it.
   */
  isMine: boolean,
): { label: string; note: string | null; tone: 'good' | 'gap' | 'quiet' } {
  switch (o.alignment) {
    case 'ALIGNS':
      return {
        label: isMine
          ? 'This matches what you said doing well looks like'
          : 'This matches what they said doing well looks like',
        note: o.alignmentNote,
        tone: 'good',
      }
    case 'DIFFERS':
      return {
        label: isMine ? 'You described doing well differently' : 'They described doing well differently',
        note: o.alignmentNote,
        tone: 'gap',
      }
    case 'CANNOT_TELL':
      return { label: 'Whether these connect cannot be told from what has been said', note: o.alignmentNote, tone: 'quiet' }
    default:
      return {
        label: isMine
          ? 'You have not said what doing well looks like to you yet'
          : 'They have not said what doing well looks like to them yet',
        note: null,
        tone: 'quiet',
      }
  }
}

/** What the lead said about whether this person knows. Neutral wording: this is not a telling-off. */
function awarenessLine(o: NonNullable<Objective>): { text: string; tone: 'plain' | 'gap' } | null {
  switch (o.awareness) {
    case 'TOLD':
      /**
       * ATTRIBUTED, BECAUSE IT IS SOMEBODY ELSE'S SENTENCE.
       *
       * `awarenessDetail` is the lead's own words, and it was rendered raw. On the page of the person
       * it is about, under a heading saying "You", that reads as: "I told him last Tuesday." - a
       * first-person sentence about the reader, spoken by nobody, on their own record.
       *
       * The fallback line already said "The lead says..."; the detail is the same claim with more
       * detail in it and needed the same frame.
       */
      return o.awarenessDetail?.trim()
        ? { text: `The lead says: “${o.awarenessDetail.trim()}”`, tone: 'plain' }
        : { text: 'The lead says this has been said directly.', tone: 'plain' }
    case 'NOT_TOLD':
      return {
        text: o.awarenessDetail?.trim()
          ? `Not yet said directly. The lead's words: "${o.awarenessDetail.trim()}"`
          : 'Not yet said directly, in the lead’s own words.',
        tone: 'gap',
      }
    case 'UNSURE':
      return { text: 'The lead is not sure whether this has been said.', tone: 'gap' }
    default:
      /** NOT_ASKED or null: the question never came up. Saying nothing beats implying an answer. */
      return null
  }
}


/** After this, a remembered state stops being presented as current. */
const STALE_AFTER_DAYS = 7

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

/** "today" / "yesterday" / "9 days ago" - the sentence a person would actually say. */
function agoWords(iso: string): string {
  const d = daysSince(iso)
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d} days ago`
}

/**
 * WHAT A PERSON CALLS A TICKET, out of the address of it.
 *
 * `https://coamana.atlassian.net/browse/OPS-418?filter=12` is not a name, and printed in full it
 * runs the width of the row and drowns everything beside it. The last meaningful segment is what
 * anybody actually says out loud - OPS-418 - and the full address stays on the title and the href,
 * so nothing is hidden, only unshouted.
 */
function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    const last = u.pathname.split('/').filter(Boolean).pop()
    return last || u.hostname
  } catch {
    return url.length > 40 ? `${url.slice(0, 37)}…` : url
  }
}

/**
 * A TICKET THAT IS SETTLED SOMEWHERE ELSE, ON THE EXPECTATION IT BELONGS TO.
 *
 * The state and the time it was true are one sentence, never two elements that can drift apart on
 * the page - "in review, as of nine days ago". Rendering them separately is exactly how a stale
 * status gets read as current, which is the only thing this is here to prevent.
 *
 * "I just looked" opens EMPTY. My first version prefilled the remembered words, which meant one
 * click and one keypress re-stamped nine-day-old text as read today, without anybody opening
 * anything. Empty forces the sentence to be written by somebody who actually looked.
 *
 * Anyone who can see it may say they looked. Looking is not ownership: the lead states the
 * expectation, and whoever opened the tracker this morning is the person who knows what it says.
 */
function TrackedElsewhere({
  groundId,
  objectiveId,
  url,
  state,
  seenAt,
}: {
  groundId: string
  objectiveId: string
  url?: string | null
  state?: string | null
  seenAt?: string | null
}) {
  const qc = useQueryClient()
  const [looking, setLooking] = useState<string | null>(null)
  const stale = !!seenAt && daysSince(seenAt) >= STALE_AFTER_DAYS

  const looked = useMutation({
    mutationFn: (text: string) => groundsApi.markExpectationLookedAt(groundId, objectiveId, text),
    onSuccess: () => {
      setLooking(null)
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That could not be saved.'),
  })

  return (
    <div style={{ marginTop: 7, paddingLeft: 10, borderLeft: `2px solid ${stale ? 'var(--gw-amber-b)' : 'var(--gw-border)'}` }}>
      {/*
        THE LINK CARRIES ITS NAME, NOT ITS ADDRESS, and the action is not sitting inside the
        sentence. It rendered as `tracked in https://tracker.example/OPS-418  I just looked` - a raw
        URL running most of the width with a control butted against its end, so the whole thing read
        as one long link and the action was invisible.
      */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 11.5, color: 'var(--gw-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          tracked in{' '}
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" title={url} style={{ color: 'var(--gw-navy)' }}>
              {shortUrl(url)}
            </a>
          ) : (
            'a tracker'
          )}
        </span>
        {looking === null && (
          <button
            onClick={() => setLooking('')}
            style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: 'var(--gw-navy)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            I just looked
          </button>
        )}
      </div>

      <div style={{ fontSize: 12, color: stale ? 'var(--gw-amber-t)' : 'var(--gw-sub)', lineHeight: 1.55, marginTop: 2 }}>
        {state && seenAt
          ? <>&ldquo;{state}&rdquo;, as of {agoWords(seenAt)}</>
          : 'Nobody has said what it says yet'}
      </div>
      {stale && (
        <div style={{ fontSize: 11.5, color: 'var(--gw-amber-t)', marginTop: 2 }}>
          That is old enough to have changed. Worth a look before the next session.
        </div>
      )}

      {looking !== null && (
        <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
          <input
            autoFocus
            value={looking}
            onChange={e => setLooking(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && looking.trim()) looked.mutate(looking.trim()) }}
            placeholder="What does it say now?"
            style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 12.5, fontFamily: 'inherit', outline: 'none' }}
          />
          <button
            onClick={() => looking.trim() && looked.mutate(looking.trim())}
            disabled={!looking.trim() || looked.isPending}
            style={{ padding: '7px 12px', borderRadius: 7, background: looking.trim() ? 'var(--gw-navy)' : 'var(--gw-border)', color: looking.trim() ? 'white' : 'var(--gw-muted)', border: 'none', cursor: looking.trim() ? 'pointer' : 'default', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}
          >
            Save
          </button>
        </div>
      )}
    </div>
  )
}

export function ExpectationsPanel({
  groundId,
  parties,
  viewerUserId,
  hasChat = false,
  bare = false,
  viewerIsLead = false,
}: {
  groundId: string
  parties: Party[]
  /** So the empty state says "your own check-in" to the person whose check-in it is. */
  viewerIsLead?: boolean
  /** So this person's own row can be marked as shown, and only their own. */
  viewerUserId?: string | null
  /**
   * Whether the context chat is on the page the panel is rendered into. It is the lead's setup
   * conversation, so it is not - and pointing at it from a page that does not have it is how the
   * "say something about this in the chat" button came to do nothing at all.
   */
  hasChat?: boolean
  /**
   * RENDERED INSIDE SOMEBODY'S OWN CARD, since 22 September 2026.
   *
   * The panel used to BE the band - one card per expectation, every person in one stack. It is now
   * the expectation part of a person's card, which is the only place anything about a person
   * appears, so it drops its own outer margin, its own card borders and its own empty state: the
   * card around it says whose it is and says when there is nothing.
   *
   * Everything else it does is why it was kept rather than rewritten: whether an expectation matches
   * what that person said doing well looks like, whether the lead says they have been told, a
   * REFERENCE expectation's link and how stale the state we last read is, and marking an expectation
   * seen the moment the person it is about actually looks at it.
   */
  bare?: boolean
}) {
  /**
   * EVERY EXPECTATION EACH PERSON IS HELD TO, not one each.
   *
   * `objective` is a single row and was all this panel ever read, so a lead who said "she owes him
   * the plan by Friday, and she owns escalations from now on" saw one of the two on the page. The
   * server now sends `all`; the single field stays for anything else still reading it.
   */
  const withExpectations = (parties ?? [])
    .filter((p) => !p.managingOnly)
    .map((p) => ({
      party: p,
      items: (((p.objective as any)?.all as Objective[] | undefined) ?? [])
        .filter((o) => o?.text?.trim())
        .length
        ? (((p.objective as any).all as Objective[]).filter((o) => o?.text?.trim()))
        : (p.objective?.text?.trim() ? [p.objective] : []),
    }))
    .filter((row) => row.items.length > 0)
  /* Never the lead's note as the name (request 36). Several with no name are "one colleague",
     "another colleague", counted the same way on every screen. */
  const everybody = (parties ?? []).filter((p) => !p.managingOnly)
  const labels = peopleLabels(everybody as any[], {
    forTheLead: true,
    readerId: everybody.find((p) => !!viewerUserId && p.userId === viewerUserId)?.id ?? null,
  })

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
  const mine = withExpectations.find((r) => !!viewerUserId && r.party.userId === viewerUserId)?.party
  useEffect(() => {
    if (fired.current) return
    if (!mine || mine.objective?.seenBySubject) return
    fired.current = true
    markShown.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine?.id, mine?.objective?.seenBySubject])

  /*
    WHAT SUCCESS LOOKS LIKE GOES IN THIS BOX, NOT UNDER IT.
    
    It arrived on Context as its own numbered section, then as a sentence below this panel - both of
    which read as a second subject. It is the same subject: the standard, and what each person is
    expected to do against it. One box, and the standard is the last thing in it, which is where
    somebody who has just read what is expected of them looks for what it is all aiming at.
  */
  if (withExpectations.length === 0) {
    /* Inside a person's card, the card says it. */
    if (bare) return null;
    return (
      <div style={{ marginBottom: 22 }}>
        <div style={{ background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '13px 15px', fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
          Nothing yet. These come out of {viewerIsLead ? 'your' : 'the lead\u2019s'} own check-in, where they are asked what this is
          aiming at and then what they expect of each person. Until that happens, everyone is working
          to their own read of it.
          {groundId && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gw-border)' }}>
              <WhatSuccessLooksLikeFor groundId={groundId} dense />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: bare ? 0 : 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: bare ? 10 : 8 }}>
        {withExpectations.flatMap((row) => row.items.map((raw, idx) => {
          const o = raw as NonNullable<Objective>
          const p = row.party
          const line = awarenessLine(o)
          const isMine = !!viewerUserId && p.userId === viewerUserId
          return (
            <div
              key={p.id + ':' + idx}
              style={bare ? { display: 'flex', flexDirection: 'column' } : {
                background: 'white',
                border: `1px solid ${isMine ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
                borderRadius: 8,
                padding: '13px 15px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: bare ? 'none' : 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-dark)' }}>
                  {isMine ? 'You' : atTheStart(labels.get(p.id) ?? 'a colleague')}
                </span>
                {o.authoredBy === 'self' && (
                  /** Rows from before one person owned expectations. Their own words are stronger, not weaker. */
                  <span style={{ fontSize: 10.5, color: 'var(--gw-green-t)', background: 'var(--gw-green-bg)', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
                    in their own words
                  </span>
                )}
              </div>

              {o.kind && (
                <span style={{
                  display: 'inline-block', fontSize: 10.5, fontWeight: 600, letterSpacing: '.03em',
                  padding: '1px 7px', borderRadius: 10, marginBottom: 4,
                  color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)',
                }}>
                  {KIND_WORD[o.kind] ?? o.kind.toLowerCase()}
                </span>
              )}
              <div style={{ fontSize: 13.5, color: 'var(--gw-text)', lineHeight: 1.6 }}>{o.text}</div>
              {/*
                HOW WE WOULD KNOW, AND BY WHEN. The two answers that decide whether a session can
                press on this at all. Shown even when the answer is "nothing checkable yet" - that is
                the state the interview exists to fix, and hiding it is how it stays unfixed.
              */}
              {/*
                WHERE THIS STANDS, which the page could not say at all.
                
                It listed what was agreed and nothing about whether any of it had happened, so it
                read as a list of sentences rather than a record somebody returns to. This reads
                only what was written down - a date somebody named, a status somebody set.
                
                It is deliberately not a judgement. "Past its date" is a fact about a calendar;
                whether it MEANS anything is the report's business, where a blocker can outrank a
                date and where the four explanations live.
              */}
              {(() => {
                const stand = whereItStands(o, new Date(), { isMine, name: labels.get(p.id) ?? 'a colleague' })
                if (!stand.says) return null
                const colour = stand.tone === 'late' ? 'var(--gw-amber-t)'
                  : stand.tone === 'done' ? 'var(--gw-green-t)'
                  : 'var(--gw-muted)'
                return (
                  <div style={{ fontSize: 11.5, fontWeight: stand.tone === 'late' ? 600 : 500, color: colour, marginTop: 3 }}>
                    {stand.says}
                  </div>
                )
              })()}

              {(o.check || o.dueSaid || o.dueKind === 'STANDING') && (
                <div style={{ fontSize: 11.5, color: o.check === 'NOT_CHECKABLE' ? 'var(--gw-amber-t)' : 'var(--gw-muted)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {o.check && <span>{CHECK_SENTENCE[o.check] ?? `You will know this is done by ${CHECK_WORD[o.check] ?? o.check}.`}</span>}
                  {o.dueSaid
                    ? <span>{dueSentence(o.dueSaid)}</span>
                    : o.dueKind === 'STANDING' ? <span>This is a standing expectation, with no end date.</span> : null}
                </div>
              )}

              {/*
                WHERE IT IS TRACKED, AND WHEN ANYBODY LAST LOOKED. Only on a REFERENCE.

                This is the whole of what a pointer is allowed to hold. Nothing is polled and nothing
                syncs, so the state is only ever the words of somebody who looked - shown WITH the
                time they looked, never without it, because a state on its own reads as now.
              */}
              {(o.trackedUrl || o.lastSeenState) && (
                <TrackedElsewhere
                  groundId={groundId}
                  objectiveId={o.id}
                  url={o.trackedUrl}
                  state={o.lastSeenState}
                  seenAt={o.lastSeenAt}
                />
              )}

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
                const a = alignmentLine(o, isMine)
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
                    {/*
                      GROUP 3'S REVIEW, BATCH A FAULT 6: "YOU DESCRIBED DOING WELL DIFFERENTLY ONE
                      STATEMENT IS..." RAN TWO SENTENCES TOGETHER WITH NO FULL STOP. The label never
                      carried its own punctuation, so a note straight after it read as one run-on
                      sentence. The label is a full sentence of its own now, always.
                    */}
                    <span style={{ fontWeight: a.tone === 'quiet' ? 400 : 600 }}>{a.label}.</span>
                    {a.note && <span style={{ color: 'var(--gw-sub)' }}> {a.note}</span>}
                  </div>
                )
              })()}
              {/*
                THE WAY TO CHANGE IT, ON THE THING ITSELF.
                
                Nobody edits an expectation by form - one person states them, and a change goes back
                through the chat where it is probed and lands with its reason. That rule was written
                at the bottom of the panel in small text, which told people what they could not do
                without showing them what they could. This points at the chat, which is on the page.
              */}
              {/*
                ONLY WHERE THE CHAT EXISTS. The context chat is the lead's setup conversation and is
                not on a participant's page at all - so this button sat on their expectations
                pointing at an anchor that was never rendered, and did nothing when pressed. Offering
                a way in that goes nowhere is worse than offering none: the sentence under this list
                already tells them the real route, which is to say it in their own check-in.
              */}
              {hasChat && (
                <button
                  onClick={() => scrollToId('gw-context-chat')}
                  style={{
                    alignSelf: 'flex-start', marginTop: 8, fontSize: 11.5, fontWeight: 600,
                    color: 'var(--gw-navy)', background: 'none', border: 'none', padding: 0,
                    cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
                  }}
                >
                  {isMine ? 'Say something about this in the chat' : 'Change this in the chat'}
                </button>
              )}
            </div>
          )
        }))}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.55, marginTop: 9 }}>
        {/*
          The one sentence that has to be here. Somebody reading their own expectation for the first
          time needs to know both that they cannot edit it and that they are not stuck with it.
        */}
        Everyone sees the same list. If something is wrong or has changed, say so in your check-in.
        You will be asked more about it there, and it will go on the record.
      </div>
    </div>
  )
}
