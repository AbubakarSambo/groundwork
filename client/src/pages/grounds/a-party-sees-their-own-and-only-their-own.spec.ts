import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * A PARTY'S SESSIONS TAB: THEIR OWN SESSIONS, AND THEIR OWN EXPECTATION.
 *
 * Who Sees What is explicit about the difference between the two views of this tab. A lead sees every
 * party, every session, and who to chase. A party sees "their own sessions only, and their own target.
 * Not other people's answers, and not who is late."
 *
 * The sessions half was already right - it reads `myRecord.sessions`, which the server scopes.
 *
 * The target half regressed when the old model was removed. It used to be an ObjectivePanel with an
 * Accept button, which is exactly the model this product no longer runs on: one person states an
 * expectation, and a party can read it but not accept or rewrite it. Removing the panel took the
 * reading with it, so the state is back in the form the lead's rows use, pointing at Context where
 * the words are published for everybody including them.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PARTY = readFileSync(path.join(__dirname, 'GroundParticipantPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('a party sees their own and only their own', () => {
  it('their sessions come from their own record, not the whole roster', () => {
    expect(PARTY).toMatch(/\(myRecord\?\.sessions \?\? \[\]\)/)
    expect(PARTY).not.toMatch(/ground\.checkIns\s*\?\?\s*\[\]\)\s*\.map/)
  })

  it('and they can read what is expected of them', () => {
    expect(PARTY).toContain('What is expected of you')
  })

  /** The words live in one published place; this points there rather than keeping a second copy. */
  it('which opens Context rather than restating it here', () => {
    expect(PARTY).toMatch(/onClick=\{\(\) => setTab\('docs'\)\}/)
  })

  /**
   * THE DECISION THIS MUST NOT DRIFT BACK FROM. "Participants should not be able to rewrite their
   * targets or accept it. One person is doing this, we dont want chaos. But they can see it."
   */
  it('and cannot accept or rewrite it', () => {
    expect(PARTY).not.toContain('ObjectivePanel')
    expect(PARTY).not.toMatch(/acceptMyObjective|stateMyObjective|proposeObjective/)
  })

  /** Nothing here tells a party who else is late. That is the lead's view, not theirs. */
  it('and is not shown who is behind', () => {
    expect(PARTY).not.toMatch(/participants are overdue|Remind/)
  })
})
