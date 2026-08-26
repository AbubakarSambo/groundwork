import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * A CHECK-IN DOES NOT CAP HOW MANY PEOPLE ARE IN IT. THE PLAN DOES.
 *
 * The setup screen carried two claims about this and both were false.
 *
 * "For coaching or mentoring, one ground per person works best. Each person keeps their own private
 * record across sessions." A check-in can be one person or a group - the cohort situations exist for
 * exactly the group case - and the API is explicit about it: "all scenarios support any number of
 * participants, the initiator decides who needs to be in the check-in, no hard-coded per-scenario cap."
 * It was also gated on the NEW_HIRE scenario, so advice about COACHING only appeared to somebody who
 * had just said they were onboarding a hire.
 *
 * "Up to 20 per ground." There is no 20 anywhere in the product. The real ceilings are the free member
 * limit (5) and the organisation's plan (Growth 100, Scale 500), so 20 was simultaneously too low for a
 * paying customer and too high for a free one - it would have refused a Growth customer their 21st
 * person and promised a free one four more than they can have.
 *
 * Both are the same mistake: a number or a rule invented on a screen, with nothing reconciling it to
 * the code that decides. This is the reconciliation.
 */
const CLIENT = join(__dirname, '../..')

const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue
      walk(full, out)
    } else if (/\.(ts|tsx)$/.test(full) && !/\.spec\.tsx?$/.test(full)) {
      out.push(full)
    }
  }
  return out
}

const sources = walk(CLIENT).map((f) => ({
  file: f.split('/src/')[1],
  body: readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''),
}))

describe('what the product tells people about check-in size', () => {
  it('never says a check-in works best with one person', () => {
    const offenders = sources
      .filter((s) => /one ground per person|one check-in per person|per person works best/i.test(s.body))
      .map((s) => s.file)
    expect(offenders).toEqual([])
  })

  it('and never quotes a per-check-in headcount the code does not enforce', () => {
    /**
     * Deliberately a pattern rather than the literal "20". The defect was inventing a number, and the
     * next one will be a different number.
     */
    const offenders = sources
      .filter((s) => /up to \d+ per (ground|check-in)/i.test(s.body))
      .map((s) => s.file)
    expect(offenders).toEqual([])
  })

  it('and the setup screen points at the plan instead', () => {
    const setup = sources.find((s) => s.file === 'pages/grounds/CreateGroundPage.tsx')!
    expect(setup.body).toMatch(/depends on your plan, not on the check-in/)
  })
})
