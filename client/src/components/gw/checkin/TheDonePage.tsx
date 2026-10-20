import { isSessionShared } from '@/lib/session-rows'
import { useId } from 'react'
import { useTheDirectMorning, isTheDirectMorningOn } from '@/lib/the-direct-morning'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { theClosingAfterYourFirstCheckIn } from '@/lib/the-closing-after-your-first-check-in'
import { toast } from 'sonner'
import { StageLadder } from '@/components/gw/kit'
import { PageTitle } from '@/components/gw/ui/PageTitle'
import { Section } from '@/components/gw/ui/Section'
import { Panel } from '@/components/gw/ui/Panel'
import { Button } from '@/components/gw/ui/Button'
import { Tag } from '@/components/gw/ui/Tag'
import { FoldedLine } from '@/components/gw/ui/FoldedLine'
import { conversationApi } from '@/api/conversation'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { THE_FIVE, wasItThere } from '@/components/gw/TheFiveThingsThatMakeItCheckable'
import { WhoIsStillOut } from '@/components/gw/WhoIsStillOut'
import { whenTheNextOneOpens, theNextOpenCheckInId, whoElseAnswers } from '@/lib/what-the-end-of-a-check-in-can-say'

/**
 * THE DONE PAGE (B3, docs/prototype/screens/B3-the-check-in/done.txt).
 *
 *   Done. Thanks, Miriam.
 *   Your check-in is saved. (and when the next one opens)
 *   For tomorrow                     first: the one thing to carry, and why answering matters folded
 *                                    (the approved rename of "That’s saved"; the light prototype's s68)
 *   Two reports come from this       your own, "Only you", "Read yours"; the team's, and whether it is out
 *   What changed on your deals       their own deals that today's lines name, from the record; a photo
 *                                    is said only where one backs today's line (what-changed-on-their-deals.ts)
 *   How checkable today’s check-in was   one line that opens: the engine's five, "Only you see it."
 *
 * Every part is said only when it is true for this check-in:
 * - The team's report opens once everyone in the round has answered (reports.listener releases it
 *   then), so it says that, not the prototype's "once Wairimu shares it, usually by 7pm".
 * - "How checkable" reads this person's own check-in, which the server sends to them alone
 *   (how-checkable-is-yours-alone). The five are the engine's own five, in the product's words.
 * - "One thing for next time" is the sentence the session itself wrote (`whatToCarry`), which
 *   arrives a little after the check-in closes.
 *
 * ROUND 5, ITEM E2: rebuilt from components/gw/ui - PageTitle for the heading (the prototype's own
 * Literata 30px, not an ad-hoc h1), Section for each of the four blocks (the prototype's own 21px
 * heading, not four different sizes), Panel for the two report cards, and ui's own Button/Tag
 * (already the prototype's values - only the import path changes). `StageLadder` stays from
 * kit.tsx: there is no ui/StageLadder yet, and it is not one of the parts this task named.
 */
/**
 * Off until request 45 (docs/requests-to-engine.md) is answered: the "n of 5" count and its bar
 * are a score built from a read of the session that is known to miss real content. Flip this back
 * on once the engine workspace has looked at why.
 */
const SHOW_THE_COUNT = false

/** The two report cards - see the comment above where this is called for why the heading above
    it is conditional while this panel is not. */
