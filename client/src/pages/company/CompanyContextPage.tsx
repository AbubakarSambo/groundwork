import { useQuery } from '@tanstack/react-query'
import { companyApi, type CompanyCard, type CompanyPriority } from '@/api/company'
import { useAuthStore } from '@/stores/auth'
import { askNameFor } from '@/lib/ask-name'
import { Page, PageTitle, Section, Panel, Button, Tag, Note, Empty, RowList, Row } from '@/components/gw/ui'

/**
 * COMPANY CONTEXT (D2 and B2, #/company/context, group 2 piece 3). The wording is copied from
 * docs/prototype/screens/B2-context/company-context.txt.
 *
 * TWO READS, EACH WITH ITS OWN RULE ON THE SERVER:
 *   - GET /company: the priorities, who owns each, and, for admins only, what success looks like.
 *   - GET /org/how-we-do-it: how the company does things (organisation memory), which everybody in
 *     the organisation may read. The handbook, resources and everything else it has been told.
 *
 * REBUILT FROM THE SHARED PARTS (`@/components/gw/ui`): `PageTitle`'s own `crumbs` for "Company /
 * Baridi Appliances" in place of the page's own nav, `Section` for "Priorities" and every card
 * group below it, `Panel` (`as="section"`) for each priority card in place of the page's own
 * `gw-you-card`, and `RowList`/`Row` for the handbook, resources and "what the company has learned"
 * lists in place of the page's own `gw-you-rows`. No new parts were needed beyond the two
 * `CompanyPage` already added (see docs/the-parts-against-the-prototype.md).
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
    <Page>
      <PageTitle
        crumbs={[{ label: 'Company', to: '/company' }, { label: name }]}
        title="What the company is trying to do, and how it reaches every team"
      />

      {loading && <Note>Loading…</Note>}
      {page.isError && refused?.status === 403 && (
        <Note tone="error">{refused.data?.message ?? 'You cannot read this page.'}</Note>
      )}
      {failed && (
        <div>
          <Note tone="error">The company context did not load.</Note>
          <Button kind="secondary" size="small" onClick={() => { page.refetch(); cards.refetch() }}>Try again</Button>
        </div>
      )}

      {page.data && (
        <Section heading="Priorities" note="Everyone reads the priorities. Targets and numbers are leadership only.">
          {priorities.length === 0 ? (
            <Empty>No priorities have come in from your organisation’s own systems yet.</Empty>
          ) : (
            <div className="gwui-cards-3">
              {priorities.map(pr => <Priority key={pr.id} pr={pr} readsTargets={page.data!.readsTargets} />)}
            </div>
          )}
        </Section>
      )}

      {/* KEPT FROM CHECK-INS (company-context.txt, "Picked up from your check-in on 22 Sep"): what a
          lead said that is true of the whole company, already kept on their yes in the
          conversation. So there is no Confirm, Edit or Not now here: the yes was said there. Only
          served to the readers the server allows; absent, not empty, for everyone else. */}
      {page.data?.whatWeKeep && page.data.whatWeKeep.items.length > 0 && (
        <Section heading="Kept from check-ins" note={page.data.whatWeKeep.readBy}>
          <RowList label="Kept from check-ins">
            {page.data.whatWeKeep.items.map(k => (
              <Row key={k.id} columns="minmax(0, 1fr) minmax(0, 3fr)">
                <b>{k.kind ? k.kind.charAt(0).toUpperCase() + k.kind.slice(1) : ''}</b>
                <div>
                  <div>{`“${k.says}”`}</div>
                  <p className="gwui-panel-text-muted">{k.source}</p>
                </div>
              </Row>
            ))}
          </RowList>
        </Section>
      )}

      {cards.data && (
        <>
          {handbook.length > 0 && (
            <Cards title="The staff handbook, short and simple" sub={`${askNameFor(page.data?.name || user?.organizationName)} answers from this, and says so`} cards={handbook} />
          )}
          {resources.length > 0 && <Cards title="Resources" cards={resources} />}
          {rest.length > 0 && <Cards title={`What ${name} has learned, promised and has to hand`} cards={rest} />}
          {page.data && all.length === 0 && (
            <Empty>Nothing about how {name} does things has been added yet.</Empty>
          )}
        </>
      )}
    </Page>
  )
}

function Priority({ pr, readsTargets }: { pr: CompanyPriority; readsTargets: boolean }) {
  const success = [pr.measure, pr.target].filter((s): s is string => !!s && !!s.trim())
  return (
    <Panel as="section" aria-label={`Priority ${pr.number}`}>
      <span className="gwui-ink-sub gwui-fs-13-5">Priority {pr.number}</span>
      <h3 className="gwui-panel-heading">{pr.title}</h3>
      {readsTargets && success.length > 0 && (
        <>
          <p className="gwui-panel-text"><b>What success looks like</b> <Tag>Leadership only</Tag></p>
          {success.map(s => <p key={s} className="gwui-panel-text">{s}</p>)}
        </>
      )}
      <p className="gwui-panel-text-muted">Owner: {pr.owner ?? 'No owner yet'}</p>
      {pr.staleSays && <p className="gwui-panel-text-muted">{pr.staleSays}</p>}
    </Panel>
  )
}

function Cards({ title, sub, cards }: { title: string; sub?: string; cards: CompanyCard[] }) {
  return (
    <Section heading={title} note={sub}>
      <RowList label={title}>
        {cards.map(c => (
          <Row key={c.key} columns="minmax(0, 1fr) minmax(0, 2fr)">
            <b>{c.title}</b>
            <span className="gwui-ink-sub gwui-pre-line">{c.body}</span>
          </Row>
        ))}
      </RowList>
    </Section>
  )
}
