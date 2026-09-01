import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * ONE WORD FOR THE REPEAT, AND IT IS "SESSION".
 *
 * A check-in runs several times, and the product had two words for that - "session" in 159 visible
 * strings and "round" in 25. The audit recommended standardising on "round", which would have
 * renamed the common word to the rare one. Her call went the other way, and the codebase already
 * agreed with her.
 *
 * THIS TEST EXISTS BECAUSE I INTRODUCED THE THIRD USE MYSELF. Fixing the two contradicting counters
 * on the check-in header, I wrote "Round 2 · 0 of 2 checked in" and shipped it - adding a word to
 * the exact problem the audit was about. It is an easy mistake while tidying vocabulary: reaching
 * for a fresh word because it is unambiguous to ME, in a product where the ambiguity was never
 * about that word.
 *
 * WHAT THIS DOES NOT ASSERT, AND WHY. A first version swept every file for the word and failed on
 * `strokeLinecap="round"`, `borderRadius`, and the idiom "the other way round" in a comment. A
 * guard that fires on things nobody can fix gets deleted, so this names the surfaces that were
 * actually wrong instead of pattern-matching English.
 *
 * "Closing round" is deliberately left alone: it is a named phase with an endpoint and a service
 * method behind it, and renaming a feature is a different decision from settling a word.
 */
const read = (...p: string[]) =>
  readFileSync(join(__dirname, ...p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

const SURFACES = {
  'the check-in header': read('pages', 'grounds', 'GroundAdminPage.tsx'),
  'the chat': read('pages', 'chat', 'ChatPage.tsx'),
  'the report': read('pages', 'report', 'ReportPage.tsx'),
  'the participant page': read('pages', 'grounds', 'GroundParticipantPage.tsx'),
  'the scenario cards': read('pages', 'grounds', 'CreateGroundPage.tsx'),
  'the history panel': read('components', 'gw', 'HowThisHasMoved.tsx'),
  'the connect page': read('pages', 'org', 'IntegrationsPage.tsx'),
}

/** The exact sentences that used to say "round". Each was a thing a person reads. */
const WAS_ROUND = [
  /for this round/i,
  /The round finishes/i,
  /as rounds complete/i,
  /everybody in a round/i,
  /end of each round/i,
  /completed this round/i,
  /first round sets out/i,
]

describe('one word and it is session', () => {
  it('reads every surface, so an empty file cannot pass', () => {
    for (const [name, src] of Object.entries(SURFACES)) {
      expect(src.length, name).toBeGreaterThan(500)
    }
  })

  it('none of the sentences that said "round" says it any more', () => {
    const offenders: string[] = []
    for (const [name, src] of Object.entries(SURFACES)) {
      for (const pattern of WAS_ROUND) if (pattern.test(src)) offenders.push(`${name}: ${pattern}`)
    }
    expect(offenders).toEqual([])
  })

  it('and the header counter names the session, not a round', () => {
    /* The string I shipped and had to take back. */
    expect(SURFACES['the check-in header']).not.toContain('Round {openRound}')
    expect(SURFACES['the check-in header']).toContain('checked in for session {openRound}')
  })
})
