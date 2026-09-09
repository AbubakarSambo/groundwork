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

  it('names the session it is correcting, in all three places the number is shown', () => {
    expect((CHAT.match(/Correcting session \$\{correctingSession\}/g) ?? []).length).toBeGreaterThanOrEqual(3)
  })

  it('and says the original is not overwritten, where somebody is about to add to it', () => {
    expect(CHAT).toContain('nothing is overwritten - this is recorded alongside what you said then')
  })

  it('while an ordinary session still says its own number', () => {
    expect(CHAT).toContain('`Session ${sessionNumber} · Private`')
  })
})
