import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE EXPLAINER THAT APPEARED AND VANISHED BEFORE ANYBODY COULD READ IT.
 *
 * "A page showed up right after i clicked check-in, it flashed and then got me into the check-in."
 *
 * The privacy screen renders when session 1 has no messages, and for up to two seconds after mount
 * that is true of EVERY session 1: the transcript fetch sits behind a random jitter of up to
 * 2000ms. So somebody resuming a check-in got a full-page explainer thrown in front of them and
 * snatched away, and somebody starting a new one got it late.
 *
 * Empty is a fact you have to have looked to know.
 */
const SRC = readFileSync(join(__dirname, 'ChatPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '')

describe('the privacy screen does not flash', () => {
  it('waits until the transcript has been looked at', () => {
    expect(SRC).toContain('const showPrivacyFirst = knowWhatIsHere &&')
  })

  it('counts having looked on the path where a transcript was found', () => {
    /* Bounded from the branch to its own return, not to the next `} catch` in the file - which is
       an earlier one, so the slice ran backwards and matched nothing. */
    const from = SRC.indexOf('if (t.turns && t.turns.length > 0)')
    const found = SRC.slice(from, SRC.indexOf('return', SRC.indexOf('setOpenFailed(false)', from)))
    expect(found).toContain('setKnowWhatIsHere(true)')
  })

  it('and on the path where the fetch failed, which is the case it exists for', () => {
    /* Falling through to open() is a brand new session - exactly when the explainer should show. */
    expect(SRC).toContain('setKnowWhatIsHere(true); openSession.mutate()')
  })

  it('still never appears over a failure to open', () => {
    /* An explainer can wait. An error cannot - this rule predates the flash and must survive it. */
    expect(SRC).toContain('!openFailed')
  })

  it('and still only on the first session, once', () => {
    expect(SRC).toContain('sessionNumber === 1 && !privacyAcknowledged')
    expect(SRC).toContain("localStorage.setItem('gw_privacy_seen', '1')")
  })
})
