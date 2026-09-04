/**
 * Two messages on screen, and the louder one was wrong.
 *
 * James picked "product ready" on a use case with a gap he had written down
 * himself. The row said exactly that — "still has a product gap recorded, clear
 * the gap or say it is not one" — and the corner of the screen said "Access
 * denied · You do not have permission to perform this action".
 *
 * He HAS the capability. The generic toast fires on any 403, and this system
 * uses 403 for refusals that are about the state of a record rather than about
 * who is asking. So the app contradicted itself, and the wrong half was the one
 * in the corner in red.
 *
 * The refusals are most of what this system is worth: they are specific, they
 * are actionable, and every one of them is rendered next to the thing it refers
 * to. So the back office opts out of the generic toasts entirely.
 *
 * Seen on screen. Nothing in the code would have shown it.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const OPS_API = readFileSync(join(__dirname, '../../api/ops.ts'), 'utf8')
const withoutComments = OPS_API.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the back office never shows a generic error over a specific one', () => {
  it('declares the opt-out', () => {
    expect(withoutComments).toMatch(/skipForbiddenToast:\s*true/)
    expect(withoutComments).toMatch(/skipNotFoundToast:\s*true/)
    expect(withoutComments).toMatch(/skipServerErrorToast:\s*true/)
  })

  it('and every call carries it, named one by one', () => {
    /*
     * Named, not counted. The first version compared totals — and there is one
     * more QUIET than there are calls, because the declaration counts too, so
     * removing the opt-out from a call left the total still passing the test.
     * It was written to catch exactly that and did not, which I found by biting
     * it. A rule about every member of a set has to look at every member.
     */
    const bare = withoutComments
      .split('\n')
      .filter((line) => /apiClient\.(get|post|patch|put|delete)/.test(line))
      .filter((line) => !line.includes('QUIET'))
      .map((line) => line.trim().slice(0, 80))

    expect(bare).toEqual([])
  })

  it('and there are enough of them that the rule is not covering two calls', () => {
    const calls = withoutComments.match(/apiClient\.(get|post|patch|put|delete)/g) ?? []
    expect(calls.length).toBeGreaterThan(20)
  })

  it('and the pages render what the server said instead', () => {
    const form = readFileSync(join(__dirname, 'OpsForm.tsx'), 'utf8')
    expect(form).toMatch(/response\?\.data\?\.message/)
    expect(form).toMatch(/role="alert"/)
  })
})
