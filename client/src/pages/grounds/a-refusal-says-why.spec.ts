import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { MIN_INTENTION_LENGTH } from '@/api/coach'

/**
 * A BUTTON THAT REFUSES MUST SAY WHY. W-UX-7.
 *
 * The audit found four buttons that go grey and stay silent. The worst was "Find the closest
 * situation": twenty characters, enforced in two places on the same line and stated in neither. A
 * person who typed "new manager" got a dead button, no message, and no way to learn what was wrong.
 * The only moves left are to guess or to leave.
 *
 * The rule this pins: wherever a length gate exists, the number is NAMED and COUNTED DOWN in front
 * of the person, never a bare literal inside a `disabled`.
 */
const CODE = readFileSync(join(__dirname, 'CreateGroundPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the describe-it-yourself box', () => {
  it('states the threshold instead of hiding it in a disabled attribute', () => {
    expect(CODE).toContain('const MIN_OWN_DESCRIPTION = 20')
    expect(CODE).not.toMatch(/ownDescription\.trim\(\)\.length < 20/)
  })

  it('and counts down what it still wants, once there is something to count', () => {
    expect(CODE).toMatch(/MIN_OWN_DESCRIPTION - ownDescription\.trim\(\)\.length\} characters to go/)
    /** Silent until they start typing. An empty box being told it is too short is nagging. */
    expect(CODE).toMatch(/ownDescription\.trim\(\)\.length > 0 && ownDescription\.trim\(\)\.length < MIN_OWN_DESCRIPTION/)
  })
})

describe('and the coach request, which already did it right', () => {
  it('keeps its countdown', () => {
    expect(CODE).toMatch(/MIN_INTENTION_LENGTH - coach\.intention\.trim\(\)\.length\} characters to go/)
  })

  it('reads its threshold from the API contract, not a copy of the number', () => {
    /** The server enforces the same minimum. A second literal here is a rule in two places. */
    expect(MIN_INTENTION_LENGTH).toBeGreaterThan(0)
    expect(CODE).toContain('MIN_INTENTION_LENGTH')
  })
})
