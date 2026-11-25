import { whereYourReportLives } from '@/pages/grounds/ground-tabs'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { groundsApi } from '@/api/grounds'
import { documentsApi } from '@/api/documents'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { PageTitle } from '@/components/gw/ui/PageTitle'
import { Section } from '@/components/gw/ui/Section'
import { Panel } from '@/components/gw/ui/Panel'
import { Tag } from '@/components/gw/ui/Tag'
import { Button } from '@/components/gw/ui/Button'
import { WhatYouAreCarryingForward } from '../WhatYouAreCarryingForward'
import { WhatYourRecordCanSupport } from '../WhatYourRecordCanSupport'
import { MyRecord } from '../MyRecord'
import { PatternPanel, EdgeList, EdgeRow } from '@/components/gw/ui'
import { AttachAFile } from '../AttachAFile'
import type { ServedPattern } from '@/api/patterns'
import { MyCheckInSessions } from '../MyCheckInSessions'
import { WhatToWalkInWith } from '../WhatToWalkInWith'
import { DeliveredPanel } from '../DeliveredPanel'
import { WhatSuccessLooksLikeFor } from '../WhatSuccessLooksLike'
import type { MyWorkPart } from '@/pages/grounds/MyWorkPage'

/**
 * "YOUR WORK" (B3, docs/prototype/screens/B3-the-check-in/my-record.jpg/.txt).
 *
 * REVIEW ROUND 3, ITEM 5's FULL REBUILD: no sub-tabs ("Report" / "What I shared" folded into one
 * flat page, the prototype's own shape), the sections in the prototype's order, each drawn only
 * when the server has sent something for it to show.
 *
 * WHAT IS NOT DRAWN, AND WHY.
 * - "Your open deals" is not served anywhere today (no per-deal stage-ladder data reaches the
 *   client outside a scenario's own report synthesis) - left out rather than invented. Flagged to
 *   the engine workspace is a future step, not this one.
 * - "Something that keeps coming up" draws only when `myRecord.patterns` holds something (my-record
 *   .txt: the pattern's own sentence, how often, who else sees it, and "Say what's behind it" -
 *   see api/src/modules/patterns/who-reads-a-pattern.ts, `AServedPattern`). `getMyRecord` serves
 *   only this reader's own patterns, never a colleague's; `.filter(p => p.yours)` below is this
 *   page's own check on top of that, not instead of it. Nothing draws while patterns are off.
 * - The stats tiles show only what a check-in of ANY scenario can support: check-ins answered of
 *   those opened, and commitments kept this month (once `settledAt` exists on a commitment - added
 *   to the server's select in this same round). The prototype's "4 sales, 3 paid" is a sales-only
 *   figure with no general equivalent served; left out.
 *
 * WHAT STAYS BEYOND THE PROTOTYPE'S OWN LIST, AND WHY. `WhatYouAreCarryingForward` (the one-line
 * summary the next session opens from, and the Share control that puts it in front of the others),
 * `WhatYourRecordCanSupport` (how checkable this reader's own account has been), and `MyRecord`'s own panels
 * (the resolution control near the end of a check-in, the "insights locked" empty state) are real,
 * served, previously-reviewed features with nowhere else to live - the prototype's own mock is one
 * scenario's screenshot, not an exhaustive list of everything this product may honestly show. Left
 * in, not dropped, per "nothing valuable is lost".
 *
 * FOR THE LEAD: "Every session" - the whole check-in's own list, with who has answered, the
 * release controls and the board link - stays exactly as it was (still the same `report` tab's own
 * code, in both pages), reached from a quiet link at the foot of this page rather than a visible
 * sub-tab, since it is a different reader's job (running the check-in) from everything above it
 * (this reader's own work).
 */

/** Two states, the prototype's own marks (my-record.txt: "✓ Send Green Mart the quote…", "○ Book a
    follow-up…") - not the four marks (proven/confirmed/said/memory) `Mark` draws elsewhere, which
    describe how a RECORD LINE is known; a commitment carries only whether it was kept, which is a
    plain done/not-done fact a person states themselves. */
function CommitmentMark({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 15, height: 15, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, marginTop: 2,
        background: done ? 'var(--gw-green-bg)' : 'white',
        color: done ? 'var(--gw-green-t)' : 'var(--gw-sub-d)',
        border: '1px solid ' + (done ? 'var(--gw-green-b)' : 'var(--gw-border)'),
      }}
    >
      {done ? '✓' : ''}
    </span>
  )
}

