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
 * RUN LAST, ON WHAT IS ALREADY WALLED. The name is the row's name as this reader may read it, after
 * every rule about names has run, so this adds no name the reader could not already read above the
 * line. A line already replaced for the person an evaluation is about (the facts only, never a
 * colleague's words) is not a quote and is left as it is.
 */

const QUOTED_ALREADY = /^[^"“]{1,80}\bsaid\b[^"“]*["“]/;

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
        const text = typeof item?.text === 'string' ? item.text.trim() : '';
        if (!text || notTheirWords.includes(text) || QUOTED_ALREADY.test(text)) return item;
        return { ...item, text: oneLineInTheirName(text, who, item.type) };
      }),
    };
  });
}
