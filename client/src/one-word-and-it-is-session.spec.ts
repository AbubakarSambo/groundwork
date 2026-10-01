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
 * "Closing round" WAS left alone here, on the reasoning that a named phase with an endpoint
 * behind it is a different decision from settling a word. That was over-cautious: the decision was
 * already made, and the phase is called the closing session now - screen, route, service method
 * and prompt. Nothing in the product says "round" to a person any more.
 */
const read = (...p: string[]) =>
  readFileSync(join(__dirname, ...p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

const SURFACES = {
  'the check-in header': read('pages', 'grounds', 'GroundAdminPage.tsx'),
  'the chat': read('pages', 'chat', 'ChatPage.tsx'),
  /* 'the report' pointed at ReportPage.tsx, whose only content (ReportBody) is deleted - see the
     comment at the top of that file. The live report surface is the per-session page. */
  'the report': read('pages', 'report', 'SessionReportPage.tsx'),
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
  /* The closing phase, settled later than the rest - screen, route, service method and prompt. */
  /closing round/i,
  /Begin closing round/i,
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
    /*
     * U.10 PICTURE-CHECK ROUND 7, ITEM 3: THE SENTENCE MOVED FROM JSX CHILDREN TO A TEMPLATE
     * LITERAL. The header's "pieces side by side" (a scenario pill, a session pill, a checked-in
     * count as separate spans) became one plain-sentence paragraph, built with
     * `${openRound}` in a template string rather than `{openRound}` as a JSX child - the same
     * word, "session", not "round", said the same way, just no longer inside a `<span>`.
     */
    expect(SURFACES['the check-in header']).toContain('checked in for session ${openRound}')
  })
})
