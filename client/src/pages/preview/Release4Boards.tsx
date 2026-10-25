import { useNavigate, useSearchParams } from 'react-router-dom'
import { ThePicturedBoard } from '@/pages/board/pictured/ThePicturedBoard'
import { theRelease4Order, whereItFolds } from '@/pages/board/release-4-orders'
import { Button, PageTitle } from '@/components/gw/ui'
import supportDesk from './__fixtures__/release-4-support-desk.json'
import operations from './__fixtures__/release-4-operations.json'
import engineering from './__fixtures__/release-4-engineering.json'
import salesOrg from './__fixtures__/release-4-sales-org.json'
import subscriptions from './__fixtures__/release-4-subscriptions.json'
import leadership from './__fixtures__/release-4-leadership.json'
import { useQueryClient } from '@tanstack/react-query'

/**
 * RELEASE 4'S BOARDS, DRAWN FROM EACH TYPE'S HAND-WRITTEN TEST ORGANISATION (development builds only; never in production). Each type is
 * one small "(test)" organisation written by hand in __fixtures__, served to the product's own board components exactly as the server
 * serves a board, so each can be set beside its kit picture without a model run. ?type=support-desk
 */
const TYPES: Record<string, { label: string; org: string; about: string; board: any; member?: boolean }> = {
  'support-desk': { label: 'Support desk', org: 'Kijani Helpdesk (test)', about: '6 agents in 3 queues, about 400 tickets a week. Daily check-ins on exceptions only.', board: supportDesk },
  operations: { label: 'Dispatch', org: 'Pwani Logistics (test)', about: '4 sites. Weekly check-ins, and the dispatch system every day.', board: operations },
  engineering: { label: 'Major release', org: 'Jenga Software (test)', about: '5 engineers. Daily check-ins until 30 October.', board: engineering },
  'sales-org': { label: 'Sales organisation, Q4', org: 'Baridi Sales (test)', about: '3 teams, 15 reps. Daily check-ins on weekdays.', board: salesOrg },
  leadership: { label: 'Leadership, Q4', org: 'Baridi Appliances (test)', about: 'The chief executive and three heads. Weekly check-ins. Read as Wairimu, a member.', board: leadership, member: true },
  subscriptions: { label: 'MarketView, Q4', org: 'MarketView (test)', about: 'Sales and product. Weekly check-ins, with Paystack and MarketView numbers each morning.', board: subscriptions },
}

export function Release4Boards() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const t = TYPES[params.get('type') ?? 'support-desk'] ?? TYPES['support-desk']
  const b = t.board
  /* The organisation's priorities come from its Company page; the test organisation's are written into its fixture. */
  const qc = useQueryClient()
  if (b._company) qc.setQueryData(['company'], b._company)
  return (
    <div className="main" data-release-4-preview={b.kindOfWork}>
      <PageTitle crumbs={[{ label: 'Check-ins', to: '/grounds' }, { label: t.label }]} title={t.label} subtitle={`${t.org}. ${t.about}`} />
      <ThePicturedBoard
        order={theRelease4Order(b.kindOfWork, !t.member) ?? []}
        leadFirstName={b._leadFirstName ?? null}
        foldAfter={whereItFolds(b.kindOfWork)}
        b={b}
        groundId={b.groundId}
        sessionRows={[]}
        renderActions={() => <Button kind="secondary" size="small">Open</Button>}
        overTime={null}
        recommendations={[]}
        onAnswerRecommendation={() => undefined}
        recommendationBusy={false}
        onRecordTheDecision={() => undefined}
        navigate={navigate}
      />
    </div>
  )
}
