import { theirWordsItCameFrom } from './the-handoff-words-the-person-typed';

/**
 * WHAT EACH PERSON SAID IS SERVED AS THEIR WORDS, IN QUOTATION MARKS, WITH THEIR NAME (review of
 * 1 October 2026, run re-d, sales, session 1).
 *
 * The lead and every participant read, under Kwame's name on "Who owns what":
 *
 *   "I'm aiming to have all the documents submitted by Friday."
 *
 * The line is Kwame's own words, word for word (their-own-words-stay), and it was served as if the
 * page were saying it: "I" with nobody to be. Every line of that panel is a person's own words, so each
 * is now said as theirs: "Kwame Mensah said, "I'm aiming to have all the documents submitted by
 * Friday."", and to Kwame himself "You said, ...". The words inside the marks are not changed.
 *
 * A piece that is not a sentence ("22 approved facilities", "to disburse N120m") is what they said
 * success is, so it reads "Femi Okonkwo said success would be "to disburse N120m"."
 *
 * ONLY WORDS THEY SAID GO INSIDE THE MARKS (review of 1 October 2026). A record line is the record
 * reader's version, sometimes tidied ("I've had follow-up conversations with all 22 of my
 * applications." for Kwame's "I've also had follow-up conversations with all 22 of my applications.").
 * As the board's risks and blocker check do (the-handoff-words-the-person-typed), each line is checked
 * against what the person typed in that check-in when the board is built: found whole, it is quoted;
 * drawn from sentences of theirs, those sentences are quoted instead; drawn from nothing they typed,
 * the line is a plain sentence that carries none of their words ("Kwame Mensah has made a commitment
 * here."). No verb is changed and no pronoun is guessed.
 *
 * RUN LAST, ON WHAT IS ALREADY WALLED. The name is the row's name as this reader may read it, after
 * every rule about names has run, so this adds no name the reader could not already read above the
 * line. A line already replaced for the person an evaluation is about (the facts only, never a
 * colleague's words) is not a quote and is left as it is.
 */

/** Their words as a sentence inside quotation marks: the closing stop goes inside. */
const inMarks = (words: string) => `"${/[.!?]$/.test(words) ? words : `${words}.`}"`;

/** A piece, not a sentence: starts in lower case or with a number, or is a few words with no stop. */
const aPiece = (words: string) => /^[\p{Ll}\p{N}]/u.test(words) || (!/[.!?]$/.test(words) && words.split(/\s+/).length <= 4);

export interface AWhoOwnsWhatRow {
  participantId: string;
  name?: string | null;
  items?: readonly any[];
}

export function oneLineInTheirName(words: string, who: string, type?: string | null): string {
  const w = (words ?? '').trim();
  if (!w) return words;
  if (aPiece(w)) {
    const piece = w.replace(/[.!?]+$/, '');
    return type === 'SUCCESS_DEFINITION'
      ? `${who} said success would be "${piece}".`
      : `${who} said, "${piece}."`;
  }
  return `${who} said, ${inMarks(w)}`;
}

/** How a line may be said: its own words quoted, the sentences it came from quoted, or none of its words. */
export type SaidAs = 'their-words' | 'their-sentences' | 'not-their-words';

/**
 * The line's text and how it may be said, from what the person typed in the check-in it came from. The
 * text is what will go inside the marks, so every rule the board runs over a person's words (names, a
 * private file's name) runs over exactly these words.
 */
export function inTheirOwnWords(line: string, typed: string[] | undefined): { text: string; saidAs: SaidAs } {
  const them = theirWordsItCameFrom(line, typed);
  if (!them?.length) return { text: line, saidAs: 'not-their-words' };
  const same = (a: string, b: string) => a.trim().replace(/[.!?]+$/, '').toLowerCase() === b.trim().replace(/[.!?]+$/, '').toLowerCase();
  if (them.length === 1 && same(them[0], line)) return { text: line, saidAs: 'their-words' };
  return { text: them.join(' '), saidAs: 'their-sentences' };
}

