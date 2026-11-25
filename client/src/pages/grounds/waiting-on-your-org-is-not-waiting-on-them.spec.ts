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
const ROSTER = strip(readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'WhosInItRoster.tsx'), 'utf8'))

/* The roster is People and setup's one list now (page audit, 24 November 2026, row 8): each row's sentence is whereThisPersonIs's,
   in WhosInItRoster.tsx, so these read it there. */
describe('a person the organisation has not let in yet', () => {
  it('says so on their row, instead of reading as an unopened invitation', () => {
    expect(ROSTER).toContain('is from outside your organisation, so an admin has to let them in before they can check in.')
    expect(ROSTER).toContain('p.user?.awaitingOrgApproval')
  })

  it('and an admin is sent where the approval is', () => {
    expect(ROSTER).toContain('<Link className="gwui-open-link" to="/org/members">Go to People</Link>')
  })

  it('is checked only after they have an account, so it cannot mask a real unopened invite', () => {
    expect(ROSTER).toContain("if (p.userId && p.user?.awaitingOrgApproval) return 'admin'")
  })
})


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