function OwnAndTeamReports({ checkInId, groundId, sessionNumber, aTeamReport, teamReportReleased, onCorrect, correcting, direct = false }: {
  /** The direct morning (lib/the-direct-morning.tsx): no "Only you" tag. Who reads it is the backend's rule, the same either way. */
  direct?: boolean
  checkInId: string
  groundId: string
  sessionNumber: number
  aTeamReport: boolean
  teamReportReleased: boolean
  onCorrect: () => void
  correcting: boolean
}) {
  return (
    <Panel pad={false}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <h3 className="gwui-panel-text" style={{ fontWeight: 700 }}>Your own report</h3>
          {!direct && <Tag tone="plain">Only you</Tag>}
        </div>
        <p className="gwui-panel-text">What you said today and what it shows. Ready now.</p>
        <div style={{ marginTop: 10 }}>
          <Button kind="secondary" wide to={`/checkin/${checkInId}/report`}>Read yours</Button>
        </div>
        <button
          onClick={onCorrect}
          disabled={correcting}
          /*
           * GROUP 3, PIECE 3: marked `.gwui-plain-link` too (the inline style above still wins
           * for every property it sets, so nothing here looks different) - a quiet text link that
           * only corrects the record in place, not a second button beside "Read yours". Found by
           * the live button count once ChatPage.tsx's own completed-session state started
           * exercising this page (e2e/the-prototype-count-of-buttons.spec.ts): without the class
           * it read as an extra button the prototype's own card does not have.
           */
          className="gwui-plain-link"
          style={{ background: 'none', border: 'none', padding: 0, marginTop: 10, color: 'var(--gw-navy)', fontSize: 12.5, cursor: correcting ? 'wait' : 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
        >
          {correcting ? 'Opening…' : 'Something here isn’t right'}
        </button>
      </div>
      {aTeamReport && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--gw-border)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <h3 className="gwui-panel-text" style={{ fontWeight: 700 }}>The team’s report</h3>
            {/* REVIEW ROUND 3, ITEM 8: A TAG EITHER WAY, LIKE "Your own report"'s "Only you" -
                this card used to say nothing at all once the report had released, so the two
                halves of one card disagreed about whether a state is worth a tag. */}
            {teamReportReleased ? <Tag tone="proven">Shared</Tag> : <Tag tone="attention">Not shared yet</Tag>}
          </div>
          {teamReportReleased ? (
            <>
              <p className="gwui-panel-text">Everyone’s check-ins together.</p>
              <div>
                <Button kind="secondary" wide to={`/grounds/${groundId}/session/${sessionNumber}`}>Read it</Button>
              </div>
            </>
          ) : (
            <p className="gwui-panel-text">Everyone’s check-ins together. You’ll get it once everyone has answered.</p>
          )}
        </div>
      )}
    </Panel>
  )
}

export interface WhatChanged {
  title?: string | null
  items: { name: string; says?: string | null; stages: { name: string; mark?: string | null }[] }[]
}

