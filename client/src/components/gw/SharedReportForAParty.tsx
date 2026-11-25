import { Link } from 'react-router-dom'
import { whereYourReportLives } from '@/pages/grounds/ground-tabs'
import { TheSharedPictureAPartyReads } from './the-shared-picture-a-party-reads'
import { howCheckable } from './how-checkable-was-that-session'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Button, Note, Section, Stack, Text } from './ui'

/**
 * THE REPORTS TAB, AS A PERSON IN THE CHECK-IN READS IT (team-report-as-participant.txt).
 *
 * The team's summary, what to settle together, and the team board. Then the reader's own finished
 * check-ins, each with its own report, and this week's report.
 *
 * PAGE AUDIT, 24 NOVEMBER, ROW 5 (approved by Hafsah). The board button held a paragraph ("The same
 * picture for everyone, built from what each person said. Never a verdict."), the report sat folded
 * under "The shared picture" with a second "The shared picture" inside it, and a sentence explained
 * the report. The button now holds its label only, and the report is open, once.
 *
 * Nothing here decides who may read what. The server strips everything lead-only before the report
 * leaves (reports.service), and it must stay that way.
 */
export interface SharedReportForAPartyProps {
  /** The check-in's id, for the links to each of the reader's own reports. */
  groundId: string
  /** The report, or null when there is not one yet. */
  report: any
  /** The check-in, for session progress and whether it has a board. */
  ground: any
  /** Open the team board. A prop, because the route is the page's business and not this view's. */
  onOpenBoard: () => void
  /** Open the weekly report (B4, "This week"), same reasoning as `onOpenBoard`. */
  onOpenWeek: () => void
  /** Per-session specificity level, the same one the session's own meter reads (U.9 third review, item 6). */
  specificityBySession?: Record<number, string | null>
  /** Who is reading, so their own finished sessions can be listed and nobody else's. */
  viewerUserId?: string | null
}

export function SharedReportForAParty({
  groundId,
  report,
  ground,
  onOpenBoard,
  onOpenWeek,
  specificityBySession,
  viewerUserId,
}: SharedReportForAPartyProps) {
  const boardRenders = !!(ground as any)?.boardRenders

  /* The reader's own finished check-ins, newest first. Yours only: another person's session is theirs. */
  const mySessions = ((ground?.checkIns ?? []) as any[])
    .filter((c) => c.status === 'COMPLETED')
    .filter((c) => ((ground?.participants ?? []) as any[]).some((p) => p.id === c.participantId && p.userId === viewerUserId))
    .sort((a, b) => (b.sessionNumber ?? 0) - (a.sessionNumber ?? 0))

  return (
    <>
      {!report ? (
        <Note tone="muted">
          {ground?.sessionProgress?.requestingUserIsMissing
            ? 'The team’s report is not ready yet. You have not checked in yet, and your answer is part of it.'
            : ground?.sessionProgress
              ? `The team’s report is not ready yet. ${ground.sessionProgress.completed} of ${ground.sessionProgress.total} people have checked in.`
              : 'The team’s report is not ready yet.'}
        </Note>
      ) : (report as any).withheldUntilYouAnswer ? (
        /* Waiting on your own answer, not on somebody else's: reading somebody else's account first makes yours an answer to theirs. */
        <Section heading="There is a picture forming, and you have not answered yet">
          <Text size="body" as="p">{(report as any).saying}</Text>
        </Section>
      ) : report.releasedAt ? (
        <TheSharedPictureAPartyReads report={report} />
      ) : null}

      {/* The team board, for every situation that draws one: one main button, holding only its label. */}
      {boardRenders && <div><Button kind="primary" onClick={() => onOpenBoard()}>Open the team board</Button></div>}

      <Section heading="This week">
        <Button kind="quiet" onClick={() => onOpenWeek()}>What kept happening for three check-ins in a row or more</Button>
      </Section>

      {mySessions.length > 0 && (
        <Section heading="Your check-ins">
          <Stack gap={12}>
            {mySessions.map((ci: any) => {
              const checkable = howCheckable(specificityBySession?.[ci.sessionNumber])
              return (
                <div key={ci.id}>
                  <Link to={whereYourReportLives(groundId, ci.id)} className="gwui-plain-link">Your report for check-in {ci.sessionNumber}</Link>
                  <Text size="meta" as="p">
                    {[ci.completedAt ? `You checked in on ${whenItWas(ci.completedAt, 'day')}.` : 'You checked in.', checkable].filter(Boolean).join(' ')}
                  </Text>
                </div>
              )
            })}
          </Stack>
        </Section>
      )}
    </>
  )
}
