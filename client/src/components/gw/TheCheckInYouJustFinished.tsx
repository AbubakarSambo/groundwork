import { useTheDirectMorning, isTheDirectMorningOn } from '@/lib/the-direct-morning'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { reportsApi } from '@/api/reports'
import { conversationApi } from '@/api/conversation'
import { Folded } from './two-accounts-side-by-side'
import { WhatSuccessLooksLike } from './WhatSuccessLooksLike'
import { TheFiveThingsThatMakeItCheckable } from './TheFiveThingsThatMakeItCheckable'
import { groundsApi } from '@/api/grounds'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { CLOSE_SHEET, Block } from './the-shape-every-close-is-drawn-in'
import { KIND } from './WhatWasTakenFromWhatYouSaid'
import { FoldedLine } from './ui/FoldedLine'
import { ProofMark } from './ui/ProofMark'

/**
 * THE END OF A SIGNED-IN CHECK-IN, REBUILT AS A · SESSION.
 *
 * WHAT IT WAS. A card that opened with the shared picture in a dark band, then an alignment status
 * word, then the differences between people, then a four-box "honest close" grid with a box
 * labelled RISK. Somebody finished ten minutes of saying what was actually going on and the first
 * thing they read was a comparison against their colleagues, with a word on it.
 *
 * WHY THAT WAS THE WRONG OBJECT, not merely the wrong tone. There are four reports - two readers by
 * two scopes - and the shared picture of one sitting is B · session, which has its own surface and
 * its own page. This card is the other cell: what YOU said this time, private to you. Printing B
 * here is why the same three differences reached one person on four screens, and why the card had
 * to hedge about whether the comparison was final.
 *
 * SO IT SHOWS THE SIX BLOCKS OF A, IN THE TEMPLATE'S ORDER:
 *
 *   1  what this is for          the objective, and your part of it
 *   2  where you are against it  your own rows and nobody else's
 *   3  what you said             extracted lines, yours to dispute
 *   4  what is still open        what you asked for, what is unresolved
 *   5  what you carry forward    one thing, and the private note inside it
 *   6  how much you gave it      folded, and last, because it is a caveat
 *
 * AND THE ALIGNMENT WORD IS GONE WITH THE BAND THAT CARRIED IT. It was already fixed once - a thin
 * sitting used to render as "Mixed", a word about whether people agree, when barely anything had
 * been said - and `whatToCallIt` still holds that rule for the surfaces that show a status. This
 * one no longer shows one, because a status is a statement about the shared picture and this card
 * is not the shared picture. The door to it is at the foot.
 *
 * WHAT IS NOT HERE AND SHOULD BE. Block 4 wants what YOU are blocking first - somebody else being
 * stopped outranks anything you are waiting on - and that read exists on the server but is not on
 * either payload this card can reach. What it draws instead is what this person asked for and what
 * they raised as unresolved, which is the honest subset. Named here rather than left as a silence.
 */

interface MyRow {
  id: string
  type: string
  text: string
  disputedAt: string | null
  documented?: boolean
  documentSays?: string | null
  /** What this line is called, filled in by the server from the record: "This is something you got done." only when it holds. */
  typeSays?: string | null
  /** How the line is known, by the one rule, and where it comes from in the end card's words (served by the reports). */
  mark?: string | null
  how?: string | null
  checkInId: string | null
  sessionNumber: number | null
  /** The line as read with a document's date where the document dates it differently (served on Release 1's sales check-ins). */
  readAs?: string | null
}

/**
 * A LINE TAKEN FROM WHAT SOMEBODY SAID, WITH THE PRESS THAT TAKES IT BACK.
 *
 * These are extracted, not typed, and that is the whole reason the control has to sit with them:
 * a person who reads a sentence they did not write, under their own name, and has no way to say
 * "that is not what I said" learns that the record is not theirs.
 *
 * Taking one back never deletes it. It marks it, the mark is shown here, and every read that
 * COUNTS rows already filters marked ones out.
 */