export function TheDonePage({
  firstName, checkInId, groundId, sessionNumber, myUserId, isInitiator, whatChanged,
}: {
  firstName: string | null | undefined
  checkInId: string
  groundId: string
  sessionNumber: number
  myUserId: string | null | undefined
  isInitiator: boolean
  whatChanged?: WhatChanged | null
}) {
  /* Read again now: the round may have closed with this answer, and this check-in's own read of
     how checkable it was is written as it completes. */
  const ground = useQuery({
    queryKey: ['ground', groundId, 'done'],
    queryFn: () => groundsApi.get(groundId),
    retry: false,
  })
  const mine = useQuery({
    queryKey: ['my-checkin-status', groundId, 'done'],
    queryFn: () => groundsApi.getMyCheckinStatus(groundId),
    /* The next session's row is written as this one completes; one retry covers the race. */
    retry: 2,
    retryDelay: 1500,
  })
  /* The sentence the session wrote about what to carry, which arrives about twenty seconds later. */
  const artifact = useQuery({
    queryKey: ['artifact', checkInId],
    queryFn: () => conversationApi.artifact(checkInId),
    retry: false,
    refetchInterval: (q: any) => (q.state.data?.artifact?.whatToCarry ? false : 5000),
  })

  /**
   * ROUND 6, ITEM 4: "SOMETHING HERE ISN'T RIGHT", KEPT REACHABLE FROM THE DONE PAGE.
   *
   * The old "already complete" view this page replaces had it (TheCheckInYouJustFinished.tsx's
   * own correction link); the Done page itself never did. Same call the report page, the ground
   * chat and TheCheckInYouJustFinished.tsx all make - one way to open a correction, not a second.
   */
  /* The green panel's own accessible region, the same pattern Section uses (aria-labelledby
     pointing at its own heading), since this panel is not built from Section any more - see the
     comment where it renders, below. */
  const savedHeadingId = useId()
  const navigate = useNavigate()
  const correct = useMutation({
    mutationFn: () => reportsApi.startSelfCorrection(groundId, sessionNumber),
    onSuccess: (res: { checkInId: string }) => navigate(`/checkin/${res.checkInId}`),
    onError: () => toast.error('Could not open a correction. Try again.'),
  })

  const g: any = ground.data
  /* The direct morning (lib/the-direct-morning.tsx): from the page that holds this one, or from the check-in read here. */
  const direct = useTheDirectMorning() || isTheDirectMorningOn(g)
  const leadName = direct ? null : whoElseAnswers(g)
  const next = whenTheNextOneOpens(mine.data?.checkIns, checkInId, new Date(), mine.data)
  /*
   * RE-REVIEW: "YOUR NEXT CHECK-IN IS OPEN NOW." NEEDS A DOOR TO WALK THROUGH.
   * This showed with no link at all - and, before `whenTheNextOneOpens` learned to treat an
   * IN_PROGRESS session as open whatever its availableFrom says, could even say "opens on
   * Sunday" about a session already running. Both are fixed together: the sentence and the
   * link agree on the same rule, in what-the-end-of-a-check-in-can-say.ts.
   */
  const nextOpenId = theNextOpenCheckInId(mine.data?.checkIns, checkInId)
  /*
   * A PLAIN YES/NO FROM THE SERVER, NOT A COUNT OF `g.participants` (U.8 fifth review). That array
   * is reduced to this reader's own row alone on a check-in that hides peers from each other, so
   * counting it always read as a check-in of one there - "Two reports come from this" and the
   * team's report card silently vanished for exactly the readers a hidden check-in has more than
   * one of. `aTeamReportComes` is read off the raw participants before that filter runs.
   */
  const aTeamReport = !!g?.aTeamReportComes
  /*
   * WHETHER THE TEAM'S REPORT IS ACTUALLY OUT, NOT WHETHER THE ROUND HAS CLOSED (U.8, edge case
   * caught before ticking). `roundCompletions` records that everyone who was on this round AT THE
   * TIME IT CLOSED had answered - the round can close and be recorded before the lead adds more
   * people, so a lead who finished session 1 alone and then grew the team had session 1 sitting in
   * `roundCompletions` for ever, and this offered "Read it" on a team report that
   * `GET /grounds/:id/report` still answers `{ forming: true, releasedAt: null }` for. The one fact
   * that decides whether there is something to read is whether it has released, which the ground
   * already carries on `report.releasedAt` - the same field the report endpoint itself is built
   * from, so this cannot disagree with it.
   */
  const carry: string | null = artifact.data?.artifact?.whatToCarry ?? null
  const thisOne = ((g?.checkIns ?? []) as any[]).find(c => c.id === checkInId)
  /* THIS session's team report, not any session's (confirm walk, 7 October): after session 1 was
     shared, session 2's Done page said "Shared" too. The same rule as the board's rows. */
  const teamReportReleased = isSessionShared(g?.report as { releasedAt?: string | null; releasedSessions?: number[] | null } | null | undefined, thisOne?.sessionNumber ?? 1)
  const dims: Record<string, string> | null = thisOne?.specificityDimensions ?? null
  const five = dims && Object.keys(dims).length > 0 ? THE_FIVE.map(f => ({ ...f, there: wasItThere(dims[f.key]) })) : null
  const changed = (whatChanged?.items ?? []).filter(i => i?.name && Array.isArray(i.stages))

  return (
    <div style={{ maxWidth: 440, margin: '0 auto', padding: '28px 16px 40px', display: 'grid', gap: 24 }}>
      <PageTitle
        title={firstName ? `Done. Thanks, ${firstName}.` : 'Done. Thank you.'}
        subtitle={`Your check-in is saved.${next ? ` ${next}` : ''}`}
      />
      {nextOpenId && (
        <p style={{ margin: '-16px 0 0', fontSize: 13.5 }}>
          <Link to={`/checkin/${nextOpenId}`} style={{ color: 'var(--gw-navy)', fontWeight: 700, textDecoration: 'underline' }}>
            Go to it
          </Link>
        </p>
      )}

      {/* DECISION 133: the lead's FIRST check-in ends on one closing message, built from the
          check-in's real schedule. Never on a later check-in, and never for a participant. */}
      {isInitiator && sessionNumber === 1 && g && (() => {
        const c = theClosingAfterYourFirstCheckIn(g)
        return (
          <p data-testid="the-leads-first-closing" style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
            {c.before}
            <Link to={`/grounds/${groundId}?tab=settings`} style={{ color: 'var(--gw-navy)', fontWeight: 700, textDecoration: 'underline' }}>{c.link}</Link>
            {c.after}
          </p>
        )
      })()}

      {/*
        FOR TOMORROW, FIRST (sales-first.md, section 5; the light prototype's s68). The approved rename of
        "That’s saved". The one thing to carry comes first, as a plain sentence, and why answering matters
        folds behind one line. The soft green panel stays (review round 3, item 8), with its heading inside.
      */}
      {(leadName || carry) && (
        <section aria-labelledby={savedHeadingId} className="gwui-done-tomorrow">
          <h2 id={savedHeadingId} className="gwui-done-tomorrow-heading">For tomorrow</h2>
          {carry && <p className="gwui-panel-text">{carry}</p>}
          {leadName && (
            <FoldedLine name="Why answering matters">
              <p className="gwui-panel-text">{leadName} also answers a check-in. The report puts the answers side by side. It does not decide who is right.</p>
            </FoldedLine>
          )}
        </section>
      )}

      {/**
        * THE HEADING IS THE TEAM'S NEWS, NOT A LABEL ON A LONE CARD.
        *
        * "Two reports come from this" is only true when there are two - a check-in of one still
        * gets "Your own report", with no heading claiming a second report that does not exist.
        * `Section` always draws a heading, so the solo case renders the same panel without it,
        * rather than the component inventing an empty one.
        */}
      {aTeamReport ? (
        <Section heading="Two reports come from this">
          <OwnAndTeamReports direct={direct} checkInId={checkInId} groundId={groundId} sessionNumber={sessionNumber} aTeamReport teamReportReleased={teamReportReleased} onCorrect={() => correct.mutate()} correcting={correct.isPending} />
        </Section>
      ) : (
        <OwnAndTeamReports direct={direct} checkInId={checkInId} groundId={groundId} sessionNumber={sessionNumber} aTeamReport={false} teamReportReleased={teamReportReleased} onCorrect={() => correct.mutate()} correcting={correct.isPending} />
      )}

      {changed.length > 0 && (
        <Section heading={whatChanged?.title?.trim() || 'What changed'}>
          <div className="gwui-done-changed" style={{ display: 'grid', gap: 14 }}>
            {changed.map((c, i) => (
              <div key={c.name + i}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <span className="gwui-panel-text" style={{ fontWeight: 700 }}>{c.name}</span>
                  {c.says && <span className="gwui-panel-text-muted">{c.says}</span>}
                </div>
                <StageLadder stages={c.stages} label={c.name} says={(c as any).stagesSays ?? undefined} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* How checkable today's check-in was, as one line that opens (the light prototype's s68). */}
      {five && (
        <FoldedLine name="How checkable today’s check-in was">
          {/*
            THE COUNT AND THE BAR ARE GONE, ON PURPOSE, NOT ONLY VISUALLY.

            "1 of 5" and a progress bar are a score, and request 45 to the engine workspace asks why
            the read itself misses real things a person said - a real check-in with dates, a number,
            a document and a named person waited on still came back "missing" on two dimensions. A
            score built on a read that is known to undercount is not honest to show, so it stays out
            until request 45 is answered. `SHOW_THE_COUNT` is the one line to flip back on; nothing
            else about this section depends on it.
          */}
          {SHOW_THE_COUNT && (
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span />
              <span className="gwui-panel-text">{five.filter(f => f.there).length} of 5</span>
            </div>
          )}
          {!direct && (
            <p className="gwui-panel-text">
              Groundwork looked for these five things. It may have missed some of what you said.
            </p>
          )}
          <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 6 }}>
            {/*
              REVIEW ROUND 3, ITEM 8: THE PROTOTYPE'S SHORT ITEMS - ONE LINE EACH, WITH THE TICK
              OR RING (done.txt: "✓ Who The customer, by name" / "○ Proof A photo, a quote or a
              message"). The trailing "Groundwork found this."/"Groundwork did not pick this up
              this time." made each row two sentences instead of one short line.
              THE ACCESSIBILITY FIX THAT SENTENCE EXISTED FOR STAYS, moved to an sr-only span:
              without it the only thing telling found from missing is a filled ring's colour,
              which is exactly the bug fixed before ("the only visible difference between found
              and missing was a filled or empty circle"). A screen reader still hears the
              difference; a sighted reader now sees the prototype's own short line.
            */}
            {five.map(f => (
              <li key={f.key} style={{ display: 'flex', gap: 8, fontSize: 13.5, lineHeight: 1.45, color: f.there ? 'var(--gw-text)' : 'var(--gw-sub)' }}>
                <span aria-hidden style={{ width: 14, flexShrink: 0, color: f.there ? 'var(--gw-green-t)' : 'var(--gw-sub-d)', fontWeight: 700 }}>{f.there ? '✓' : '○'}</span>
                <span>
                  {f.there ? f.met : f.missing}
                  <span className="gwui-sr-only"> {f.there ? 'Groundwork found this.' : 'Groundwork did not pick this up this time.'}</span>
                </span>
              </li>
            ))}
          </ul>
          {!direct && <p className="gwui-panel-text-muted" style={{ marginTop: 10 }}>This is about the check-in. Only you see it.</p>}
        </FoldedLine>
      )}

      {/* For whoever runs it: who the round is still waiting on. Kept from the old finished screen. */}
      {isInitiator && <WhoIsStillOut groundId={groundId} sessionNumber={sessionNumber} myUserId={myUserId} />}
    </div>
  )
}
