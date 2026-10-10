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
  /* B-147: the deep page audit found "check-in" and "round" still standing in for a single
     session on My work, the just-finished panel, the board, who-is-still-out, the help modal,
     an invitation, setup, the waiting-for-an-admin page, the entry chat and the staff dashboard. */
  'my work (the session count tile)': read('components', 'gw', 'checkin', 'YourWork.tsx'),
  'what the report can say yet': read('components', 'gw', 'WhatTheReportCanSayYet.tsx'),
  'the just-finished panel': read('components', 'gw', 'TheCheckInYouJustFinished.tsx'),
  'the board': read('pages', 'board', 'BoardPage.tsx'),
  'who is still out': read('components', 'gw', 'WhoIsStillOut.tsx'),
  'the help modal': read('components', 'gw', 'HelpModal.tsx'),
  'the invitation': read('pages', 'invite', 'InvitePage.tsx'),
  'the setup strings': read('pages', 'enter', 'TheSetup.tsx'),
  'waiting for an admin': read('pages', 'join', 'WaitingForAnAdminPage.tsx'),
  'the entry chat': read('pages', 'enter', 'EntryChatPage.tsx'),
  'the staff dashboard': read('pages', 'admin', 'AdminPage.tsx'),
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
  /* B-147's own finds. */
  /Check-in \$\{sessionNumber\}/,
  /check-ins so far/i,
  /Needs a second round/i,
  /said no to this round/i,
  /the next round opens/i,
  /The second round is/i,
  /Do the second round/i,
  /their last 10 check-ins/i,
  /build from the next round/i,
  /Your first check-in opens/i,
  /first check-in opens at the start time/i,
  /first check-in will be waiting/i,
  /waiting for the first check-in/i,
  /Avg days to first check-in/i,
  /A second round finished/i,
  /leads with a second check-in/i,
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
    /* F-18: the sentence is written once, in lib/how-many-checked-in.ts, and the header calls it.
       UPDATED (B-053): the call now reads `clockRound`/`clockRoundDone`, the session
       `ground.sessionClock.says` itself names, rather than the page's own `openRound` - the two
       used to disagree the moment the lead had finished a session the server still called
       current. Still "session", never "round". */
    expect(SURFACES['the check-in header']).toContain('howManyCheckedInSentence(clockRoundDone, total, clockRound)')
  })
})