/** A line drawn from nothing they typed: what kind of thing they said, with none of their words. */
export function saidWithoutTheirWords(who: string, type?: string | null): string {
  const has = who === 'You' ? 'have' : 'has';
  const they = who === 'You' ? 'you' : 'they';
  switch (type) {
    case 'COMMITMENT': return `${who} ${has} made a commitment here.`;
    case 'SUCCESS_DEFINITION': return `${who} ${has} said what success looks like.`;
    case 'INTENT': return `${who} ${has} said what ${they} intend to do.`;
    case 'PROGRESS': return `${who} ${has} reported progress.`;
    default: return `${who} ${has} said what ${they} own here.`;
  }
}

/**
 * A LINE IS AN INTENTION ONLY IF IT SAYS SOMETHING IS INTENDED (requests 127 item 4 and 129 item 5). "I close refunds when I send the
 * instruction", "Zainab Suleiman, partnerships." and "I believed Zainab was driving this forward." were typed INTENT, so the screen
 * said "This is something Aisha Wanjiku intends to do." of what she does now, of a name and of what she once believed. A line typed
 * INTENT that holds no word of intending is sent with no type, and the screen says nothing about its kind. The words are not changed.
 */
const SAYS_SOMETHING_IS_INTENDED = /\b(?:will|won['\u2019]t|going to|plan(?:s|ning|ned)?(?: to)?|want(?:s|ed)? to|aim(?:s|ing)?(?: to| for)?|hope(?:s|d)? to|intend(?:s|ed)?|would like|would|need(?:s)? to|should|shall|trying to|looking to|expect(?:s)? to|next|(?:is|are) to|by (?:friday|monday|tuesday|wednesday|thursday|saturday|sunday|tomorrow|the end))\b|['\u2019]ll\b/i;
export function theKindThatFits(text: string | null | undefined, type: string | null | undefined): string | null | undefined {
  if (type !== 'INTENT') return type;
  return SAYS_SOMETHING_IS_INTENDED.test(String(text ?? '')) ? type : null;
}

/** The served lines with the kind that fits each (see theKindThatFits). Run last: the other boards read the kind the record holds. */
export function eachLineWithTheKindThatFits<T extends AWhoOwnsWhatRow>(rows: readonly T[] | null | undefined): T[] {
  if (!Array.isArray(rows)) return (rows ?? []) as T[];
  return rows.map((row) => (row && Array.isArray(row.items)
    ? { ...row, items: row.items.map((it: any) => (it && it.type === 'INTENT' ? { ...it, type: theKindThatFits(it.text, it.type) } : it)) }
    : row));
}

export function eachLineInTheirName<T extends AWhoOwnsWhatRow>(
  rows: readonly T[] | null | undefined,
  readerParticipantId: string | null,
  /** Lines that are not their words (the facts-only line an evaluation's subject reads). */
  notTheirWords: readonly string[] = [],
): T[] {
  if (!Array.isArray(rows)) return (rows ?? []) as T[];
  return rows.map((row) => {
    if (!row || !Array.isArray(row.items)) return row;
    const who = readerParticipantId && row.participantId === readerParticipantId
      ? 'You'
      : (row.name ?? '').trim() || 'A colleague';
    return {
      ...row,
      items: row.items.map((item: any) => {
        const { saidAs, ...rest } = item ?? {};
        const text = typeof rest?.text === 'string' ? rest.text.trim() : '';
        /* Already said as theirs (this ran once before on it): left as it is. */
        const alreadyTheirs = saidAs === undefined && (text.startsWith(`${who} said`) || text.startsWith(`${who} has `) || text.startsWith(`${who} have `));
        if (!text || notTheirWords.includes(text) || alreadyTheirs) return item ? rest : item;
        /* The text already says what kind of line it is ("You have reported progress."), so the screen need not
           say it again under it (request 117, part 8): `itsKindIsSaid`. */
        if (saidAs === 'not-their-words') return { ...rest, text: saidWithoutTheirWords(who, rest.type), itsKindIsSaid: true };
        /* Their own marks inside a quote become single ones, so one quote is never closed by another. */
        const words = text.replace(/["“”]/g, "'");
        if (saidAs === 'their-sentences') return { ...rest, text: `${who} said, "${/[.!?]$/.test(words) ? words : `${words}.`}"` };
        return { ...rest, text: oneLineInTheirName(words, who, rest.type) };
      }),
    };
  });
}
