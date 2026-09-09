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
/**
 * WHAT A PARTY SEES, WHEREVER IT IS WRITTEN.
 *
 * This read the page alone. The record itself lives in `MyRecord` now, so that the page which RUNS
 * a check-in can show a lead their own account without sending them to a second page - and reading
 * only the page would have quietly stopped covering the thing this file is named after.
 *
 * Both, joined, so these assertions follow the content rather than the filename. They keep holding
 * when the two views merge.
 */
const strip = (f: string) =>
  readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
const PARTY = [
  strip(path.join(__dirname, 'GroundParticipantPage.tsx')),
  strip(path.join(__dirname, '..', '..', 'components', 'gw', 'MyRecord.tsx')),
].join('\n')

describe('a party sees their own and only their own', () => {
  it('their sessions come from their own record, not the whole roster', () => {
    /*
     * THE LIST MOVED AND THE RULE DID NOT. `MyRecord` had a sessions list and `WhatYouAreCarryingForward`
     * had another one - the same sessions, the same dates, one of them with a way into each
     * session's report. Two lists of one thing on one page, which is what "my record page is
     * doing too much" was about. The one that survives is the one you can act from, and it is
     * still filtered to the reader's OWN participant row rather than drawn from the roster.
     */
    expect(PARTY).toMatch(/p\.userId === user\?\.id/)
    expect(PARTY).not.toMatch(/ground\.checkIns\s*\?\?\s*\[\]\)\s*\.map/)
  })

  it('and they can read what is expected of them', () => {
    /*
     * IT WAS A CARD WHOSE USUAL CONTENT WAS "Nothing yet", above a button that opened Context - a
     * heading, an absence and a link, where the link alone says all three. The words are published
     * on Context for everybody including the person they are about, which is the point of
     * publishing them.
     *
     * The rule is unchanged and is what is asserted: a party can reach what they are read against.
     */
    /* On the Context tab itself, which is in this page's own tab bar - not behind a line on My
       record telling them a neighbouring tab exists. */
    expect(PARTY).toContain('<ContextPage')
  })
  /* The follow-up "which opens Context rather than restating it here" went with the line it was
     about. The rule it protected - the record does not restate the material - is stronger now:
     there is nothing on My record to restate it with. */

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
