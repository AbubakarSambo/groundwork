import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { suitesApi, type AdminSuite, type Answers, type Question, type SuitesForAnAdmin, type SuitesForALead } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Button, Tag } from '@/components/gw/kit'

/**
 * THE SUITES PAGE (E, #/settings/suites, U.17). The wording is copied from
 * docs/prototype/screens/E-suites/suites-admin.txt and suites-lead.txt.
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /suites). An admin reads every suite, in three
 * groups, with its switch; a lead reads only the suites that are on, with no switches; the server
 * refuses everybody else. The page adds nothing to what it is given.
 *
 * "OPEN ITS BOARD" ONLY FOR A BOARD THAT EXISTS (docs/morning-report-ui.md, item 28): a door that
 * leads nowhere is worse than none, so each suite's board brings its own door, one at a time, in
 * BOARDS below. Onboarding came first, then leave requests, time sheets and performance reviews.
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
  { name: 'Numbers from other systems', line: 'Sales, payments and usage, shown beside what people say.', where: 'Connections', to: '/org/integrations' },
  { name: 'Slack or Teams', line: 'Notices in the channels your team already uses.', where: 'Connections', to: '/org/integrations' },
]

/** The suites whose board is built, and where it lives. The rest have no door yet. */
export const BOARDS: Record<string, { to: string }> = {
  onboard: { to: '/suite/onboard' },
  leave: { to: '/suite/leave' },
  time: { to: '/suite/time' },
  reviews: { to: '/suite/reviews' },
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

  return (
    <div className="gw-you gw-suites">
      {orgName && <p className="gw-suites-org">{orgName}</p>}
      <h1 className="gw-t-title gw-suites-h1">Suites</h1>
      {data?.reader === 'admin' && (
        <p className="gw-you-sub">Ready-made tools for other kinds of team work. Switch on only what you need. Each one adds a single board, and people use it by talking to Groundwork, not by filling in forms. Only admins see this page.</p>
      )}
      {data?.reader === 'lead' && (
        <p className="gw-you-sub">The team tools your organisation has switched on. An admin switches them on or off.</p>
      )}

      {isLoading && <p className="gw-t-body gw-you-quiet">Loading…</p>}
      {isError && (
        refused?.status === 403 ? (
          <p role="alert" className="gw-t-body">{refused.data?.message ?? 'Only an admin or a lead can open the suites.'}</p>
        ) : (
          <div role="alert" className="gw-you-quiet">
            <p className="gw-t-body">The suites did not load.</p>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}
      {data?.reader === 'admin' && <ForAnAdmin page={data} />}
      {data?.reader === 'lead' && <ForALead page={data} />}
    </div>
  )
}

function ForALead({ page }: { page: SuitesForALead }) {
  if (page.suites.length === 0) return <p className="gw-t-body gw-you-quiet">None are switched on yet.</p>
  return (
    <div className="gw-you-grid">
      {page.suites.map(s => (
        <section key={s.key} className="gw-you-card gw-suite-card" aria-labelledby={`suite-${s.key}`}>
          <h3 id={`suite-${s.key}`} className="gw-t-h3">{s.name}</h3>
          <p>{s.line}</p>
          {BOARDS[s.key] && <Link to={BOARDS[s.key].to} className="gw-suite-open">Open its board</Link>}
        </section>
      ))}
    </div>
  )
}

function ForAnAdmin({ page }: { page: SuitesForAnAdmin }) {
  return (
    <>
      {page.groups.map(g => (
        <section key={g.name} className="gw-suites-group" aria-labelledby={`suites-${g.name}`}>
          <h2 id={`suites-${g.name}`} className="gw-t-h2">{g.name}</h2>
          <div className={g.suites.length === 1 ? 'gw-suites-one' : 'gw-you-grid'}>
            {g.suites.map(s => <ASuite key={s.key} s={s} people={page.people} />)}
          </div>
        </section>
      ))}

      <section className="gw-suites-group" aria-labelledby="suites-already">
        <h2 id="suites-already" className="gw-t-h2">Already part of Groundwork</h2>
        <p className="gw-you-sub">These don’t need switching on. Here is where each one lives.</p>
        <ul className="gw-you-card gw-suites-already">
          {ALREADY_PART.map(a => (
            <li key={a.name}>
              <b>{a.name}</b>
              <span>{a.line}</span>
              <Link to={a.to}>{a.where}</Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function ASuite({ s, people }: { s: AdminSuite; people: SuitesForAnAdmin['people'] }) {
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
  const allAnswered = s.questions.every(q => (answers[q.id] ?? '').trim() !== '')

  return (
    <section className="gw-you-card gw-suite-card" aria-labelledby={`suite-${s.key}`}>
      <div className="gw-suite-head">
        <div>
          <h3 id={`suite-${s.key}`} className="gw-t-h3">{s.name}</h3>
          <p>{s.line}</p>
          {s.on && BOARDS[s.key] && <Button kind="secondary" size="small" to={BOARDS[s.key].to}>Open its board</Button>}
        </div>
        <div className="gw-suite-switch">
          <Tag tone="plain">{s.on ? 'On' : 'Off'}</Tag>
          <button
            type="button"
            role="switch"
            aria-checked={s.on}
            aria-labelledby={`suite-${s.key}`}
            className={`gw-switch${s.on ? ' on' : ''}`}
            onClick={pressed}
            disabled={flip.isPending || asking}
          >
            <span aria-hidden />
          </button>
        </div>
      </div>

      {asking && (
        <form
          className="gw-suite-ask"
          onSubmit={e => { e.preventDefault(); if (allAnswered) flip.mutate({ on: true, given: answers }) }}
        >
          <p>Answer these first, and it switches on.</p>
          {s.questions.map(q => (
            <AQuestion key={q.id} suite={s.key} q={q} value={answers[q.id] ?? ''} people={people}
              onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} />
          ))}
          <div className="gw-suite-ask-actions">
            <Button kind="primary" size="small" type="submit" disabled={!allAnswered || flip.isPending}>Switch it on</Button>
            <Button kind="quiet" size="small" onClick={() => { setAsking(false); setProblem(null) }}>Cancel</Button>
          </div>
        </form>
      )}
      {problem && <p className="gw-auth-error" role="alert">{problem}</p>}
    </section>
  )
}

function AQuestion({ suite, q, value, people, onChange }: {
  suite: string; q: Question; value: string; people: SuitesForAnAdmin['people']; onChange: (v: string) => void
}) {
  const id = `suite-${suite}-${q.id}`
  return (
    <div className="gw-suite-q">
      <label htmlFor={id}>{q.ask}</label>
      {q.kind === 'person' && (
        <select id={id} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">Choose somebody</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      {q.kind === 'choice' && (
        <select id={id} value={value} onChange={e => onChange(e.target.value)}>
          <option value="" disabled>Choose one</option>
          {q.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {q.kind === 'number' && (
        <input id={id} type="number" inputMode="numeric" min={q.min} max={q.max} value={value} onChange={e => onChange(e.target.value)} />
      )}
      {q.kind === 'lines' && (
        <textarea id={id} rows={4} value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  )
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
