import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { boardApi } from '@/api/board'
import { resolutionApi } from '@/api/resolution'
import { ResolutionPanel } from '@/components/gw/ResolutionPanel'
import { SuggestionsForTheLead } from '@/components/gw/Suggestions'
import { TheEndOfMonthRead } from '@/components/gw/TheEndOfMonthRead'
import type { TheContinueOption } from '@/api/anchorShapes'
import { hasEnded } from '@/lib/a-ground-that-has-ended'
import { Panel, Note, Button as UIButton, Stack } from '@/components/gw/ui'

/**
 * HOW DOES THIS END? (U.11, B6, ending-and-probation-review.txt, #/c/kwame/end)
 *
 * The page the lead reaches from "Decide how it ends" on the board. It holds the ending panel whole:
 * the outcomes, "Why, in a sentence or two", and what the other person reads now. Who may choose
 * is the server's answer, not this page's: anyone else who opens it reads the outcomes and who
 * decides, and somebody the server refuses reads nothing.
 *
 * Groundwork's suggestion about how it ends ("Groundwork suggests keeping Kwame on"), with why, what
 * would change it and the person's own answer, is drawn for the lead when the engine has made one
 * (C3, U.13; request 15). Not built here, because only the engine can write them (request 13): the
 * probation review's parts (week by week, why things went wrong and what went well, what colleagues
 * saw, the support given, and questions to help decide).
 */
export default function EndingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: ground } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
    retry: false,
  })

  /**
   * PIECE 33: THE END-OF-MONTH READ (plan section 5, row 13; docs/answers-from-engine.md,
   * "Request 149 (6 of 6)", `TheEndOfMonthRead`). The same board call the board page itself makes.
   * Served only once the month has run and the lead has her own first words to begin with; before
   * that the key is absent and the component below draws nothing. Lead only (`canEditFrame`), and
   * only for an anchor Ground (`anchorScenarioOn`): a board that is neither sends nothing here
   * either.
   */
  const { data: board } = useQuery({
    queryKey: ['board', id],
    queryFn: () => boardApi.get(id!),
    enabled: !!id,
    retry: false,
  })
  const monthReadForTheLead = board && board.renders && (board as any).canEditFrame && (board as any).anchorScenarioOn
    ? (board as any).theEndOfMonthRead
    : undefined

  /**
   * FAULT 3 (live walk, 6 October 2026): A CLOSED CHECK-IN WAS STILL OFFERED "SAVE THE OUTCOME AND
   * END IT". `ResolutionPanel` (rendered unconditionally below) only knows a check-in has ended once
   * somebody has actually proposed and confirmed an outcome through its own flow (`resolution.
   * closedAt`); the anchor's month ends on its own clock, with no such proposal ever made, so the
   * panel still showed its "How does this end?" form and the primary "Save the outcome and end it"
   * button - offering to end something already over. The ground's own status is read the same way
   * `BoardPage.tsx` reads it (`hasEnded`, `lib/a-ground-that-has-ended.ts`), from the same board
   * response this page already fetches, so this needs no new call.
   *
   * When the ground has ended, `ResolutionPanel` is still given `place="board-top"` - its own
   * read-only branch, the same one the board itself uses - so an outcome that WAS recorded through
   * the ordinary flow still reads here in full ("How this ended", the reason, the date). It draws
   * nothing when no outcome was ever recorded (the anchor's case), and this page's own plain
   * sentence fills that gap instead, with a way back to the board.
   */
  const groundClosed = hasEnded((board as any)?.groundStatus)

  /*
   * THE SAME QUERY `ResolutionPanel` MAKES, so this costs nothing extra: React Query shares one
   * cached answer for the same `['resolution', id]` key, and this page's own read of it decides
   * only whether to draw the plain fallback sentence, never what `ResolutionPanel` itself shows.
   */
  const { data: resolutionState } = useQuery({
    queryKey: ['resolution', id],
    queryFn: () => resolutionApi.get(id!),
    enabled: !!id && groundClosed,
    retry: false,
  })
  const outcomeWasRecorded = !!(resolutionState as any)?.resolution?.closedAt

  /**
   * WHERE THE FOUR CONTINUE OPTIONS GO (docs/answers-from-engine.md, "Request 149 (6 of 6)",
   * "Answer (3)"), using routes that already exist:
   *   - "Keep this Ground running" and "Continue Groundwork for the team" both open the plan
   *     choice, `/settings/billing` (Stripe test mode only, decision 96 item 4) - the same page
   *     today, honest until Hafsah says what "keep this Ground running" should do differently.
   *   - "Start recommended Grounds" opens this Ground's own board, where "Groundwork recommends"
   *     lists the offers.
   *   - "Turn on relevant suites" opens the Suites page.
   */
  function onContinue(option: TheContinueOption) {
    switch (option.key) {
      case 'keepThisGroundRunning':
      case 'continueGroundworkForTheTeam':
        navigate('/settings/billing')
        break
      case 'startRecommendedGrounds':
        navigate(`/grounds/${id}/board`)
        break
      case 'turnOnRelevantSuites':
        navigate('/settings/suites')
        break
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 60px' }}>
      <Link to={`/grounds/${id}/board`} style={{ fontSize: 12.5, color: 'var(--gw-navy)', textDecoration: 'none' }}>
        &larr; Back to the board
      </Link>
      {ground?.label && (
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '12px 0 16px' }}>{ground.label}</h1>
      )}
      {monthReadForTheLead && (
        <div style={{ marginBottom: 24 }}>
          <TheEndOfMonthRead read={monthReadForTheLead} onContinue={onContinue} />
        </div>
      )}
      {/* FAULT 3: a closed check-in with no month-in-review read gets a plain sentence that it has
          ended, never the "decide how it ends" form - see the comment on `groundClosed` above. */}
      {!monthReadForTheLead && groundClosed && !outcomeWasRecorded && !!id && (
        <Panel>
          <Stack gap={10}>
            <Note>This check-in has ended.</Note>
            <UIButton to={`/grounds/${id}/board`}>See the board</UIButton>
          </Stack>
        </Panel>
      )}
      {!groundClosed && !!id && <SuggestionsForTheLead groundId={id} where="ending" />}
      {/*
        FAULT 5 (live walk, 6 October 2026): ON A CLOSED CHECK-IN, "DECIDE HOW IT ENDS" LINKED
        BACK TO THIS SAME PAGE.
        `ResolutionPanel`'s own `board-top` branch offers that button whenever `nearTheEnd` is not
        explicitly `false` and no outcome was ever proposed through its flow - true by default,
        since this page never said otherwise. For the anchor's case above (ended by its own clock,
        `outcomeWasRecorded` false), that meant the plain "This check-in has ended." panel right
        above this one sat beside a second panel inviting the lead to decide how it ends, from the
        page where they are already deciding it. Passing `nearTheEnd={false}` once the ground has
        ended stops that offer; it has no effect on the `closed` (outcome-recorded) branch above
        it, which still reads "How this ended" in full either way.
      */}
      {!!id && <ResolutionPanel groundId={id} place={groundClosed ? 'board-top' : undefined} nearTheEnd={groundClosed ? false : undefined} />}
    </div>
  )
}
