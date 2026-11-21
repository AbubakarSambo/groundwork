import { useQuery } from '@tanstack/react-query'
import { onboardingBoardApi, type NewPerson } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Page, PageTitle, Section, Panel, Button, Tag, Note, Empty, RowList, Row, Skeleton } from '@/components/gw/ui'
import { SuiteOffMessage, theToneForARefusal } from '@/lib/suite-is-off'

/**
 * THE ONBOARDING BOARD (E1, #/suite/onboard, group 2 piece 4). The wording is copied from
 * docs/prototype/screens/E-suites/suite-onboard.txt.
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /suites/onboard/board): an admin reads everybody
 * being set up, a lead only the new people in their own team, and only while the suite is on.
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` (its own `crumbs`, "Suites / Onboarding"),
 * `Section` for each new person ("Faith Kerubo is getting set up"), `Panel` for their to-do list,
 * `Tag` for each step's own state, `RowList`/`Row` for the steps, and `Note`/`Empty` for the
 * loading, error and empty states. No new parts were needed.
 *
 * NOT DRAWN HERE, ON PURPOSE (docs/morning-report-ui.md, item 28):
 *   - "Something nobody has shown ... yet": it would be built from the new person's private
 *     questions to Ask Groundwork.
 *   - "Who helps set ... up", with each helper's own list: nothing records who helps with which step.
 *   - "Her work is in her own check-in, ...": nothing links a new person to their work check-in yet.
 *   - Ticking a step done: this board is read-only, so nobody ticks off a new person's own to-do for
 *     them (audit B13). Steps are marked where they always were.
 * The prototype's page is one person's; this one has a part for each new person, each headed with the
 * prototype's sentence, under the heading "Onboarding".
 *
 * WORDING NO SCREEN SHOWS (item 28): "Onboarding" as the page heading, "Done", "Not needed",
 * "Optional" and "The board did not load."
 *
 * FAULT 7A OF THE LIVE WALK (6 October): "Nobody is being set up right now." gave no next step. A
 * new person is actually set up by starting a "Help a new hire get started" check-in (the
 * switchboard's own situation, the-switchboard-g2-table.ts), which seeds this board's steps and
 * roster entry (the-onboarding-board.service.ts: "built only from... onboarding statuses"). The
 * empty state now says so, with a link to the switchboard (`/start`).
 *
 * A SUBTITLE SAYING WHAT THE BOARD IS FOR (group 2's review, fault F): while the suite is off this
 * page used to show only "Onboarding / Onboarding" and the server's off sentence, with nothing
 * saying what the board is even for - every other board carries that line regardless of whether it
 * loaded (TodosPage, EquipmentPage, and the rest). The sentence below is built from the same words
 * the prototype uses for one new person (suite-onboard.txt, "This board is only about getting her
 * set up... It is never used to judge her work."), put in general terms for anybody who might be on
 * it.
 */
const SUBTITLE = 'This board is only about getting new people set up, with their papers, equipment and training, and the people they need to meet. It is never used to judge anyone’s work.'
export function OnboardingBoardPage() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-onboard'],
    queryFn: onboardingBoardApi.get,
    enabled: !!user,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response

  return (
    <Page>
      <PageTitle crumbs={[{ label: 'Suites', to: '/settings/suites' }, { label: 'Onboarding' }]} title="Onboarding" subtitle={SUBTITLE} />

      {isLoading && <Skeleton what="Getting this page" shape="rows" />}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <Note tone={theToneForARefusal(refused.data?.message ?? 'Only an admin or a lead can open this board.')}><SuiteOffMessage message={refused.data?.message ?? 'Only an admin or a lead can open this board.'} role={user?.role} /></Note>
        ) : (
          <div>
            <Note tone="error">The board did not load.</Note>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}
      {data && (data.people ?? []).length === 0 && (
        <Empty title="Nobody is being set up right now." action={<Button kind="secondary" to="/start">Start a check-in</Button>}>
          Set someone up by starting a “Help a new hire get started” check-in.
        </Empty>
      )}
      {(data?.people ?? []).map(p => <ANewPerson key={p.id} p={p} />)}
    </Page>
  )
}

function ANewPerson({ p }: { p: NewPerson }) {
  const first = p.firstName
  const started = p.startedAt ? `${first} started on ${whenItWas(p.startedAt, 'dayAndMonthLong')}. ` : ''
  return (
    <Section heading={`${p.name} is getting set up`}>
      <p className="gwui-panel-text-muted">{`${started}This board is only about getting ${first} set up. It is never used to judge ${first}’s work.`}</p>
      <Panel>
        <div className="gwui-suite-head">
          <h3 className="t-h3">{first}’s to-do list</h3>
          <span className="gwui-ink-sub">{p.done} of {p.of} done</span>
        </div>
        <RowList label={`${first}’s to-do list`}>
          {p.steps.map((s, i) => (
            <Row key={i} columns="minmax(0, 1fr) auto">
              <span>{s.name}{s.description && <small className="gwui-ink-sub">{s.description}</small>}</span>
              <span>
                {s.optional && <Tag>Optional</Tag>}
                {s.state === 'done' && <Tag>Done</Tag>}
                {s.state === 'not needed' && <Tag>Not needed</Tag>}
              </span>
            </Row>
          ))}
        </RowList>
      </Panel>
    </Section>
  )
}
