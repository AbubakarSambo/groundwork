import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A CONTROL IS OFFERED ONLY TO SOMEBODY WHO CAN USE IT.
 *
 * Two from the audit's twenty bugs, and the same shape twice: the screen offers something the
 * server will refuse. Being shown a door, walking through it and being turned away teaches somebody
 * the product is broken rather than that the rule is deliberate.
 *
 * BUG 9 - the check-in door asked `mayOpenCheckIns !== false`, so a MISSING field opened it. The
 * field had gone missing twice already, both times because a second builder of the user shape did
 * not carry it, and each time every member in the organisation was shown "Start a check-in" and
 * refused on submit.
 *
 * BUG 19 - the rename pencil rendered beside every check-in for every user, with no role condition
 * at all. Harmless in the worst way while renaming did nothing for anybody; a refusal waiting to
 * happen the moment it started working.
 */
const read = (p: string) =>
  readFileSync(join(__dirname, p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

const APP = read('App.tsx')
const SHELL = read('components/gw/AppShell.tsx')

describe('a control is offered only to whoever can use it', () => {
  it('reads the real files, so an empty one cannot pass', () => {
    expect(APP.length).toBeGreaterThan(3000)
    expect(SHELL.length).toBeGreaterThan(5000)
  })

  it('BUG 9 IS NOT A BUG, AND THIS RECORDS WHY', () => {
    /*
     * The audit lists `mayOpenCheckIns !== false` as failing open: a lost field re-offers the
     * button, and the field has gone missing twice. That is all true, and I changed it to
     * `=== true` before finding that the trade-off had already been made deliberately, revisited
     * once, and kept - see nobody-sees-a-button-that-refuses-them.spec.ts.
     *
     * The reasoning there is better than mine. `=== true` hides the product's main action for the
     * moment between rehydrating a stored session and `/auth/me` answering - a certain cost paid by
     * everybody on every load, against an uncertain one paid rarely. The real defence is upstream:
     * the field must not go missing, which the API asserts by requiring every endpoint that returns
     * a user to route through one shape.
     *
     * So the client keeps `!== false`, on purpose. This asserts that the upstream defence is the
     * thing actually holding it up, because that is what makes the trade-off safe.
     */
    const api = (f: string) =>
      readFileSync(join(__dirname, '../../api/src/modules/auth/', f), 'utf8')
    expect(api('one-shape-for-a-person.spec.ts')).toContain('mayOpenCheckIns: mayOpen(')
    expect(api('who-you-are-is-one-shape.spec.ts')).toContain('mayOpenCheckIns: mayOpen(')
    /* And the client still reads it the deliberate way. */
    expect(APP).toContain('user?.mayOpenCheckIns !== false')
  })

  it('BUG 19: the rename pencil asks the same question the server asks', () => {
    /*
     * This asserted the condition inline, as `g.initiatorId === user?.id || user?.role === 'ADMIN'`
     * written at the button. Two branches fixed BUG 19 independently and the other one moved that
     * question into `who-may-rename-a-check-in`, shared with the server's own rule, so the rail and
     * the server cannot answer differently. The intent of this test - the pencil asks what the
     * server asks - is better served by the shared rule than by a second copy of the condition, so
     * it asserts the rule is what gates the button.
     */
    const pencil = SHELL.slice(SHELL.indexOf('className="gw-rename"') - 400, SHELL.indexOf('className="gw-rename"'))
    expect(pencil).toMatch(/\{mayRename\(g\) &&/)
    expect(SHELL).toContain("import { mayRenameACheckIn } from '@/lib/who-may-rename-a-check-in'")
    expect(SHELL).toMatch(/const mayRename = \(g: Ground\) => mayRenameACheckIn\(g, user\)/)

    /* And the rule itself still asks that question, rather than having become something else. */
    const rule = readFileSync(join(__dirname, 'lib/who-may-rename-a-check-in.ts'), 'utf8')
    expect(rule).toMatch(/checkIn\.initiatorId === viewer\.id/)
    expect(rule).toMatch(/checkIn\.mayChangeSetup/)
  })

  it('and the server refuses the same people, so the two cannot drift apart', () => {
    const service = readFileSync(
      join(__dirname, '../../api/src/modules/grounds/grounds.service.ts'),
      'utf8',
    )
    /* Decision 119, H10: renaming is part of the set-up, so the server lets the lead through and sends
       anybody else to the set-up rule (an admin only once the lead has left). The rail asks the same. */
    expect(service).toMatch(/if \(dto\.label !== undefined\) \{[\s\S]{0,600}?if \(ground\.initiatorId !== requestingUserId\) await this\.mayConfirmSetupOn\(ground, requestingUserId\)/)
    const rule = readFileSync(join(__dirname, 'lib/who-may-rename-a-check-in.ts'), 'utf8')
    expect(rule).toMatch(/mayChangeSetup/)
    expect(rule).not.toMatch(/viewer\.role === 'ADMIN'/)
  })
})
