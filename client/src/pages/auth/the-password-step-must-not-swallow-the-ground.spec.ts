import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A GROUND DESCRIBED BEFORE SIGNING UP MUST SURVIVE THE PASSWORD STEP.
 *
 * The anonymous entry chat lets somebody describe their situation before they have an account. The
 * ground is only really created at verify-email, by the commit in this file. Adding the password
 * step, I put its redirect ABOVE that commit and wrote a comment praising the placement - "so it
 * applies to every arrival". It applied to every arrival by returning before the commit ran. A
 * person set a password and landed on an empty grounds list, and everything they had described was
 * gone.
 *
 * That is the vanishing-ground failure this product had already found and fixed once, reintroduced
 * by a change about passwords. Nothing caught it except the persona suite, which has a whole runner
 * named after this exact symptom - the typecheck was clean and every unit test passed.
 *
 * Pinned as source order because that IS the bug: both pieces of code were correct on their own,
 * and only their sequence was wrong. Live behaviour is covered by the persona suite_v runner.
 */
const SRC = readFileSync(join(__dirname, 'MagicVerifyPage.tsx'), 'utf8')
/** Comments stripped, since the old placement is described at length in one. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the commit runs before the password redirect', () => {
  it('commitFlow is awaited, not returned straight out of the flow', () => {
    /**
     * `return commitFlow(...)` was the shape that made the bug possible - nothing could run after
     * it. Awaiting gives the password step somewhere to happen that is after the ground exists.
     */
    expect(CODE).toMatch(/const outcome = await commitFlow\(payload, hadEntryIntent\)/)
  })

  it('and the password redirect appears AFTER the commit in the flow', () => {
    const commitAt = CODE.indexOf('await commitFlow(')
    const handoverAt = CODE.indexOf('passwordStep(`/grounds/')
    expect(commitAt).toBeGreaterThan(-1)
    expect(handoverAt).toBeGreaterThan(-1)
    expect(handoverAt).toBeGreaterThan(commitAt)
  })

  it('nothing returns UNCONDITIONALLY to the password step before the commit', () => {
    /**
     * The precise old shape, and the reason this assertion is narrow rather than "no set-password
     * redirect before the commit": there IS a legitimate early one. An arrival carrying an explicit
     * destination - an invite, a report link - has no entry draft to commit, so it may go straight
     * to the password step, as long as it takes its destination with it.
     *
     * What must never come back is the version that returned for EVERYBODY, towards a generic
     * grounds list, before the commit had a chance to run.
     */
    const beforeCommit = CODE.slice(0, CODE.indexOf('await commitFlow('))
    /** An `if (needsPassword)` guard whose body returns, standing alone before the commit. */
    expect(beforeCommit).not.toMatch(/if \(res\.needsPassword && res\.passwordSetupToken\) \{\s*\n\s*const onward/)
    expect(beforeCommit).not.toMatch(/next=\$\{encodeURIComponent\(onward\)\}/)
  })

  it('and the password step is a helper the commit path can call, not a branch that pre-empts it', () => {
    expect(CODE).toMatch(/const passwordStep = \(destination: string\)/)
  })
})

describe('the password step keeps hold of where the person was going', () => {
  it('a successful commit sends them on to the ground that was just created', () => {
    /** Not /grounds. The ground itself is what tells them nothing was lost. */
    expect(CODE).toMatch(/passwordStep\(`\/grounds\/\$\{outcome\.groundId\}`\)/)
  })

  it('an explicit destination is preserved through the detour', () => {
    /** An invite or report link must still land there after the password, not on a generic list. */
    expect(CODE).toMatch(/return passwordStep\(fromParam\) \?\? \{ kind: 'redirect', to: fromParam \}/)
  })

  it('and a commit FAILURE stays on this screen instead', () => {
    /**
     * There is a "Try again" here that re-attempts the commit. Redirecting away mid-failure loses
     * the retry and the explanation together, and the password will be asked for next time anyway.
     */
    expect(CODE).toMatch(/if \(outcome\.kind === 'success'\) \{/)
  })

  it('somebody who already has a password is not sent through it at all', () => {
    expect(CODE).toMatch(/res\.needsPassword && res\.passwordSetupToken/)
  })
})
