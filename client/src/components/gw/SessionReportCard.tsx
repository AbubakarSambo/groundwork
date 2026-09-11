import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { reportsApi } from '@/api/reports'
import { conversationApi } from '@/api/conversation'
import type { Report } from '@/types'
import { whatToCallIt } from './absence-of-evidence-is-not-a-finding'

/* The ladder's labels and its position table went with it. The five words are still the synthesis's
   own enum and still reach a person one at a time; nothing needs to know which rung they are. */

/*
 * THE LADDER IS GONE - the last of the scales nobody can see.
 *
 * UNRESOLVED · MIXED · EMERGING · CLEAR · ALIGNED, filled in up to your position. The same shape as
 * the specificity bars and the five-segment confidence meter, both of which came off My record for
 * the same reason: a mark on a scale whose steps are never defined, on a product that gives no
 * verdicts.
 *
 * It was worse here. Those were about a record; this was a five-rung ladder with a person standing
 * on the second rung, on the report of their own session. And it read as progress they could make,
 * which they cannot - where it lands depends on whether somebody else has answered yet.
 *
 * The word stays. "Emerging" is what the synthesis called it, it is one word, and it is above this.
 * What went is turning that word into a position out of five.
 */

// ---------------------------------------------------------------------------
// Honest close grid
// ---------------------------------------------------------------------------
interface CloseItem { label: string; text: string; bg: string; labelColor: string }

function HonestClose({ items }: { items: CloseItem[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {items.map(c => (
        <div key={c.label} style={{ background: c.bg, borderRadius: 7, padding: '8px 10px', fontSize: 12, lineHeight: 1.5 }}>
          <span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: c.labelColor, display: 'block', marginBottom: 2 }}>{c.label}</span>
          {c.text}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Area block (observation / why / recommended move)
// ---------------------------------------------------------------------------
interface Area { title: string; observation: string; whyItMatters: string; move: string; reached?: boolean; reachedNote?: string }

function AreaBlock({ area }: { area: Area }) {
  if (area.reached) {
    return (
      <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, padding: '11px 13px', borderLeft: '3px solid var(--gw-green-b)', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>{area.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{area.reachedNote}</div>
      </div>
    )
  }
  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, padding: '11px 13px', borderLeft: '3px solid var(--gw-amber-b)', marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{area.title}</div>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)', display: 'block', marginBottom: 1 }}>What we noticed</span>
        <span style={{ fontSize: 13, lineHeight: 1.5 }}>{area.observation}</span>
      </div>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)', display: 'block', marginBottom: 1 }}>Why it matters</span>
        <span style={{ fontSize: 13, lineHeight: 1.5 }}>{area.whyItMatters}</span>
      </div>
      <div style={{ background: 'var(--gw-green-bg)', borderRadius: 7, padding: '8px 10px' }}>
        <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-green-t)', opacity: .75, display: 'block', marginBottom: 2 }}>What to do next</span>
        <span style={{ fontSize: 13, color: 'var(--gw-green-t)', lineHeight: 1.5 }}>{area.move}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bullet list
// ---------------------------------------------------------------------------
function BulletList({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 9, fontSize: 13, lineHeight: 1.55 }}>
          <div style={{ flexShrink: 0, marginTop: '.55em', width: 5, height: 5, borderRadius: '50%', background: 'var(--gw-green-b)' }} />
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section label
// ---------------------------------------------------------------------------
function SecH({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 9 }}>{children}</div>
  )
}

// ---------------------------------------------------------------------------
// Admin cross-reference view - built from the shared report data
// ---------------------------------------------------------------------------
/**
 * THE PICTURE COMES FROM THE SESSION REPORT'S ENGINES, NOT THE STORED PROSE.
 *
 * Walked live as the second person to check in: this card said "Only Abubak Sambo has checked in so
 * far" with his success definition and deadline, under a line saying everyone had answered. The band
 * was printing the ground report's sharedPicture, model prose written when the first person finished
 * and never rewritten, naming the other party. The session report drafts its picture from the reads,
 * keys every line, and names nobody the reader may not see. That is what the card shows now.
 */
type Picture = { finding: { text: string; basis: string | null } | null; lines: string[]; settled: string[]; open: string[]; answered: number; of: number }
function ThePicture({ picture, dark }: { picture: Picture | null; dark: boolean }) {
  const dim = dark ? 'rgba(255,255,255,.62)' : 'var(--gw-muted)'
  const ink = dark ? 'rgba(255,255,255,.93)' : 'var(--gw-text)'
  if (!picture || (!picture.finding && !picture.lines.length)) {
    return <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: dim }}>Not enough has been said yet to draw one. It fills in as people check in.</p>
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {picture.finding && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, fontWeight: 600, color: ink }}>{picture.finding.text}</p>}
      {picture.finding?.basis && <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: dim }}>{picture.finding.basis}</p>}
      {picture.lines.map((l, i) => <p key={i} style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: ink }}>{l}</p>)}
    </div>
  )
}

