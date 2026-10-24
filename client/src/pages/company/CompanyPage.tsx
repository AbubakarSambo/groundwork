import { useQuery } from '@tanstack/react-query'
import { companyApi, type CompanyPage as Page, type CompanyPriority, type CompanyLevel } from '@/api/company'
import { useAuthStore } from '@/stores/auth'
import { useAskStore } from '@/stores/ask'
import { Page as PageFrame, PageTitle, Section, Panel, Button, Tag, Note, Empty, RowList, Row, SubHeading } from '@/components/gw/ui'

/**
 * THE COMPANY PAGE (D2, #/company, group 2 piece 3). The wording is copied from
 * docs/prototype/screens/D2-company/company.txt.
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /company). The page adds nothing to what it is
 * given, and hides nothing it was given.
 *
 * REBUILT FROM THE SHARED PARTS (`@/components/gw/ui`): `Page`/`PageTitle` for the frame, the head
 * row of buttons reuses `.gwui-sentence-row` (the same row `YouPage`'s "Your data" already uses),
 * `Section` for "Is the strategy moving?" and every section below it, `Panel` (`as="section"`) for
 * each priority card and the "Named by more than one team" card, and `Note`/`Empty` in place of the
 * page's own loading and empty lines. Two small parts were missing and are now in `gw-ui.css`, read
 * from the prototype's own values where it has one (see docs/the-parts-against-the-prototype.md):
 * `.gwui-priority-top` (a priority's "Priority N" beside its tag), `.gwui-team-col` (one team's own
 * column under "Named by more than one team"), and `.gwui-compare-table` (the plain comparison
 * table under "What you say, and where the time goes" - the prototype never draws a real `<table>`
 * itself, so this is the product's own shape, built at the same sizes the rest of this kit uses).
 *
 * ALSO DRAWN, WHEN THE SERVER SENDS THEM: each priority's measure and target, to admins only
 * (decision 86, item 3; "It is measured by ... and the target is ..."), and "What each level
 * understood" under it, top down from the priority through each objective and project, with the
 * sentence saying where the meaning changed.
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
    <PageFrame>
      <PageTitle title={name} />

      {isLoading && <Note>Loading…</Note>}
      {isError && (
        refused?.status === 403 ? (
          <Note tone="error">{refused.data?.message ?? 'You cannot read this page.'}</Note>
        ) : (
          <div>
            <Note tone="error">The company page did not load.</Note>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}

      {data && (
        <>
          {/*
            * REQUEST 153, PART TWO, DONE: ASK COVERS THE WHOLE ORGANISATION AND THE PERSON'S OWN
            * WORK BY DEFAULT; A CHECK-IN IS ONLY AN OPTIONAL FOCUS THEY MAY PICK
            * (docs/answers-from-engine.md, "Request 153, part two"). `showAsk` opens the same Ask
            * panel the rest of the product does; it opens on the organisation because the panel's
            * own default (AskGroundwork.tsx) no longer falls back to the first check-in on
            * "About" when the page it opened from isn't about one, and the Company page never is.
            * The labels are the prototype's own two ("Ask about the whole organisation",
            * "Ask about the strategy" - docs/prototype/screens/D2-company/company.txt), which used
            * to open a chat about one check-in (request 154, item 4) and now open on the
            * organisation, as both always said they did.
            */}
          <div className="gwui-sentence-row">
            <Button kind="secondary" onClick={showAsk}>Ask about the whole organisation</Button>
            <div className="gwui-edge-acts">
              <Button kind="secondary" to="/company/context">Company context</Button>
              <Button kind="secondary" onClick={showAsk}>Ask about the strategy</Button>
            </div>
          </div>
          {data.line && <Note>{data.line}</Note>}

          <ThePage p={data} />
        </>
      )}
    </PageFrame>
  )
}

