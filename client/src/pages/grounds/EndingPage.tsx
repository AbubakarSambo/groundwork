import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { boardApi } from '@/api/board'
import { ResolutionPanel } from '@/components/gw/ResolutionPanel'
import { SuggestionsForTheLead } from '@/components/gw/Suggestions'
import { TheEndOfMonthRead } from '@/components/gw/TheEndOfMonthRead'
import type { TheContinueOption } from '@/api/anchorShapes'

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
   * "Request 147", `TheEndOfMonthRead`). The same board call the board page itself makes - the
   * field is not served yet, so `theEndOfMonthRead` is undefined on every board today, and the
   * component below draws nothing until the engine sends it. Lead only (`canEditFrame`), and only
   * for an anchor Ground (`anchorScenarioOn`): a board that is neither sends nothing here either.
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
   * THE FOUR CONTINUE OPTIONS GO TO THE EXISTING PLAN CHOICE, STRIPE TEST MODE ONLY (decision 96,
   * item 4: "build the four options to the existing plan choice ... Piece 33 is not blocked from
   * being built, only from being turned on"). Every option opens the same billing page today -
   * there is no separate route yet for "Start recommended Grounds" or "Turn on relevant suites".
   */
  function onContinue(_option: TheContinueOption) {
    navigate('/billing')
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
      {!!id && <SuggestionsForTheLead groundId={id} where="ending" />}
      {!!id && <ResolutionPanel groundId={id} />}
    </div>
  )
}
