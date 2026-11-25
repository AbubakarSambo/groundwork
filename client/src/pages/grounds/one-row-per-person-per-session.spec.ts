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
/* The roster is People and setup's one list of people now (page audit, 24 November 2026, row 8, approved by Hafsah): each person's
   row carries their check-in dots. Its status is said once, by the row's own sentence, so the dot-row label ("Some check-ins done,
   some still open") went; "No expectation set for them yet." is left off when nothing is set; and what is expected of them is on
   their card under the row, opened from "···", rather than a link to another tab. */
const CODE = readFileSync(path.join(__dirname, 'PeopleAndSetupAsPictured.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('one row per person, one cell per session', () => {
  it('a row carries every session that person has', () => {
    expect(CODE).toMatch(/const theirSessions = \[\.\.\.\(g\?\.checkIns \?\? \[\]\)\]/)
    expect(CODE).toMatch(/\.filter\(\(c: any\) => c\.participantId === p\.id && !c\.isSetup\)/)
  })

  it('in session order, left to right', () => {
    expect(CODE).toMatch(/\(a\.sessionNumber \?\? 0\) - \(b\.sessionNumber \?\? 0\)/)
  })

  it('the three stat tiles are gone, because the header carries that line', () => {
    expect(CODE).not.toContain('label="This round"')
    expect(CODE).not.toContain('label="Still to come"')
  })

  it('only your own sessions are clickable, finished ones too', () => {
    expect(CODE).toMatch(/disabled=\{!isSelf\}/)
    expect(CODE).not.toMatch(/isSelf && !done/)
  })

  it('each row says whether something is expected of them, and whether they have seen it, and nothing when nothing is', () => {
    expect(CODE).toContain('Their expectation is set. They have seen it.')
    expect(CODE).toContain('Their expectation is set. They have not seen it yet.')
    expect(CODE).not.toContain('No expectation set for them yet.')
  })
})
