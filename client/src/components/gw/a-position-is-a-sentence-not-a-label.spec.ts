import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * GROUP 3'S REVIEW, BATCH A FAULT 6: "BARAKA MWANGI: COMPETITOR PRICING IS..." WAS A LABEL GLUED
 * TO A CLAUSE WITH A COLON, NOT A SENTENCE.
 *
 * Under "Where things stand", each person's position on an open difference read as a name, a
 * colon, and whatever they said - "Rukia Otieno: The main obstacle noted is..." - which is a table
 * row, not plain English. Each position is now its own full sentence, "X said ...", with the
 * reader's own line read as "You said ...", the same rule `Cite`/`Quotes` already use just above
 * it on the same component for the same kind of row.
 */
const SRC = readFileSync(join(__dirname, 'TheSessionsReport.tsx'), 'utf8')

describe('a position under "Where things stand" is a sentence', () => {
  it('no longer joins a person\'s name to their view with a colon', () => {
    expect(SRC).not.toMatch(/\{p\.who\}:\s*<\/span>\{p\.view\}/)
  })

  it('says "X said ...", and "You said ..." on the reader\'s own row', () => {
    /*
     * RELEASE WALKTHROUGH A, FIX 2: THE SAME PERSON, NAMED TWICE.
     * The literal `{who} said {lowerFirst(view)}` this used to pin always glued the frame on, even
     * when the served `view` already opened with the person's name or "You" - "Amani Wekesa said
     * amani Wekesa stated an aim..." `sayWhatTheySaid` (below, in this same file) keeps that exact
     * frame whenever the view does not already carry the name - see its own spec,
     * TheSessionsReport.sayWhatTheySaid.spec.ts, for both halves of the rule.
     */
    expect(SRC).toMatch(/sayWhatTheySaid\(p\.who, p\.view, yourName\)/)
  })
})
