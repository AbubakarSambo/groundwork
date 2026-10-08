import { apiClient } from '@/api/client'
import { roleWord as theRoleWord } from '@/components/gw/your-organisations'
import { whatTellsItApart, type HasLabelAndStart } from '@/lib/tell-apart-the-same-name'

/**
 * THE PEOPLE IN THIS ORGANISATION, AS AN ADMIN READS THEM (U.4, A4 people.txt and one-person.txt).
 *
 * One read for the People page and one person's page, and the words each row is shown in. Every
 * word here is the prototype's, apart from the few listed in the morning report.
 */
export interface OrgMember {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  /**
   * DECISION 115: A NAME FOR EVERY PERSON, NEVER AN ADDRESS IN ITS PLACE. `GET /users` now carries
   * this on every row - the person's name, "Someone who has not given a name yet" for one who has
   * not, and for somebody added or invited with no seat, the name typed beside their address, or
   * "Somebody invited by email". Seven of twelve people at one real organisation had no name, and
   * `nameOf`/`firstNameOf` used to fall back to the raw email address for them. Read this first,
   * wherever a name goes.
   */
  displayName?: string
  role: string
  isActive: boolean
  isEmailVerified: boolean
  createdAt: string
  phoneNumber?: string | null
  state?: 'invited' | 'signed in' | 'checked in'
  checkInsOn?: number
  checkInsAnswered?: number
  /** Check-ins they were added to and have not opened the invitation for yet. */
  checkInsNotOpened?: number
  arrivedThroughACheckIn?: boolean
  awaitingOrgApproval?: boolean
  /** This organisation's own admin said no to their latest request to join it. */
  notLetIn?: boolean
  /** Who decided that, when known. */
  notLetInBy?: string | null
  /** When that decision was made. */
  notLetInAt?: string | null
  /** A guest added when the plan had no seat for them: holds none, and is not offered the check-in yet. */
  heldForASeat?: boolean
  /** Held for a seat, and nothing has been written for them yet: there is no account to open. */
  noAccountYet?: boolean
  /** Where they sit here. Describes the organisation; grants nothing. */
  level?: string | null
  team?: string | null
  reportsTo?: { id: string; name: string } | null
  /** Which of this organisation's check-ins they are on. */
  checkIns?: { id: string; label: string | null; runsIt: boolean }[]
}

/**
 * EVERY PERSON, NOT THE FIRST PAGE OF THEM. The shared pagination caps a page at 100, so this pages
 * and stops, and a truncated list says so. See the note that used to sit on the People page.
 */
const MOST_PAGES = 10
const PER_PAGE = 100

export async function fetchMembers(): Promise<{ data: OrgMember[]; meta: { total: number } }> {
  const all: OrgMember[] = []
  let total = 0
  for (let page = 1; page <= MOST_PAGES; page += 1) {
    const r = await apiClient.get(`/users?limit=${PER_PAGE}&page=${page}`)
    const body = r.data.data ? r.data : { data: r.data, meta: { total: 0 } }
    all.push(...(body.data ?? []))
    total = body.meta?.total ?? all.length
    if (all.length >= total || (body.data ?? []).length < PER_PAGE) break
  }
  /* Somebody who left is not one of the organisation's people (U.4 fourth review). The server leaves
     them out already; this keeps every filter's count true even against an older server. */
  const here = all.filter((m) => m.isActive !== false)
  return { data: here, meta: { total: total - (all.length - here.length) } }
}

