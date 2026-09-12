import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * "I DIDN'T GET ANY CONTEXT ABOUT THE CHECK-IN UNTIL I WAS DONE WITH THE CHECK-IN."
 *
 * A participant followed an invite, was asked "in your own words, what did you understand your role
 * in this to be?", answered a whole session, and only afterwards found out what the check-in was
 * about.
 *
 * The band exists. "What this check-in is about" carries the subject, what the lead wrote, and the
 * objectives on record, and its own comment says why it must persist: "it stays visible rather than
 * appearing once, because a target you saw at the top of a ten-minute conversation is a target you
 * are no longer looking at by the time it matters."
 *
 * It was doing the opposite. `brief` was assigned in exactly one place - the success handler of
 * `conversationApi.open` - so it survived only for the single page load that opened the session.
 * Any later load reads the transcript instead, which did not carry it, so the band vanished. A
 * person who opens the invite, answers a few turns and comes back the next day has never seen it.
 *
 * WHY THIS AND NOT A SECOND FETCH ON THE CLIENT. The transcript is already the one request every
 * later load makes, and the brief is three fields off a row that request already loads. A second
 * call would be a second thing to fail, and it would fail exactly where the first one already did.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const PAGE = strip(readFileSync(path.join(__dirname, 'ChatPage.tsx'), 'utf8'))
const API = strip(readFileSync(path.join(__dirname, '../../api/conversation.ts'), 'utf8'))
const SERVICE = strip(
  readFileSync(path.join(__dirname, '../../../../api/src/modules/conversation/conversation.service.ts'), 'utf8'),
)

describe('what this check-in is about', () => {
  it('travels on the transcript, which is what every later load reads', () => {
    expect(SERVICE).toContain('brief: this.briefFor(ground,')
    const at = SERVICE.indexOf('async getTranscript(')
    const end = SERVICE.indexOf('async getDownload(')
    expect(SERVICE.slice(at, end)).toContain('brief: this.briefFor(ground,')
  })

  it('and the transcript query loads the fields it needs to build one', () => {
    const at = SERVICE.indexOf('async getTranscript(')
    const end = SERVICE.indexOf('async getDownload(')
    const body = SERVICE.slice(at, end)
    expect(body).toContain('brief: true')
    expect(body).toMatch(/objectives: \{ select: \{ name: true, target: true, ownerParticipantId: true \}/)
  })

  it('is declared on the response the client reads', () => {
    expect(API).toMatch(/TranscriptResponse[\s\S]{0,400}brief\?: CheckInBrief \| null/)
  })

  it('and is set from it, not only from the call that opens the session', () => {
    /* Two assignments now. One was the whole defect. */
    const sets = PAGE.match(/setBrief\(/g) ?? []
    expect(sets.length).toBeGreaterThanOrEqual(2)
    expect(PAGE).toContain('if (t.brief) setBrief(t.brief)')
  })

  it('outside the turns check, because an unanswered session has a subject too', () => {
    /* And that is the load where somebody most needs to read it - before they type anything. */
    const at = PAGE.indexOf('if (t.brief) setBrief(t.brief)')
    const turns = PAGE.indexOf('if (t.turns && t.turns.length > 0)')
    expect(at).toBeGreaterThan(-1)
    expect(at).toBeLessThan(turns)
  })

  it('and renders when the lead wrote a description but set no objectives', () => {
    /* The condition tested `subject` and `objectives` while the body also rendered `says`, so a
       brief that held only the lead's own description drew nothing. */
    expect(PAGE).toMatch(/brief && \(brief\.subject \|\| \(brief as any\)\.says \|\| brief\.objectives\.length > 0\)/)
  })
})
