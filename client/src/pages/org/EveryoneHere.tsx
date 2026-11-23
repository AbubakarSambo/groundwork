import { useTheDesignPass } from '@/lib/the-design-pass'
import { useMemo, useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'
import { PLAN_LABELS, type SubscriptionPlan } from '@/api/billing'
import { groundsApi } from '@/api/grounds'
import { ShowAFew } from '@/components/gw/a-long-list-is-not-a-page'
import { Paged } from '@/components/gw/ui/Paged'
import {
  Section, Stack, Folded, TextField, Select, Choices, Button, PeopleTable, PeopleTableHead, PersonRow, Tag, Note, Empty,
  type TagTone, Skeleton
} from '@/components/gw/ui'
import {
  type OrgMember, fetchMembers, nameOf, firstNameOf, initialsOf, isNamePlaceholder, roleWord, statusWord, needsSomething, whereTheySitLine, checkInsPartsApart,
} from './people-here'
import { TheirNumberInTheRow } from './their-number'
import { RemoveFromTheOrganisation } from './ask-first-in-the-page'
import { useAuthStore } from '@/stores/auth'
import { namesToCallAmong } from '@/lib/names-that-tell-people-apart'

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
type RoleFilter = 'Everyone' | 'Owner' | 'Admins' | 'Can open check-ins' | 'Takes part' | 'Guests' | 'Needs something'
const ROLE_FILTERS: RoleFilter[] = ['Everyone', 'Owner', 'Admins', 'Can open check-ins', 'Takes part', 'Guests', 'Needs something']

/** Team, Role, Status, Check-ins, Open - the name column is PersonRow's own (PEOPLE_NAME_COLUMN). */
const EXTRA_COLUMNS = '100px 110px 220px minmax(110px, 1fr) 40px'
/* The design pass: "Remove" was cut off in a 40px column and "Can open check-ins" ran into Status. Room for both. */
const EXTRA_COLUMNS_IN_THE_DESIGN_PASS = '92px 144px minmax(208px, 1.5fr) minmax(88px, 1fr) 76px'

function matches(filter: RoleFilter, m: OrgMember, ownerId: string | null): boolean {
  const role = roleWord(m, ownerId)
  switch (filter) {
    case 'Everyone': return true
    case 'Owner': return role === 'Owner'
    case 'Admins': return role === 'Admin' || role === 'Owner'
    case 'Can open check-ins': return role === 'Can open check-ins'
    case 'Takes part': return role === 'Takes part'
    case 'Guests': return role === 'Guest'
    case 'Needs something': return needsSomething(m)
  }
}

/** "Faraji", or "Faraji and Zawadi", or "Faraji, Zawadi and Baraka" - never an Oxford-less list. */
function namesAnd(names: string[]): string {
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * "27 people, on the Growth plan, which is for up to 100." The prototype's colon, as a sentence.
 *
 * THE TWO COUNTS ON THIS PAGE DISAGREED (U.4 people-group review, item 1). `count` is the seat count
 * billing charges for; the table below can show more rows than that, because somebody waiting to be
 * let in, or on a check-in with no seat for them, is shown here too (so an admin can act on them)
 * without holding a seat. Rather than leave the two numbers to contradict each other, this names the
 * difference, when there are few enough people to name.
 */
export function howManyHere(
  count: number, plan: string | null | undefined, cap: number | null | undefined,
  waitingToBeLetIn: string[] = [], heldForASeat: string[] = [], notLetIn: string[] = [],
  /* Release check, 9 October: people waiting for a seat who are on no check-in (the plan is full, or a paste's invitation is kept)
     read "Omondi is on a check-in with no seat for them", which was not true. They are said apart, and the server's own sentence
     about the plan being full (request 197) is said when it is served. */
  waitingWithNoCheckIn: string[] = [], overThePlanSays: string | null = null,
  /* Invited with no account yet (run 9): a row below that holds no seat, so the head count never disagrees with the rows shown. */
  invitedWithNoAccount: string[] = [],
  /* An organisation with no cover at all (its free month is over, or the free plan never applied to it): not "on the free plan", which Plan and billing and the Pricing page never say of it (run 10). */
  withNoPlanYet = false,
): string {
  const peopleCount = (n: number) => (n === 1 ? '1 person' : `${n} people`)
  const people = peopleCount(count)
  const first = cap == null ? `${people}.` : (() => {
    if (!plan && withNoPlanYet) return `${people}, with no plan chosen yet, which covers up to ${cap}.`
    const name = plan ? `the ${PLAN_LABELS[plan as SubscriptionPlan] ?? plan} plan` : 'the free plan'
    return `${people}, on ${name}, which is for up to ${cap}.`
  })()
  /*
   * B-212: "SOMEONE AND SOMEONE ARE WAITING TO BE LET IN." `names` here are already first names
   * (firstNameOf), and for a person with no name that is the placeholder sentence's own first word
   * - "Someone" or "Somebody" - which read exactly like a real name once joined by `namesAnd`. When
   * ANY of them has no name, the whole group falls back to a plain count instead, same as a group
   * too long to name individually; a mix of named and unnamed people is still a mix nobody can read
   * apart from the sentence alone, so the number is the only thing that stays true either way.
   */
  const sentence = (names: string[], few: string, many: string): string | null => {
    if (names.length === 0) return null
    if (names.some(isNamePlaceholder)) return `${peopleCount(names.length)} ${names.length === 1 ? 'is' : 'are'} ${few}.`
    if (names.length <= 3) return `${namesAnd(names)} ${names.length === 1 ? 'is' : 'are'} ${few}.`
    return `${names.length} ${many}.`
  }
  /*
   * SOMEBODY DECLINED IS NOT "WAITING" (U.4 re-review, item 2b). Their row already reads "Not let
   * in"; the count line used to say "Faraji is waiting to be let in." about the very same person,
   * because it read `awaitingOrgApproval` alone, which an admin's "no" does not clear. Told apart
   * here so the two sentences on the same page agree with each other.
   */
  const wasNotSentence = (names: string[]): string | null => {
    if (names.length === 0) return null
    if (names.some(isNamePlaceholder)) return `${peopleCount(names.length)} ${names.length === 1 ? 'was' : 'were'} not let in.`
    if (names.length <= 3) return `${namesAnd(names)} ${names.length === 1 ? 'was' : 'were'} not let in.`
    return `${names.length} were not let in.`
  }
  const extra = [
    sentence(waitingToBeLetIn, 'waiting to be let in', 'more are waiting to be let in'),
    wasNotSentence(notLetIn),
    /* Never "account" (page audit, 24 November, row 15): they are invited and have not joined yet. */
    sentence(invitedWithNoAccount, invitedWithNoAccount.length === 1 ? 'invited and hasn’t joined yet' : 'invited and haven’t joined yet', 'people are invited and haven’t joined yet'),
    sentence(heldForASeat, 'on a check-in with no seat for them', 'people are on a check-in with no seat for them'),
    overThePlanSays?.trim() || sentence(waitingWithNoCheckIn, 'waiting for a seat on your plan', 'people are waiting for a seat on your plan'),
  ].filter((s): s is string => !!s)
  /* More people than the plan is for, with nothing else already saying why (a plan that fell back to the free one): said, so "4 people, which is for up to 1" never contradicts itself. */
  if (cap != null && count > cap && !overThePlanSays?.trim() && heldForASeat.length === 0 && waitingWithNoCheckIn.length === 0) extra.push('That is more people than the plan covers.')
  return [first, ...extra].join(' ')
}

/** Blue for who runs the place, amber for a guest, green for checking in, red for a problem (design-audit.md item 9 and 16). */
export function roleTagTone(role: string): TagTone {
  if (role === 'Owner' || role === 'Admin') return 'action'
  if (role === 'Guest') return 'attention'
  return 'plain'
}

export function statusTagTone(status: string): TagTone {
  if (status === 'Checking in') return 'proven'
  if (status === 'No seat on your plan' || status === 'Not let in') return 'concern'
  if (status === 'Waiting to be let in') return 'attention'
  return 'plain'
}

/**
 * A PERSON'S CHECK-INS CELL, CAPPED (HAFSAH'S FAULT 4). With thirty people each on several
 * check-ins, writing every one of them out in the cell made the table unreadable. The first few
 * (`CAP`) show, in the same words `checkInsWordApart` always used; the rest sit behind "and N
 * more", which shows the rest in place - never a check-in the reader could not already see, since
 * `m.checkIns` is only ever what the server already sent this admin.
 */
const CAP = 3
function CheckInsCell({ m, startOf }: { m: OrgMember; startOf: Map<string, { startsAt?: string | null; createdAt?: string | null }> }) {
  const [expanded, setExpanded] = useState(false)
  const parts = checkInsPartsApart(m, startOf)
  if (parts.length === 0) return <span>None</span>
  /* Commas between the names, as the prototype writes them, unless a name has a comma of its own
     ("the Nairobi route, round 1"): then a comma cannot tell one check-in from the next, so each
     goes on its own line.

     "AND" FOR THE PLAIN CASE, NOT A BARE COMMA LIST (real-user walk, Kijani Foods, fault 8d).
     Naomi's three check-ins, none of them sharing a name, used to read as a run-on list joined by
     commas ("Weekly sales push, Nairobi, Operations drop-in, Finance close"), which reads as one
     long check-in name rather than three. `namesAnd`, already used above for this same page's own
     people lists, reads the same three as a plain sentence instead. */
  const oneALine = parts.some(p => p.includes(','))
  /* `full`: whether `some` is every check-in rather than the first few ahead of a "that many more"
     button - `namesAnd` reads as a plain sentence only for the complete list; cut short ahead of
     its own "and N more", "A, B and C and 2 more" reads as two sentences arguing over one "and". */
  const list = (some: string[], full: boolean) => oneALine
    ? <>{some.map((p, i) => <div key={i}>{p}</div>)}</>
    : full ? <>{namesAnd(some)}</> : <>{some.join(', ')}</>
  if (parts.length <= CAP) return <span>{list(parts, true)}</span>
  if (expanded) {
    return (
      <span>
        {list(parts, true)}{' '}
        <button type="button" className="gwui-plain-link" onClick={() => setExpanded(false)}>
          Show fewer
        </button>
      </span>
    )
  }
  return (
    <span>
      {list(parts.slice(0, CAP), false)}{' '}
      <button type="button" className="gwui-plain-link" onClick={() => setExpanded(true)}>
        {`and ${parts.length - CAP} more`}
      </button>
    </span>
  )
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

/**
 * ONE PERSON'S LINE ON PEOPLE, IN SENTENCES (the design pass): who they are and who they report to, their team, what they can do
 * here, and how they are doing, in the same words the table's columns used. A status that needs something is said by its tag
 * beside the row instead, so it is never said twice.
 */
export function aPersonsLine(m: OrgMember, role: string, status: string): string {
  const where = whereTheySitLine(m)
  const team = m.team?.trim() ? `In ${m.team.trim()}.` : 'No team yet.'
  const can = ({
    Owner: 'Owns the organisation.',
    Admin: 'An admin.',
    'Can open check-ins': 'Can open check-ins.',
    'Takes part': 'Takes part in check-ins.',
    Guest: 'A guest.',
  } as Record<string, string>)[role] ?? `${role}.`
  const how = needsSomething(m) ? '' : `${status}.`
  return [where ? `${where}.` : '', team, can, how].filter(Boolean).join(' ')
}

export function EveryoneHere({ orgName, ownerId }: { orgName: string; ownerId: string | null }) {
  const whatsappOn = useWhatsAppIsOn()
  const me = useAuthStore((st) => st.user)
  const designPass = useTheDesignPass()
  const columns = designPass ? EXTRA_COLUMNS_IN_THE_DESIGN_PASS : EXTRA_COLUMNS
  const [removing, setRemoving] = useState<OrgMember | null>(null)
  const { data, isLoading, isError } = useQuery({ queryKey: ['org-members'], queryFn: fetchMembers })
  /* Same query the sidebar already makes (AppShell.tsx), read here only for when each check-in
     started, so a person's own check-ins cell can tell two of the same label apart. */
  const grounds = useQuery({ queryKey: ['grounds'], queryFn: groundsApi.list })
  const startOf = useMemo(() => new Map((grounds.data ?? []).map((g) => [g.id, { startsAt: g.startsAt, createdAt: g.createdAt }])), [grounds.data])
  const status = useQuery({
    queryKey: ['billing-status-people'],
    queryFn: () => apiClient.get('/billing/status').then((r: any) => (r.data.data ?? r.data) as { people?: { count: number; cap: number | null }; subscription?: { plan: string | null }; onTheHouse?: { plan: string } | null; onTheFreePlan?: boolean }),
    retry: false,
  })
  const [find, setFind] = useState('')
  const [team, setTeam] = useState('')
  const [filter, setFilter] = useState<RoleFilter>('Everyone')

  const everybody = data?.data ?? []
  const teams = useMemo(() => [...new Set(everybody.map((m) => (m.team ?? '').trim()).filter(Boolean))].sort(), [everybody])
  const shown = everybody.filter((m) => {
    const q = find.trim().toLowerCase()
    /* "by name, email or a check-in they are in" (HAFSAH'S FAULT 4): `m.checkIns` is only ever what
       the server already sent this admin, so matching against it here never surfaces a check-in
       the reader could not already see in the cell below. */
    const checkInLabels = (m.checkIns ?? []).map((c) => c.label ?? '').join(' ')
    if (q && !`${nameOf(m)} ${m.email} ${m.level ?? ''} ${checkInLabels}`.toLowerCase().includes(q)) return false
    if (team && (m.team ?? '') !== team) return false
    return matches(filter, m, ownerId)
  })

  if (isError) {
    return (
      <Note tone="error">
        I could not load your people just now. Nobody has been removed. Reload the page, and if it keeps happening, email hello@myground.work.
      </Note>
    )
  }
  if (isLoading) return <Skeleton what="Getting the people" shape="rows" />

  /* Who the head count leaves out, and why (U.4 people-group review, item 1): named, so "N people"
     and the number of rows below it never quietly disagree. */
  /* By first name, and by the whole name where somebody else here has the same first name ("Neema and Neema are invited", page audit,
     24 November, row 15). A person with no name keeps the placeholder sentence the count reads as a number. */
  const callThem = namesToCallAmong(everybody.map(nameOf))
  const called = (m: OrgMember) => (isNamePlaceholder(firstNameOf(m)) ? firstNameOf(m) : callThem(nameOf(m)) || firstNameOf(m))
  const waitingToBeLetIn = everybody.filter((m) => m.awaitingOrgApproval && !m.notLetIn).map(called)
  const heldForASeat = everybody.filter((m) => m.heldForASeat && (m.checkInsOn ?? 0) > 0).map(called)
  const waitingWithNoCheckIn = everybody.filter((m) => m.heldForASeat && (m.checkInsOn ?? 0) === 0).map(called)
  const notLetIn = everybody.filter((m) => m.notLetIn).map(called)
  const invitedWithNoAccount = everybody.filter((m) => m.noAccountYet && !m.heldForASeat && !m.notLetIn && !m.awaitingOrgApproval).map(called)

  const headCount = howManyHere(
    status.data?.people?.count ?? everybody.length,
    status.data?.subscription?.plan ?? status.data?.onTheHouse?.plan,
    status.data?.people?.cap,
    waitingToBeLetIn,
    heldForASeat,
    notLetIn,
    waitingWithNoCheckIn,
    data?.overThePlanSays ?? null,
    invitedWithNoAccount,
    !status.data?.subscription?.plan && !status.data?.onTheHouse && status.data?.onTheFreePlan === false,
  )

  /*
   * THE DESIGN PASS (21 November 2026): the full list, each person one quiet row. Their name first; one line saying who they are,
   * where they sit, what they can do and how they are doing, in sentences; their phone number with Change; the check-ins they
   * are on; and Open and Remove as quiet links. A problem with somebody's status is the only coloured tag. The filters are one
   * row, with a Show picker in place of seven chips. Who each person reports to is in their own row ("..., reports to Grace Achieng"),
   * so the separate tree is not drawn again with the pass on: it would repeat every row as fifteen more lines.
   */
  if (designPass) {
    const directReportsOf = (m: OrgMember) => everybody.filter((p) => p.reportsTo?.id === m.id && p.id !== m.id).map(nameOf)
    return (
      <>
        <Section heading={`Everyone at ${orgName}`} note={headCount}>
          <Stack gap={18}>
            {status.data?.people && everybody.some((m) => m.role === 'GUEST') && <Note>Guests with no account don’t take a seat.</Note>}
            {(
              <div className="gwui-filters-row">
                <TextField value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a person or a check-in"
                  aria-label="Find somebody by name, email or a check-in they are in" style={{ maxWidth: 240 }} />
                <label className="gwui-inline-label">
                  Team{' '}
                  <Select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Team" style={{ width: 'auto' }}>
                    <option value="">All teams</option>
                    {teams.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </label>
                <label className="gwui-inline-label">
                  Show{' '}
                  <Select value={filter} onChange={(e) => setFilter(e.target.value as RoleFilter)} aria-label="Show" style={{ width: 'auto' }}>
                    {ROLE_FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </Select>
                </label>
              </div>
            )}
            <p className="dp-count">{shown.length === 1 ? '1 person shown.' : `${shown.length} people shown.`}</p>
            {shown.length === 0 ? (
              <Empty>{find.trim() ? `Nobody here matches "${find.trim()}".` : 'Nobody here matches that.'}</Empty>
            ) : (
              <ul className="dp-rows dp-people" aria-label={`Everyone at ${orgName}`}>
                {/* The table's own headings, on a computer; on a phone each row says the same in a sentence. */}
                <li className="dp-row dp-people-row dp-people-head" aria-hidden="true">
                  <span>Person</span><span>Team</span><span>Role</span><span>Status</span><span>Check-ins</span><span />
                </li>
                <Paged items={shown} label="people" render={(m: OrgMember) => {
                    const name = nameOf(m)
                    const st = statusWord(m)
                    const role = roleWord(m, ownerId)
                    const where = whereTheySitLine(m)
                    const theirCheckIns = checkInsPartsApart(m, startOf).map((c) => `“${c}”`)
                    return (
                      <li key={m.id} className="dp-row dp-people-row">
                        <span className="dp-row-main">
                          <span className="dp-row-title">{name}</span>
                          {where && <span className="dp-row-line">{where}</span>}
                          {directReportsOf(m).length > 0 && <span className="dp-row-line">{`${namesAnd(directReportsOf(m))} ${directReportsOf(m).length === 1 ? 'reports' : 'report'} to them.`}</span>}
                          {m.email && <span className="dp-row-line">{m.email}</span>}
                          <span className="dp-row-line dp-on-a-phone">{aPersonsLine({ ...m, level: null, reportsTo: null } as OrgMember, role, st)}</span>
                          <TheirNumberInTheRow m={m} first={firstNameOf(m)} whatsappOn={whatsappOn} />
                          {/* Each check-in in quotes, so a name with a comma of its own still reads as one check-in. */}
                          <span className="dp-row-line dp-on-a-phone">{theirCheckIns.length > 0 ? `On ${namesAnd(theirCheckIns)}.` : 'On none of the check-ins yet.'}</span>
                        </span>
                        <span className="dp-cell">{m.team?.trim() || 'No team'}</span>
                        <span className="dp-cell">{role}</span>
                        <span className="dp-cell">{needsSomething(m) ? <Tag tone={statusTagTone(st)}>{st}</Tag> : st}</span>
                        <span className="dp-cell">{theirCheckIns.length > 0 ? namesAnd(theirCheckIns) : 'None'}</span>
                        <span className="dp-row-acts">
                          {needsSomething(m) && <span className="dp-on-a-phone"><Tag tone={statusTagTone(st)}>{st}</Tag></span>}
                          {!m.noAccountYet && <Link className="gwui-plain-link" aria-label={`Open ${name}`} to={`/org/members/${m.id}`}>Open</Link>}
                          {!m.noAccountYet && m.id !== me?.id && m.id !== ownerId && (
                            <button type="button" className="gwui-plain-link" aria-label={`Remove ${name}`} onClick={() => setRemoving(m)}>Remove</button>
                          )}
                        </span>
                      </li>
                    )
                  }} />
              </ul>
            )}
            {data?.meta?.total != null && data.meta.total > everybody.length && <Note>{`Showing ${everybody.length} of ${data.meta.total} people.`}</Note>}
          </Stack>
        </Section>
        {removing && (
          <RemoveFromTheOrganisation id={removing.id} name={nameOf(removing)} orgName={orgName} alsoIn={removing.alsoIn} onClose={() => setRemoving(null)} />
        )}
      </>
    )
  }

  return (
    <>
      <Folded
        summary="Who reports to whom"
        /* FAULT 13 (live review): one sentence joined to another with a semicolon reads as a
           single clipped clause, not plain writing. Two full sentences instead. */
        note="Level and reporting lines describe the organisation. What someone can do still comes from their role."
      >
        <TheTree people={everybody.filter((m) => m.role !== 'GUEST' && !m.noAccountYet)} />
      </Folded>

      <Section
        heading={`Everyone at ${orgName}`}
        note={howManyHere(
          status.data?.people?.count ?? everybody.length,
          status.data?.subscription?.plan ?? status.data?.onTheHouse?.plan,
          status.data?.people?.cap,
          waitingToBeLetIn,
          heldForASeat,
          notLetIn,
          waitingWithNoCheckIn,
          data?.overThePlanSays ?? null,
          invitedWithNoAccount,
          !status.data?.subscription?.plan && !status.data?.onTheHouse && status.data?.onTheFreePlan === false,
        )}
      >
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
              placeholder="Find a person or a check-in"
              aria-label="Find somebody by name, email or a check-in they are in"
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
              <PeopleTableHead extraColumns={columns} labels={['Person', 'Team', 'Role', 'Status', 'Check-ins', '']} />
              <ShowAFew rows={shown} few={25} what="people">
                {(m: OrgMember) => {
                  const name = nameOf(m)
                  const line = whereTheySitLine(m)
                  const st = statusWord(m)
                  const role = roleWord(m, ownerId)
                  return (
                    <PersonRow
                      key={m.id}
                      extraColumns={columns}
                      person={{ initials: initialsOf(name), name, level: line || undefined, email: m.email }}
                    >
                      {/* "None" alone, at phone width where the column name has collapsed away, read
                          as a bare word with nothing to attach to (U.4 review, item 12). */}
                      <span>{m.team?.trim() || 'No team'}</span>
                      <Tag tone={roleTagTone(role)}>{role}</Tag>
                      <span>
                        <Tag tone={statusTagTone(st)}>{st}</Tag>
                        {/* Their number, always, with "Change" to add or change it here (Hafsah, 30 October 2026); where
                            they are on WhatsApp only while it is on (pilots on WhatsApp, 14 October). */}
                        <TheirNumberInTheRow m={m} first={firstNameOf(m)} whatsappOn={whatsappOn} />
                      </span>
                      <CheckInsCell m={m} startOf={startOf} />
                      {/* Nothing has been written for them yet, so there is no page to open (U.4
                          people-group review, item 2: Zawadi's row, held for a seat). */}
                      {/* HAFSAH, 30 SEPTEMBER, ITEM 2: A PLAIN LINK, NOT A BUTTON. The prototype
                          draws each row's "Open" (people.txt) as a plain link to the person's own
                          page, not a button - so this is now a real `<a>`, styled the same way, not
                          a `<button>` with a click handler standing in for one. */}
                      {m.noAccountYet
                        ? <span />
                        : <span>
                            <Link className="gwui-open-link" aria-label={`Open ${name}`} to={`/org/members/${m.id}`}>Open</Link>
                            {/* Remove from the list too, not only from the person's own page (run 5, 19 November). Never yourself, never whoever owns the organisation. */}
                            {m.id !== me?.id && m.id !== ownerId && (
                              <Button kind="quiet" size="small" aria-label={`Remove ${name}`} onClick={() => setRemoving(m)}>Remove</Button>
                            )}
                          </span>}
                    </PersonRow>
                  )
                }}
              </ShowAFew>
            </PeopleTable>
          )}
          {data?.meta?.total != null && data.meta.total > everybody.length && (
            <Note>{`Showing ${everybody.length} of ${data.meta.total} people.`}</Note>
          )}
        </Stack>
      </Section>
      {removing && (
        <RemoveFromTheOrganisation id={removing.id} name={nameOf(removing)} orgName={orgName} alsoIn={removing.alsoIn} onClose={() => setRemoving(null)} />
      )}
    </>
  )
}
