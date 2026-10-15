import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "PENDING" MEANT TWO DIFFERENT THINGS AND LOOKED LIKE ONE.
 *
 * "When you add a participant that is one on the org, the org has to approve, and you see pending
 * org approval and not pending check-in. Do people know this when they add someone?"
 *
 * The roster showed "Invite pending" for somebody whose invitation had gone out days ago and who
 * is held by an admin in the LEAD'S OWN organisation. So a lead reads it as the person ignoring
 * their email, and chases the person instead of the admin who can let them in.
 *
 * ONE CORRECTION TO MY OWN EARLIER READING OF THIS: the approval queue is NOT invisible. It is on
 * the People page, for admins, whenever somebody is in it. What was missing is the connection - the
 * check-in's roster never said which kind of pending it was, and nobody was told the rule before
 * they added anybody.
 *
 * AND IT IS SAID AS A RULE, NOT AS A PREDICTION. Working out in advance whether one address will
 * need approval means looking up whether it already has an account and where - which would turn
 * this box into a way to test whether somebody is a Groundwork user.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const PAGE = strip(readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8'))

describe('a person the organisation has not let in yet', () => {
  it('says so on their row, instead of reading as an unopened invitation', () => {
    expect(PAGE).toContain('Waiting on your organisation')
    expect(PAGE).toContain('p.user?.awaitingOrgApproval')
  })

  it('and goes where the approval is, because the lead cannot do it from here', () => {
    const at = PAGE.indexOf('Waiting on your organisation')
    expect(PAGE.slice(Math.max(0, at - 500), at)).toContain("navigate('/org/members')")
  })

  it('is checked only after they have an account, so it cannot mask a real unopened invite', () => {
    /* The order of the branches is the rule: no account at all is still "Invite pending". */
    const noAccount = PAGE.indexOf('Invite pending')
    const awaiting = PAGE.indexOf('p.user?.awaitingOrgApproval')
    expect(noAccount).toBeLessThan(awaiting)
  })
})

/*
 * REPOINTED (People and setup rebuild, 29 Sept): the add-a-person form and its approval-rule
 * sentence moved to WhosInItRoster.tsx, which CheckInPeopleAndSetup.tsx renders inside "Who's in
 * it" - the roster row logic this file's first describe block checks stayed on GroundAdminPage.tsx
 * (the Sessions tab's own roster is untouched).
 */
const ROSTER = strip(readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'WhosInItRoster.tsx'), 'utf8'))

describe('before anybody is added', () => {
  it('the rule is on the control that adds them', () => {
    expect(ROSTER).toContain('an admin here')
    expect(ROSTER).toContain('has to let them in before they can check in')
  })

  it('and it is the rule, not a lookup on the address they typed', () => {
    /* A per-address prediction would disclose whether that email is registered here. */
    expect(ROSTER).not.toMatch(/willNeedApproval|checkApprovalFor|lookupOrgFor/)
  })
})
