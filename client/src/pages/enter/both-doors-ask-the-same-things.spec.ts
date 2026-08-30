import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE TWO WAYS OUT OF THE ENTRY CHAT ASK THE SAME QUESTIONS.
 *
 * There are two: an emailed link, and Google. Google skips the email round trip because the address
 * is already verified, which is right - but it also skipped the organisation's name, because that
 * field only existed on the panel shown while somebody waits for the email. A person who signed up
 * with Google left as "Ada's Workspace" and was never offered anything else.
 *
 * The Google callback deliberately does not stop to ask afterwards, on the grounds that
 * interrupting between "signed in" and "here is your check-in" is the worst moment for a question
 * already offered. That reasoning is right; the question just had not been offered. So it is asked
 * one step earlier, where both doors pass.
 */
const PAGE = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')
const code = PAGE.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('the organisation name', () => {
  it('is asked once, not twice', () => {
    expect(code.match(/Organisation name \(optional\)/g) ?? []).toHaveLength(1)
  })

  it('is asked before the email is sent, which is the step Google also passes', () => {
    const where = code.indexOf('Organisation name (optional)')
    const emailField = code.indexOf('placeholder="your@email.com"')
    expect(where).toBeGreaterThan(-1)
    /* Above the email field, and both inside the not-yet-sent branch. */
    expect(where).toBeLessThan(emailField)
    const branch = code.lastIndexOf('!emailSent ?', where)
    expect(branch).toBeGreaterThan(-1)
  })

  it('and reaches the server on both paths, through one payload', () => {
    /* `buildCommitPayload` is shared by the emailed link and by Google for this reason. */
    const payload = code.slice(code.indexOf('function buildCommitPayload'), code.indexOf('function buildCommitPayload') + 900)
    expect(payload).toContain('orgName: orgName.trim() || undefined')
  })
})
