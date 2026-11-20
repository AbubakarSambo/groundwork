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

/*
 * CHANGED IN BATCH 2, GROUP 6 (staging check S14, Hafsah 4 November): there is no password step after an emailed link at all,
 * and no "Your email is confirmed" page either. A link signs in and lands where the person was going; a password is set from
 * Settings. What this file protected is kept: the check-in described before signing in is saved first, and nothing returns
 * before that save.
 */
describe('the commit runs, and nothing stands between the link and where it goes', () => {
  it('commitFlow is awaited, not returned straight out of the flow', () => {
    expect(CODE).toMatch(/const outcome = await commitFlow\(payload, hadEntryIntent\)/)
  })

  it('no password step and no confirmation page, before or after the commit', () => {
    expect(CODE).not.toContain('passwordSetupToken')
    expect(CODE).not.toContain('needsPassword')
    expect(CODE).not.toContain('/set-password')
    expect(CODE).not.toContain('<EmailConfirmed')
    expect(CODE).not.toContain("kind: 'confirmed'")
  })

  it('an explicit destination goes straight there', () => {
    expect(CODE).toMatch(/return \{ kind: 'redirect', to: goingTo \}/)
  })

  it('and a commit FAILURE stays on this screen instead', () => {
    expect(CODE).toMatch(/if \(outcome\.kind === 'success'\) \{/)
  })

  it('the way out of the welcome lands on the check-in', () => {
    expect(CODE).toContain("navigate(`/grounds/${nextGroundId}`, { replace: true })")
  })
})
