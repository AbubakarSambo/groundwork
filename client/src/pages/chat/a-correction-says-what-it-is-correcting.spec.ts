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

/*
 * CHANGED 3 NOVEMBER EVENING (Hafsah: "No ... explanation lines"; "the opening line ... is part of the first message"). The page no
 * longer prints a line about the correction under the header or above the box. What the old tests guarded, that a correction says which
 * session it is correcting and that nothing is overwritten, is said where the person reads it first: in the engine's opening message
 * for a correction, which these now read.
 */
const ENGINE = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'api', 'src', 'modules', 'conversation', 'conversation.service.ts'), 'utf8'))

describe('a correction session', () => {
  it('opens by saying which session it is correcting, and that the original answers are kept', () => {
    expect(ENGINE).toContain('Open in one sentence by saying you are back on session ${correctingSession}')
    expect(ENGINE).toContain('Their original answers are not deleted or edited; this is recorded alongside them.')
  })

  it('and the page adds no line of its own about it, and no lone session number', () => {
    expect(CHAT).not.toMatch(/Correcting session/)
    expect(CHAT).not.toContain('`Session ${sessionNumber}`')
  })
})
