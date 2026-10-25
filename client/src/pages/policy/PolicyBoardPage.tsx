import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { policyApi } from '@/api/policy'
import { Page, PageTitle, Section, Note, EdgeList, EdgeRow } from '@/components/gw/ui'
import { useAuthStore } from '@/stores/auth'
import { NotFoundPage } from '@/pages/notfound/NotFoundPage'

/**
 * THE POLICY BOARD (Release 9; the Check-in Reports file's "The policy board"). Every rule the organisation runs on, by area, each with
 * where it came from, who may make an exception, what it applies to and whether it changed; then what is not applied until somebody
 * decides. Everyone in the organisation reads it. An admin sets it up from documents.
 */
export function PolicyBoardPage() {
  const q = useQuery({ queryKey: ['policy'], queryFn: policyApi.board, retry: false })
  const org = (useAuthStore((s) => s.user) as any)?.organization?.name ?? ''
  const eyebrow = org ? `${org}, the organisation’s context` : 'The organisation’s context'
  if (q.isLoading) return <Page><PageTitle eyebrow={eyebrow} title="The policy board" /><Note>Loading the policy board.</Note></Page>
  /* Off for this organisation: the page is not there, and nothing says a switch exists (switches are Groundwork's own, 25 October). */
  if (!q.data?.on || !q.data.board) return <NotFoundPage />
  const b = q.data.board
  return (
    <Page>
      <PageTitle eyebrow={eyebrow} title={b.title} subtitle={b.intro} />
      {q.data.mayChange && <Link to="/policies/setup" className="gw-link t-small gw-start">Set up from your documents</Link>}
      {b.empty && <Note>{b.empty}</Note>}
      {b.areas.map((a) => (
        <Section key={a.area} heading={a.heading}>
          <EdgeList label={a.heading}>
            {a.rules.map((r) => <EdgeRow key={r.id} kind="ready" reason={null} title={r.says} detail={r.facts} />)}
          </EdgeList>
        </Section>
      ))}
      {b.undecided.length > 0 && (
        <Section heading="Not applied until you decide">
          <EdgeList label="Not applied until you decide">
            {b.undecided.map((u) => <EdgeRow key={u.title} kind="concern" reason="Waiting on a decision." title={u.title} detail={u.says} actions={q.data!.mayChange ? <Link to="/policies/setup" className="gw-link">Decide</Link> : undefined} />)}
          </EdgeList>
        </Section>
      )}
    </Page>
  )
}
