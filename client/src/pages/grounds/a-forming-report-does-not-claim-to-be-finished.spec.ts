import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE LEAD WAS TOLD EVERYBODY HAD FINISHED WHETHER OR NOT THEY HAD.
 *
 * The release panel gated on `report?.createdAt` - on a Report ROW EXISTING. A row exists long
 * before a round is done: the API builds a forming picture as soon as anybody completes, marks it
 * `forming: true`, and attaches `sessionProgress` saying how many are still out. The participant's
 * page reads the same row and correctly says "A picture is forming... not everyone has checked in
 * yet."
 *
 * So one row was read two ways. The party was told it was incomplete; the lead was told "Everybody
 * has completed their sessions" and offered a button that reveals the picture to the whole team at
 * once AND activates billing. Seen on a check-in whose own header said "1 of 4 checked in", two
 * lines above the sentence claiming everybody was done.
 *
 * Releasing early is still allowed - a lead may want to close a round short. Claiming the round
 * finished is not.
 *
 * WHERE THIS LESSON LIVES NOW. The release panel and its two branches are gone with the report
 * body: the report tab is a list of sessions, each row carrying its own count and whether it is
 * final. So the false sentence cannot be rendered by a branch, because there is no branch and no
 * sentence - and releasing is one line that describes itself accurately, which is the same lesson
 * with nothing left to get wrong. Asserted as the absence of the claim plus the honest naming.
 */
const PAGE = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
const CODE = PAGE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const LIST = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'TheReportIsAListOfSessions.tsx'), 'utf8')

describe('what the lead is told before everyone has answered', () => {
  it('never claims everybody finished', () => {
    expect(CODE).not.toContain('Everybody has completed their sessions')
  })

  it('says releasing happens by itself, and names the early one for what it does', () => {
    expect(CODE).toContain('the report goes out to everybody on its own')
    expect(CODE).toContain('Close this round now and publish what there is')
    expect(CODE).toContain('anybody who has not answered loses their turn')
  })

  it('and every session row says how many answered, and whether it is final', () => {
    /* U.9: the prototype's row, "6 of 6 checked in" and "Shared" or "Not shared" (sessions.txt). */
    expect(LIST).toContain('checkedIn(r.answered, r.total)')
    /* 'Final' read as 'the last session' on every released row. It means the report is out. */
    /* A round everybody has answered is not forming, it is waiting for the lead - see
       a-round-everybody-answered-is-not-forming. The three states are still the three states. */
    expect(LIST).toContain('r.closed ? EVERY_SESSION.shared : EVERY_SESSION.notShared')
  })

  it('and names who is still being waited on, rather than a number alone', () => {
    expect(LIST).toContain('stillToCheckIn(r.waitingOn)')
  })
})
