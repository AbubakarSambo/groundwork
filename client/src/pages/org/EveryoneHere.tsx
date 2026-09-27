import { useMemo, useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { PLAN_LABELS, type SubscriptionPlan } from '@/api/billing'
import { ShowAFew } from '@/components/gw/a-long-list-is-not-a-page'
import {
  type OrgMember, fetchMembers, nameOf, initialsOf, roleWord, statusWord, needsSomething, whereTheySitLine, checkInsWord,
} from './people-here'

/**
 * "EVERYONE AT BARIDI" AND "WHO REPORTS TO WHOM" (A4 people.txt), the People page's list.
 *
 * Person, team, role, status and check-ins, with the prototype's search, team and role filters. The
 * tree is folded, as in the prototype, under its line: "Level and reporting lines describe the
 * organisation; what someone can do still comes from their role".
 */
type RoleFilter = 'Everyone' | 'Owner' | 'Admins' | 'Can open check-ins' | 'Take part' | 'Guests' | 'Needs something'
const ROLE_FILTERS: RoleFilter[] = ['Everyone', 'Owner', 'Admins', 'Can open check-ins', 'Take part', 'Guests', 'Needs something']

function matches(filter: RoleFilter, m: OrgMember, ownerId: string | null): boolean {
  const role = roleWord(m, ownerId)
  switch (filter) {
    case 'Everyone': return true
    case 'Owner': return role === 'Owner'
    case 'Admins': return role === 'Admin' || role === 'Owner'
    case 'Can open check-ins': return role === 'Can open check-ins'
    case 'Take part': return role === 'Takes part'
    case 'Guests': return role === 'Guest'
    case 'Needs something': return needsSomething(m)
  }
}

/** "27 people, on the Growth plan, which is for up to 100." The prototype's colon, as a sentence. */
export function howManyHere(count: number, plan: string | null | undefined, cap: number | null | undefined): string {
  const people = count === 1 ? '1 person' : `${count} people`
  if (cap == null) return `${people}.`
  const name = plan ? `the ${PLAN_LABELS[plan as SubscriptionPlan] ?? plan} plan` : 'the free plan'
  return `${people}, on ${name}, which is for up to ${cap}.`
}

function TheTree({ people }: { people: OrgMember[] }) {
  const here = new Set(people.map((p) => p.id))
  const under = new Map<string, OrgMember[]>()
  for (const p of people) {
    const to = p.reportsTo?.id
    if (to && here.has(to) && to !== p.id) under.set(to, [...(under.get(to) ?? []), p])
  }
  const top = people.filter((p) => !p.reportsTo?.id || !here.has(p.reportsTo.id) || p.reportsTo.id === p.id)
  const seen = new Set<string>()
  const branch = (p: OrgMember): ReactElement | null => {
    if (seen.has(p.id)) return null
    seen.add(p.id)
    const kids = under.get(p.id) ?? []
    return (
      <li key={p.id}>
        <span>{nameOf(p)}</span>{p.level ? <span className="gw-tree-level">{`, ${p.level}`}</span> : null}
        {kids.length > 0 && <ul>{kids.map(branch)}</ul>}
      </li>
    )
  }
  return <ul className="gw-tree">{top.map(branch)}</ul>
}

export function EveryoneHere({ orgName, ownerId }: { orgName: string; ownerId: string | null }) {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useQuery({ queryKey: ['org-members'], queryFn: fetchMembers })
  const status = useQuery({
    queryKey: ['billing-status-people'],
    queryFn: () => apiClient.get('/billing/status').then((r: any) => (r.data.data ?? r.data) as { people?: { count: number; cap: number | null }; subscription?: { plan: string | null }; onTheHouse?: { plan: string } | null }),
    retry: false,
  })
  const [find, setFind] = useState('')
  const [team, setTeam] = useState('')
  const [filter, setFilter] = useState<RoleFilter>('Everyone')

  const everybody = data?.data ?? []
  const teams = useMemo(() => [...new Set(everybody.map((m) => (m.team ?? '').trim()).filter(Boolean))].sort(), [everybody])
  const shown = everybody.filter((m) => {
    const q = find.trim().toLowerCase()
    if (q && !`${nameOf(m)} ${m.email} ${m.level ?? ''}`.toLowerCase().includes(q)) return false
    if (team && (m.team ?? '') !== team) return false
    return matches(filter, m, ownerId)
  })

  if (isError) {
    return (
      <p className="gw-people-problem" role="alert">
        We could not load your people just now. Nobody has been removed. Reload the page, and if it keeps happening, tell us.
      </p>
    )
  }
  if (isLoading) return <p className="gw-people-note">Loading…</p>

  return (
    <>
      <details className="gw-people-tree">
        <summary>
          <b>Who reports to whom</b>{' '}
          <span>Level and reporting lines describe the organisation; what someone can do still comes from their role</span>
        </summary>
        <TheTree people={everybody.filter((m) => m.role !== 'GUEST')} />
      </details>

      <section className="gw-people-sec" aria-labelledby="everyone-h">
        <div className="gw-people-sec-head">
          <h2 id="everyone-h">{`Everyone at ${orgName}`}</h2>
          {/*
            THE SAME NUMBER AS PLAN AND BILLING (U.19): billing's seat count, which counts everybody who
            belongs here except guests from outside. The plan is whichever covers the organisation, so a
            free run's plan is named rather than "the free plan". The list below shows guests too, so
            the page says they do not count.
          */}
          <span>{howManyHere(status.data?.people?.count ?? everybody.length, status.data?.subscription?.plan ?? status.data?.onTheHouse?.plan, status.data?.people?.cap)}</span>
          {status.data?.people && everybody.some((m) => m.role === 'GUEST') && (
            <span>Guests from outside don’t count toward the plan.</span>
          )}
        </div>
        <div className="gw-people-filters">
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find somebody" aria-label="Find somebody" />
          <label>
            Team{' '}
            <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Team">
              <option value="">All teams</option>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <div className="gw-people-chips" role="group" aria-label="Show">
          {ROLE_FILTERS.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <p className="gw-people-note">{shown.length === 1 ? '1 person shown.' : `${shown.length} people shown.`}</p>

        {shown.length === 0 ? (
          <p className="gw-people-note">{find.trim() ? `Nobody here matches "${find.trim()}".` : 'Nobody here matches that.'}</p>
        ) : (
          <div className="gw-people-table" role="table" aria-label={`Everyone at ${orgName}`}>
            <div className="gw-people-tr gw-people-th" role="row">
              <span role="columnheader">Person</span><span role="columnheader">Team</span><span role="columnheader">Role</span>
              <span role="columnheader">Status</span><span role="columnheader">Check-ins</span><span role="columnheader" aria-label="Open" />
            </div>
            <ShowAFew rows={shown} few={25} what="people">
              {(m: OrgMember) => {
                const name = nameOf(m)
                const line = whereTheySitLine(m)
                const st = statusWord(m)
                return (
                  <div key={m.id} className="gw-people-tr" role="row">
                    <span role="cell" className="gw-people-person">
                      <span className="gw-people-av" aria-hidden>{initialsOf(name)}</span>
                      <span>
                        <b>{name}</b>
                        {line && <small>{line}</small>}
                        {name !== m.email && <small>{m.email}</small>}
                      </span>
                    </span>
                    <span role="cell">{m.team?.trim() || 'None'}</span>
                    <span role="cell"><span className="gw-people-tag">{roleWord(m, ownerId)}</span></span>
                    <span role="cell"><span className={`gw-people-tag ${st === 'Checking in' ? 'good' : needsSomething(m) ? 'warn' : ''}`}>{st}</span></span>
                    <span role="cell">{checkInsWord(m)}</span>
                    <span role="cell">
                      <button type="button" className="gw-link-btn" aria-label={`Open ${name}`} onClick={() => navigate(`/org/members/${m.id}`)}>Open</button>
                    </span>
                  </div>
                )
              }}
            </ShowAFew>
          </div>
        )}
        {data?.meta.total != null && data.meta.total > everybody.length && (
          <p className="gw-people-note">{`Showing ${everybody.length} of ${data.meta.total} people.`}</p>
        )}
      </section>
    </>
  )
}
