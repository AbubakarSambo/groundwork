import { useQuery } from '@tanstack/react-query'
import { companyApi, type CompanyPage as Page, type CompanyPriority } from '@/api/company'
import { useAuthStore } from '@/stores/auth'
import { useAskStore } from '@/stores/ask'
import { Button, Tag } from '@/components/gw/kit'

/**
 * THE COMPANY PAGE (D2, #/company). The wording is copied from
 * docs/prototype/screens/D2-company/company.txt.
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /company). The page adds nothing to what it is
 * given, and hides nothing it was given.
 *
 * NOT DRAWN HERE, ON PURPOSE (docs/morning-report-ui.md, item 26):
 *   - "Strategy v2, since 1 September.": nothing keeps versions of the strategy yet.
 *   - The "Teams" and "History" tabs: no screen shows what is in them, and nothing keeps the
 *     history. "Is the strategy moving?" is the page's one part, so it is its heading.
 *   - "What new people keep asking": it is built from questions to Ask Groundwork, which are private
 *     always. That is a privacy question for Hafsah.
 *   - "Decide", "Ask", "Make someone responsible", "Read what each team said" and "Open": they wait
 *     for the engine's parts they act on (request 17).
 * The engine's parts (how each priority is moving, where the strategy isn't reaching the work,
 * what more than one team named, and what you say next to what the check-ins show) are drawn only
 * when served.
 */
export function CompanyPage() {
  const user = useAuthStore(s => s.user)
  const showAsk = useAskStore(s => s.show)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['company'],
    queryFn: companyApi.get,
    enabled: !!user,
    staleTime: 30_000,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response
  const name = data?.name || user?.organizationName || 'Company'

  return (
    <div className="gw-you gw-company">
      <h1 className="gw-t-title gw-company-h1">{name}</h1>

      {data && (
        <div className="gw-company-head">
          <div>
            <Button kind="secondary" onClick={showAsk}>Ask about the whole organisation</Button>
            {data.line && <p className="gw-you-sub gw-company-line">{data.line}</p>}
          </div>
          <div className="gw-company-head-actions">
            <Button kind="secondary" to="/company/context">Company context</Button>
            <Button kind="secondary" onClick={showAsk}>Ask about the strategy</Button>
          </div>
        </div>
      )}

      {isLoading && <p className="gw-t-body gw-you-quiet">Loading…</p>}
      {isError && (
        refused?.status === 403 ? (
          <p role="alert" className="gw-t-body">{refused.data?.message ?? 'You cannot read this page.'}</p>
        ) : (
          <div role="alert" className="gw-you-quiet">
            <p className="gw-t-body">The company page did not load.</p>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}
      {data && <ThePage p={data} />}
    </div>
  )
}

function ThePage({ p }: { p: Page }) {
  return (
    <>
      <h2 className="gw-t-h2 gw-company-h2">Is the strategy moving?</h2>
      {p.priorities.length === 0 ? (
        <p className="gw-t-body gw-you-quiet">No priorities have come in from your organisation’s own systems yet.</p>
      ) : (
        <div className="gw-you-grid">
          {p.priorities.map(pr => <Priority key={pr.id} pr={pr} />)}
        </div>
      )}

      {!!p.notReaching?.length && (
        <section className="gw-you-section" aria-labelledby="co-reach-h">
          <div className="gw-you-section-head">
            <h2 id="co-reach-h" className="gw-t-h2">Where the strategy isn’t reaching the work</h2>
            <span>Questions for the person who can answer each one</span>
          </div>
          <ul className="gw-you-rows">
            {p.notReaching.map(o => (
              <li key={o.id} className="gw-you-row gw-company-row-q">
                <span><b>{o.observation}</b><br />{o.question}</span>
                <span className="gw-you-quiet">{o.forWhom}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!!p.namedByTeams?.length && (
        <section className="gw-you-section" aria-labelledby="co-named-h">
          <div className="gw-you-section-head">
            <h2 id="co-named-h" className="gw-t-h2">Named by more than one team</h2>
            <span>Nobody on a single team would see this</span>
          </div>
          {p.namedByTeams.map(n => (
            <div key={n.id} className="gw-you-card">
              <div className="gw-you-section-head">
                <h3 className="gw-t-h3">{n.title}</h3>
                {n.touches && <span>{n.touches}</span>}
              </div>
              <div className="gw-you-grid">
                {n.teams.map(t => (
                  <div key={t.team} className="gw-company-team">
                    <b>{t.team}</b>
                    <p>{t.says}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {!!p.saidAndShown?.length && (
        <section className="gw-you-section" aria-labelledby="co-said-h">
          <h2 id="co-said-h" className="gw-t-h2 gw-company-h2">What you say, and where the time goes</h2>
          <table className="gw-company-table">
            <thead><tr><th scope="col"><span className="gw-sr-only">Priority</span></th><th scope="col">You said</th><th scope="col">The check-ins show</th></tr></thead>
            <tbody>
              {p.saidAndShown.map(s => (
                <tr key={s.id}><th scope="row">{s.area}</th><td>“{s.youSaid}”</td><td>{s.checkInsShow}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="gw-you-quiet">People appear here as counts. What each person said stays with them and their own lead.</p>
        </section>
      )}
    </>
  )
}

function Priority({ pr }: { pr: CompanyPriority }) {
  const tag = pr.reading?.tag ?? pr.tag
  return (
    <section className="gw-you-card gw-company-priority" aria-label={`Priority ${pr.number}`}>
      <div className="gw-company-priority-top">
        <span className="gw-you-quiet">Priority {pr.number}</span>
        {tag && <Tag tone="attention">{tag}</Tag>}
      </div>
      <h3 className="gw-t-h3">{pr.title}</h3>
      {pr.reading?.says && <p>{pr.reading.says}</p>}
      {pr.staleSays && <p className="gw-you-quiet">{pr.staleSays}</p>}
      {pr.fedBy && <p className="gw-you-quiet">{pr.fedBy}</p>}
    </section>
  )
}