function ThePage({ p }: { p: Page }) {
  return (
    <>
      <Section heading="Is the strategy moving?">
        {!p.priorities?.length ? (
          <Empty>No priorities have come in from your organisation’s own systems yet.</Empty>
        ) : (
          <div className="gwui-cards-3">
            {p.priorities.map(pr => <Priority key={pr.id} pr={pr} />)}
          </div>
        )}
      </Section>

      {!!p.notReaching?.length && (
        <Section heading="Where the strategy isn’t reaching the work" note="Questions for the person who can answer each one">
          <RowList label="Where the strategy isn’t reaching the work">
            {p.notReaching.map(o => (
              <Row key={o.id} columns="minmax(0, 1fr) auto">
                <span><b>{o.observation}</b><br />{o.question}</span>
                <span className="gwui-ink-sub">{o.forWhom}</span>
              </Row>
            ))}
          </RowList>
        </Section>
      )}

      {!!p.namedByTeams?.length && (
        <Section heading="Named by more than one team" note="Nobody on a single team would see this">
          {p.namedByTeams.map(n => (
            <Panel as="section" key={n.id} aria-label={n.title}>
              <div className="sec-h">
                <h3 className="t-h3">{n.title}</h3>
                {n.touches && <span className="gwui-ink-sub">{n.touches}</span>}
              </div>
              <div className="gwui-cards-3">
                {n.teams.map(t => (
                  <div key={t.team} className="gwui-team-col">
                    <b>{t.team}</b>
                    <p>{t.says}</p>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </Section>
      )}

      {!!p.saidAndShown?.length && (
        <Section heading="What you say, and where the time goes" foot="People appear here as counts. What each person said stays with them and their own lead.">
          <table className="gwui-compare-table">
            <thead><tr><th scope="col"><span className="gwui-sr-only">Priority</span></th><th scope="col">You said</th><th scope="col">The check-ins show</th></tr></thead>
            <tbody>
              {p.saidAndShown.map(s => (
                <tr key={s.id}><th scope="row">{s.area}</th><td>“{s.youSaid}”</td><td>{s.checkInsShow}</td></tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </>
  )
}

/** What success looks like, in the server's own words for the measure and the target. Served to admins only (decision 86, item 3). */
export function whatSuccessLooksLike(measure?: string | null, target?: string | null): string {
  /* A measure that begins "Qualified enterprise deals" reads after "measured by" in lower case; an acronym stays. */
  const inSentence = (x?: string | null) => { const v = x?.trim() ?? ''; return /^[A-Z][a-z]/.test(v) ? `${v[0].toLowerCase()}${v.slice(1)}` : v }
  const m = inSentence(measure)
  const t = target?.trim()
  if (m && t) return `It is measured by ${m}, and the target is ${t}.`
  if (m) return `It is measured by ${m}.`
  if (t) return `The target is ${t}.`
  return ''
}

function Priority({ pr }: { pr: CompanyPriority }) {
  const tag = pr.reading?.tag ?? pr.tag
  const success = whatSuccessLooksLike(pr.measure, pr.target)
  const levels = pr.levels ?? []
  /* The priority alone, with nothing under it and nothing that changed, says nothing more than its card. */
  const showLevels = levels.length > 1 || levels.some(l => l.changedHere)
  return (
    <Panel as="section" aria-label={`Priority ${pr.number}`}>
      <div className="gwui-priority-top">
        <span className="gwui-note">Priority {pr.number}</span>
        {tag && <Tag tone="attention">{tag}</Tag>}
      </div>
      <h3 className="t-h3">{pr.title}</h3>
      {pr.reading?.says && <p className="gwui-panel-text">{pr.reading.says}</p>}
      {pr.staleSays && <p className="gwui-panel-text-muted">{pr.staleSays}</p>}
      {pr.fedBy && <p className="gwui-panel-text-muted">{pr.fedBy}</p>}
      {success && <p className="gwui-panel-text">{success}</p>}
      {showLevels && (
        <>
          <SubHeading as="h3" tone="kicker">What each level understood</SubHeading>
          <RowList label={`What each level understood, priority ${pr.number}`}>
            {levels.map(l => <ALevel key={l.id} l={l} />)}
          </RowList>
        </>
      )}
    </Panel>
  )
}

function ALevel({ l }: { l: CompanyLevel }) {
  return (
    <Row columns="auto minmax(0, 1fr)">
      <span className="gwui-panel-text-muted">{l.level}</span>
      <div>
        <b>{l.title}</b>
        {l.changedHere && <p className="gwui-panel-text">{l.changedHere}</p>}
        {l.fedBy && <p className="gwui-panel-text-muted">{l.fedBy}</p>}
      </div>
    </Row>
  )
}
