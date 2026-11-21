import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TheSpendingRoute } from './ApprovalStepsByAmount'
import { suitesApi, reviewsApi, yourRequestsApi, type AdminSuite, type Answers, type Question, type SuitesForAnAdmin, type SuitesForALead, type SuitesForADutyHolder } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { useSuitesOnForYou } from '@/hooks/useSuitesOnForYou'
import { Page, PageTitle, Section, Panel, Button, Tag, Toggle, Note, Empty, RowList, Row, FieldLabel, TextField, TextArea, Select, Modal, Skeleton } from '@/components/gw/ui'
import { QueueLink, RequestLinks } from './QueuePage'
import { WhoLooksAfterWhat } from './WhoLooksAfterWhat'
import { WhatIsMissing } from './WhatIsMissing'
import { ForSomePeople } from './ForSomePeople'
import { TheLeavePolicy } from './TheLeavePolicy'
import { everySays } from './ReviewsBoardPage'
import { useTheDesignPass } from '@/lib/the-design-pass'

/**
 * B-140: THE SAME MADE-UP CADENCE B-119 ALREADY FIXED ON THE REVIEWS BOARD, STILL HERE. The
 * catalog's own line for the reviews suite (`the-ten-suites.ts`, `key: 'reviews'`) is one sentence
 * for every organisation, "A review every 6 months, built from...", which reads as a real setting
 * even for an organisation like Kijani Foods that has never set how often (`every: null`). `GET
 * /suites` does not carry each organisation's own cadence, only `GET /suites/reviews/board` does
 * (the same call the reviews board itself reads it from), so this suite's card alone asks that too,
 * once it is on, and swaps the made-up clause out exactly as `everySays` already does on the board.
 */
function reviewsLineFor(line: string, every: string | null | undefined): string {
  const said = everySays(every)
  return said ? line : 'A review is built from what each person did and proved, with their own view beside it.'
}

/** A suite's own description, with B-140's fix applied to the reviews suite alone. */
function SuiteLine({ s }: { s: { key: string; line: string; on?: boolean } }) {
  /* The lead's own list (`SuitesForALead`) carries only the suites that are already on, with no
     `on` field of its own - so a lead's card is "reviews" and on whenever its key says so. */
  const isReviews = s.key === 'reviews' && s.on !== false
  const { data } = useQuery({
    queryKey: ['suite-reviews-board-for-switchboard'],
    queryFn: reviewsApi.board,
    enabled: isReviews,
    retry: false,
  })
  const line = isReviews ? reviewsLineFor(s.line, data?.every) : s.line
  return <p className="gwui-panel-text">{line}</p>
}

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
  { name: 'Company documents', line: 'The handbook, learnings and resources.', where: 'Desk', to: '/company' },
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

/** The suites whose approvals follow the reporting lines, so their card says what is missing (Batch S, S3). */
const CHECKED = ['leave', 'time', 'spend', 'reviews']

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
     and the two pages agree on when the link shows.
     FAULT 1 OF THE LIVE WALK (6 October): hours gates it the same way, and the link's own words
     change with it - "Your own requests" once hours are part of what it opens. */
  const suitesOn = useSuitesOnForYou()
  const yourLeave = useQuery({ queryKey: ['your-leave'], queryFn: yourRequestsApi.leave, enabled: !!user && suitesOn.leave, retry: false, staleTime: 60_000 })
  const yourSpending = useQuery({ queryKey: ['your-spending'], queryFn: yourRequestsApi.spending, enabled: !!user && suitesOn.spending, retry: false, staleTime: 60_000 })
  const yourHours = useQuery({ queryKey: ['your-hours'], queryFn: yourRequestsApi.hours, enabled: !!user && suitesOn.hours, retry: false, staleTime: 60_000 })
  const aSuiteIsOnForYou = yourLeave.isSuccess || yourSpending.isSuccess || yourHours.isSuccess
  const requestsLinkLabel = yourHours.isSuccess ? 'Your own requests' : 'Your own leave and spending requests'
  const designPass = useTheDesignPass()

  return (
    <Page>
      <PageTitle
        eyebrow={orgName || undefined}
        title="Suites"
        action={designPass ? <RequestLinks userId={user?.id} requests={{ show: aSuiteIsOnForYou, label: requestsLinkLabel }} /> : undefined}
        explains
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

      {isLoading && <Skeleton what="Getting this page" shape="rows" />}
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
      {!designPass && aSuiteIsOnForYou && (
        <p className="gwui-panel-text"><Link className="gwui-plain-link" to="/suite/mine">{requestsLinkLabel}</Link></p>
      )}
      {!designPass && <QueueLink userId={user?.id} />}
    </Page>
  )
}

