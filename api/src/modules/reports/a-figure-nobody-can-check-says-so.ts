import { quantitiesIn, wasHedged } from '../conversation/a-hedge-is-not-a-fact';

/**
 * A NUMBER SOMEBODY ESTIMATED IS NOT A NUMBER SOMEBODY COUNTED, AND THE REPORT HAS TO SAY WHICH.
 *
 * The conversation now refuses to restate a hedge as a fact - see a-hedge-is-not-a-fact. That
 * protects the turn. It does not protect the record, because what reaches the report is the line
 * itself: "about a third of the way there I would say" arrives at a manager's screen as a sentence
 * with a quantity in it, sitting in a list beside lines that came off a system.
 *
 * On the page a chief of staff opens to decide what to do about ten people, those two look
 * identical. One of them is a guess made in a chat.
 *
 * SO THE MARK GOES ON THE LINE, NOT ON THE PERSON. It says what the reader cannot otherwise know:
 * that this figure was estimated, or that nothing was attached to it. It never says the person is
 * unreliable, never scores anybody, and never removes the line - what they said is what they said,
 * and a number given honestly as a guess is worth having.
 *
 * TWO DIFFERENT ABSENCES, AND THEY ARE NOT THE SAME. "Roughly a third" is a figure its author has
 * already told you not to lean on. "Twelve tickets are over a day old" with nothing attached is a
 * firm claim from memory - the person is sure, and nobody else can see it. The first needs the
 * hedge kept; the second needs the reader to know where it came from.
 */
export type HowSolid = 'counted' | 'estimated' | 'from-memory';

export const WHAT_THAT_MEANS: Record<HowSolid, string> = {
  'counted': 'given as a figure, with something behind it',
  'estimated': 'given as an estimate, in their own words',
  'from-memory': 'given from memory, with nothing attached',
};

/** The short mark a report puts beside the line. Empty for a figure that needs no caveat. */
export const MARK: Record<HowSolid, string> = {
  'counted': '',
  'estimated': 'their estimate',
  'from-memory': 'from memory',
};

export interface Said {
  text: string;
  /** False when the line is anchored to a document. Mirrors RecordEntry.recallBased. */
  recallBased: boolean;
}

/**
 * How solid a line's figures are, or null where it holds no figure at all.
 *
 * Null rather than 'counted' on purpose: a line with no number in it is not a weak number, and
 * marking every sentence in the report would turn the mark into wallpaper nobody reads.
 */
export function howSolid(said: Said): HowSolid | null {
  const quantities = quantitiesIn(said.text ?? '');
  if (!quantities.length) return null;
  if (quantities.some((q) => wasHedged(said.text, q))) return 'estimated';
  return said.recallBased ? 'from-memory' : 'counted';
}

/**
 * Every line in a report that carries a figure the reader cannot check, with the mark for it.
 *
 * Counted figures are left out of the result entirely: the point is what needs a caveat, and a list
 * that included the solid ones would have to be read to find the weak ones.
 */
export function figuresWorthACaveat<T extends Said>(lines: T[]): { line: T; how: HowSolid; mark: string }[] {
  return lines
    .map((line) => ({ line, how: howSolid(line) }))
    .filter((r): r is { line: T; how: HowSolid } => r.how === 'estimated' || r.how === 'from-memory')
    .map((r) => ({ ...r, mark: MARK[r.how] }));
}

/**
 * THE SENTENCE THAT GOES UNDER THE BLOCK, where any of it is unchecked.
 *
 * A count, never a list of names and never a proportion of the person. "Two of the six figures
 * here" is a statement about the report; "a third of what Musa said" is a statement about Musa.
 */
export function sayingHowMuchIsUnchecked(unchecked: number, ofTotal: number): string | null {
  if (unchecked <= 0 || ofTotal <= 0) return null;
  const which = unchecked === 1 ? 'One figure here was' : `${unchecked} of the ${ofTotal} figures here were`;
  return `${which} given in conversation rather than read off anything. Worth confirming before acting on ${unchecked === 1 ? 'it' : 'them'}.`;
}
