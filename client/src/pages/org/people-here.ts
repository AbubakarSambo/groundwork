import { apiClient } from '@/api/client'
import { roleWord as theRoleWord } from '@/components/gw/your-organisations'

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
  /** A guest added when the plan had no seat for them: holds none, and is not offered the check-in yet. */
  heldForASeat?: boolean
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

export function nameOf(m: Pick<OrgMember, 'firstName' | 'lastName' | 'email'>): string {
  return `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || m.email
}

export function firstNameOf(m: Pick<OrgMember, 'firstName' | 'lastName' | 'email'>): string {
  return (m.firstName ?? '').trim() || nameOf(m)
}

export function initialsOf(name: string): string {
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
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
 */
export function statusWord(m: OrgMember): string {
  if (m.notLetIn) return 'Not let in'
  if (m.awaitingOrgApproval) return 'Waiting to be let in'
  if (m.heldForASeat) return 'No seat on your plan'
  if (m.state === 'invited') return 'Invited, not opened'
  if ((m.checkInsOn ?? 0) === 0) return 'Signed in, not on a check-in'
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

export const A_FAILURE = 'That did not go through, and nothing has changed. Try again.'
