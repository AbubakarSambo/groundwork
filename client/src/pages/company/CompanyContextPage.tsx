import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { companyApi, type CompanyCard, type CompanyPriority } from '@/api/company'
import { useAuthStore } from '@/stores/auth'
import { Button, Tag } from '@/components/gw/kit'

/**
 * COMPANY CONTEXT (D2 and B2, #/company/context). The wording is copied from
 * docs/prototype/screens/B2-context/company-context.txt.
 *
 * TWO READS, EACH WITH ITS OWN RULE ON THE SERVER:
 *   - GET /company: the priorities, who owns each, and, for admins only, what success looks like.
 *   - GET /org/how-we-do-it: how the company does things (organisation memory), which everybody in
 *     the organisation may read. The handbook, resources and everything else it has been told.
 *
 * NOT DRAWN HERE, ON PURPOSE (docs/morning-report-ui.md, item 26): "Waiting for your confirmation",
 * the brief in the chief executive's words, "How goals connect", principles, definitions, "Still
 * to decide" and the strategy's history. Nothing keeps them at the organisation's level yet, and
 * picking them up from a check-in is the engine's (request 17). "Change this" and "Say who owns
 * this" wait for a way to change a priority that came from the organisation's own system.
 */
export function CompanyContextPage() {
  const user = useAuthStore(s => s.user)
  const page = useQuery({ queryKey: ['company'], queryFn: companyApi.get, enabled: !!user, staleTime: 30_000, retry: false })
  const cards = useQuery({ queryKey: ['company-cards'], queryFn: companyApi.cards, enabled: !!user && user.role !== 'GUEST', staleTime: 30_000, retry: false })
  const name = page.data?.name || user?.organizationName || 'Company'
  const refused = (page.error as { response?: { status?: number; data?: { message?: string } } } | null)?.response

  const all = cards.data ?? []
  const handbook = all.filter(c => c.kind === 'HANDBOOK')
  const resources = all.filter(c => c.kind === 'RESOURCE' || c.kind === 'DOCUMENT')
  const rest = all.filter(c => !handbook.includes(c) && !resources.includes(c))
  const priorities = page.data?.priorities ?? []
  const loading = page.isLoading || cards.isLoading
  const failed = (page.isError && refused?.status !== 403) || cards.isError

  return (
    <div className="gw-you gw-company">
      <nav aria-label="Where you are" className="gw-company-crumbs">
        <Link to="/company">Company</Link> <span aria-hidden="true">/</span> <span>{name}</span>
      </nav>
      <h1 className="gw-t-title gw-company-h1">What the company is trying to do, and how it reaches every team</h1>

      {loading && <p className="gw-t-body gw-you-quiet">Loading…</p>}
      {page.isError && refused?.status === 403 && (
        <p role="alert" className="gw-t-body">{refused.data?.message ?? 'You cannot read this page.'}</p>
      )}
      {failed && (
        <div role="alert" className="gw-you-quiet">
          <p className="gw-t-body">The company context did not load.</p>
          <Button kind="secondary" size="small" onClick={() => { page.refetch(); cards.refetch() }}>Try again</Button>
        </div>
      )}

      {page.data && (
        <section className="gw-you-section" aria-labelledby="cc-pri-h">
          <h2 id="cc-pri-h" className="gw-t-h2 gw-company-h2">Priorities</h2>
          <p className="gw-you-quiet">Everyone reads the priorities. Targets and numbers are leadership only.</p>
          {priorities.length === 0 ? (
            <p className="gw-t-body gw-you-quiet">No priorities have come in from your organisation’s own systems yet.</p>
          ) : (
            <div className="gw-you-grid">
              {priorities.map(pr => <Priority key={pr.id} pr={pr} readsTargets={page.data!.readsTargets} />)}
            </div>
          )}
        </section>
      )}

      {cards.data && (
        <>
          {handbook.length > 0 && (
            <Cards id="cc-hb-h" title="The staff handbook, short and simple" sub="Ask Groundwork answers from this, and says so" cards={handbook} />
          )}
          {resources.length > 0 && <Cards id="cc-res-h" title="Resources" cards={resources} />}
          {rest.length > 0 && <Cards id="cc-rest-h" title={`What ${name} has learned, promised and has to hand`} cards={rest} />}
          {page.data && all.length === 0 && (
            <p className="gw-t-body gw-you-quiet">Nothing about how {name} does things has been added yet.</p>
          )}
        </>
      )}
    </div>
  )
}

function Priority({ pr, readsTargets }: { pr: CompanyPriority; readsTargets: boolean }) {
  const success = [pr.measure, pr.target].filter((s): s is string => !!s && !!s.trim())
  return (
    <section className="gw-you-card gw-company-priority" aria-label={`Priority ${pr.number}`}>
      <span className="gw-you-quiet">Priority {pr.number}</span>
      <h3 className="gw-t-h3">{pr.title}</h3>
      {readsTargets && success.length > 0 && (
        <>
          <p className="gw-company-small"><b>What success looks like</b> <Tag>Leadership only</Tag></p>
          {success.map(s => <p key={s}>{s}</p>)}
        </>
      )}
      <p className="gw-you-quiet">Owner: {pr.owner ?? 'No owner yet'}</p>
      {pr.staleSays && <p className="gw-you-quiet">{pr.staleSays}</p>}
    </section>
  )
}

function Cards({ id, title, sub, cards }: { id: string; title: string; sub?: string; cards: CompanyCard[] }) {
  return (
    <section className="gw-you-section" aria-labelledby={id}>
      <div className="gw-you-section-head">
        <h2 id={id} className="gw-t-h2">{title}</h2>
        {sub && <span>{sub}</span>}
      </div>
      <ul className="gw-you-rows">
        {cards.map(c => (
          <li key={c.key} className="gw-you-row gw-company-row-card">
            <b>{c.title}</b>
            <span className="gw-company-body">{c.body}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