function ForALead({ page }: { page: SuitesForALead }) {
  const setUp = page.youSetUp ?? []
  const designPass = useTheDesignPass()
  if (page.suites.length === 0 && setUp.length === 0) return <Empty>None are switched on yet.</Empty>
  return (
    <>
      {page.suites.length === 0 ? <Empty>None are switched on yet.</Empty> : designPass ? (
        /* The design pass: each suite one quiet row, its line and its board's link, not a card. */
        <ul className="dp-rows" aria-label="Suites switched on">
          {page.suites.map(s => (
            <li key={s.key} className="dp-row" aria-label={s.name}>
              <div className="dp-row-main">
                <span className="dp-row-title">{s.name}</span>
                <SuiteLine s={s} />
              </div>
              {BOARDS[s.key] && <span className="dp-row-acts"><Link className="gwui-plain-link" to={BOARDS[s.key].to}>Open its board</Link></span>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="gwui-cards-3">
          {page.suites.map(s => (
            <Panel as="section" key={s.key} aria-label={s.name}>
              <h3 className="t-h3">{s.name}</h3>
              <SuiteLine s={s} />
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
  const designPass = useTheDesignPass()
  if (designPass) {
    return (
      <Section heading="Suites you set up">
        <ul className="dp-rows" aria-label="Suites you set up">{suites.map(s => <ASuite key={s.key} s={s} people={people} forYou />)}</ul>
      </Section>
    )
  }
  return (
    <Section heading="Suites you set up" note="Your organisation has asked you to set these up.">
      <div className={suites.length === 1 ? undefined : 'gwui-cards-3'}>
        {suites.map(s => <ASuite key={s.key} s={s} people={people} forYou />)}
      </div>
    </Section>
  )
}

function ForAnAdmin({ page }: { page: SuitesForAnAdmin }) {
  const designPass = useTheDesignPass()
  if (designPass) {
    /*
     * THE DESIGN PASS: each group a list of quiet rows, one a suite: its name and what it does, its board's link, its switch at the
     * right (the switch says on or off, so no On/Off tag beside it), and "See or change its settings" opening its form under the
     * row, full width. "Already part of Groundwork" stays, every row of it, without the line explaining it.
     */
    return (
      <>
        {page.groups.map(g => (
          <Section key={g.name} heading={g.name}>
            <ul className="dp-rows" aria-label={g.name}>{g.suites.map(s => <ASuite key={s.key} s={s} people={page.people} />)}</ul>
          </Section>
        ))}
        <WhoLooksAfterWhat />
        <Section heading="Already part of Groundwork">
          <ul className="dp-rows" aria-label="Already part of Groundwork">
            {ALREADY_PART.map(a => (
              <li key={a.name} className="dp-row">
                <span className="dp-row-main">
                  <span className="dp-row-title">{a.name}</span>
                  <span className="dp-row-line">{a.line}</span>
                </span>
                <span className="dp-row-acts"><Link className="gwui-plain-link" to={a.to}>{a.where}</Link></span>
              </li>
            ))}
          </ul>
        </Section>
      </>
    )
  }
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

      <WhoLooksAfterWhat />

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
  const [answers, setAnswers] = useState<Record<string, string>>(() => startFrom(s, people))
  const [problem, setProblem] = useState<string | null>(null)
  const flip = useMutation({
    mutationFn: ({ on, given }: { on: boolean; given?: Answers }) => suitesApi.switch(s.key, on, given),
    onSuccess: (page) => { setProblem(null); setAsking(false); qc.setQueryData(['suites'], page); qc.invalidateQueries({ queryKey: ['suites-on-for-you'] }); qc.invalidateQueries({ queryKey: ['spend-rules'] }) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })

  /*
   * FAULT 7D OF THE LIVE WALK (6 October): switching a suite off was one click, with no warning
   * even while requests or hours were waiting in it. `switch(reader, key, { on: false })`
   * (suites.service.ts) only sets `isOn: false` and keeps the suite's stored answers - it deletes
   * nothing, and a request already filed stays exactly as it is, refused only from being added to
   * (a-suite-that-is-off-says-what-to-do.ts) until it is switched on again, so what the confirmation
   * below says is true.
   */
  const [confirmingOff, setConfirmingOff] = useState(false)
  function pressed() {
    setProblem(null)
    if (s.on) { setConfirmingOff(true); return }
    if (s.questions.length === 0) return flip.mutate({ on: true })
    setAnswers(startFrom(s, people))
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
  function openSettings() {
    setProblem(null)
    setAnswers(startFrom(s, people))
    setAsking(true)
  }
  const allAnswered = s.questions.every(q => (answers[q.id] ?? '').trim() !== '')
  /*
   * B-124 FOR AN EXISTING ORGANISATION (coordinator follow-up, 9 October). "These settings were set
   * up another way, so they cannot be changed here yet." used to refuse the form outright for a
   * suite like Kijani Foods' leave, stored before this page existed (`daysAYear` and a person's id
   * where today's questions ask `days` and a choice of "Their manager"/"An admin") - the real bug
   * B-124 names: an existing admin with nothing to lose by looking could not even open the door, and
   * could not change a single thing the server already lets an admin change.
   *
   * `startFrom` now reads every current question under its own id first, falls back to the one
   * legacy rename this product actually made (`days` from the even older `daysAYear`), and leaves
   * anything else blank rather than guess - a stored value of the wrong shape for its question (a
   * person's id where a choice is asked) is exactly as unsafe to prefill as one under the wrong
   * name, so it is treated the same way: blank, not guessed at. The form always opens now; a plain
   * note below says when something could not be read, and `allAnswered` still keeps "Save" disabled
   * until every blank is deliberately filled in - so nothing already on record is ever replaced
   * except by the admin's own, explicit save, never just by opening the form to look.
   */
  const hadAnswersBefore = !!s.answers && Object.keys(s.answers).length > 0
  const someUnreadable = hadAnswersBefore && s.questions.some(q => (answers[q.id] ?? '') === '')
  const designPass = useTheDesignPass()

  const theForm = asking && (
    <form
      className={designPass ? 'gwui-suite-ask-alone' : 'gwui-suite-ask'}
      onSubmit={e => { e.preventDefault(); if (allAnswered) flip.mutate({ on: true, given: answers }) }}
    >
      {!designPass && <p className="gwui-panel-text">{s.on ? 'Change your answers below, then save them.' : 'Answer these first, and it switches on.'}</p>}
      {someUnreadable && (
        <Note tone="muted">Some of these were set up before this page existed, so they show blank below. Choose them now, and saving sets them from what you choose.</Note>
      )}
      {s.questions.map(q => (
        <AQuestion key={q.id} suite={s.key} q={q} value={answers[q.id] ?? ''} people={people}
          onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} />
      ))}
      <div className="gwui-edge-acts">
        <Button kind="primary" size="small" type="submit" disabled={!allAnswered || flip.isPending}>{s.on ? 'Save' : 'Switch it on'}</Button>
        <Button kind="quiet" size="small" onClick={() => { setAsking(false); setProblem(null) }}>Cancel</Button>
      </div>
    </form>
  )
  const confirmOff = confirmingOff && (
    <Modal title={`Switch ${s.name} off?`} onClose={() => setConfirmingOff(false)}>
      <p className="gwui-panel-text">Anything waiting in it stays as it is, and nobody can add to it until it is switched on again.</p>
      <div className="gwui-edge-acts">
        <Button kind="secondary" size="small" disabled={flip.isPending} onClick={() => { setConfirmingOff(false); flip.mutate({ on: false }) }}>Switch it off</Button>
        <Button kind="quiet" size="small" onClick={() => setConfirmingOff(false)}>Cancel</Button>
      </div>
    </Modal>
  )

  if (designPass) {
    return (
      <li className="dp-row" aria-label={s.name}>
        <div className="dp-row-main">
          <span className="dp-row-title">{s.name}</span>
          <SuiteLine s={s} />
          <div className="dp-links">
            {s.on && BOARDS[s.key] && <Link className="gwui-plain-link" to={forYou && s.key === 'spend' ? '/suite/spend/finance' : BOARDS[s.key].to}>{forYou && s.key === 'spend' ? 'Open the requests for finance' : 'Open its board'}</Link>}
            {s.on && s.questions.length > 0 && !asking && <button type="button" className="gwui-plain-link" onClick={openSettings}>See or change its settings</button>}
          </div>
        </div>
        <span className="dp-row-acts"><Toggle on={s.on} onChange={pressed} label={s.name} disabled={flip.isPending || asking} /></span>
        <div className="dp-row-body">
          {s.on && s.key === 'spend' && !asking && <TheSpendingRoute />}
          {s.on && CHECKED.includes(s.key) && <WhatIsMissing suite={s.key} />}
          {theForm}
          {asking && s.on && <ForSomePeople suite={s.key} />}
          {asking && s.on && s.key === 'leave' && <TheLeavePolicy />}
          {problem && <Note tone="error">{problem}</Note>}
        </div>
        {confirmOff}
      </li>
    )
  }

  return (
    <Panel as="section" aria-label={s.name}>
      <div className="gwui-suite-head">
        <div>
          <h3 className="t-h3">{s.name}</h3>
          <SuiteLine s={s} />
          {s.on && BOARDS[s.key] && <Link className="gwui-plain-link" to={forYou && s.key === 'spend' ? '/suite/spend/finance' : BOARDS[s.key].to}>{forYou && s.key === 'spend' ? 'Open the requests for finance' : 'Open its board'}</Link>}
          {s.on && s.questions.length > 0 && !asking && (
            <Button kind="quiet" size="small" onClick={openSettings}>See or change its settings</Button>
          )}
          {s.on && s.key === 'spend' && !asking && <TheSpendingRoute />}
          {s.on && CHECKED.includes(s.key) && <WhatIsMissing suite={s.key} />}
        </div>
        <div className="gwui-suite-switch">
          <Tag>{s.on ? 'On' : 'Off'}</Tag>
          <Toggle on={s.on} onChange={pressed} label={s.name} disabled={flip.isPending || asking} />
        </div>
      </div>

      {theForm}
      {/* Batch S, S1: the number set for some people, beside the settings it differs from. Its own form, saved on its own. */}
      {asking && s.on && <ForSomePeople suite={s.key} />}
      {/* The whole leave policy, in the server's sentences, and each part of it to change (21 November 2026). */}
      {asking && s.on && s.key === 'leave' && <TheLeavePolicy />}
      {problem && <Note tone="error">{problem}</Note>}

      {/* ONE NAVY BUTTON PER PAGE: the confirmation's own button stays secondary (see confirmOff above). */}
      {confirmOff}
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

/**
 * THE ONE LEGACY RENAME THIS PRODUCT ACTUALLY MADE (B-124 for an existing organisation). Before the
 * suite's first questions were written as they are now, the leave suite stored the days a year
 * under `daysAYear`; today's question asks for the same thing under `days`. Both names mean exactly
 * the same number, so it is safe to read one under the other. Nothing else is renamed here: a
 * person's id stored where a choice is asked, say, is not "the same thing under another name" - it
 * is a different shape the current question cannot use at all, and is left blank rather than guessed.
 */
const LEGACY_RENAMES: Record<string, Record<string, string>> = {
  leave: { days: 'daysAYear' },
}

/** Whether a stored value is safe to show for this particular question, never just present. */
function readableFor(q: Question, v: unknown, people: SuitesForAnAdmin['people']): string | null {
  if (v == null) return null
  if (q.kind === 'person') return typeof v === 'string' && people.some(p => p.id === v) ? v : null
  if (q.kind === 'choice') return typeof v === 'string' && q.options.includes(v) ? v : null
  if (q.kind === 'number') {
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
    return Number.isFinite(n) ? String(n) : null
  }
  /* lines */
  if (Array.isArray(v)) return v.map(String).join('\n')
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

/**
 * WHAT THE ADMIN ANSWERED LAST TIME, SO THE FORM STARTS FROM IT - for a suite set up on this page,
 * and, where the meaning carries over safely, for one set up before it existed too. A field this
 * cannot read starts blank, never guessed at: `allAnswered` then keeps "Save" disabled until the
 * admin has deliberately chosen it, so nothing already on record can be replaced except by their own,
 * explicit save.
 */
function startFrom(s: AdminSuite, people: SuitesForAnAdmin['people']): Record<string, string> {
  const stored = (s.answers ?? {}) as Record<string, unknown>
  const renames = LEGACY_RENAMES[s.key] ?? {}
  const out: Record<string, string> = {}
  for (const q of s.questions) {
    const own = readableFor(q, stored[q.id], people)
    const legacyKey = renames[q.id]
    const legacy = own == null && legacyKey ? readableFor(q, stored[legacyKey], people) : null
    out[q.id] = own ?? legacy ?? ''
  }
  return out
}