function Row({ row, onTakeBack, busy, light = false }: { row: MyRow; onTakeBack: () => void; busy: boolean; light?: boolean }) {
  const gone = !!row.disputedAt
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {/* A quote, because it is one: these are this person's own words, lifted. Set as plain
          body text they read as the product's prose about them, which is the opposite of true. */}
      <p className="gw-said" style={{
        margin: 0, fontStyle: 'italic',
        color: gone ? 'var(--gw-sub)' : 'var(--gw-text)',
        textDecoration: gone ? 'line-through' : undefined, maxWidth: '68ch',
      }}>
        “{row.text}”
      </p>
      {/*
        U.9 RE-REVIEW, ITEM A: A SENTENCE, NOT A TYPE WORD AND A "·" JOIN.
        Same shape of fix as WhatWasTakenFromWhatYouSaid.tsx's own rows, and the same shared KIND
        phrases, so the two files never say the same type two different ways: "ask · from a
        document" read as a table row. "This is {kind}." is its own sentence, and "A document
        backs it." follows it as another, rather than a dot stitched onto the end.
      */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        {/* The light own report marks each line, proven only where there is proof (sales-first.md, section 5). */}
        {light && row.mark && <span className="gwui-own-mark"><ProofMark mark={row.mark} /></span>}
        <span className="gw-stamp" style={{ color: 'var(--gw-sub-d)' }}>
          {row.typeSays ?? KIND[row.type] ?? `This is ${row.type.replace(/_/g, ' ').toLowerCase()}.`}
          {row.documented ? ' A document backs it.' : ''}
        </span>
        {gone
          ? <span className="gw-mini" style={{ color: 'var(--gw-sub)' }}>You said this is not what you said. It counts toward nothing.</span>
          : (
            <button
              onClick={onTakeBack}
              disabled={busy}
              className="gw-mini"
              style={{
                background: 'none', border: 'none', padding: 0, color: 'var(--gw-navy)',
                cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
                /* A press on a phone needs somewhere to land that is not four pixels tall. */
                minHeight: 32, display: 'inline-flex', alignItems: 'center',
              }}
            >
              Something here isn’t right
            </button>
          )}
      </div>
    </div>
  )
}

/**
 * WHAT EACH TYPE OF ROW IS DOING IN THIS PERSON'S OWN HALF.
 *
 * EVERY LINE GETS EXACTLY ONE HOME, WHICH I GOT WRONG FIRST TIME. Drawn on real data, "What I
 * expect from Tom is that he ships the onboarding rewrite" appeared in block 3 as something they
 * said and again in block 5 as something they carry, three lines apart - which is the same fault,
 * in one card, that this whole rebuild exists to remove.
 *
 * So the types partition. What was raised and is unresolved lives in block 4 and nowhere else.
 * Everything else somebody stated is the ledger in block 3, where the press that takes a line back
 * sits with it. Block 5 stops echoing rows and carries what only it has: the one thing to carry,
 * which is a sentence the session itself wrote, and the private note.
 */
const STILL_OPEN = ['ASK', 'WORRY', 'TENSION', 'OPERATING_DIFFERENCE']
const AGAINST_IT = ['SUCCESS_DEFINITION', 'TIMEFRAME', 'TOLERANCE']

/**
 * THE THREE WORDS A ROW IS ALLOWED TO BE, AND WHY THE COLOUR IS NOT ONE OF THEM.
 *
 * This drew a coloured dot and nothing else, which is a code with no key: green, clay and grey
 * against three states somebody has to already know. The template shows the word beside the row
 * and the colour only carries it.
 *
 * "Met" is deliberately not among them - whether a condition has been satisfied is a judgement
 * about the world, and committing to do a thing is not the thing being done.
 */
const SAYS: Record<string, { word: string; dot: string }> = {
  moving: { word: 'moving', dot: 'var(--gw-green-t)' },
  stuck: { word: 'stuck', dot: 'var(--gw-clay)' },
  unspoken: { word: 'not spoken to', dot: 'var(--gw-border)' },
}

