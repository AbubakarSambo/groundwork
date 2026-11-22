import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Section, Button, Empty, RowList, Row, Note } from '@/components/gw/ui'
import { yourRequestsApi } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { useSuitesOnForYou } from '@/hooks/useSuitesOnForYou'
import { maySwitchSuitesOn } from '@/lib/suite-is-off'
import { ARequestRow } from './YourLeave'
import { TenAPage } from './TenAPage'

/**
 * YOUR REQUESTS (Hafsah, 21 November 2026: "spending requests and anything else that is theirs"). Your own requests to spend money and
 * your own hours, each in the server's own sentence: GET /suites/spend/mine and /suites/time/mine, the same calls and caches as your
 * Suites page (#/suite/mine), which is the full place for them. Nobody else's request or hours are on it. A suite that is off for a
 * member leaves no trace, as on the Suites page; an admin is told it is off.
 */
type AnItem = { key: string; node: ReactElement }

export function YourRequests() {
  const user = useAuthStore(s => s.user)
  const suitesOn = useSuitesOnForYou()
  const spending = useQuery({ queryKey: ['your-spending'], queryFn: yourRequestsApi.spending, enabled: !!user && suitesOn.spending, retry: false })
  const hours = useQuery({ queryKey: ['your-hours'], queryFn: yourRequestsApi.hours, enabled: !!user && suitesOn.hours, retry: false })
  if (!suitesOn.known) return null
  if (!suitesOn.spending && !suitesOn.hours) {
    if (!maySwitchSuitesOn(user?.role)) return null
    return (
      <Section heading="Your requests">
        <Empty>Spending and time sheets are not switched on. You can switch them on under <Link to="/settings/suites">Suites</Link>.</Empty>
      </Section>
    )
  }
  const items: AnItem[] = [
    ...(spending.data?.requests ?? []).map(r => ({ key: `spend-${r.id}`, node: <ARequestRow key={`spend-${r.id}`} r={r} /> })),
    ...(hours.data?.weeks ?? []).map(w => ({
      key: `hours-${w.weekOf}`,
      node: (
        <Row key={`hours-${w.weekOf}`} columns="minmax(0, 1fr)">
          <b>{w.where}</b>
        </Row>
      ),
    })),
  ]
  const loading = (suitesOn.spending && spending.isLoading) || (suitesOn.hours && hours.isLoading)
  const failed = spending.isError || hours.isError
  return (
    <Section
      heading="Your requests"
      action={suitesOn.spending ? <Button kind="secondary" size="small" to="/suite/spend/new">Ask to spend money</Button> : undefined}
    >
      {hours.data?.standing && <p className="gwui-panel-text">{hours.data.standing}</p>}
      {failed && <Note tone="error">Some of your requests did not load. Open your Suites page to see them.</Note>}
      {!loading && items.length === 0 && !failed && (
        <Empty>{[suitesOn.spending && 'You have not asked to spend anything.', suitesOn.hours && 'You have not given any hours yet.'].filter(Boolean).join(' ')}</Empty>
      )}
      {items.length > 0 && (
        <TenAPage items={items} label="your requests">
          {shown => <RowList label="Your requests">{shown.map(i => i.node)}</RowList>}
        </TenAPage>
      )}
      <p className="gwui-panel-text"><Link className="gwui-plain-link" to="/suite/mine">Open your Suites page for everything you have asked for</Link></p>
    </Section>
  )
}
