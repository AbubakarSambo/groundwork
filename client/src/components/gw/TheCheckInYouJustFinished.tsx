import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { reportsApi } from '@/api/reports'
import { conversationApi } from '@/api/conversation'
import { Folded } from './two-accounts-side-by-side'
import { WhatSuccessLooksLike } from './WhatSuccessLooksLike'
import { HowSpecificThisSessionWas } from './HowSpecificThisSessionWas'

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

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const PROSE: React.CSSProperties = { maxWidth: '68ch', lineHeight: 1.6 }
const LABEL: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase',
  color: 'var(--gw-muted)', marginBottom: 10,
}

/** One numbered block: its number, its name, and a note saying what the block is FOR. */
function Block({ n, label, note, children }: {
  n: number
  label: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--gw-border)' }}>
      <div style={{ ...LABEL, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span>
          {/* The space is real, not a margin: a screen reader announces the number and the name as
              two things only if there is one between them. */}
          <span style={{ color: 'var(--gw-muted)', marginRight: 8 }}>{String(n).padStart(2, '0')}{' '}</span>
          {label}
        </span>
        {note && <span style={{ color: 'var(--gw-sub)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>{note}</span>}
      </div>
      {children}
    </div>
  )
}

interface MyRow {
  id: string
  type: string
  text: string
  disputedAt: string | null
  documented?: boolean
  documentSays?: string | null
  checkInId: string | null
  sessionNumber: number | null
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
function Row({ row, onTakeBack, busy }: { row: MyRow; onTakeBack: () => void; busy: boolean }) {
  const gone = !!row.disputedAt
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <p style={{
        margin: 0, fontSize: 13.5, color: gone ? 'var(--gw-muted)' : 'var(--gw-text)',
        textDecoration: gone ? 'line-through' : undefined, ...PROSE,
      }}>
        {row.text}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gw-muted)' }}>
          {row.type.replace(/_/g, ' ').toLowerCase()}{row.documented ? ' · from a document' : ''}
        </span>
        {gone
          ? <span style={{ fontSize: 11.5, color: 'var(--gw-muted)' }}>You said this is not what you said. It counts toward nothing.</span>
          : (
            <button
              onClick={onTakeBack}
              disabled={busy}
              style={{
                background: 'none', border: 'none', padding: 0, fontSize: 11.5, color: 'var(--gw-navy)',
                cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
              }}
            >
              This is not what I said
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

export function TheCheckInYouJustFinished({ checkInId, groundId, sessionNumber }: {
  checkInId: string
  groundId: string
  sessionNumber: number
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

  if (session.isLoading && whole.isLoading && artifact.isLoading) return null

  /* Numbered by what is DRAWN. Fixed numbers skip when a block is empty, and 01 · 03 · 06 reads as
     pieces missing rather than as a report with three blocks. */
  let step = 0
  const next = () => (step += 1)

  return (
    <div style={{ margin: '16px 0 8px', background: 'var(--gw-card)', border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>

      {/* ── The masthead. What it is, whose it is, and where in the run it sits. */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gw-text)', lineHeight: 1.3 }}>
          {closed ? 'Where this ended, in your own words' : 'What you said this time'}
        </div>
        <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)' }}>
          {[
            `check-in ${sessionNumber}${d?.plannedSessions ? ` of ${d.plannedSessions}` : ''}`,
            'yours · nobody else reads this half',
          ].join(' · ')}
        </div>
      </div>

      {/* ── 01 · What this is for. The objective leads, and this person's part of it comes second. */}
      {(d?.againstSuccess?.stated || mySuccess) && (
        <Block n={next()} label="What this is for" note="the objective, and your part of it">
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
                <p style={{ margin: 0, fontSize: 14, color: 'var(--gw-text)', fontWeight: 600, ...PROSE }}>{mySuccess}</p>
                <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--gw-sub)', ...PROSE }}>
                  Your own words for what good looks like. Nobody has set one for everybody yet, so
                  this is what your half is read against.
                </p>
              </>
            )}
        </Block>
      )}

      {/* ── 02 · Where you are against it. Your rows only - see the filter above. */}
      {yours.length > 0 && (
        <Block n={next()} label="Where you are against it" note="your rows only">
          <div style={{ display: 'grid', gap: 8 }}>
            {yours.map((c: any, i: number) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: 10, alignItems: 'start' }}>
                <span aria-hidden style={{
                  marginTop: 6, width: 6, height: 6, borderRadius: 3,
                  background: c.state === 'moving' ? 'var(--gw-green-t)' : c.state === 'stuck' ? 'var(--gw-clay)' : 'var(--gw-border)',
                }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-text)', ...PROSE }}>{c.text}</p>
                  {/* No score and no on-track label. Each row says what it says, and says what it
                      was read off, so a reader who thinks the match is wrong can see that it is. */}
                  {c.why && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gw-sub)', ...PROSE }}>“{c.why}”</p>}
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* ── 03 · What you said. Extracted lines, disputable, and the press sits with them. */}
      {said.length > 0 && (
        <Block n={next()} label="What you said" note="yours to take back">
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--gw-sub)', ...PROSE }}>
            These were taken from what you wrote, not typed by you. If one is wrong, say so.
          </p>
          <div style={{ display: 'grid', gap: 14 }}>
            {said.map(row => (
              <Row
                key={row.id}
                row={row}
                busy={tookBack === row.id}
                onTakeBack={() => { setTookBack(row.id); takeBack.mutate(row.id) }}
              />
            ))}
          </div>
        </Block>
      )}

      {/* ── 04 · What is still open for you. See the header for what this cannot say yet. */}
      {open.length > 0 && (
        <Block n={next()} label="What is still open for you" note="what you asked for, and what you raised">
          <div style={{ display: 'grid', gap: 8 }}>
            {open.map(x => (
              <p key={x.id} style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-text)', ...PROSE }}>{x.text}</p>
            ))}
          </div>
        </Block>
      )}

      {/* ── 05 · What you carry into the next one. One thing, and the private note INSIDE it. */}
      {(carry || note) && (
        <Block n={next()} label="What you carry into the next one" note="one thing, named">
          {/* The session's own sentence, not a row echoed from block 3 - see the note on the
              type lists above. */}
          {carry && <p style={{ margin: 0, fontSize: 14, color: 'var(--gw-text)', fontWeight: 600, ...PROSE }}>{carry}</p>}
          {/*
            THE PRIVATE NOTE LIVES IN HERE AND NEVER BECOMES A SECTION OF ITS OWN.
            Given its own heading it reads as an assessment filed about somebody. Inside the block
            about what they are carrying, it is what it is: a thing to try next time.
          */}
          {note?.showingUp && (
            <div style={{ marginTop: 12, background: 'var(--gw-blue-bg)', borderRadius: 8, padding: '11px 13px' }}>
              <div style={{ ...LABEL, color: 'var(--gw-navy)', marginBottom: 6 }}>Written for you · not part of the shared picture</div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--gw-navy)', ...PROSE }}>{note.showingUp}</p>
              {note.whyItMatters && <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--gw-navy)', opacity: .85, ...PROSE }}>{note.whyItMatters}</p>}
              {(note.beforeNextTime ?? []).length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--gw-navy)', lineHeight: 1.6 }}>
                  {note.beforeNextTime.map((b: string, i: number) => <li key={i}>{b}</li>)}
                </ul>
              )}
            </div>
          )}
        </Block>
      )}

      {/* ── 06 · How much you gave it. Folded and last: a caveat above the thing it qualifies reads
             as a verdict on it. */}
      {d?.howClearThisWas?.level && (
        <div style={{ padding: '0 20px', borderTop: '1px solid var(--gw-border)' }}>
          <Folded summary="How much you gave this one">
            <HowSpecificThisSessionWas level={d.howClearThisWas.level} spots={r?.mySoftSpots ?? null} />
            <p style={{ margin: 0, fontSize: 12, color: 'var(--gw-sub)', ...PROSE }}>
              Yours alone. It is a read of how checkable this sitting is, not a mark on you.
            </p>
          </Folded>
        </div>
      )}

      {/* ── Nothing yet, said as what it is rather than as an empty card. */}
      {step === 0 && (
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--gw-border)' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--gw-sub)', ...PROSE }}>
            {artifact.data?.artifact?.summary
              ?? 'Your check-in is saved. The lines taken from it appear here in a moment.'}
          </p>
        </div>
      )}

      {/* ── The way out, and the way to argue with it. */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--gw-border)', display: 'grid', gap: 10 }}>
        <button
          onClick={() => navigate(`/grounds/${groundId}/session/${sessionNumber}`)}
          style={{
            background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: 'var(--gw-navy)',
            cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', justifySelf: 'start',
          }}
        >
          {/* The shared half is a different report and it lives on its own page. It is not copied
              here: that copy is what made one finding reach one person on four screens. */}
          See the shared picture for this session
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
              style={{
                background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: 'var(--gw-navy)',
                cursor: correct.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
              }}
            >
              {correct.isPending ? 'Opening…' : 'Something here is wrong - correct it'}
            </button>
            <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.5, marginTop: 4, ...PROSE }}>
              This opens a short session to correct or add to what you said. Nothing is overwritten -
              the change is shown alongside the original.
            </div>
          </div>
        )}
        {/* Everyone reads the same report - true at two people and at twelve. */}
        <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.5, ...PROSE }}>
          {r?.releasedAt
            ? 'The shared picture is open, and everyone reads the same report.'
            : 'This half is yours. The shared picture opens to everybody at the same moment.'}
        </div>
      </div>
    </div>
  )
}
