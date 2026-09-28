import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A CORRECTION CALLED ITSELF "SESSION 3".
 *
 * A correction is created at the next free session number - the original is never edited, so the
 * correction has to be its own row and rows are unique per session number. That is right for the
 * record and wrong for the header: she pressed Correct it on session 1 and the page called what
 * followed Session 3.
 *
 * The check-in row has said `isSelfCorrection` and named its target all along. The header was
 * reading `sessionNumber` out of navigation state, which carries no such thing, so it had nothing
 * to say it with.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const CHAT = strip(readFileSync(join(__dirname, 'ChatPage.tsx'), 'utf8'))

describe('a correction session', () => {
  it('takes the fact from the check-in rather than from navigation state', () => {
    expect(CHAT).toContain('(t.checkIn as any)?.isSelfCorrection')
    expect(CHAT).toContain('selfCorrectionTargetSession')
  })

  it('names the session it is correcting, in every place the number is shown', () => {
    /* Three places until the "what happens to what you write" gate was deleted - its header was one
       of them. Two remain: the page header and the composer footer. */
    expect((CHAT.match(/Correcting session \$\{correctingSession\}/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('and says the original is not overwritten, where somebody is about to add to it', () => {
    expect(CHAT).toContain('nothing is overwritten - this is recorded alongside what you said then')
  })

  it('while an ordinary session shows no lone number, and a correction still says its own', () => {
    /*
     * U.8 REVIEW: THE LONE NUMBER ITSELF WENT, NOT ONLY ITS PRIVACY TAG.
     *
     * "No privacy tag since 10 Sep 2026: the number is the whole label" was true right up until the
     * U.8 review found that bare label sitting at the bottom of an ordinary session with nothing to
     * say - the prototype's own check-in screens (docs/prototype/screens/B3-the-check-in/*.txt)
     * never print a lone session number there at all. `privacyLabel` is `null` for an ordinary
     * session now, and the bottom bar shows nothing in that spot rather than "Session 3".
     *
     * What this test was actually guarding - that a CORRECTION still says which session it is
     * correcting - is unweakened: it is checked twice above already ("names the session it is
     * correcting, in every place the number is shown"), and pinned here too so this file keeps its
     * own honest name.
     */
    expect(CHAT).not.toContain('`Session ${sessionNumber}`')
    expect(CHAT).toMatch(/[Cc]orrecting session \$\{correctingSession\}/)
  })
})