export function nameOf(m: Pick<OrgMember, 'firstName' | 'lastName' | 'email' | 'displayName'>): string {
  if (m.displayName) return m.displayName
  return `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || m.email || ''
}

/**
 * THE FIRST WORD, NEVER THE WHOLE FIELD (U.4 re-review, item 7). Some accounts, Rukia's own owner
 * account among them, hold a full name in the `firstName` field alone ("Rukia Otieno", `lastName`
 * empty) - a record of how the account was created, not of what her first name is. Reading the
 * field whole read "What Rukia Otieno can do..." and "Rukia Otieno owns this organisation..." where
 * every other person on the same page reads their first name alone ("What Faraji can do...").
 */
export function firstNameOf(m: Pick<OrgMember, 'firstName' | 'lastName' | 'email' | 'displayName'>): string {
  const whole = (m.firstName ?? '').trim() || nameOf(m)
  return whole.split(/\s+/)[0] || whole
}

/**
 * B-066: "SOMEONE WHO HAS NOT GIVEN A NAME YET" READ AS THE INITIALS "SW".
 *
 * `initialsOf` took the first letter of the first two words of whatever it was given, which is
 * right for an actual name but wrong for the placeholder sentence decision 115 serves in its place
 * - "Someone" and "who" are not a first and last name, they are the start of a sentence that says
 * there isn't one. E1 on Riverbank Trading's old data found every person with no name on People
 * reading "SW" in their avatar circle. Both of the app's own placeholder sentences are matched
 * literally and read as a plain neutral mark instead, never initials made out of their own words.
 */
const NO_NAME_PLACEHOLDERS = new Set(['Someone who has not given a name yet', 'Somebody invited by email'])

export function initialsOf(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim()
  if (NO_NAME_PLACEHOLDERS.has(trimmed)) return ''
  const parts = trimmed.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

/** Role, in the prototype's words. The owner is one field, not a role, and reads as "Owner". */
export function roleWord(m: Pick<OrgMember, 'id' | 'role'>, ownerId: string | null): string {
  if (ownerId && m.id === ownerId) return 'Owner'
  return theRoleWord(m.role)
}

/**
 * Where they got to. "Checking in", "Signed in, not on a check-in", "Invited, not opened" and
 * "Waiting to be let in" are the prototype's. "Not answered yet" is ours: somebody on a check-in who
 * has not answered one, which the prototype has no word for and an admin rolling out needs. "Not let
 * in" is Hafsah's decision of 29 September: once this organisation's own admin has said no, "waiting"
 * is no longer true.
 *
 * "RUNS N CHECK-INS", NOT "NOT ANSWERED YET", FOR SOMEBODY WHO ONLY RUNS THEM (real-user walk,
 * Kijani Foods, fault 8d). Naomi, who leads check-ins but answers in none of them, read "Not
 * answered yet" - untrue: nothing is waiting on her to answer, because a lead who is not also a
 * party to their own check-in never answers one. `checkIns[].runsIt` already says which of
 * `checkInsOn` she runs rather than takes part in; where every one of them is hers to run, and
 * none is a seat she is still expected to answer from, the status says what is actually true.
 */
export function statusWord(m: OrgMember): string {
  if (m.notLetIn) return 'Not let in'
  if (m.awaitingOrgApproval) return 'Waiting to be let in'
  if (m.heldForASeat) return 'No seat on your plan'
  if (m.state === 'invited') return 'Invited, not opened'
  if ((m.checkInsOn ?? 0) === 0) return 'Signed in, not on a check-in'
  const onlyRuns = (m.checkIns ?? []).length > 0 && (m.checkIns ?? []).every((c) => c.runsIt)
  if (onlyRuns && (m.checkInsAnswered ?? 0) === 0) {
    const n = m.checkIns!.length
    return `Runs ${n} check-in${n === 1 ? '' : 's'}`
  }
  /* Added to a check-in, and has not opened the invitation yet (U.4 review). */
  if ((m.checkInsAnswered ?? 0) === 0 && (m.checkInsNotOpened ?? 0) >= (m.checkInsOn ?? 0)) return 'Invited, not opened'
  if ((m.checkInsAnswered ?? 0) === 0) return 'Not answered yet'
  return 'Checking in'
}

export function needsSomething(m: OrgMember): boolean {
  return ['Waiting to be let in', 'Not let in', 'No seat on your plan', 'Invited, not opened', 'Not answered yet'].includes(statusWord(m))
}

/** "Sales rep, reports to Wairimu Kamau", or either half on its own, or nothing. */
export function whereTheySitLine(m: Pick<OrgMember, 'level' | 'reportsTo'>): string {
  const level = (m.level ?? '').trim()
  const to = m.reportsTo?.name
  if (level && to) return `${level}, reports to ${to}`
  if (level) return level
  if (to) return `Reports to ${to}`
  return ''
}

export function checkInsWord(m: Pick<OrgMember, 'checkIns'>): string {
  const labels = (m.checkIns ?? []).map((c) => c.label ?? 'A check-in with no name yet')
  return labels.length ? labels.join(', ') : 'None'
}

/**
 * THE SAME CELL, WITH TWO OF A PERSON'S OWN CHECK-INS TOLD APART WHEN THEY SHARE A LABEL
 * (walkthrough pass 2, item 5). A person's own check-ins cell can hold the same label twice
 * ("Help a new hire get started" more than once in one row) with nothing to say which is which.
 * `m.checkIns` itself carries no date (users.service.ts sends only `id`, `label`, `runsIt`), so
 * this reads it from the grounds this reader already has, by id - the same join YouPage.tsx makes
 * for its own "Your work in each" list.
 */
/** The same read as `checkInsWordApart`, as the list of pieces it joins - one per check-in, each
 * already told apart from a same-named one in the same cell when it needs to be. Used where the
 * cell is capped to the first few rather than written out in full (HAFSAH'S FAULT 4, the People
 * page). */
export function checkInsPartsApart(m: Pick<OrgMember, 'checkIns'>, startOf: Map<string, { startsAt?: string | null; createdAt?: string | null }>): string[] {
  const checkIns = m.checkIns ?? []
  if (checkIns.length === 0) return []
  const withDates: HasLabelAndStart[] = checkIns.map((c) => ({ id: c.id, label: c.label ?? 'A check-in with no name yet', ...startOf.get(c.id) }))
  return withDates.map((c) => {
    const apart = whatTellsItApart(withDates, c)
    return apart ? `${c.label}, ${apart}` : c.label
  })
}

export function checkInsWordApart(m: Pick<OrgMember, 'checkIns'>, startOf: Map<string, { startsAt?: string | null; createdAt?: string | null }>): string {
  const parts = checkInsPartsApart(m, startOf)
  return parts.length ? parts.join(', ') : 'None'
}

export const A_FAILURE = 'That did not go through, and nothing has changed. Try again.'
