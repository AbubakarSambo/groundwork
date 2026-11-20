import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * WHERE HAS EACH PERSON GOT TO. One question, and the tab could not answer it.
 *
 * It held two lists. A roster whose status dot came from `checkIns.find(c => c.participantId === p.id)`
 * - the FIRST check-in found, so somebody two sessions into six showed one state and the row could not
 * say which session it was about. And below it a flat run of cards, one per check-in, sorted by
 * session: on two parties across twelve sessions that is twenty-four cards reading Session 1, Session
 * 1, Session 2, Session 2, which is not a record anybody can read.
 *
 * Neither answered the question. The roster knew who but not where; the cards knew where but grouped
 * by the wrong thing.
 *
 * It is now one row per person with a cell per session, which is what the tab was always meant to be.
 *
 * AND IT IMMEDIATELY CAUGHT SOMETHING. A row read "Completed" beside a session-2 cell that had not
 * started - same person, two statements, one of them false. The label had been wrong for as long as
 * anybody had more than one session; it only became visible once something true stood next to it.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CODE = readFileSync(path.join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('one row per person, one cell per session', () => {
  it('a row carries every session that person has', () => {
    expect(CODE).toMatch(/const theirSessions = \[\.\.\.\(ground\.checkIns \?\? \[\]\)\]/)
    /*
     * B-080: WIDENED, NOT NARROWED. A set-up row (`isSetup: true`) is not a session - the same rule
     * `sessionsDoneBy` already applies to "Your sessions" - so it is now excluded here too; without
     * it, a lead who only manages and never checks in read "Some sessions done, some still open"
     * from her one completed set-up row alone. Every *real* session that person has is still here.
     */
    expect(CODE).toMatch(/\.filter\(\(c: any\) => c\.participantId === p\.id && !c\.isSetup\)/)
  })

  it('in session order, left to right', () => {
    expect(CODE).toMatch(/\(a\.sessionNumber \?\? 0\) - \(b\.sessionNumber \?\? 0\)/)
  })

  /**
   * THE CONTRADICTION THIS FOUND. A row's overall state has to be read from all of that person's
   * sessions; from one of them it is a guess that happens to be right when there is only one.
   */
  it('the row state comes from all their sessions, not from one', () => {
    expect(CODE).toMatch(/theirSessions\.every\(\(c: any\) => c\.status === 'COMPLETED'\)/)
    expect(CODE).toMatch(/theirSessions\.some\(\(c: any\) => c\.status === 'IN_PROGRESS'\)/)
  })

  /** Half-done is its own state, and it is the one the old label got wrong. */
  it('and says so when some are done and some are not', () => {
    expect(CODE).toContain('Some check-ins done, some still open')
  })

  /**
   * The two things the cells replaced are gone, not left alongside. Keeping either would put the
   * same numbers on the screen twice, which is what the tab already suffered from.
   */
  it('the three stat tiles are gone, because the header carries that line', () => {
    expect(CODE).not.toContain('label="This round"')
    expect(CODE).not.toContain('label="Still to come"')
  })

  it('and the flat run of session cards is gone', () => {
    expect(CODE).not.toMatch(/Session \{ci\.sessionNumber\}\{isMine \? ' ·  yours' : ''\}/)
  })

  /**
   * Only your own unfinished session is openable from here. Somebody else's check-in is not yours to
   * walk into, and a finished one is not reopened by clicking a cell.
   */
  it('only your own sessions are clickable, and now the finished ones too', () => {
    /*
     * IT USED TO BE `&& !done`, which made your own COMPLETED session the one cell you could not
     * click - and that is where your private report lives. Reported as "I cannot find the report
     * that popped up after I was done with my first check-in, once it closes I have no idea where
     * it went." It is not in the Report tab and never was: that tab holds the SHARED report, which
     * does not exist until everyone has checked in.
     *
     * The wall is unchanged and is what the condition is actually for: somebody else's session is
     * never clickable, finished or not.
     */
    expect(CODE).toMatch(/const isMine = p\.userId === user\?\.id\b(?!\s*&&\s*!done)/)
    expect(CODE).not.toMatch(/const isMine = p\.userId === user\?\.id && !done/)
  })

  it('and says what opening a finished one gives you', () => {
    /* A cell that becomes clickable without saying why is a cell people do not click. */
    expect(CODE).toContain('yours, open it to read your report')
  })

  /** The expectation state on the row - and the words themselves live on Context, not here. */
  it('each row says whether anything is expected of them, and whether they have seen it', () => {
    /**
     * REVIEW ROUND 3, ITEM 5: A SENTENCE, CAPITALISED, WITH A FULL STOP - it read as a lowercase
     * fragment trailing off the sessions row above it.
     */
    expect(CODE).toContain(/* Names its subject now: it sat under a sessions line and read as contradicting it. */ 'No expectation set for them yet.')
    expect(CODE).toContain('Expectation set. They have seen it.')
    expect(CODE).toContain('Expectation set. Not seen yet.')
  })

  /**
   * The state is here; the words are on Context, published where everyone reads them. A row that
   * summarised the expectation instead of pointing at it would be a second copy of something whose
   * whole purpose is to exist in one place, in plain view.
   */
  it('and the state opens the tab where the words actually live', () => {
    expect(CODE).toMatch(/onClick=\{\(\) => setTab\('docs'\)\}/)
  })
})
