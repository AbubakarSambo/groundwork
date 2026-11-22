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
    /*
     * The field list moved into WHAT_THE_BRIEF_IS_READ_FROM and is spread in here. It moved
     * because this query and the one that opens a session had drifted: both feed briefFor,
     * neither fetched initiatorId, and briefFor reads it through `as any` - so a lead opening
     * her own check-in came back as not-the-lead and was shown the narrowed view of targets she
     * set herself. One shape now, so the two cannot disagree again.
     *
     * Asserted on the shared constant rather than on this query's own lines, because listing
     * them here again is the duplication that caused it.
     */
    expect(body).toMatch(/\.\.\.WHAT_THE_BRIEF_IS_READ_FROM/)
    const shape = SERVICE.split('const WHAT_THE_BRIEF_IS_READ_FROM = {')[1]?.split('} as const;')[0] ?? ''
    expect(shape).toContain('brief: true')
    /* The engine may read more about each objective (it added isADecisionAboutAPerson on 29
       September); what matters here is that these three are read. */
    /* Since 22 November each objective's id is read too, so a goal its lead changed can be matched to its change. */
    expect(shape).toMatch(/objectives: \{ select: \{ (id: true, )?name: true, target: true, ownerParticipantId: true[^}]*\}/)
  })

  it('is declared on the response the client reads', () => {
    expect(API).toMatch(/TranscriptResponse[\s\S]{0,400}brief\?: CheckInBrief \| null/)
  })

  /* The page no longer draws the brief during the check-in (Hafsah, 3 November evening: no side panels or explanation lines), so the
     three tests that read where the page set and drew it are deleted; what the server sends, above, is unchanged. */
})