/**
 * "CORRECTIONS YOU'VE MADE." Reuses `myTranscript` (the same query `MyCheckInSessions` already
 * makes, same cache key) rather than a second endpoint - a correction is a session like any other,
 * marked `isSelfCorrection`, and that is already on the wire. Not served: the actual before/after
 * values the prototype's row shows ("Buying in December to Buying in January") - flagged, not
 * invented; "Details" opens the correction's own conversation instead, which is the true record of
 * what changed.
 */
function CorrectionsYouHaveMade({ groundId }: { groundId: string }) {
  const { data } = useQuery({
    queryKey: ['my-transcript', groundId],
    queryFn: () => groundsApi.myTranscript(groundId),
  })
  const corrections = (data?.sessions ?? []).filter(s => s.isSelfCorrection)
  if (corrections.length === 0) return null
  return (
    <Section heading="Corrections you’ve made" note="Both versions are kept">
      <Panel pad={false}>
        {corrections.map((c, i) => (
          <div key={c.checkInId} style={{ padding: '11px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--gw-border)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span className="gwui-panel-text">
              Check-in {c.correctionOf ?? c.sessionNumber}. Corrected on {whenItWas(c.date, 'full')}.
            </span>
            <Link to={`/checkin/${c.checkInId}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', textDecoration: 'underline' }}>Details</Link>
          </div>
        ))}
      </Panel>
    </Section>
  )
}

export interface YourWorkProps {
  groundId: string
  ground: any
  myRecord: any
  mySoloReport?: { report: Record<string, unknown> | null; shared: boolean }
  refetchSoloReport: () => void
  specificity: any
  report: any
  totalSessions: number | null
  completedCount: number
  /** This reader's own finished sessions, newest first. */
  myFinishedSessions: any[]
  /** One dot per session, done and still to come, exactly as `WhatYourRecordCanSupport` already
      reads it - passed straight through rather than rebuilt here, so the corrected/todo states and
      each session's checkable score are not lost. */
  sessionDots: { sessionNumber: number; state: 'done' | 'corrected' | 'todo'; checkable: number | null }[]
  /** This reader's own participant row, for their expectations (`objective.all`) - deliveries are
      filed against one of them, or against nothing ("something nobody asked for"). */
  myParticipant: any
  /**
   * THE READER'S OWN REAL NAME, AS THE SERVER NAMES THEM ELSEWHERE ON THE SAME REPORT.
   *
   * `WhatSuccessLooksLikeFor` reads each row's `who` and says "You" only where it equals this -
   * never a literal "You" (group 3's review, batch A fault 6: that comparison can never succeed
   * against a real name, so it always fell through to the name itself). BoardPage already passes
   * its own equivalent (`myName`); null is a plain "no name known yet", never guessed.
   */
  myName?: string | null
  /** Read from the participant's own name where the report has one - "Wairimu" beside "You". */
  leadFirstName?: string | null
  otherParties: { id: string; name: string; email?: string | null }[]
  postReportGuide?: unknown
  /** Whether THIS check-in has a team report at all - a solo check-in never will. */
  aTeamReportComes: boolean
  /** For the lead: opens the existing "Every session" view (unchanged; still the `report` tab's
      own code in the calling page) - a link, not a visible sub-tab. */
  onSeeEverySession?: () => void
  /**
   * FOR THE LEAD: WHO IS IN IT, AND WHO HAS ANSWERED - the roster (GroundAdminPage.tsx's own
   * `checkins` tab: Remind, the per-session grid, expectation state), a genuinely different job
   * from reading your own work, and not one of the prototype's own "Your work" sections, but real,
   * served, previously-reviewed functionality with nowhere else to live once the sub-tab it sat
   * behind is gone - kept reachable per "nothing valuable is lost", the same way as "Every
   * session".
   */
  onSeeRoster?: () => void
  /**
   * FOR A PARTY: "the team's" Read opens the fuller shared-report reading experience
   * (`SharedReportForAParty` - where the accounts agree and differ, not only the session-by-session
   * list a plain link to `/grounds/:id/session/:n` would show) when the calling page has one, in
   * place of the plain route link. GroundParticipantPage.tsx passes this; GroundAdminPage.tsx does
   * not (its own `report` tab is the lead's release tools, not this reading view), so a lead using
   * this page still gets the plain per-session link.
   */
  onReadTeamReport?: () => void
  /**
   * RELEASE 1B (pull request 3 of 3): THE REST OF TODAY'S PAGE, UNDER THE NEW MY WORK. Where the organisation's switch is on,
   * MyWorkPage.tsx draws the person's name and numbers, To do (what you said you'd do), and Your reports, so this draws
   * everything else today's page holds, by the same code: what keeps coming up (with its answer box), what you are carrying
   * forward, how checkable your record is, your record, your check-ins, what success looks like, what you delivered,
   * corrections, what to walk in with, and the lead's two links. Left out, the page is exactly as before.
   */
  asTheRestOfMyWork?: boolean
  /**
   * WHICH PART OF THE REST, ON THE B7 PAGE (the design system, journey 4, 23 November 2026). MyWorkPage.tsx draws each part where it
   * belongs: what you say you delivered and your files under What you achieved, what success looks like with the targets, what keeps
   * coming up under Coaching, what you are carrying forward with your report once you open it, your sessions
   * inside the Your check-ins card, and how much your record can support, corrections and the sign-off under the two cards.
   * Left out, or 'all', the whole rest is drawn in its old order (My work's switch off).
   */
  part?: MyWorkPart | 'all'
}

export function YourWork({
  groundId, ground, myRecord, mySoloReport, refetchSoloReport, specificity, report,
  totalSessions, completedCount, myFinishedSessions, sessionDots, myParticipant, myName, leadFirstName,
  otherParties, postReportGuide, aTeamReportComes, onSeeEverySession, onReadTeamReport, onSeeRoster, asTheRestOfMyWork, part = 'all',
}: YourWorkProps) {
  const myCommitments = ((ground?.commitments ?? []) as any[]).filter((c) => c.participantId === myParticipant?.id)
  /* Their own files, the WhatsApp photos and pins included, from the same list and cache the Context tab reads. */
  const { data: docsOnTheCheckIn } = useQuery({
    queryKey: ['docs', groundId],
    queryFn: () => documentsApi.list(groundId),
    enabled: !!myParticipant?.id,
    retry: false,
  })
  const myFiles = ((docsOnTheCheckIn ?? []) as any[]).filter((d) => d.participantId === myParticipant?.id || d.mine === true)

  /* What happened to what they said they would do, as the server says it from the one count (plan round 32: "0/2 promises kept this
     month" was a score on a person, counted here from the commitments on its own). */
  const whatHappenedToThePromises: string | null = (myRecord as any)?.promises ?? null

  const patterns = (((myRecord as any)?.insightsLocked ? [] : ((myRecord as any)?.patterns ?? [])) as ServedPattern[])
    .filter((p) => p.yours !== false)

  /* THE PROTOTYPE'S OWN SHAPE (my-record.jpg): "Your work" (the stat tiles, and any deals) sits in
     a left column, with "Something that keeps coming up", "What you said you'd do" and "Your
     reports" beside it in a right column - not stacked the full height of the page underneath one
     another. `auto-fit, minmax(320px, 1fr)` matches the grid already used for this kind of
     side-by-side pair elsewhere (BoardPage's own card rows): two columns wherever both have
     something to show, one full-width column when only one side does, and a single stacked column
     once the page is too narrow for 320px twice - the same rule this page already follows for
     its own responsive rows, not a new one invented for this fix. */
  const rest = !!asTheRestOfMyWork
  const show = (p: MyWorkPart) => part === 'all' || part === p
  const managing = !!myParticipant?.managingOnly
  /* Every part of the rest, drawn by the one piece of code, whichever page it lands on. */
  const theRest = (
    <>
        {show('achieved') && myParticipant && !managing && (
          <DeliveredPanel
            groundId={groundId}
            expectations={((myParticipant as any)?.objective?.all ?? []).map((o: any) => ({ id: o.id, text: o.text }))}
          />
        )}
        {/* YOUR FILES, AND ATTACHING ONE (Hafsah, 24 November 2026): all that was kept of the "You" card, whose other parts said
            "Nothing on record", "Nothing outstanding" and "Nothing yet". With no files, only "Attach something" is drawn. */}
        {show('achieved') && myParticipant && (
          <Section heading="Your files" action={<AttachAFile groundId={groundId} contextEnabled={ground?.contextEnabled === true} label="Attach something" />}>
            {myFiles.length > 0 && (
              <EdgeList label="Your files">
                {myFiles.map((f) => (
                  <EdgeRow
                    key={f.id}
                    reason={null}
                    title={f.fileName ?? f.name}
                    detail={f.visibility === 'OPEN'
                      ? 'Everyone in this check-in can read it.'
                      : f.visibility === 'CLOSED' ? 'Whoever runs this check-in can read it.' : 'Only you can read it.'}
                  />
                ))}
              </EdgeList>
            )}
          </Section>
        )}
        {/* Drawn only once somebody has said what success looks like (the board's rule): an empty section is not drawn. */}
        {show('expected') && leadFirstName && <WhatSuccessLooksLikeFor groundId={groundId} yourName={myName} asASection />}
        {show('coaching') && patterns.length > 0 && (
          <Section heading="Something that keeps coming up">
            {patterns.map((p) => <PatternPanel key={p.id} pattern={p} invalidateKey={['my-record', groundId]} leadFirstName={leadFirstName} />)}
          </Section>
        )}
        {/* B-080: she never checks in, so there is no record of her own to carry forward. */}
        {show('report') && !managing && (
          <WhatYouAreCarryingForward groundId={groundId} mySoloReport={mySoloReport} refetchSoloReport={refetchSoloReport} otherParties={otherParties} />
        )}
        {show('report') && postReportGuide != null && <WhatToWalkInWith guide={postReportGuide as any} />}
        {show('check-ins') && (part === 'all' ? <Section heading="Your check-ins"><MyCheckInSessions groundId={groundId} /></Section> : <MyCheckInSessions groundId={groundId} />)}
        {show('after-check-ins') && (
          <WhatYourRecordCanSupport
            strength={(myRecord as any)?.insightsLocked ? null : (myRecord as any)?.confidence}
            trend={specificity?.trend}
            sessions={sessionDots}
            totalSessions={totalSessions}
            coverage={{
              iHaveCheckedIn: completedCount > 0,
              answered: completedCount,
              parties: aTeamReportComes ? null : 1,
              waitingOn: [],
              corroborated: (report as any)?.engagement?.whatCouldBeChecked ?? null,
              documentBackedPct: (report as any)?.engagement?.documentBackedPct ?? null,
              filesAttached: myFiles.length,
              roundsFinished: completedCount,
            }}
            alsoNoticed={[]}
          />
        )}
        {show('after-check-ins') && <CorrectionsYouHaveMade groundId={groundId} />}
        {show('after-check-ins') && <MyRecord groundId={groundId} ground={ground} totalSessions={totalSessions} completedCount={completedCount} />}
    </>
  )
  if (rest) return theRest
  const sideColumn = (patterns.length > 0 || myCommitments.length > 0 || myFinishedSessions.length > 0) && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {patterns.length > 0 && (
        <Section heading="Something that keeps coming up">
          {patterns.map((p) => (
            <div key={p.id} style={{ marginBottom: 8 }}>
              <PatternPanel pattern={p} invalidateKey={['my-record', groundId]} leadFirstName={leadFirstName} />
            </div>
          ))}
        </Section>
      )}

      {myCommitments.length > 0 && (
        <Section heading="What you said you’d do">
          <Panel pad={false}>
            {/*
              RE-REVIEW BUG: THE TIMING WAS ADDED EVEN WHEN THE LINE ALREADY SAID IT.
              "…on Wednesday 30 September to show them the fridges (on Wednesday 30 September)"
              repeated the same date twice because `c.whenSaid` was always appended in brackets,
              whatever `c.text` already contained. Now it is added only when the line does not
              already say it, and it reads as its own capitalised sentence rather than a bracket -
              "send them the price list (the same day)" becomes "Send them the price list. The
              same day."
            */}
            {myCommitments.map((c, i) => {
              const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
              const text = capitalize(c.text)
              const alreadySaysWhen = !!c.whenSaid && text.toLowerCase().includes(c.whenSaid.toLowerCase())
              return (
                <div key={c.id} style={{ padding: '11px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--gw-border)', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <CommitmentMark done={c.status === 'DONE'} />
                  <span className="gwui-panel-text">
                    {text}
                    {c.whenSaid && !alreadySaysWhen && (
                      <span style={{ display: 'block', color: 'var(--gw-sub)', marginTop: 2 }}>{capitalize(c.whenSaid)}.</span>
                    )}
                  </span>
                </div>
              )
            })}
          </Panel>
        </Section>
      )}

      {myFinishedSessions.length > 0 && (
        <Section heading="Your reports">
          <Panel pad={false}>
            {myFinishedSessions.slice(0, 5).map((s, i) => {
              const teamReleased = !!(ground as any)?.report?.releasedAt
              return (
                <div key={s.id} style={{ padding: '11px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--gw-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span className="gwui-panel-text">Check-in {s.sessionNumber}, your own</span>
                    <Link to={whereYourReportLives(groundId, s.id)} className="gwui-tap-44" style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', textDecoration: 'underline' }}>Read</Link>
                  </div>
                  {aTeamReportComes && (
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      <span className="gwui-panel-text">Check-in {s.sessionNumber}, the team’s</span>
                      {teamReleased
                        ? (onReadTeamReport
                          ? <button type="button" onClick={onReadTeamReport} className="gwui-tap-44" style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>Read</button>
                          : <Link to={`/grounds/${groundId}/session/${s.sessionNumber}`} className="gwui-tap-44" style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', textDecoration: 'underline' }}>Read</Link>)
                        : <Tag tone="attention">Not shared yet</Tag>}
                    </div>
                  )}
                </div>
              )
            })}
          </Panel>
        </Section>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageTitle
        eyebrow={ground?.label}
        title="Your work"
        /* No subtitle: "Everything you’ve said, and what the proof shows. Only you see this page." was an explainer and a privacy
           note (Hafsah, 4 November, issue 41). Who reads it is the server's rule. */
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 20, alignItems: 'start' }}>
        <div>
          {/* THE NUMBER TILES THE SERVED DATA SUPPORTS. my-record.jpg shows a row of three; this
              check-in's own scenario decides how many of them mean anything here. */}
          {/*
            B-080: A LEAD WHO ONLY MANAGES IS NOT GIVEN A SESSION COUNT OF HER OWN (the same rule as
            "Your sessions" on People and setup, and DeliveredPanel just below). Grace runs this
            check-in and never checks in, so "0 of 4 check-ins so far" was never going to change -
            she reads what she does instead.
          */}
          {myParticipant?.managingOnly && (
            <Panel>
              <div className="gwui-panel-text-muted">You check in when you choose. Use Check in yourself any time.</div>
            </Panel>
          )}
          {!myParticipant?.managingOnly && (totalSessions != null || whatHappenedToThePromises) && (
            <Panel>
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                {totalSessions != null && (
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gw-text)' }}>{completedCount} of {totalSessions}</div>
                    {/* RE-REVIEW: "check-ins of 12" repeated the number already above it and read as
                        a clipped fragment rather than a caption. "Sessions so far" says what the
                        number is without saying it twice. "Session" is the one word for a single
                        occurrence of a check-in (B-147); "check-ins" would mean separate check-ins. */}
                    <div className="gwui-panel-text-muted">check-ins so far</div>
                  </div>
                )}
                {whatHappenedToThePromises && <p className="gwui-panel-text" style={{ margin: 0, flexBasis: '100%' }}>{whatHappenedToThePromises}</p>}
              </div>
            </Panel>
          )}
          {/* "YOUR OPEN DEALS" IS NOT SERVED - see the comment at the top of this file. Not drawn. */}
        </div>

        {sideColumn}
      </div>

      {theRest}

      {/* FOR THE LEAD: "EVERY SESSION" AND THE ROSTER STAY REACHABLE, AS QUIET LINKS - not a
          visible sub-tab, since running the whole check-in is a different job from reading your
          own work. */}
      {(onSeeEverySession || onSeeRoster) && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {onSeeEverySession && <Button kind="quiet" size="small" onClick={onSeeEverySession}>Every check-in</Button>}
          {onSeeRoster && <Button kind="quiet" size="small" onClick={onSeeRoster}>Who has answered</Button>}
        </div>
      )}
    </div>
  )
}