function AdminCrossRef({ report, closed, picture }: { report: Report; closed: boolean; picture: Picture | null }) {
  const engagement = report.engagement as any
  /* See absence-of-evidence-is-not-a-finding.ts: a thin record used to render as "Mixed", which is
     a word about whether the accounts agree. It cannot be, because barely anything was said. */
  const called = whatToCallIt(engagement?.coverage, closed)
  const status = called.status

  const openAreas: Area[] = (report.divergences ?? []).map(d => ({
    title: d.topic,
    observation: d.positions.map(p => `${p.participantLabel}: ${p.view}`).join(' - '),
    whyItMatters: d.evidence?.[0] ?? 'The longer this stays unsaid, the harder it gets to sort out.',
    move: 'Surface this explicitly next session. Name what each of you expects and write it down.',
  }))

  const reachedAreas: Area[] = (report.agreements ?? []).map(a => ({
    title: a,
    reached: true,
    reachedNote: a,
    observation: '', whyItMatters: '', move: '',
  }))

  const closeItems: CloseItem[] = [
    { label: 'Aligned', text: report.agreements?.slice(0, 2).join('. ') || '-', bg: 'var(--gw-green-bg)', labelColor: 'var(--gw-green-t)' },
    { label: 'Open', text: report.divergences?.map(d => d.topic).join('. ') || '-', bg: 'var(--gw-amber-bg)', labelColor: 'var(--gw-amber-t)' },
    { label: 'Revisit', text: closed ? 'Review at next raise.' : 'Review next session.', bg: 'var(--gw-blue-bg)', labelColor: 'var(--gw-navy)' },
    { label: 'Risk', text: report.centralQuestion, bg: 'var(--gw-clay-bg)', labelColor: 'var(--gw-clay)' },
  ]

  return (
    <div>
      {/*
        A HEADING OVER NOTHING READS AS A PAGE THAT FAILED TO LOAD.

        Reported as "my private report didn't render". It had: the card drew, the status drew, "Too
        little to say / 0 areas settled" drew. What was blank was this band - a heading promising a
        summary with an empty paragraph under it, because `sharedPicture` is empty until enough has
        been said to make one.

        Both places print it, and both now say why it is empty instead of leaving the space. The
        reason is never a fault in the product and is worth saying plainly: one person has spoken,
        and a picture across the accounts needs more than one account.
      */}
      {/* What we heard */}
      <div style={{ background: 'var(--gw-dark)', color: '#fff', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-green-b)', fontWeight: 700, marginBottom: 7 }}>
          {closed ? 'What we heard across the check-in' : 'What we heard from you'}
        </div>
        <ThePicture picture={picture} dark />
      </div>

      {/* Alignment status */}
      <div style={{ marginBottom: 14 }}>
        <SecH>Alignment status</SecH>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{status}</div>
        {called.note ? (
          /*
           * A COUNT OF AGREEMENTS IS THE WRONG THING TO SAY UNDER A THIN RECORD. "1 agreed" reads
           * as a finding drawn from a conversation; here it is one sentence somebody typed. The
           * ladder goes too - it places this round on a scale from unresolved to aligned, and this
           * round is not on that scale yet.
           */
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 4, lineHeight: 1.55 }}>{called.note}</div>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 2, lineHeight: 1.5 }}>
              {/* Same undefined noun as the header used to carry - "area" is not a heading anywhere
                  in this card. See client/src/lib/alignment.ts. */}
              {report.agreements?.length ?? 0} agreed
              {report.divergences?.length ? `, ${report.divergences.length} still open` : ''}.
            </div>
          </>
        )}
      </div>

      {/* Open areas */}
      {openAreas.length > 0 && !closed && (
        <div style={{ marginBottom: 14 }}>
          <SecH>What's still open</SecH>
          {openAreas.map((a, i) => <AreaBlock key={i} area={a} />)}
        </div>
      )}

      {/* Reached areas */}
      {reachedAreas.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <SecH>{closed ? 'What was agreed' : 'Alignment reached'}</SecH>
          {closed
            ? <BulletList items={report.agreements ?? []} />
            : reachedAreas.map((a, i) => <AreaBlock key={i} area={a} />)
          }
        </div>
      )}

      {/* Honest close */}
      <div style={{ marginBottom: 14 }}>
        <SecH>An honest close</SecH>
        <HonestClose items={closeItems} />
      </div>

      {/* Doc line */}
      {engagement?.documentBacked && (
        <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 4 }}>Documents added during this check-in.</div>
      )}

      {closed && (
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.55, marginTop: 8 }}>
          This record is permanent. It is yours and is portable to your profile.
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Participant cross-reference view
// ---------------------------------------------------------------------------
function ParticipantCrossRef({ report, closed, picture }: { report: Report; closed: boolean; picture: Picture | null }) {
  /* The same rule as the admin view. This variant reads "Clear, trending to aligned" where the
     record is strong; a thin one says what it is instead of guessing at alignment. */

  /**
   * ONE LIST, NOT THREE.
   *
   * These same divergences used to be printed three times on this one card, under three headings -
   * "The assumptions in what you said", "Where more clarity would strengthen alignment", and
   * "Questions worth resolving next" - each one a template wrapped around `d.topic.toLowerCase()`.
   * Three divergences became nine bullets saying the same three things, and the Report tab printed
   * the same three a fourth time. That is why one person with one finished session reported reading
   * "too many reports": most of what they were reading was one finding, restated.
   *
   * Two of the three were also assertions nobody had established. "Your account on X could be more
   * specific" was said about every divergence regardless of how specific the account was - a
   * criticism generated by a for-loop, addressed to the person whose account it was. "That X is
   * settled" claimed they believed something they may never have said.
   *
   * What is left is what the report actually holds: the topic, and the consequence the synthesis
   * wrote under it. No template, nothing invented.
   */
  const stillOpen = (report.divergences ?? []).map(d => ({
    topic: d.topic,
    why: ((d as any).atStake ?? '').toString().trim(),
  }))

  return (
    <div>
      {/* What contribution reveals */}
      <div style={{ background: 'var(--gw-green-t)', color: '#fff', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-green-b)', fontWeight: 700, marginBottom: 7 }}>
          {closed ? 'What your contribution secured' : 'Where this stands, across everyone'}
        </div>
        {closed
          ? <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,.93)' }}>{`Over ${report.agreements?.length ?? 0} agreed area${(report.agreements?.length ?? 0) !== 1 ? 's' : ''}, what you wrote turned assumptions into written agreement.`}</p>
          : <ThePicture picture={picture} dark />}
      </div>

      {closed ? (
        <>
          <div style={{ marginBottom: 14 }}>
            <SecH>What was agreed</SecH>
            <BulletList items={report.agreements ?? []} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <SecH>Worth keeping an eye on</SecH>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {report.divergences?.slice(0, 1).map((d, i) => (
                <div key={i} style={{ background: 'var(--gw-amber-bg)', borderRadius: 7, padding: '8px 10px', fontSize: 12, lineHeight: 1.5 }}>
                  <span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-amber-t)', display: 'block', marginBottom: 2 }}>Still to pin</span>
                  {d.topic}
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            Documented and portable. You can add this check-in to your profile. It survives the relationship, and it is yours as much as the organisation's.
          </div>
        </>
      ) : (
        <>
          {stillOpen.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <SecH>Still open, and why it matters</SecH>
              <div style={{ display: 'grid', gap: 8 }}>
                {stillOpen.map((d, i) => (
                  <div key={i} style={{ background: 'var(--gw-amber-bg)', borderRadius: 8, padding: '9px 11px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>{d.topic}</div>
                    {d.why && (
                      <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 3, lineHeight: 1.55 }}>{d.why}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            {/* "Account" is the login word. Here it meant what this person said, so it says that. */}
            <SecH>Where this stands</SecH>
            {(picture?.settled.length || picture?.open.length)
              ? <div style={{ display: 'grid', gap: 6 }}>
                  {picture!.settled.map((t, i) => <div key={`s${i}`} style={{ fontSize: 13, lineHeight: 1.5 }}><b>Settled.</b> {t}</div>)}
                  {picture!.open.map((t, i) => <div key={`o${i}`} style={{ fontSize: 13, lineHeight: 1.5 }}><b>Still open.</b> {t}</div>)}
                </div>
              : <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.5 }}>Nothing settled or in dispute yet. {picture ? `${picture.answered} of ${picture.of} answered.` : ''}</div>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.55 }}>
            {/*
              THE LINE SAID THE OPPOSITE OF WHAT WAS ON THE SCREEN ABOVE IT.

              Walked as a real participant, on a card that was showing a cross reference of what
              everybody had said: "You can still only see your own. The full comparison opens once
              everyone has opened the report." Two lines above it, a paragraph naming the other
              party and describing their account of the same events.

              Both were correct about the data. This card only ever renders a cross reference once
              everybody in the round has answered, and until the report is released that picture is
              still forming. What was wrong is the label, which described a state the reader had
              already left. A person who can see the thing being denied stops believing the next
              promise too, and the next promise is the one about their wording.
            */}
            {report.releasedAt
              ? 'The full comparison is now open, and everyone reads the same report.'
              : 'Everyone in this round has answered, so this picture is forming from all of it. It is not final until the report is released.'}
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main SessionReportCard
// ---------------------------------------------------------------------------
interface Props {
  checkInId: string
  groundId: string
  sessionNumber: number
  isInitiator: boolean
}

type CardState = 'loading' | 'solo' | 'waiting' | 'cross_ref' | 'closed'

export function SessionReportCard({ checkInId, groundId, sessionNumber, isInitiator }: Props) {
  const [state, setState] = useState<CardState>('loading')
  const [soloArtifact, setSoloArtifact] = useState<{ summary: string; whatToCarry?: string } | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [sessionTag, setSessionTag] = useState('')
  const [picture, setPicture] = useState<Picture | null>(null)
  const navigate = useNavigate()
  useEffect(() => {
    if (!groundId || !sessionNumber) return
    reportsApi.sessionReport(groundId, sessionNumber)
      .then((d: any) => setPicture({
        finding: d?.finding ? { text: d.finding.text, basis: d.finding.basis ?? null } : null,
        lines: ((d?.picture as { key: string; text: string }[] | undefined) ?? []).filter((l) => !['basis', 'reads', 'written'].includes(l.key) && l.key !== d?.finding?.key).map((l) => l.text),
        settled: d?.whereThingsStand?.settled ?? [],
        open: d?.whereThingsStand?.open ?? [],
        answered: (d?.counting ?? []).filter((c: any) => c.answered).length,
        of: (d?.counting ?? []).length,
      }))
      .catch(() => setPicture(null))
  }, [groundId, sessionNumber])
  /** The same call the report page and the ground chat make: a fresh session, in correction mode. */
  const correct = useMutation({
    mutationFn: () => reportsApi.startSelfCorrection(groundId, sessionNumber),
    onSuccess: (res: { checkInId: string }) => navigate(`/checkin/${res.checkInId}`),
    onError: () => toast.error('Could not open a correction. Try again.'),
  })

  async function fetchState() {
    try {
      // Always try to get the report first
      const r = await reportsApi.get(groundId).catch(() => null)

      if (r?.releasedAt) {
        const closed = (r as any).status === 'CLOSED' || (r as any).groundStatus === 'CLOSED'
        setReport(r)
        setSessionTag(closed ? 'Closing session · resolution record' : `Session ${sessionNumber} · cross reference`)
        setState(closed ? 'closed' : 'cross_ref')
        return
      }

      if (r?.id) {
        // Report synthesised but not released - cross reference is available
        setReport(r)
        setSessionTag(`Session ${sessionNumber} · cross reference`)
        setState('cross_ref')
        return
      }

      // No report yet - try solo artifact
      const art = await conversationApi.artifact(checkInId).catch(() => null)
      if (art?.artifact) {
        setSoloArtifact(art.artifact)
        setState('solo')
        return
      }

      setState('waiting')
    } catch {
      setState('waiting')
    }
  }

  useEffect(() => {
    fetchState()
  }, [checkInId, groundId])

  // Poll every 30s when waiting for the other party or for synthesis
  useEffect(() => {
    if (state !== 'waiting' && state !== 'solo') return
    const t = setInterval(fetchState, 30_000)
    return () => clearInterval(t)
  }, [state])

  if (state === 'loading') return null

  const headerBg = isInitiator ? 'var(--gw-navy)' : 'var(--gw-green-t)'
  /*
    IT IS THIS PERSON'S REPORT, SO IT SAYS SO.

    "Admin report" and "Participant report" name the reader's ROLE on a document that is theirs
    alone - the subtitle directly under it says "the report you read when you finished, nobody else
    can see it". Being told you are the participant, on your own private page, is the product
    describing its own data model at somebody.
  */
  const headerLabel = 'My report'
  const closingLabel = isInitiator ? 'Resolution record' : 'Resolution record'

  return (
    <div style={{ margin: '16px 0 8px', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--gw-border)', background: 'white' }}>
      {/* Card header */}
      <div style={{ background: headerBg, color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>
          {state === 'closed' ? closingLabel : headerLabel}
        </span>
        {sessionTag && (
          <span style={{ fontSize: 11, opacity: .82 }}>{sessionTag}</span>
        )}
      </div>

      <div style={{ padding: '16px 16px 18px' }}>

        {/* STATE: solo artifact */}
        {state === 'solo' && soloArtifact && (
          <div>
            <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 9 }}>Just for you</div>
            <p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: soloArtifact.whatToCarry ? 12 : 0 }}>{soloArtifact.summary}</p>
            {soloArtifact.whatToCarry && (
              <div style={{ background: 'var(--gw-blue-bg)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--gw-navy)', lineHeight: 1.55 }}>
                <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: 3, opacity: .7 }}>Carry forward</span>
                {soloArtifact.whatToCarry}
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gw-muted)', fontStyle: 'italic' }}>
              Waiting for everybody else to finish their check-in. Your cross-reference will appear here.
            </div>
          </div>
        )}

        {/* STATE: waiting (no artifact yet) */}
        {state === 'waiting' && (
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            Your session is saved. The cross-reference appears once everybody else has checked in.
          </div>
        )}

        {/* STATE: cross reference or closed */}
        {(state === 'cross_ref' || state === 'closed') && report && (
          isInitiator
            ? <AdminCrossRef report={report} closed={state === 'closed'} picture={picture} />
            : <ParticipantCrossRef report={report} closed={state === 'closed'} picture={picture} />
        )}

        {/*
          * A REPORT YOU CANNOT ARGUE WITH IS A REPORT YOU STOP TRUSTING.
          *
          * Reported plainly: "I also see nowhere to correct the report." There was nowhere on this
          * card, which is the one place a person reads it - immediately after finishing, while what
          * it got wrong is still fresh.
          *
          * THE MACHINERY ALREADY EXISTED AND WAS ON THE WRONG SCREENS. `startSelfCorrection` opens a
          * fresh session in correction mode against a prior one, and it was wired into the report
          * PAGE and the ground chat - both of which somebody reaches later, if at all. The entry
          * chat has its own "what did we get wrong?" for the same reason and this path had nothing.
          *
          * Not offered on a closed check-in: the resolution record is the end of the argument, and a
          * control that exists to be refused is worse than no control.
          */}
        {state !== 'closed' && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--gw-border)' }}>
            <button
              onClick={() => correct.mutate()}
              disabled={correct.isPending}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: 'var(--gw-navy)', cursor: correct.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              {correct.isPending ? 'Opening…' : 'Something here is wrong - correct it'}
            </button>
            <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.5, marginTop: 4 }}>
              This opens a short session to correct or add to what you said. Nothing is overwritten -
              the change is shown alongside the original.
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
