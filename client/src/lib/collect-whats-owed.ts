import type { ScenarioCard } from '@/pages/grounds/CreateGroundPage'

/**
 * COLLECT WHAT'S OWED (COLLECTIONS, working label; release plan, Release 2), FOR THE SCREENS.
 *
 * OFFERED ONLY WHERE THE ORGANISATION'S RELEASE 2 SWITCH IS ON. The server says so on GET /grounds/situations-offered, and asks
 * again when the check-in is created, so hiding it here is never the guard. Where it is off, every picker reads exactly as it
 * did: this card is kept out of SCENARIO_LABELS and SCENARIO_FACTS, which both pickers build their lists from, the same way the
 * anchor's own situation is (scenario-catalog.ts, HELP_TEAM_UNDERSTAND).
 *
 * A COPY OF THE SERVER'S WORDS where the screen needs them before anything exists (api/src/modules/grounds/collect-whats-owed.ts):
 * the label, the one line, the detection words and the default rhythm.
 */
export const COLLECT_WHATS_OWED = 'Collect what’s owed'

export const COLLECT_WHATS_OWED_ONE_LINE = 'Which bills are due, what has been paid with proof, and what is in the way.'

/** The sentence the card starts the conversation with, as every other card has one. */
export const COLLECT_WHATS_OWED_OPENER = 'We are following up what is owed to us, and I want to know which bills are due, what has been paid with proof, and what is in the way.'

/** The heading it sits under in "every situation": a read on work that is already running. */
export const COLLECT_WHATS_OWED_GROUP = 'reading' as const

export const COLLECT_WHATS_OWED_CARD: ScenarioCard = {
  cardKey: 'COLLECTIONS',
  scenario: 'COLLECTIONS',
  label: COLLECT_WHATS_OWED,
  desc: 'Agree which bills each person follows up, and what counts as paid. Each check-in asks about every open bill by name: what makes it due, what has been paid with proof, and what is in the way.',
  moment: COLLECT_WHATS_OWED_ONE_LINE,
  agreed: 'Agree which bills each person follows up, and what counts as paid.',
  tests: 'Each check-in asks about every open bill by name: what makes it due, what has been paid with proof, and what is in the way.',
  examples: [
    'Fee notes go out late, and nobody knows which clients have paid.',
    'Borrowers repay each week, and you only hear about the ones who stop.',
  ],
}

/** "For example", in the "You picked" panel, in full sentences. */
export const COLLECT_WHATS_OWED_FOR_EXAMPLE: [string, string] = [
  'Fee notes go out late, and nobody knows which clients have paid.',
  'Borrowers repay each week, and you only hear about the ones who stop.',
]

/**
 * THE DETECTION WORDS (release plan, Release 2): collect, owed, invoice, fee note, debtor, repay, loan, credit, each a whole word
 * with its ordinary endings. Read only where the switch is on, on words the lead typed herself.
 */
const DETECTS = /\b(?:collect(?:s|ed|ing|ions?)?|owed|owing|invoic(?:e|es|ed|ing)|fee[- ]?notes?|debtors?|repa(?:y|ys|id|ying|yments?)|loans?|credit(?:s|ors?)?)\b/i

export function soundsLikeCollectingWhatsOwed(words: string | null | undefined): boolean {
  return DETECTS.test(String(words ?? ''))
}

/** The default rhythm a new one starts with (the server's RECOMMENDED_CADENCE and DEFAULT_TIMELINE_DAYS). */
export const COLLECT_WHATS_OWED_FACTS = { cadence: 'Weekly', timelineDays: 90 } as const
