/**
 * TWENTY CARDS IS A WALL, AND THE GROUPS ONLY MADE IT SIX SHORTER WALLS.
 *
 * Grouping fixed the card nobody could find. It did not fix the person who arrives knowing their
 * situation in their own words - "someone keeps missing deadlines", "we are onboarding four people",
 * "my co-founder and I disagree" - and has to translate that into our headings before they can look.
 * So: let them type it, and match against the words already on the cards.
 *
 * WHAT IS MATCHED. The label, the moment line, the description, the tag, and the "e.g." examples -
 * which is the important one, because the examples are the concrete situations somebody recognises
 * themselves in, and they are the words closest to what a person types.
 *
 * WHAT IS NOT DONE. No fuzzy distance, no synonym table, no ranking model. A typed word is matched
 * as a prefix of a word on the card, so "deadline" finds "deadlines" and "onboard" finds
 * "onboarding", and that is the whole of it. A cleverer matcher that silently reorders twenty
 * situations is worse than an honest one that finds nothing and says so - because picking the wrong
 * situation sets the objective, the cadence and the questions everybody is then asked.
 *
 * EVERY typed word must hit, not any of them. Somebody typing three words is narrowing.
 */

export interface Searchable {
  cardKey: string
  label: string
  desc: string
  /*
   * OPTIONAL, BECAUSE THE TAG IS NO LONGER A FIELD ON THE CARD - it is the card's group, derived
   * where the card is drawn. Search still weighs it when a caller has one, because somebody typing
   * "recurring" or "renewal" was being matched on it and that is worth keeping.
   */
  tag?: string
  moment?: string
  examples?: string[]
  /** Words people type that are nowhere on the card. See WORDS_PEOPLE_TYPE. */
  alsoTyped?: string[]
}

/**
 * THE WORDS PEOPLE TYPE THAT ARE NOWHERE ON THE CARDS.
 *
 * Found by searching the real catalogue with the phrases somebody would actually type. "Handover" -
 * the most ordinary English word for the situation - matched nothing, because the card is called "A
 * role changing hands". So did "conflict", "crisis", "promoted", "okr" and "underperforming".
 *
 * These are synonyms only. Each one is a different word for a situation a card already covers. Where
 * a typed word has no card behind it - "vendor", "audit", "launch", "burnout", "remote", "morale" -
 * there is deliberately no entry, and the search says so and points at "Not sure yet". Inventing a
 * mapping there would route somebody to a situation that is not theirs, and the card they land on
 * sets the objective, the cadence and the questions their whole team is then asked. A search that
 * finds nothing costs one sentence. A search that finds the wrong thing costs a round of check-ins.
 */
export const WORDS_PEOPLE_TYPE: Record<string, string[]> = {
  /* 'over' is here for the two-word "handing over": every typed word has to hit the same card,
     and without it "handing" hit this card while "over" hit only "A new manager taking over". */
  ROLE_HANDOVER: ['handover', 'handing', 'over', 'succession', 'replacing', 'successor', 'transition'],
  /* Before signing. "Draft" and "terms" are the giveaways — somebody with a signed contract does
     not describe it as a draft. */
  CONTRACT_REVIEW: ['draft', 'drafting', 'terms', 'before we sign', 'signing', 'unsigned', 'negotiating', 'proposal', 'agreement', 'msa', 'sow'],
  /* After signing. The words people use are about what is HAPPENING under it. */
  IMPLEMENTATION_TRACKING: ['royalty', 'royalties', 'revenue share', 'reconcile', 'reconciliation', 'reporting', 'licence', 'license', 'quarterly', 'invoices', 'compliance'],
  PIP: ['underperforming', 'underperformance', 'improvement', 'probation', 'warning', 'struggling'],
  DRIFT: ['slipping', 'behind', 'delayed', 'stalled', 'overdue', 'late'],
  REALIGN_TEAM: ['conflict', 'dispute', 'disagreement', 'argument', 'friction', 'tension'],
  ACUTE_SHOCK: ['crisis', 'emergency', 'incident', 'resigned', 'resignation', 'quit', 'fired', 'churn', 'walked'],
  RECOGNITION: ['promoted', 'appraisal', 'bonus'],
  NEW_COFOUNDER: ['cofounder'],
  OKR_ALIGNMENT: ['okr', 'okrs', 'kpi', 'kpis', 'targets', 'objectives', 'quarter', 'quarterly'],
  CONTRACT_RENEWAL: ['freelancer', 'contractor', 'consultant', 'extension'],
  CRISIS_ALIGNMENT: ['pivot', 'merger', 'acquisition', 'choice'],
  COHORT_CHECK: ['cohort'],
  SNAPSHOT: ['today'],
}

/** Attach the extra words to the cards, so the picker can hand them straight to whatMatches. */
export function alsoTyped<T extends { cardKey: string }>(cards: readonly T[]): (T & { alsoTyped?: string[] })[] {
  return cards.map(c => ({ ...c, alsoTyped: WORDS_PEOPLE_TYPE[c.cardKey] }))
}

/** Where a hit landed, worst to best. The label is what the card is called; an example is a
 *  situation somebody recognises. Both beat prose the eye skims. */
const WEIGHT = { label: 4, example: 3, alsoTyped: 3, moment: 2, tag: 2, desc: 1 } as const

const words = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g) ?? []

/** A word "hits" a field if some word in that field starts with it. Prefix, not substring, so
 *  "off" does not match "coffee" and "hire" does not match "higher". */
function hits(needle: string, haystack: string) {
  return words(haystack).some(w => w.startsWith(needle))
}

function scoreOneWord<T extends Searchable>(needle: string, card: T): number {
  let best = 0
  if (hits(needle, card.label)) best = Math.max(best, WEIGHT.label)
  for (const e of card.examples ?? []) if (hits(needle, e)) best = Math.max(best, WEIGHT.example)
  for (const w of card.alsoTyped ?? []) if (hits(needle, w)) best = Math.max(best, WEIGHT.alsoTyped)
  if (card.moment && hits(needle, card.moment)) best = Math.max(best, WEIGHT.moment)
  if (card.tag && hits(needle, card.tag)) best = Math.max(best, WEIGHT.tag)
  if (hits(needle, card.desc)) best = Math.max(best, WEIGHT.desc)
  return best
}

/**
 * The cards that match every word typed, best first. A query of nothing but punctuation or spaces
 * is not a search: it returns null, meaning "show the normal grouped list", which is different from
 * an empty array meaning "we looked and found nothing".
 */
export function whatMatches<T extends Searchable>(cards: readonly T[], query: string): T[] | null {
  const needles = words(query)
  if (needles.length === 0) return null
  const scored: { card: T; score: number }[] = []
  for (const card of cards) {
    let total = 0
    let all = true
    for (const n of needles) {
      const s = scoreOneWord(n, card)
      if (s === 0) { all = false; break }
      total += s
    }
    if (all) scored.push({ card, score: total })
  }
  /* Stable within a score: ties keep catalogue order rather than shuffling between keystrokes. */
  return scored
    .map((s, i) => ({ ...s, i }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(s => s.card)
}

/** What to say when the search found nothing. Names the way out rather than leaving a blank. */
export const NOTHING_MATCHED =
  'Nothing here uses those words. Clear the search to see them all, or pick "Not sure yet" at the '
  + 'top and describe it in your own words instead.'
