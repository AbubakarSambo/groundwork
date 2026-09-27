import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { onboardingBoardApi, type NewPerson } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Button, Tag } from '@/components/gw/kit'

/**
 * THE ONBOARDING BOARD (E1, #/suite/onboard, U.17). The wording is copied from
 * docs/prototype/screens/E-suites/suite-onboard.txt.
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /suites/onboard/board): an admin reads everybody
 * being set up, a lead only the new people in their own team, and only while the suite is on.
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
 * "Optional", "Nobody is being set up right now." and "The board did not load."
 */
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
    <div className="gw-you gw-suites">
      <nav className="gw-people-crumb" aria-label="Breadcrumb"><Link to="/settings/suites">Suites</Link> / Onboarding</nav>
      <h1 className="gw-t-title gw-suites-h1">Onboarding</h1>

      {isLoading && <p className="gw-t-body gw-you-quiet">Loading…</p>}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <p role="alert" className="gw-t-body">{refused.data?.message ?? 'Only an admin or a lead can open this board.'}</p>
        ) : (
          <div role="alert" className="gw-you-quiet">
            <p className="gw-t-body">The board did not load.</p>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}
      {data && data.people.length === 0 && <p className="gw-t-body gw-you-quiet">Nobody is being set up right now.</p>}
      {data?.people.map(p => <ANewPerson key={p.id} p={p} />)}
    </div>
  )
}

function ANewPerson({ p }: { p: NewPerson }) {
  const first = p.firstName
  const started = p.startedAt ? `${first} started on ${whenItWas(p.startedAt, 'dayAndMonthLong')}. ` : ''
  return (
    <section className="gw-suites-group" aria-labelledby={`new-${p.id}`}>
      <h2 id={`new-${p.id}`} className="gw-t-h2">{p.name} is getting set up</h2>
      <p className="gw-you-sub">{`${started}This board is only about getting ${first} set up. It is never used to judge ${first}’s work.`}</p>
      <div className="gw-you-card">
        <div className="gw-suite-head">
          <h3 className="gw-t-h3">{first}’s to-do list</h3>
          <span className="gw-you-quiet">{p.done} of {p.of} done</span>
        </div>
        <ul className="gw-onboard-steps">
          {p.steps.map((s, i) => (
            <li key={i}>
              <div>
                <span>{s.name}</span>
                {s.description && <small>{s.description}</small>}
              </div>
              <div className="gw-onboard-tags">
                {s.optional && <Tag tone="plain">Optional</Tag>}
                {s.state === 'done' && <Tag tone="plain">Done</Tag>}
                {s.state === 'not needed' && <Tag tone="plain">Not needed</Tag>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
