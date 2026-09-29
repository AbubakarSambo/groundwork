import { useMemo, useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { PLAN_LABELS, type SubscriptionPlan } from '@/api/billing'
import { ShowAFew } from '@/components/gw/a-long-list-is-not-a-page'
import {
  Section, Stack, Folded, TextField, Select, Choices, PeopleTable, PeopleTableHead, PersonRow, Tag, Note, Empty,
  type TagTone,
} from '@/components/gw/ui'
import {
  type OrgMember, fetchMembers, nameOf, initialsOf, roleWord, statusWord, needsSomething, whereTheySitLine, checkInsWord,
} from './people-here'

/**
 * "EVERYONE AT BARIDI" AND "WHO REPORTS TO WHOM" (A4 people.txt), the People page's list.
 *
 * Person, team, role, status and check-ins, with the prototype's search, team and role filters. The
 * tree is folded, as in the prototype, under its line: "Level and reporting lines describe the
 * organisation; what someone can do still comes from their role".
 *
 * REBUILT FROM THE SHARED PARTS (design-audit.md section 3, "People", items 3, 6, 7, 8, 9, 17;
 * components/gw/ui only): the folded tree is now `Folded` (66px closed, matching `Panel`'s own
 * corners and inside space, item 6); the search field is the standard 48px `TextField`, not the old
 * cramped 36px one, and the role filters are `Choices` (40px, 15px, "Everyone" bold when chosen,
 * item 7); the table is `PeopleTable`/`PersonRow` with 34px avatars, 16px bold names and a 13px
 * level line (never 11.5px, item 8 and 17); the role and status read as `Tag`s in the prototype's
 * own colours - "Owner" and "Admin" blue, "Guest" amber, "Checking in" green, "No seat on your
 * plan" red, the rest plain (item 9); and "Open" is a 14.5px regular navy link, not a bold button
 * (item 8).
 */
type RoleFilter = 'Everyone' | 'Owner' | 'Admins' | 'Can open check-ins' | 'Take part' | 'Guests' | 'Needs something'
const ROLE_FILTERS: RoleFilter[] = ['Everyone', 'Owner', 'Admins', 'Can open check-ins', 'Take part', 'Guests', 'Needs something']

/** Team, Role, Status, Check-ins, Open - the name column is PersonRow's own (PEOPLE_NAME_COLUMN). */
const EXTRA_COLUMNS = '140px 170px 170px minmax(200px, 1fr) 60px'

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

/** Blue for who runs the place, amber for a guest, green for checking in, red for a problem (design-audit.md item 9 and 16). */
export function roleTagTone(role: string): TagTone {
  if (role === 'Owner' || role === 'Admin') return 'action'
  if (role === 'Guest') return 'attention'
  return 'plain'
}

export function statusTagTone(status: string): TagTone {
  if (status === 'Checking in') return 'proven'
  if (status === 'No seat on your plan') return 'concern'
  if (status === 'Waiting to be let in') return 'attention'
  return 'plain'
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
        <span>{nameOf(p)}</span>{p.level ? <span className="gwui-tree-level">{`, ${p.level}`}</span> : null}
        {kids.length > 0 && <ul>{kids.map(branch)}</ul>}
      </li>
    )
  }
  return <ul className="gwui-tree">{top.map(branch)}</ul>
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
      <Note tone="error">
        We could not load your people just now. Nobody has been removed. Reload the page, and if it keeps happening, tell us.
      </Note>
    )
  }
  if (isLoading) return <Note>Loading…</Note>

  return (
    <>
      <Folded
        summary="Who reports to whom"
        note="Level and reporting lines describe the organisation; what someone can do still comes from their role"
      >
        <TheTree people={everybody.filter((m) => m.role !== 'GUEST')} />
      </Folded>

      <Section heading={`Everyone at ${orgName}`} note={howManyHere(status.data?.people?.count ?? everybody.length, status.data?.subscription?.plan ?? status.data?.onTheHouse?.plan, status.data?.people?.cap)}>
        <Stack gap={18}>
          {/*
            THE SAME NUMBER AS PLAN AND BILLING (U.19): billing's seat count. Everybody with an account
            here takes a seat, guests included, as the prototype says (U.4 re-review); only somebody
            answering by link with no account does not, and a guest held for a seat does not yet.
          */}
          {status.data?.people && everybody.some((m) => m.role === 'GUEST') && (
            <Note>Guests with no account don’t take a seat.</Note>
          )}

          <div className="gwui-filters-row">
            <TextField
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder="Find somebody"
              aria-label="Find somebody"
              style={{ maxWidth: 240 }}
            />
            <label className="gwui-inline-label">
              Team{' '}
              <Select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Team" style={{ width: 'auto' }}>
                <option value="">All teams</option>
                {teams.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </label>
          </div>

          <Choices
            label="Show"
            value={filter}
            onChange={(k) => setFilter(k as RoleFilter)}
            options={ROLE_FILTERS.map((f) => ({ key: f, label: f }))}
          />

          <Note>{shown.length === 1 ? '1 person shown.' : `${shown.length} people shown.`}</Note>

          {shown.length === 0 ? (
            <Empty>{find.trim() ? `Nobody here matches "${find.trim()}".` : 'Nobody here matches that.'}</Empty>
          ) : (
            <PeopleTable>
              <PeopleTableHead extraColumns={EXTRA_COLUMNS} labels={['Person', 'Team', 'Role', 'Status', 'Check-ins', '']} />
              <ShowAFew rows={shown} few={25} what="people">
                {(m: OrgMember) => {
                  const name = nameOf(m)
                  const line = whereTheySitLine(m)
                  const st = statusWord(m)
                  const role = roleWord(m, ownerId)
                  return (
                    <PersonRow
                      key={m.id}
                      extraColumns={EXTRA_COLUMNS}
                      person={{ initials: initialsOf(name), name, level: line || undefined, email: m.email }}
                    >
                      <span>{m.team?.trim() || 'None'}</span>
                      <Tag tone={roleTagTone(role)}>{role}</Tag>
                      <Tag tone={statusTagTone(st)}>{st}</Tag>
                      <span>{checkInsWord(m)}</span>
                      <button type="button" className="gwui-open-link" aria-label={`Open ${name}`} onClick={() => navigate(`/org/members/${m.id}`)}>Open</button>
                    </PersonRow>
                  )
                }}
              </ShowAFew>
            </PeopleTable>
          )}
          {data?.meta.total != null && data.meta.total > everybody.length && (
            <Note>{`Showing ${everybody.length} of ${data.meta.total} people.`}</Note>
          )}
        </Stack>
      </Section>
    </>
  )
}
