import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { statusWord, roleWord } from './people-here'

/**
 * THE PEOPLE PAGE, READ AS AN ADMIN PUTTING 160 PEOPLE ON.
 *
 * It had one email box and a list. Three things were missing and each one of them is the whole job
 * at that size: a way to paste, a way to see where each person actually got to, and a way to make
 * somebody else an admin.
 *
 * U.4 moved each of these into its own part of the page, as the prototype draws it: pasting into
 * InvitePeople.tsx, where each person got to into people-here.ts (read on the list and on one
 * person's page), and the role onto one person's page, OnePersonPage.tsx. The guards follow them
 * there; the promises are the same. The prototype's statuses replace "Checked in" and "Answered on
 * 1 of 3" (see statusWord), and the rendered page is checked in OrgMembersPage.spec.tsx,
 * InvitePeople.spec.tsx and OnePersonPage.spec.tsx.
 */
const INVITE = readFileSync(join(__dirname, 'InvitePeople.tsx'), 'utf8')
const ONE = readFileSync(join(__dirname, 'OnePersonPage.tsx'), 'utf8')

describe('pasting a company in', () => {
  it('checks the list before anything is sent, and offers the rest only while it is still a check', () => {
    /* The team picked for the list goes with it (Hafsah, 21 November 2026). */
    expect(INVITE).toContain('mutationFn: () => pasteMany(pasted, true, role, team)')
    expect(INVITE).toContain("a.rows.every((r) => r.result === 'invited')")
    expect(INVITE).toContain('answer.preview && canGo > 0')
  })

  it('changes tense once the invitations have gone', () => {
    const map = INVITE.slice(INVITE.indexOf('const HOW_IT_READS'), INVITE.indexOf('const ROLES'))
    expect(map).toContain("sent: 'Invited'")
    expect(INVITE).toContain('answer.preview ? how.says : (how.sent ?? how.says)')
  })

  it('previews and sends through one call, one flag apart', () => {
    const calls = INVITE.match(/apiClient\.post\('\/users\/invitations'/g) ?? []
    expect(calls).toHaveLength(1)
    expect(INVITE).toContain('pasteMany(pasted, true, role, team)')
    expect(INVITE).toContain('pasteMany(pasted, false, role, team)')
  })

  it('says how many seats are left before the send, not during it', () => {
    expect(INVITE).toContain('Your plan has room for ${answer.seatsLeft} more')
    expect(INVITE).toContain('See the plans')
  })

  it('names what will happen to every kind of row', () => {
    const map = INVITE.slice(INVITE.indexOf('const HOW_IT_READS'), INVITE.indexOf('const ROLES'))
    for (const kind of ['invited', 'already here', 'repeated', 'not an email', 'no seat']) {
      expect(map).toContain(`${kind.includes(' ') ? `'${kind}'` : kind}:`)
    }
  })
})

describe('where each person got to', () => {
  const m = (over: any) => ({ id: 'x', email: 'x@y.co', firstName: 'X', lastName: '', role: 'MEMBER', isActive: true, isEmailVerified: true, createdAt: '', ...over })
  it('tells an unopened invitation, an account on nothing, one not answered yet, and somebody checking in apart', () => {
    expect(statusWord(m({ state: 'invited' }))).toBe('Invited, not opened')
    expect(statusWord(m({ state: 'signed in', checkInsOn: 0 }))).toBe('Signed in, not on a check-in')
    /* Somebody on five check-ins who has answered none is not the same as somebody on none. */
    expect(statusWord(m({ state: 'signed in', checkInsOn: 5, checkInsAnswered: 0 }))).toBe('Not answered yet')
    expect(statusWord(m({ state: 'checked in', checkInsOn: 2, checkInsAnswered: 1 }))).toBe('Checking in')
    expect(statusWord(m({ awaitingOrgApproval: true }))).toBe('Waiting to be let in')
    /* U.4 re-review: a guest added with no seat for them, as the prototype's row reads. */
    expect(statusWord(m({ role: 'GUEST', heldForASeat: true, state: 'signed in', checkInsOn: 1, checkInsNotOpened: 1 }))).toBe('No seat on your plan')
    expect(statusWord(m({ role: 'GUEST', heldForASeat: false, state: 'signed in', checkInsOn: 1, checkInsNotOpened: 1 }))).toBe('Invited, not opened')
    /* U.4 review: added by name, invitation not opened yet. It read "Signed in, not on a check-in". */
    expect(statusWord(m({ state: 'signed in', checkInsOn: 1, checkInsAnswered: 0, checkInsNotOpened: 1 }))).toBe('Invited, not opened')
    expect(statusWord(m({ state: 'signed in', checkInsOn: 2, checkInsAnswered: 0, checkInsNotOpened: 1 }))).toBe('Not answered yet')
    /*
     * REAL-USER WALK, KIJANI FOODS, FAULT 8D: somebody who only runs check-ins, and is never
     * expected to answer one, is not "not answered yet" - that reads as a thing still waiting on
     * them, which is untrue for a lead who leads and never takes part in their own check-in.
     */
    expect(statusWord(m({
      state: 'checked in', checkInsOn: 3, checkInsAnswered: 0,
      checkIns: [{ id: 'a', label: 'A', runsIt: true }, { id: 'b', label: 'B', runsIt: true }, { id: 'c', label: 'C', runsIt: true }],
    }))).toBe('Runs 3 check-ins')
    /* One of the three check-ins is hers to answer, not just to run: back to the honest "not yet". */
    expect(statusWord(m({
      state: 'checked in', checkInsOn: 3, checkInsAnswered: 0,
      checkIns: [{ id: 'a', label: 'A', runsIt: true }, { id: 'b', label: 'B', runsIt: true }, { id: 'c', label: 'C', runsIt: false }],
    }))).toBe('Not answered yet')
  })
})

describe('what somebody is here', () => {
  it('offers the three things an admin means, and writes one field', () => {
    expect(ONE).toContain("{ value: 'ADMIN', title: 'Admin'")
    expect(ONE).toContain("{ value: 'LEAD', title: 'Can open check-ins'")
    expect(ONE).toContain("{ value: 'MEMBER', title: 'Takes part'")
    expect(ONE).toContain('apiClient.patch(`/users/${id}`, { role: what })')
    expect(ONE).not.toContain('mayOpenCheckIns')
  })

  it('offers no change on your own role or the owner\'s: the server refuses both', () => {
    /*
     * REBUILT (design-audit.md section 3, "One person"): the per-button `locked` variable is gone -
     * the role choice is now the shared `ChoiceCards`, which takes one group-level `disabled` and
     * locks every card but the chosen one. The rule itself (nobody may change their own role or the
     * owner's) is unchanged, only where it is written.
     */
    expect(ONE).toContain('disabled={isOwner || isMe ||')
  })

  it('and the owner reads as "Owner" in the list', () => {
    expect(roleWord({ id: 'a', role: 'ADMIN' }, 'a')).toBe('Owner')
    expect(roleWord({ id: 'b', role: 'LEAD' }, 'a')).toBe('Can open check-ins')
  })
})
