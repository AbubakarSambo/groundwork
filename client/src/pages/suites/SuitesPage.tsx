import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { suitesApi, yourRequestsApi, type AdminSuite, type Answers, type Question, type SuitesForAnAdmin, type SuitesForALead, type SuitesForADutyHolder } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Page, PageTitle, Section, Panel, Button, Tag, Toggle, Note, Empty, RowList, Row, FieldLabel, TextField, TextArea, Select } from '@/components/gw/ui'
import { QueueLink } from './QueuePage'

/**
 * THE SUITES PAGE (E, #/settings/suites, group 2 piece 4). The wording is copied from
 * docs/prototype/screens/E-suites/suites-admin.txt and suites-lead.txt.
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /suites). An admin reads every suite, in three
 * groups, with its switch; a lead reads only the suites that are on, with no switches; the server
 * refuses everybody else. The page adds nothing to what it is given.
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` for the frame (the organisation's name as the
 * eyebrow), `Section` for each of "People"/"Money"/"Work" and "Already part of Groundwork", `Panel`
 * (`as="section"`) for each suite card, `Toggle` for its switch, `FieldLabel`/`TextField`/`TextArea`/
 * `Select` for a suite's own questions, and `RowList`/`Row` for "Already part of Groundwork"'s list.
 * Two small parts were missing and are now in `gw-ui.css` (see
 * docs/the-parts-against-the-prototype.md): `.gwui-suite-head`/`.gwui-suite-switch` (a suite card's
 * own two-column layout, title and body to the left, the On/Off tag and its switch to the right)
 * and `.gwui-suite-ask`/`.gwui-suite-q` (the small form a suite's own questions open into).
 *
 * "OPEN ITS BOARD" ONLY FOR A BOARD THAT EXISTS (docs/morning-report-ui.md, item 28): a door that
 * leads nowhere is worse than none, so each suite's board brings its own door, one at a time, in
 * BOARDS below. Onboarding came first, then leave requests, time sheets, performance reviews, when someone leaves, the role map, spending and budgets, to-dos, customers and deals, and equipment, so now all ten have one.
 *
 * WORDING NO SCREEN SHOWS, in the fewest plain words (item 28): "Off"; "Answer these first, and it
 * switches on."; "Choose somebody"; "Switch it on"; "Cancel"; "None are switched on yet."; and
 * "The suites did not load." The first questions themselves are the server's (the-ten-suites.ts).
 */

/** "Already part of Groundwork", as suites-admin.txt lists it, each with where it lives. */
export const ALREADY_PART = [
  { name: 'Goals and targets', line: 'Set in each check-in, with what counts.', where: 'Each check-in', to: '/grounds' },
  { name: 'Commitments', line: 'What people said they would do, and whether they did.', where: 'Each check-in', to: '/grounds' },
  { name: 'Teams and who reports to whom', line: 'Each person’s team, level and manager.', where: 'People', to: '/org/members' },
  { name: 'Roles and permissions', line: 'Who can start check-ins, and who can see what.', where: 'People', to: '/org/members' },
  { name: 'Company documents', line: 'The handbook, learnings and resources.', where: 'Company context', to: '/company/context' },
  { name: 'Numbers from other systems', line: 'Sales, payments and usage, shown beside what people say.', where: 'Connections', to: '/settings/connections' },
  { name: 'Slack or Teams', line: 'Notices in the channels your team already uses.', where: 'Connections', to: '/settings/connections' },
]

/** The suites whose board is built, and where it lives: all ten, since U.17. */
export const BOARDS: Record<string, { to: string }> = {
  onboard: { to: '/suite/onboard' },
  leave: { to: '/suite/leave' },
  time: { to: '/suite/time' },
  reviews: { to: '/suite/reviews' },
  leaving: { to: '/suite/leaving' },
  roles: { to: '/suite/roles' },
  spend: { to: '/suite/spend' },
  todos: { to: '/suite/todos' },
  customers: { to: '/suite/customers' },
  equipment: { to: '/suite/equipment' },
}

const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'

