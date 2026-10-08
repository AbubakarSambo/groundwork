import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { mayRenameACheckIn } from './who-may-rename-a-check-in'

/**
 * THE PENCIL WAS OFFERED TO EVERYONE AND WORKED FOR ALMOST NOBODY.
 *
 * The audit found the rail's rename inert: a party pressed it, the field opened, they typed, and
 * nothing happened - no error, no change. The server then started answering 403 properly, which
 * turned "nothing happened" into an unhandled rejection: the field stayed open in edit mode and
 * still said nothing. Same experience for the person, arriving a different way.
 *
 * WHAT WAS DRIVEN IN THE BROWSER AND WHAT IS PROVEN HERE. The failure path was driven in the
 * running product with PATCH forced to 500: one message rather than two, the field closes, and a
 * real rename still works and persists. What the browser could NOT show is a MEMBER not seeing the
 * pencil - that session is signed in as an admin, who correctly sees it everywhere, and a token for
 * a second account could not be minted. So the rule itself is proven here instead.
 */
describe('who may rename a check-in', () => {
  const CHECK_IN = { initiatorId: 'u-lead' }

  it('the person leading it may', () => {
    expect(mayRenameACheckIn(CHECK_IN, { id: 'u-lead', role: 'MEMBER' })).toBe(true)
  })

  it('an admin who does not lead it may not while the lead is still there, because the server refuses them (decision 119, H10)', () => {
    /* Before this, the rail offered every admin the pencil and the server answered "Only <lead>, who
       runs this check-in, can change how it is set up". */
    expect(mayRenameACheckIn(CHECK_IN, { id: 'u-other', role: 'ADMIN' })).toBe(false)
    expect(mayRenameACheckIn({ ...CHECK_IN, mayChangeSetup: false }, { id: 'u-other', role: 'ADMIN' })).toBe(false)
  })

  it('an admin may once the server says they may change the set-up (the lead has left)', () => {
    expect(mayRenameACheckIn({ ...CHECK_IN, mayChangeSetup: true }, { id: 'u-other', role: 'ADMIN' })).toBe(true)
  })

  it('a party who does not lead it may not - this is the one the audit found', () => {
    expect(mayRenameACheckIn(CHECK_IN, { id: 'u-party', role: 'MEMBER' })).toBe(false)
  })

  it('a guest may not', () => {
    expect(mayRenameACheckIn(CHECK_IN, { id: 'u-guest', role: 'GUEST' })).toBe(false)
  })

  it('and nobody signed out may, rather than defaulting open', () => {
    expect(mayRenameACheckIn(CHECK_IN, null)).toBe(false)
    expect(mayRenameACheckIn(CHECK_IN, {})).toBe(false)
  })

  it('the rail asks this rule rather than repeating it', () => {
    /* Repeating the condition inline is how the rail and the server drifted apart the first time. */
    const shell = readFileSync(join(__dirname, '../components/gw/AppShell.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
    expect(shell).toContain('mayRenameACheckIn')
    expect(shell).toMatch(/\{mayRename\(g\) && <button/)
  })
})