export function TheCheckInYouJustFinished({ checkInId, groundId, sessionNumber, light = false, pictured = false }: {
  checkInId: string
  groundId: string
  sessionNumber: number
  /** Your own report exactly as own-report.jpg draws it (screen match, screen 42). Everything else this card shows is on ?whole=1. */
  pictured?: boolean
  /** The light own report, for a sales check-in (sales-first.md, sections 2 and 5). Other kinds read it as before. */
  light?: boolean
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tookBack, setTookBack] = useState<string | null>(null)

  /* The per-session read: the objective, how clear this sitting was, and who is counted. */
  const session = useQuery({
    queryKey: ['session-shaped-report', groundId, sessionNumber],
    queryFn: () => reportsApi.sessionReport(groundId, sessionNumber),
    enabled: !!groundId && !!sessionNumber,
  })
  /* The ground report, for this reader's own rows and their own private note. Both are already
     walled at the read - `myRows` resolves the participant from the caller's own user id, and the
     coaching note is theirs alone - so nothing here decides who may see what. */
  const whole = useQuery({
    queryKey: ['report', groundId],
    queryFn: () => reportsApi.get(groundId),
    enabled: !!groundId,
    retry: false,
  })
  /* The two sentences the session itself produced, which arrive about twenty seconds after it
     ends. This is the only thing on the card before extraction has run. */
  const artifact = useQuery({
    queryKey: ['artifact', checkInId],
    queryFn: () => conversationApi.artifact(checkInId),
    enabled: !!checkInId,
    retry: false,
  })

  /* The check-in itself, for two things the template's sheet carries and this had neither of: the
     date this sitting happened, and the five dimensions behind block 6. Both are already on the
     ground payload; nothing new is computed for either. */
  const ground = useQuery({
    queryKey: ['ground', groundId],
    queryFn: () => groundsApi.get(groundId),
    enabled: !!groundId,
    retry: false,
  })
  /* The direct morning (lib/the-direct-morning.tsx): no privacy note, and the team's report is called the team's report. */
  const direct = useTheDirectMorning() || isTheDirectMorningOn(ground.data)
  const mySpecificity = useQuery({
    queryKey: ['my-specificity', groundId],
    queryFn: () => groundsApi.getMySpecificity(groundId),
    enabled: !!groundId,
    retry: false,
  })

  const takeBack = useMutation({
    mutationFn: (entryId: string) => conversationApi.disputeEntry(checkInId, entryId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['report', groundId] }); setTookBack(null) },
    onError: () => { toast.error('Could not mark that. Try again.'); setTookBack(null) },
  })
  /** The same call the report page and the ground chat make - one way of correcting, not a second. */
  const correct = useMutation({
    mutationFn: () => reportsApi.startSelfCorrection(groundId, sessionNumber),
    onSuccess: (res: { checkInId: string }) => navigate(`/checkin/${res.checkInId}`),
    onError: () => toast.error('Could not open a correction. Try again.'),
  })

  const d: any = session.data
  const r: any = whole.data
  const closed = (r as any)?.status === 'CLOSED' || (r as any)?.groundStatus === 'CLOSED'

  const mine: MyRow[] = ((r?.myRows ?? []) as MyRow[]).filter(x => x.sessionNumber === sessionNumber)
  const open = mine.filter(x => STILL_OPEN.includes(x.type) && !x.disputedAt)
  const said = mine.filter(x => !AGAINST_IT.includes(x.type) && !STILL_OPEN.includes(x.type))
  /*
   * WHAT THEY COULD TRY, beside what is still in their way. Computed on the server - see
   * what-you-could-try-next - because a recommendation that depends on the model remembering one
   * line among two hundred and seventy-three is not a recommendation anybody reliably gets.
   */
  const couldTry: { id: string; what: string; couldTry: string[] }[] = ((r as any)?.couldTry ?? [])
  const carry = artifact.data?.artifact?.whatToCarry ?? null
  const note = r?.coaching ?? null

  /* Only this person's own conditions. A person's own half never shows movement on somebody
     else's work, so a condition somebody else spoke to is not on this card at all. */
  const yourName: string | null = d?.counting?.find((c: any) => c.isYou)?.who ?? null
  const yours = ((d?.againstSuccess?.conditions ?? []) as any[])
    .filter(c => c.who == null || (yourName && c.who === yourName))
  /* This person's own words for what good looks like, for the block above when nobody has set a
     standard for everybody. Their own line is the one with no name on it, or their own name. */
  const mySuccess: string | null = ((d?.againstSuccess?.definitions ?? []) as any[])
    .filter(x => x.who == null || (yourName && x.who === yourName))
    .map(x => x.text).pop() ?? null
  /* This sitting's own row on the ground, for the date in the masthead and the five dimensions. */
  const thisSitting: any = ((ground.data as any)?.checkIns ?? []).find((c: any) => c.id === checkInId)
    ?? ((ground.data as any)?.checkIns ?? []).find((c: any) => c.sessionNumber === sessionNumber)

  if (session.isLoading && whole.isLoading && artifact.isLoading) return null

  /* Numbered by what is DRAWN. Fixed numbers skip when a block is empty, and 01 · 03 · 06 reads as
     pieces missing rather than as a report with three blocks. */
  let step = 0
  const next = () => (step += 1)

  /*
   * THE LIGHT OWN REPORT (sales-first.md, sections 2 and 5; the light prototype's own report for Miriam,
   * docs/prototype/screens/B4-reports-and-sharing/own-report.txt): What you did well, What you told us,
   * One thing to think about, then the rest folded. What you did well is only their own lines from this
   * session that are proven or confirmed, with where the proof came from as the server says it, so a
   * photo is only ever claimed where one backs the line.
   */
  /* In the light own report every fold is the same one line that opens (FoldedLine); elsewhere the old fold stays. */
  /* A plain call, not a component made here, so a fold that is open stays open when the page draws again. */
  const theFold = (summary: string, children: React.ReactNode) =>
    light ? <FoldedLine name={summary}>{children}</FoldedLine> : <Folded summary={summary}>{children}</Folded>
  const didWell = said.filter(x => !x.disputedAt && (x.mark === 'proven' || x.mark === 'confirmed'))
  const hasFor = !!(d?.againstSuccess?.stated || mySuccess)
  const didWellJSX = light && didWell.length > 0 ? (
    <Block n={next()} label="What you did well">
      <div style={{ display: 'grid', gap: 8 }}>
        {didWell.map(x => (
          <div key={x.id} className="gw-row">
            <span style={{ marginTop: 3 }}><ProofMark mark={x.mark} /></span>
            <div>
              <p className="gw-p" style={{ margin: 0, color: 'var(--gw-text)', maxWidth: '68ch' }}>{x.text}</p>
              {x.how && <p className="gw-small" style={{ margin: '2px 0 0', color: 'var(--gw-sub)', maxWidth: '68ch' }}>{x.how}</p>}
            </div>
          </div>
        ))}
      </div>
    </Block>
  ) : null
  const forJSX = (
    <>
      {/*
        ── What this is for. The objective leads, and this person's part of it comes second.
        U.9 END-OF-MODULE API SUITE: THE LABEL IS THE ONE `the-four-reports.ts` DECLARES.
        `the-order-is-the-order-on-screen.spec.ts` checks the block this workspace draws against
        `WHAT_THE_BLOCK_IS_CALLED.whatThisIsFor`, which the engine declared as the plain heading
        "What this is for" - not this screen's own longer phrasing to add. The extra context
        ("and your part of it") is still true and still on the page; it belongs in the block's
        body, not appended to the one string the two sides have to agree on byte for byte.
      */}
      {(d?.againstSuccess?.stated || mySuccess) && (
        <Block n={next()} label="What this is for" hideLabel={light}>
          {/*
            WHEN NOBODY HAS SET A STANDARD, THIS BLOCK SHOWS WHAT *YOU* SAID, NOT A PROSE
            EXPLANATION OF WHY THERE ISN'T ONE.

            The band's unset state reads: nobody has set this as the standard, so nothing is being
            read against it, and they can state it on the Setup tab. Every word true, and all of it
            addressed to the lead. Rendered as block 1 of somebody's own half it is a paragraph
            about a setting they may not be able to change, in the first thing they read after ten
            minutes of talking - and it is the same text Hafsah had just taken off the Report tab.

            What this person's own half can always say is what THEY said good looks like, which is
            their part of it and is the block's other half anyway.
          */}
          {d.againstSuccess?.stated
            ? <WhatSuccessLooksLike data={{ ...d.againstSuccess, conditions: yours, definitions: [] }} yourName={yourName} headingIsTheCallers />
            : (
              <>
                <p className="gw-big" style={{ margin: 0, color: 'var(--gw-text)', maxWidth: '68ch' }}>{mySuccess}</p>
                <p className="gw-small" style={{ margin: '6px 0 0', color: 'var(--gw-sub)', maxWidth: '68ch' }}>
                  Your own words for what good looks like. Nobody has set one for everybody yet, so
                  this is what your half is read against.
                </p>
              </>
            )}
          {/*
            AND WHICH OF IT IS YOURS, which is the second half of this block on the template's own
            sheet and was missing entirely. The objective without it is a statement about the team;
            with it, it is a statement about what this person is answerable for - which is the only
            reason their own half opens with it.
          */}
          {/*
            U.9 THIRD REVIEW, ITEM 4: A SENTENCE, NOT A LABEL WITH A COLON JOINING A LIST WITH
            SEMICOLONS. "Your part: {A}; {B}." read as a form field, not something anybody would
            say. The label is folded into the sentence, and the list is said as a sentence too.
          */}
          {yours.length > 0 && (
            <p className="gw-p" style={{ margin: '10px 0 0', color: 'var(--gw-text)', maxWidth: '68ch' }}>
              {`Your own part of this is ${yours.map((c: any) => c.text).join(', ')}.`}
            </p>
          )}
        </Block>
      )}
    </>
  )
  const whereJSX = (
    <>
      {/*
        ── 02 · Where you are against it. Your rows only - see the filter above.
        U.9 END-OF-MODULE API SUITE: THE PLAIN HEADING `whereYouAre` DECLARES ("Where you are
        against it"), not this screen's longer phrasing. "From your own rows only" is still true -
        it is the note under "No score, and no on-track label" a few lines down.
      */}
      {yours.length > 0 && (
        <Block n={next()} label="Where you are against it" hideLabel={light}>
          <div style={{ display: 'grid', gap: 8 }}>
            {yours.map((c: any, i: number) => {
              const says = SAYS[c.state as string] ?? SAYS.unspoken
              return (
                <div key={i} className="gw-row">
                  <span aria-hidden style={{ marginTop: 6, width: 6, height: 6, borderRadius: 3, background: says.dot }} />
                  <div>
                    <p className="gw-p" style={{ margin: 0, color: 'var(--gw-text)', maxWidth: '68ch' }}>{c.text}</p>
                    {/* The match is shown, never just asserted: a row is put in a state by a line
                        somebody actually wrote, and that line is printed under it, so a reader who
                        thinks the match is wrong can see that it is wrong. */}
                    {c.why && <p className="gw-small" style={{ margin: '2px 0 0', color: 'var(--gw-sub)', maxWidth: '68ch' }}>“{c.why}”</p>}
                  </div>
                  <span className="gw-state gw-stamp" style={{ color: 'var(--gw-sub-d)', whiteSpace: 'nowrap', marginTop: 3 }}>{says.word}</span>
                </div>
              )
            })}
          </div>
          <p className="gw-small" style={{ margin: '10px 0 0', color: 'var(--gw-sub)', maxWidth: '68ch' }}>
            No score, and no on-track label. Each row says what it says.
          </p>
        </Block>
      )}
    </>
  )
  const saidJSX = (
    <>
      {/*
        ── 03 · What you said. Extracted lines, disputable, and the press sits with them.
        U.9 END-OF-MODULE API SUITE: THE PLAIN HEADING `whatYouSaid` DECLARES ("What you said"),
        not this screen's longer phrasing. "And it is yours to take back" is still true - it is
        the sentence right underneath ("If one is wrong, say so.") and the press on every row.
      */}
      {said.length > 0 && (
        <Block n={next()} label="What you said" shownAs={light ? 'What you told us' : undefined}>
          <p className="gw-small" style={{ margin: '0 0 10px', color: 'var(--gw-sub)', maxWidth: '68ch' }}>
            These were taken from what you wrote, not typed by you. If one is wrong, say so.
          </p>
          <div className="gw-quotes">
            {said.map(row => (
              <Row
                key={row.id}
                row={row}
                busy={tookBack === row.id}
                light={light}
                onTakeBack={() => { setTookBack(row.id); takeBack.mutate(row.id) }}
              />
            ))}
          </div>
        </Block>
      )}
    </>
  )
  const openJSX = (
    <>
      {/*
        ── 04 · What is still open for you. See the header for what this cannot say yet.
        U.9 END-OF-MODULE API SUITE: THE PLAIN HEADING `stillOpenForYou` DECLARES ("What is still
        open for you"), not this screen's longer phrasing. "What you asked for, and what you
        raised" is still true of the block's contents, drawn below.
      */}
      {(open.length > 0 || couldTry.length > 0) && (
        <Block n={next()} label="What is still open for you" hideLabel={light}>
          <div style={{ display: 'grid', gap: 8 }}>
            {open.map(x => (
              <p key={x.id} className="gw-p" style={{ margin: 0, color: 'var(--gw-text)', maxWidth: '68ch' }}>{x.text}</p>
            ))}
          </div>

          {/*
            AND WHAT THEY COULD DO ABOUT IT. Options, in the order they are worth doing, for each
            thing still in their way - never a count of days shouted back at them and nothing about
            whether they should have moved sooner. Somebody who has already escalated or gone around
            has no row here at all, because they have done the thing this would suggest.
          */}
          {couldTry.length > 0 && (
            <div style={{ display: 'grid', gap: 12, marginTop: open.length > 0 ? 14 : 0 }}>
              {couldTry.map(b => (
                <div key={b.id} className="gw-try">
                  <p className="gw-p" style={{ margin: '0 0 4px', color: 'var(--gw-text)', fontWeight: 600 }}>
                    Ways through {'\u201C'}{b.what}{'\u201D'}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 3 }}>
                    {b.couldTry.map((line, i) => (
                      <li key={i} className="gw-p" style={{ color: 'var(--gw-text)', maxWidth: '64ch' }}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Block>
      )}
    </>
  )
  const carryJSX = (
    <>
      {/*
        ── 05 · What you carry into the next one. One thing, and the private note INSIDE it.
        U.9 END-OF-MODULE API SUITE: THE PLAIN HEADING `whatYouCarry` DECLARES ("What you carry
        into the next one"), not this screen's "The one thing…" - which is still true, since only
        one sentence is ever drawn below it.
      */}
      {/* Only when there is something to say: a coaching note with no text drew the heading over nothing. */}
      {(carry || note?.showingUp) && (
        <Block n={next()} label="What you carry into the next one" shownAs={light ? 'One thing to think about' : undefined}>
          {/* The session's own sentence, not a row echoed from block 3 - see the note on the
              type lists above. */}
          {carry && <p className="gw-big" style={{ margin: 0, color: 'var(--gw-text)', maxWidth: '68ch' }}>{carry}</p>}
          {/*
            U.9 RE-REVIEW, ITEM A: NO DATE THAT IS NOT PROVABLY THIS ONE'S.
            "By when, in your words: by 20 December" attached `d.myTimeframe` - a date said
            somewhere else in the session - to `carry`, a different sentence the session wrote
            with no structural link between the two. Walked live, the date belonged to a different
            thing entirely (her shops deadline, not the item shown here). Nothing here can tell
            whether the two are about the same thing, so the date is left out rather than guessed.
          */}
          {/*
            THE PRIVATE NOTE LIVES IN HERE AND NEVER BECOMES A SECTION OF ITS OWN.
            Given its own heading it reads as an assessment filed about somebody. Inside the block
            about what they are carrying, it is what it is: a thing to try next time.
          */}
          {note?.showingUp && (
            <div style={{ marginTop: 12, background: 'var(--gw-blue-bg)', borderRadius: 8, padding: '11px 13px' }}>
              {/* Navy on the blue tint, never a grey ink on a tinted ground. */}
              {!direct && <div className="gw-stamp" style={{ color: 'var(--gw-navy)', marginBottom: 6 }}>Written for you. It is not part of the shared picture.</div>}
              <p className="gw-p" style={{ margin: 0, color: 'var(--gw-navy)', maxWidth: '68ch' }}>{note.showingUp}</p>
              {note.whyItMatters && <p className="gw-small" style={{ margin: '6px 0 0', color: 'var(--gw-navy)', maxWidth: '68ch' }}>{note.whyItMatters}</p>}
              {(note.beforeNextTime ?? []).length > 0 && (
                <ul className="gw-small" style={{ margin: '8px 0 0', paddingLeft: 18, color: 'var(--gw-navy)' }}>
                  {note.beforeNextTime.map((b: string, i: number) => <li key={i}>{b}</li>)}
                </ul>
              )}
            </div>
          )}
        </Block>
      )}
    </>
  )
  const checkableJSX = (
    <>
      {/*
        ── How much you gave it. Folded and last: a caveat above the thing it qualifies reads as a
        verdict on it.

        U.9 RE-REVIEW, ITEM A: SHOWN ONCE, NOT TWICE. This block used to draw its own copy of the
        specificity bar (HowSpecificThisSessionWas), and SessionReportPage draws the same bar again
        above this whole card - one page, the same reader's own rating, twice. The bar stays where
        it always sits first, at the top of the page; this fold keeps only what it alone has, the
        five things it is made of.
      */}
      {d?.howClearThisWas?.level && (
        <div className="gw-blk" style={{ paddingTop: 0, paddingBottom: 0 }}>
          {/* U.9 THIRD REVIEW, ITEM 4: THE PROTOTYPE'S OWN WORDS, NOT A PARAPHRASE OF THEM.
              docs/prototype/screens/B3-the-check-in/done.txt: "How checkable today's check-in
              was". */}
          {theFold("How checkable today’s check-in was", <>
            {/* The bar says how much; these five say of WHAT, which is the difference between a
                reading somebody can act on and a mark they cannot. Same read as the one on the
                run-long page, scoped to this sitting rather than across every one. */}
            <TheFiveThingsThatMakeItCheckable
              dimensions={thisSitting?.specificityDimensions ?? null}
              sessionNumber={sessionNumber}
              mostUseful={mySpecificity.data?.mostUseful ?? null}
              strongest={mySpecificity.data?.strongest ?? null}
            />
            {!direct && (
              <p className="gw-small" style={{ margin: 0, color: 'var(--gw-sub)', maxWidth: '68ch' }}>
                Yours alone. It is a read of how checkable this sitting is, not a mark on you.
              </p>
            )}
          </>)}
        </div>
      )}
    </>
  )

  /*
   * YOUR OWN REPORT, AS PICTURED (own-report.jpg, screen 42). "What you did well" in its own panel, the session's own two
   * sentences, "What you told us" as a list with each line's mark and where it comes from, "One thing to think about" in
   * its own panel with one thing to think about, and "Something here isn't right". Every line is this person's own, served
   * to them alone, as before. The rest of this card (the masthead, the folds, the rest of the private note, how checkable
   * it was, each line's own take-back) is on the page as it was, one tap away (?whole=1).
   */
  if (pictured) {
    /* Release 1's sales own report (Hafsah's points 21 and 22): no second summary paragraph, and one question about one of your own deals that is stuck. */
    const releaseOne = d?.releaseOneSalesReport === true
    const story: string | null = releaseOne ? null : artifact.data?.artifact?.summary ?? null
    const aQuestion: string | null = ((note?.beforeNextTime ?? []) as string[]).find((b) => /\?\s*$/.test(b)) ?? null
    /* Each line once (Drop Access short run, item 14), on Release 1's sales check-in: a line in What you did well is not listed again under What you told us. */
    const toldUs = releaseOne ? said.filter((x) => !didWell.includes(x)) : said
    const toThinkAbout: string[] = releaseOne
      ? (d?.forYouToThinkAbout ? [d.forYouToThinkAbout as string] : [])
      : carry ? [carry] : [note?.showingUp, aQuestion].filter(Boolean) as string[]
    /*
     * Quality pass, 18 October, O-1 to O-6: on Release 1's sales check-in the server reads your own report from your own deals and
     * lines (your-own-report-from-the-record): what you did well in your own name, the kit's story, and what you told us said once.
     */
    const own: { didWell: { text: string; how: string | null; mark: string }[]; story: string | null; toldUs: { text: string; how: string | null; mark: string }[] } | null = releaseOne ? d?.yourOwnReport ?? null : null
    if (own) {
      return (
        <div className="pb-own-body">
          {own.didWell.length > 0 && (
            <section className="pb-own-panel" aria-label="What you did well">
              <h2 className="pb-own-h">What you did well</h2>
              <ul className="pb-own-list">
                {own.didWell.map((x) => <li key={x.text}><ProofMark mark={x.mark} /><span>{x.text}{x.how ? ` ${x.how}` : ''}</span></li>)}
              </ul>
            </section>
          )}
          {own.story && <p className="pb-own-story">{own.story}</p>}
          {own.toldUs.length > 0 && (
            <section aria-label="What you told us">
              <h2 className="pb-own-h pb-own-h-rule">What you told us</h2>
              <ul className="pb-own-told">
                {own.toldUs.map((x) => (
                  <li key={x.text}>
                    <ProofMark mark={x.mark} />
                    <div>
                      <span>{x.text}</span>
                      {x.how && <span className="pb-own-how">{x.how}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {toThinkAbout.length > 0 && (
            <section className="pb-own-panel" aria-label="One thing to think about">
              <h2 className="pb-own-h">One thing to think about</h2>
              {toThinkAbout.map((t) => <p key={t} className="pb-own-think">{t}</p>)}
            </section>
          )}
          {!closed && (
            <button type="button" className="pb-own-wrong" onClick={() => correct.mutate()} disabled={correct.isPending}>
              {correct.isPending ? 'Opening…' : 'Something here isn’t right'}
            </button>
          )}
        </div>
      )
    }
    return (
      <div className="pb-own-body">
        {didWell.length > 0 && (
          <section className="pb-own-panel" aria-label="What you did well">
            <h2 className="pb-own-h">What you did well</h2>
            <ul className="pb-own-list">
              {didWell.map((x) => (
                <li key={x.id}><ProofMark mark={x.mark} /><span>{x.readAs ?? x.text}{x.how ? ` ${x.how}` : ''}</span></li>
              ))}
            </ul>
          </section>
        )}
        {story && <p className="pb-own-story">{story}</p>}
        {toldUs.length > 0 && (
          <section aria-label="What you told us">
            <h2 className="pb-own-h pb-own-h-rule">What you told us</h2>
            <ul className="pb-own-told">
              {toldUs.map((x) => (
                <li key={x.id} className={x.disputedAt ? 'pb-own-gone' : undefined}>
                  <ProofMark mark={x.mark ?? 'said'} />
                  <div>
                    <span>{x.readAs ?? x.text}</span>
                    {(x.how || x.typeSays) && <span className="pb-own-how">{x.how ?? x.typeSays}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {toThinkAbout.length > 0 && (
          <section className="pb-own-panel" aria-label="One thing to think about">
            <h2 className="pb-own-h">One thing to think about</h2>
            {toThinkAbout.map((t) => <p key={t} className="pb-own-think">{t}</p>)}
          </section>
        )}
        {!closed && (
          <button type="button" className="pb-own-wrong" onClick={() => correct.mutate()} disabled={correct.isPending}>
            {correct.isPending ? 'Opening…' : 'Something here isn’t right'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="gw-close" style={{ margin: '16px 0 8px', background: 'var(--gw-card)', border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>
      <style>{CLOSE_SHEET}</style>

      {/*
        ── The masthead. What it is, whose it is, and where in the run it sits.
        U.9 RE-REVIEW, ITEM A: A SENTENCE, NOT CAPITALS JOINED WITH "·". "CHECK-IN 1 · 27 SEPT ·
        YOURS · NOBODY ELSE READS THIS HALF" is now "Check-in 1, on 27 September. Only you read
        this part."
      */}
      <div className="gw-head">
        <div className="gw-title">
          {closed ? 'Where this ended, in your own words' : 'What you said this time'}
        </div>
        <div className="gw-stamp" style={{ marginTop: 4, color: 'var(--gw-sub)' }}>
          {`Session ${sessionNumber}${d?.plannedSessions ? ` of ${d.plannedSessions}` : ''}`}
          {/* The date this sitting happened. A report with no date on it is a report somebody
              cannot place against anything else that was going on that week. */}
          {thisSitting?.completedAt ? `, on ${whenItWas(thisSitting.completedAt, 'dayAndMonth')}` : ''}
          {direct ? '.' : '. Only you read this part.'}
        </div>
      </div>

      {light ? (
        <>
          {didWellJSX}
          {saidJSX}
          {carryJSX}
          {/* The rest of their own report, each part one line that opens (the light prototype's s71: nothing is removed). */}
          {(hasFor || yours.length > 0 || open.length > 0 || couldTry.length > 0) && (
            <div className="gw-blk gwui-own-more">
              <div className="gw-lbl">More in your report</div>
              {hasFor && <FoldedLine name="What this is for">{forJSX}</FoldedLine>}
              {yours.length > 0 && <FoldedLine name="Where you are against it" fact={`${yours.length} ${yours.length === 1 ? 'thing' : 'things'} you are answerable for`}>{whereJSX}</FoldedLine>}
              {(open.length > 0 || couldTry.length > 0) && <FoldedLine name="What is still open for you" fact={`${open.length + couldTry.length} still open`}>{openJSX}</FoldedLine>}
            </div>
          )}
          {checkableJSX}
        </>
      ) : (
        <>
          {forJSX}
          {whereJSX}
          {saidJSX}
          {openJSX}
          {carryJSX}
          {checkableJSX}
        </>
      )}

      {/* ── Nothing yet, said as what it is rather than as an empty card. */}
      {step === 0 && (
        <div className="gw-blk">
          <p className="gw-p" style={{ margin: 0, color: 'var(--gw-sub)', maxWidth: '68ch' }}>
            {/*
              TWO DIFFERENT EMPTIES, AND ONE SENTENCE WAS BEING USED FOR BOTH.
              "The lines taken from it appear here in a moment" is true while extraction is still
              running. It is a promise that never comes true for somebody whose answers had nothing
              in them to take a line from - watched on a live run, where a person answered "yeah,
              all good from my side" and "I think I am doing what is expected" and was told, on a
              closed sitting, to wait for lines that were never coming.
              Not a telling-off either: it says what happened, not what they should have done. The
              five things that make an answer checkable are already on this card, folded, for
              anybody who wants to know what would have been taken.
            */}
            {artifact.data?.artifact?.summary
              ?? (closed
                ? 'Your check-in is saved. Nothing in it was specific enough to take a line from this time.'
                : 'Your check-in is saved. The lines taken from it appear here in a moment.')}
          </p>
        </div>
      )}

      {/* ── The way out, and the way to argue with it. */}
      <div className="gw-foot">
        <button
          onClick={() => navigate(`/grounds/${groundId}/session/${sessionNumber}`)}
          className="gw-link"
          style={{
            background: 'none', border: 'none', padding: 0, color: 'var(--gw-navy)',
            cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', justifySelf: 'start',
            minHeight: 36, display: 'inline-flex', alignItems: 'center', textAlign: 'left',
          }}
        >
          {/* The shared half is a different report and it lives on its own page. It is not copied
              here: that copy is what made one finding reach one person on four screens. */}
          {direct ? 'See the team’s report for this session' : 'See the shared picture for this session'}
        </button>
        {/*
          A REPORT YOU CANNOT ARGUE WITH IS A REPORT YOU STOP TRUSTING.

          Two ways to change what is on somebody's record is one more than can be reasoned about,
          so this is the same call the report page and the ground chat make. Row by row, taking one
          back is above; this is for what is missing or wrong in a way a mark cannot say.

          Not on a closed check-in: the resolution record is the end of the argument, and a control
          that exists to be refused is worse than no control.
        */}
        {!closed && (
          <div>
            <button
              onClick={() => correct.mutate()}
              disabled={correct.isPending}
              className="gw-link"
              style={{
                background: 'none', border: 'none', padding: 0, color: 'var(--gw-navy)',
                cursor: correct.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
                minHeight: 36, display: 'inline-flex', alignItems: 'center', textAlign: 'left',
              }}
            >
              {correct.isPending ? 'Opening…' : 'Something here isn’t right'}
            </button>
            <div className="gw-mini" style={{ color: 'var(--gw-sub)', marginTop: 3, maxWidth: '68ch' }}>
              This opens a short session to correct or add to what you said. Nothing is overwritten.
              The change is shown alongside the original.
            </div>
          </div>
        )}
        {/*
          RELEASE WALKTHROUGH A, FIX 4 (engine request 151, E5): THIS SESSION'S OWN RELEASE, NOT
          THE GROUND'S LAST ONE. `r?.releasedAt` is the whole ground report's most recent release -
          true for ever once any round has gone out, including while THIS session's own round is
          still forming. Walked live: session 2 read "The shared picture is open, and everyone
          reads the same report" while session 2 was not shared, because session 1's release had
          already set it. `d?.released` is the per-session shaped read (reportsApi.sessionReport),
          already scoped to `sessionNumber` above - this session's own state, not the ground's.
        */}
        <div className="gw-mini" style={{ color: 'var(--gw-sub)', maxWidth: '68ch' }}>
          {direct
            ? (d?.released ? 'The team’s report is shared.' : 'The team’s report is not shared yet.')
            : d?.released
            ? 'The shared picture is open, and everyone reads the same report.'
            : 'This half is yours. The shared picture opens to everybody at the same moment.'}
        </div>
      </div>
    </div>
  )
}