export function SuitesPage() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suites'],
    queryFn: suitesApi.get,
    enabled: !!user,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response
  const orgName = user?.organization?.name?.trim() || user?.organizationName || ''
  /* "Your own leave and spending requests" only where a suite is on for this person: with both
     off, the link opened a page that only says the suite is off (fault 2, live re-walk). The same
     queries and query keys Today already uses, so this costs nothing more than Today already pays,
     and the two pages agree on when the link shows. */
  const yourLeave = useQuery({ queryKey: ['your-leave'], queryFn: yourRequestsApi.leave, enabled: !!user, retry: false, staleTime: 60_000 })
  const yourSpending = useQuery({ queryKey: ['your-spending'], queryFn: yourRequestsApi.spending, enabled: !!user, retry: false, staleTime: 60_000 })
  const aSuiteIsOnForYou = yourLeave.isSuccess || yourSpending.isSuccess

  return (
    <Page>
      <PageTitle
        eyebrow={orgName || undefined}
        title="Suites"
        subtitle={
          data?.reader === 'admin'
            ? 'Ready-made tools for other kinds of team work. Switch on only what you need. Each one adds a single board, and people use it by talking to Groundwork, not by filling in forms. Only admins see this page.'
            : data?.reader === 'lead'
              ? 'The team tools your organisation has switched on. An admin switches them on or off.'
              : data?.reader === 'duty'
                ? 'Your organisation has asked you to set up these suites. Answer the first questions to switch one on, and switch it off again whenever you need to.'
                : undefined
        }
      />

      {isLoading && <Note>Loading…</Note>}
      {isError && (
        refused?.status === 403 ? (
          <Note tone="error">{refused.data?.message ?? 'Only an admin or a lead can open the suites.'}</Note>
        ) : (
          <div>
            <Note tone="error">The suites did not load.</Note>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}
      {data?.reader === 'admin' && <ForAnAdmin page={data} />}
      {data?.reader === 'lead' && <ForALead page={data} />}
      {data?.reader === 'duty' && <ForADutyHolder page={data} />}

      {/* Every reader has requests of their own, including a member, whom this page otherwise
          refuses - but only once a suite is actually on for them (fault 2, live re-walk): with
          both leave and spending off, this opened a page that only says the suite is off. */}
      {aSuiteIsOnForYou && (
        <p className="gwui-panel-text"><Link className="gwui-plain-link" to="/suite/mine">Your own leave and spending requests</Link></p>
      )}
      <QueueLink userId={user?.id} />
    </Page>
  )
}

function ForALead({ page }: { page: SuitesForALead }) {
  const setUp = page.youSetUp ?? []
  if (page.suites.length === 0 && setUp.length === 0) return <Empty>None are switched on yet.</Empty>
  return (
    <>
      {page.suites.length === 0 ? <Empty>None are switched on yet.</Empty> : (
        <div className="gwui-cards-3">
          {page.suites.map(s => (
            <Panel as="section" key={s.key} aria-label={s.name}>
              <h3 className="gwui-panel-heading">{s.name}</h3>
              <p className="gwui-panel-text">{s.line}</p>
              {BOARDS[s.key] && <Link className="gwui-plain-link" to={BOARDS[s.key].to}>Open its board</Link>}
            </Panel>
          ))}
        </div>
      )}
      {setUp.length > 0 && <SuitesYouSetUp suites={setUp} people={page.people ?? []} />}
    </>
  )
}

/** Whoever holds the HR or finance duty sets up their suites here, with the same switch and questions an admin has. */
function ForADutyHolder({ page }: { page: SuitesForADutyHolder }) {
  return <SuitesYouSetUp suites={page.youSetUp} people={page.people} />
}

function SuitesYouSetUp({ suites, people }: { suites: AdminSuite[]; people: SuitesForAnAdmin['people'] }) {
  return (
    <Section heading="Suites you set up" note="Your organisation has asked you to set these up.">
      <div className={suites.length === 1 ? undefined : 'gwui-cards-3'}>
        {suites.map(s => <ASuite key={s.key} s={s} people={people} forYou />)}
      </div>
    </Section>
  )
}

function ForAnAdmin({ page }: { page: SuitesForAnAdmin }) {
  return (
    <>
      {page.groups.map(g => (
        <Section key={g.name} heading={g.name}>
          {/* A group of one suite (suites-admin.jpg: "Money", "Spending and budgets" alone) takes
              the full width, rather than sitting narrow in one third of a three-column grid. */}
          <div className={g.suites.length === 1 ? undefined : 'gwui-cards-3'}>
            {g.suites.map(s => <ASuite key={s.key} s={s} people={page.people} />)}
          </div>
        </Section>
      ))}

      <Section heading="Already part of Groundwork" note="These don’t need switching on. Here is where each one lives.">
        <RowList label="Already part of Groundwork">
          {ALREADY_PART.map(a => (
            <Row key={a.name} columns="minmax(0, 220px) minmax(0, 1fr) auto">
              <b>{a.name}</b>
              <span>{a.line}</span>
              <Link to={a.to}>{a.where}</Link>
            </Row>
          ))}
        </RowList>
      </Section>
    </>
  )
}

function ASuite({ s, people, forYou }: { s: AdminSuite; people: SuitesForAnAdmin['people']; forYou?: boolean }) {
  const qc = useQueryClient()
  const [asking, setAsking] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>(() => startFrom(s))
  const [problem, setProblem] = useState<string | null>(null)
  const flip = useMutation({
    mutationFn: ({ on, given }: { on: boolean; given?: Answers }) => suitesApi.switch(s.key, on, given),
    onSuccess: (page) => { setProblem(null); setAsking(false); qc.setQueryData(['suites'], page) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })

  function pressed() {
    setProblem(null)
    if (s.on) return flip.mutate({ on: false })
    if (s.questions.length === 0) return flip.mutate({ on: true })
    setAnswers(startFrom(s))
    setAsking(true)
  }
  /*
   * "SEE OR CHANGE ITS SETTINGS" (screen fault 6). A suite already on, with questions of its own,
   * used to offer no way back into them - only the switch, which turns the suite off rather than
   * opening them. `GET /suites` already serves every suite's own stored answers (`s.answers`,
   * read by `startFrom` below), and `PUT /suites/:key` already accepts `{ on: true, answers }` to
   * save them without touching the switch, so this opens the same form, filled in, and saves
   * through the same call `pressed` already uses to switch on - it just never sends `on: false`.
   */
  /*
   * NEVER SAVE OVER SETTINGS THIS FORM CANNOT READ (recheck, 7 October). Some suites' stored
   * answers were written under other names than the suite's questions (leave stored `daysAYear`
   * and a person's id where the questions ask `days` and a choice). Opened, the form showed them
   * empty, and Save would have replaced the real settings. Until the engine serves them under the
   * questions' own names (request 180), such a suite says so instead of opening the form.
   */
  const [cannotChangeHere, setCannotChangeHere] = useState(false)
  function openSettings() {
    setProblem(null)
    if (storedUnderOtherNames(s)) { setCannotChangeHere(true); return }
    setAnswers(startFrom(s))
    setAsking(true)
  }
  const allAnswered = s.questions.every(q => (answers[q.id] ?? '').trim() !== '')

  return (
    <Panel as="section" aria-label={s.name}>
      <div className="gwui-suite-head">
        <div>
          <h3 className="gwui-panel-heading">{s.name}</h3>
          <p className="gwui-panel-text">{s.line}</p>
          {s.on && BOARDS[s.key] && <Link className="gwui-plain-link" to={forYou && s.key === 'spend' ? '/suite/spend/finance' : BOARDS[s.key].to}>{forYou && s.key === 'spend' ? 'Open the requests for finance' : 'Open its board'}</Link>}
          {s.on && s.questions.length > 0 && !asking && !cannotChangeHere && (
            <Button kind="quiet" size="small" onClick={openSettings}>See or change its settings</Button>
          )}
          {cannotChangeHere && (
            <Note tone="muted">These settings were set up another way, so they cannot be changed here yet. Nothing has been changed.</Note>
          )}
        </div>
        <div className="gwui-suite-switch">
          <Tag>{s.on ? 'On' : 'Off'}</Tag>
          <Toggle on={s.on} onChange={pressed} label={s.name} disabled={flip.isPending || asking} />
        </div>
      </div>

      {asking && (
        <form
          className="gwui-suite-ask"
          onSubmit={e => { e.preventDefault(); if (allAnswered) flip.mutate({ on: true, given: answers }) }}
        >
          <p className="gwui-panel-text">{s.on ? 'Change your answers below, then save them.' : 'Answer these first, and it switches on.'}</p>
          {s.questions.map(q => (
            <AQuestion key={q.id} suite={s.key} q={q} value={answers[q.id] ?? ''} people={people}
              onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} />
          ))}
          <div className="gwui-edge-acts">
            <Button kind="primary" size="small" type="submit" disabled={!allAnswered || flip.isPending}>{s.on ? 'Save' : 'Switch it on'}</Button>
            <Button kind="quiet" size="small" onClick={() => { setAsking(false); setProblem(null) }}>Cancel</Button>
          </div>
        </form>
      )}
      {problem && <Note tone="error">{problem}</Note>}
    </Panel>
  )
}

function AQuestion({ suite, q, value, people, onChange }: {
  suite: string; q: Question; value: string; people: SuitesForAnAdmin['people']; onChange: (v: string) => void
}) {
  const id = `suite-${suite}-${q.id}`
  return (
    <div className="gwui-suite-q">
      <FieldLabel htmlFor={id}>{q.ask}</FieldLabel>
      {q.kind === 'person' && (
        <Select id={id} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">Choose somebody</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      )}
      {q.kind === 'choice' && (
        <Select id={id} value={value} onChange={e => onChange(e.target.value)}>
          <option value="" disabled>Choose one</option>
          {q.options.map(o => <option key={o} value={o}>{o}</option>)}
        </Select>
      )}
      {q.kind === 'number' && (
        <TextField id={id} type="number" inputMode="numeric" min={q.min} max={q.max} value={value} onChange={e => onChange(e.target.value)} />
      )}
      {q.kind === 'lines' && (
        <TextArea id={id} rows={4} value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  )
}

/** True when the suite has stored answers, but not under the names its questions use, so the form
 *  would show them empty and a save would replace them. */
export function storedUnderOtherNames(s: AdminSuite): boolean {
  const stored = s.answers ? Object.keys(s.answers) : []
  if (stored.length === 0) return false
  return s.questions.some(q => !(q.id in (s.answers as Record<string, unknown>)))
}

/** What the admin answered last time, so switching on again starts from it. */
function startFrom(s: AdminSuite): Record<string, string> {
  const out: Record<string, string> = {}
  for (const q of s.questions) {
    const v = s.answers?.[q.id]
    out[q.id] = Array.isArray(v) ? v.join('\n') : v == null ? '' : String(v)
  }
  return out
}
