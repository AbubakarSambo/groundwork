import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { isSessionShared } from '@/lib/session-rows'
import { numberUpToTenInWords } from '@/lib/a-number-up-to-ten-in-words'

/**
 * THE CONFIRM WALK OF 7 OCTOBER: three sentences that were wrong on screen.
 *  - the Done page tagged session 2's team report "Shared" because session 1 had been shared;
 *  - "1 of 2 person has checked in";
 *  - "The shared report releases once all parties have checked in.", jargon and untrue (the lead shares it).
 */
const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')

describe('the confirm walk’s three sentences', () => {
  it('a session is shared only when that session was released', () => {
    const report = { releasedAt: '2026-10-06T10:00:00Z', releasedSessions: [1] }
    expect(isSessionShared(report, 1)).toBe(true)
    expect(isSessionShared(report, 2)).toBe(false)
    /* The end page that read it went in batch 2 (group 5); the rows of every session still read it. */
    expect(read('../../lib/session-rows.ts')).toContain('shared: isSessionShared(report, n)')
  })

  it('the count of who has checked in is said in words', () => {
    expect(numberUpToTenInWords(1)).toBe('one')
    expect(numberUpToTenInWords(2)).toBe('two')
    /* The engine's F-18 made this one shared sentence (lib/how-many-checked-in.ts), and the page
       calls it; the words now live there, so this reads the sentence it gives.
       UPDATED (B-053): the count is now taken against `clockRound`/`clockRoundDone`, the same
       session `ground.sessionClock.says` names, not the page's own `openRound` - see
       GroundAdminPage.oneSessionNamedOnce.spec.tsx for why (the two used to count different
       sessions). The shared sentence itself, and its wording, are unchanged. */
    /* UPDATED (Hafsah, 30 October 2026): the page no longer counts. It says the server's one sentence for the session
       (`thisSession.says`, api this-sessions-count.ts, whose spec pins "Three of the five people have checked in for session 1."). */
    /* Batch 2, group 5 (Hafsah, item 42): the Check-in tab draws the conversation, not a session line, so the server's one
       sentence is said where it always was too, on the board. */
    const src = read('GroundAdminPage.tsx')
    expect(read('../board/BoardPage.tsx')).toContain('theCountSays={theClocksSessionSaid(b)?.says ?? null}')
    expect(src).not.toContain('theClocksSessionSaid(')
    expect(src).not.toContain('howManyCheckedInSentence(')
    /* Changed 3 November (F5 part 3): the page's own copy of the sentence (lib/how-many-checked-in.ts) is deleted; the server's one count says it. */
    expect(src).not.toMatch(/\$\{roundDone\} of \$\{total\} \$\{roundDone === 1 \? 'person has'/)
  })

  it('the set-up never says the report releases once all parties have checked in', () => {
    const src = read('../enter/EntryChatPage.tsx')
    expect(src).not.toContain('releases once all parties have checked in')
    expect(src).toContain('when you choose to share it')
  })
})
