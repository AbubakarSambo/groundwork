/**
 * WHAT A PERSON WITH NO NAME IS CALLED, IN THE SAME WORDS THE ENGINE USES. Request 36.
 *
 * Hafsah, 27 September 2026: "Fix it the simple way: the label never uses the lead's description;
 * with no name, use a plain neutral label." The screens used to fall back to `roleAsDescribed`,
 * which is mostly the lead's own private sentence about someone ("Daniel - Your sales manager, who
 * you said is not meeting his agreed targets..."), and then to "a teammate", which the prototype
 * never says.
 *
 * This mirrors `plainWordsForTheUnnameable` and `plainWordsByPerson` in
 * api/src/modules/reports/party-labels.ts, so that a person is called the same thing on the board,
 * in the report and on every screen. It is a copy, not an import, because the client does not load
 * server code; `a-colleague.spec.ts` runs both on the same people and checks they agree.
 *
 *  - One person with no name is "a colleague".
 *  - Several are "one colleague", "another colleague", "a third colleague" and so on, in the order
 *    they joined the check-in; past the twelfth, everybody left is "another colleague".
 *  - A lead with no name is "the lead", or "your lead" to somebody in the check-in.
 *  - The reader is never counted: they are "You" on every screen.
 *  - All of these are lower case, for inside a sentence. `atTheStart` gives the capital for the
 *    start of a sentence or a line.
 */

export interface APersonToName {
  id?: string | null
  partyType?: string | null
  createdAt?: string | Date | null
}

const AFTER_THE_SECOND = [
  'a third colleague', 'a fourth colleague', 'a fifth colleague', 'a sixth colleague',
  'a seventh colleague', 'an eighth colleague', 'a ninth colleague', 'a tenth colleague',
  'an eleventh colleague', 'a twelfth colleague',
]

/** The same order the engine hands its labels out in: by when they joined, where every row says. */
function inAStableOrder<T extends APersonToName>(people: T[]): T[] {
  const when = (p: T) => (p.createdAt ? new Date(p.createdAt as any).getTime() : NaN)
  const times = people.map(when)
  if (!times.length || times.some((t) => !Number.isFinite(t))) return people
  return [...people].sort((a, b) => when(a) - when(b) || String(a.id).localeCompare(String(b.id)))
}

/**
 * The plain words for everybody in `people` who has no name this reader may see, keyed by id.
 * People with a name are left out of the map. `named` says whether somebody has one.
 */
export function plainWordsByPerson<T extends APersonToName>(
  people: (T | null | undefined)[],
  opts: {
    named: (p: T) => boolean
    /** The reader's own row, which is "You" and so is never counted as a colleague. */
    readerId?: string | null
    /** Whether the reader is somebody in this check-in, so a lead with no name is "your lead". */
    readerIsInIt?: boolean
  },
): Map<string, string> {
  const out = new Map<string, string>()
  const all = inAStableOrder(people.filter((p): p is T => !!p && !!p.id))
  const unnamed = all.filter((p) => !opts.named(p) && (!opts.readerId || p.id !== opts.readerId))
  const lead = unnamed.find((p) => p.partyType === 'INITIATOR')
  if (lead) out.set(lead.id as string, opts.readerIsInIt ? 'your lead' : 'the lead')
  const colleagues = unnamed.filter((p) => p.partyType !== 'INITIATOR')
  if (colleagues.length === 1) {
    out.set(colleagues[0].id as string, 'a colleague')
  } else {
    colleagues.forEach((p, i) => {
      const phrase = i === 0 ? 'one colleague' : i === 1 ? 'another colleague' : AFTER_THE_SECOND[i - 2]
      out.set(p.id as string, phrase ?? 'another colleague')
    })
  }
  return out
}

/** The words for one person with no name, shown on their own: "a colleague", or "the lead". */
export function oneWithNoName(p: APersonToName | null | undefined, readerIsInIt = false): string {
  if (p?.partyType === 'INITIATOR') return readerIsInIt ? 'your lead' : 'the lead'
  return 'a colleague'
}

/** Whether a label is one of the plain phrases above, rather than somebody's name or address. */
export function isPlainWords(label: string | null | undefined): boolean {
  return /^(a|an|one|another|the|your) ([a-z]+ )?(colleague|lead)$/.test((label ?? '').trim())
}

/**
 * The phrase with a capital, for the start of a sentence or a line of its own. Only the plain
 * phrases are touched: a name or an address is shown exactly as the person gave it
 * ("admin@harvestline.test" does not become "Admin@harvestline.test").
 */
export function atTheStart(phrase: string): string {
  return phrase && isPlainWords(phrase) ? `${phrase[0].toUpperCase()}${phrase.slice(1)}` : phrase
}

/**
 * THE OPPOSITE CASE: A SERVED PHRASE DROPPED MID-SENTENCE (real-user walk, Kijani Foods, fault 1).
 * Some served `what` strings open with a capitalised article ("The Mwangi agency", "A new freezer")
 * because the same string also has to stand as a title on its own elsewhere. Where the screen drops
 * one into the middle of its own sentence ("for The Mwangi agency", "waiting on The Mwangi agency"),
 * only the leading "A", "An" or "The" is wrong - lower-case it, and leave every other word,
 * including a person's name, exactly as given.
 */
export function midSentence(phrase: string): string {
  return phrase.replace(/^(A|An|The)(?=\s)/, (m) => m.toLowerCase())
}
