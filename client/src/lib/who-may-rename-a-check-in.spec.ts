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
 *
 * UPDATED FOR DECISION 119, H10 (8 October 2026). "An admin in the organisation may, as the server
 * allows" stopped being true: the server's own rule (`mayConfirmSetupOn`) now refuses an admin who
 * is not the lead WHILE the lead is still here, and lets one through only once the lead's account
 * shows they left. The case below was rewritten to prove that, rather than deleted, because the
 * old assertion was pinning the very bug H10 fixes on the server - an admin could rename any
 * check-in in her organisation at any time, whoever ran it.
 */
describe('who may rename a check-in', () => {
  const CHECK_IN = { initiatorId: 'u-lead' }

  it('the person leading it may', () => {
    expect(mayRenameACheckIn(CHECK_IN, { id: 'u-lead', role: 'MEMBER' })).toBe(true)
  })

  it('an admin in the organisation may NOT while the lead is still here (decision 119, H10) - the list does not yet say whether the lead has left, so the safe side is shown', () => {
    expect(mayRenameACheckIn(CHECK_IN, { id: 'u-other', role: 'ADMIN' })).toBe(false)
  })

  it('an admin may once the check-in row says the lead has left', () => {
    expect(mayRenameACheckIn({ ...CHECK_IN, leadHasLeft: true }, { id: 'u-other', role: 'ADMIN' })).toBe(true)
  })

  it('an admin may not while the row explicitly says the lead is still here', () => {
    expect(mayRenameACheckIn({ ...CHECK_IN, leadHasLeft: false }, { id: 'u-other', role: 'ADMIN' })).toBe(false)
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
