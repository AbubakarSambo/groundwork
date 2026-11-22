import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Section, Button, Empty, RowList, Row, Tag, Note } from '@/components/gw/ui'
import { yourRequestsApi, type YourRequest } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { useSuitesOnForYou } from '@/hooks/useSuitesOnForYou'
import { maySwitchSuitesOn, SuiteOffMessage } from '@/lib/suite-is-off'
import { TenAPage } from './TenAPage'

/**
 * YOUR LEAVE (Hafsah, 21 November 2026: "leave etc."). Your days left and your own requests for time off, each in the server's own
 * sentence: GET /suites/leave/mine, the same call and cache as your Suites page (#/suite/mine), which is where a question about a
 * request is answered. Nobody else's leave is on it.
 *
 * A suite that is off is said only to an admin, who can switch it on; for everybody else the section is left out, the same rule as
 * the Suites page (YourRequestsPage.tsx, screen fault 8).
 */
export const LEAVE_TAGS = { waiting: 'Waiting', approved: 'Approved', declined: 'Declined' } as const

export function aRequestsTag(r: YourRequest) {
  return <Tag tone={r.status === 'declined' ? 'concern' : r.status === 'approved' ? 'proven' : 'attention'}>{LEAVE_TAGS[r.status]}</Tag>
}

/** One request: the server's sentence, and where to answer a question that waits on you. */
export function ARequestRow({ r }: { r: YourRequest }) {
  return (
    <Row columns="minmax(0, 1fr) auto">
      <div>
        <b>{r.where}</b>
        {r.declinedBecause && <p className="gwui-panel-text">{r.declinedBecause}</p>}
        {r.questionWaiting && (
          <p className="gwui-panel-text">
            {`${r.questionWaiting.askedBy} asked you a question about this. `}
            <Link className="gwui-plain-link" to="/suite/mine">Answer it on your Suites page</Link>
          </p>
        )}
      </div>
      <span>{aRequestsTag(r)}</span>
    </Row>
  )
}

export function YourLeave() {
  const user = useAuthStore(s => s.user)
  const suitesOn = useSuitesOnForYou()
  const leave = useQuery({ queryKey: ['your-leave'], queryFn: yourRequestsApi.leave, enabled: !!user && suitesOn.leave, retry: false })
  if (!suitesOn.known) return null
  if (!suitesOn.leave) {
    if (!maySwitchSuitesOn(user?.role)) return null
    return <Section heading="Your leave"><Empty><SuiteOffMessage message="The leave suite is not switched on. An admin switches it on under Suites." role={user?.role} /></Empty></Section>
  }
  return (
    <Section heading="Your leave" action={<Button kind="secondary" size="small" to="/suite/leave/new">Request leave</Button>}>
      {leave.isError && <Note tone="error">Your leave did not load. Open your Suites page to see it.</Note>}
      {leave.data && (
        <>
          {leave.data.daysLeftSaid && <p className="gwui-panel-text">{leave.data.daysLeftSaid}</p>}
          {leave.data.requests.length === 0 ? (
            <Empty>You have not asked for any leave.</Empty>
          ) : (
            <TenAPage items={leave.data.requests} label="your leave">
              {shown => <RowList label="Your leave">{shown.map(r => <ARequestRow key={r.id} r={r} />)}</RowList>}
            </TenAPage>
          )}
        </>
      )}
    </Section>
  )
}
