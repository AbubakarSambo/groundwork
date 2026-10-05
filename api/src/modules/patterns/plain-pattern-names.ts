/**
 * THE PLAIN NAME OF EVERY PATTERN, AND THE ONLY NAME A PERSON EVER READS.
 *
 * Copied word for word from docs/pattern-names.md, approved by Hafsah 29 September 2026 (decision
 * 52), with eight names reworded from the 26 September draft: B3, B8, B11, E1, E3, E5, F3 and F4.
 * Decision 19: "The internal names stay as they are. Each of the 49 patterns gets a plain name for
 * screens." So the internal names in pattern-library.ts are untouched and stay for whoever reads the
 * detectors, and everything that puts a pattern in front of a person takes its name from here and
 * nowhere else. If a name changes again, it changes here, and the document changes with it.
 *
 * WHY MOST OF THEM ARE A SENTENCE. Several internal names are labels on a person, "Blame Shifting",
 * "CEO-Pleasing", "Defensive Leadership", and the product's rule is that no label goes on a person.
 * A plain name says what the record shows HAPPENING, never what somebody is.
 *
 * E4 AND F5 ARE NOT HERE. They are on ALIGNMENT_FEED_ONLY_CODES and are never named to either person;
 * docs/pattern-names.md gives them a name "for an internal screen only", and that is kept apart below,
 * in a map nothing that serves a pattern imports, so a plain name cannot carry them onto a page by
 * mistake. `plainNameOf` answers null for them, and for any code the library does not know.
 *
 * B5 IS SETTLED. Decision 52: "B5 as written there (the code's meaning)". The detector means "heavy
 * communication, no reduction in blockers", and the name here follows the code, as approved.
 */

export type PlainKind = 'good' | 'carrying' | 'attention';

export interface APlainName {
  /** What the record shows happening, in a short plain sentence. */
  name: string;
  kind: PlainKind;
}

export const PLAIN_PATTERN_NAMES: Readonly<Record<string, APlainName>> = {
  /* Good news (8) */
  R3: { kind: 'good', name: 'Credits somebody else by name' },
  M1: { kind: 'good', name: 'Delivers what was agreed, with proof' },
  M2: { kind: 'good', name: 'Makes other people faster' },
  M3: { kind: 'good', name: 'Made several things move at once' },
  M4: { kind: 'good', name: 'Holds something up that nobody notices' },
  C1: { kind: 'good', name: 'Helps people agree' },
  C2: { kind: 'good', name: 'Keeps on top of what the work needs from others' },
  C3: { kind: 'good', name: 'Turns scattered information into something clear' },

  /* Carrying (3) */
  A1: { kind: 'carrying', name: 'Takes on coordination other people left undone' },
  A2: { kind: 'carrying', name: 'Steps in to stop things failing' },
  A3: { kind: 'carrying', name: 'Doing less than they used to, after a change' },

  /* Worth the lead's attention (36) */
  D1: { kind: 'attention', name: 'Said it was finished, the next team says it was not' },
  D2: { kind: 'attention', name: 'Works in a walkthrough, not in real use' },
  D3: { kind: 'attention', name: 'What counts as success changed part-way through' },
  D4: { kind: 'attention', name: 'Plenty of planning, nothing written down to work from' },
  D5: { kind: 'attention', name: 'The screens are there, what sits behind them is not' },
  D6: { kind: 'attention', name: 'Only one person can run it or explain it' },
  D7: { kind: 'attention', name: 'The time asked for does not match the work' },
  D8: { kind: 'attention', name: 'Keeps breaking after it was called finished' },
  B1: { kind: 'attention', name: 'Reports upward more brightly than the team describes it' },
  B2: { kind: 'attention', name: 'Presents well, delivers late, more than once' },
  B3: { kind: 'attention', name: 'Others describe doing work they described as theirs' },
  B4: { kind: 'attention', name: 'The founder keeps stepping in to fix things' },
  B5: { kind: 'attention', name: 'A lot of communicating, nothing unblocked' },
  B6: { kind: 'attention', name: 'The research keeps going and no decision comes' },
  B7: { kind: 'attention', name: 'Costs a lot, little has moved because of it' },
  B8: { kind: 'attention', name: 'When delivery is questioned, the answer points elsewhere' },
  B9: { kind: 'attention', name: 'The team each name a different priority' },
  B10: { kind: 'attention', name: 'The work stops until there is another call' },
  B11: { kind: 'attention', name: 'Problems are mostly put down to things outside the team' },
  B12: { kind: 'attention', name: 'The way of working does not fit the size of the company' },
  K1: { kind: 'attention', name: 'Decks and proposals instead of conversations with named buyers' },
  K2: { kind: 'attention', name: 'Spending is tracked and waste is not challenged' },
  K3: { kind: 'attention', name: 'The same problem is raised again and never fixed' },
  K4: { kind: 'attention', name: 'The inbox wins over the important work' },
  K5: { kind: 'attention', name: 'Tasks are described without saying what they are for' },
  E1: { kind: 'attention', name: 'Holds equity, and the record shows little delivered recently' },
  E2: { kind: 'attention', name: 'The introductions are always about to happen' },
  E3: { kind: 'attention', name: 'Present for the big moments, less so for the day-to-day work' },
  E5: { kind: 'attention', name: 'Asks for more than the record shows being given back' },
  R1: { kind: 'attention', name: 'Several people are waiting on the same person' },
  R2: { kind: 'attention', name: 'Their work keeps leaving other people unclear' },
  R4: { kind: 'attention', name: 'Two people who used to mention each other have stopped' },
  F1: { kind: 'attention', name: 'Good ideas, not much built' },
  F2: { kind: 'attention', name: 'The strategy is clear at the top and absent in the team' },
  F3: { kind: 'attention', name: 'Check-ins have become less specific while equity continues to vest' },
  F4: { kind: 'attention', name: "Well regarded, and their areas haven't moved faster" },
};

/**
 * The two that are never named to either person. For an internal screen only, and imported by
 * nothing that serves a pattern; the spec beside this file checks that.
 */
export const NEVER_NAMED_TO_A_PERSON: Readonly<Record<string, string>> = {
  E4: 'One founder carries the operational load',
  F5: 'One cofounder does the operating, the other the talking',
};

/** The plain name a person may read, or null: for E4, F5 and any code the library does not know. */
export function plainNameOf(code: string): APlainName | null {
  return Object.prototype.hasOwnProperty.call(PLAIN_PATTERN_NAMES, code) ? PLAIN_PATTERN_NAMES[code] : null;
}
