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
    expect(SRC).toMatch(/\{\(p\.who === yourName \? 'You' : p\.who\)\} said \{lowerFirst\(p\.view\)\}/)
  })
})
