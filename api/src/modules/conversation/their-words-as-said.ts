/**
 * THE ONE FUNCTION THAT PUTS QUOTATION MARKS ROUND WHAT SOMEBODY SAID (docs/fix-plan.md, batch 2 group 3; round 50: "I've promised to
 * send the draft to Wanjiru by Wednesday, 4 November." was shown in quotation marks as Brian's, and he had typed "promised to send the
 * Kasarani Foods submissions draft to Wanjiru by Wednesday 4 November 2026").
 *
 * Only words they typed word for word (`saidWordForWord`, set where the words were found in what they typed) are put in quotation
 * marks. Anything else is said plainly, with no marks, so nothing reads as a quote that was not typed. Every sentence that quotes a
 * line takes its words from here, and no sentence builds its own marks.
 */

/** Their words without marks round them and without the stop at the end, since the sentence puts its own. */
export function theWordsAlone(words: string): string {
  return String(words ?? '').trim().replace(/^["“”']+|["“”']+$/g, '').replace(/[\s.,;:!]+$/, '').trim();
}

/** Their words in quotation marks when they typed them word for word; otherwise the same words said plainly. */
export function theirWordsAsSaid(words: string, saidWordForWord: boolean | null | undefined): string {
  const w = theWordsAlone(words);
  if (!w) return '';
  return saidWordForWord === true ? `“${w}”` : w;
}

/** Whether a line may be quoted at all: only what they typed word for word. */
export const mayBeQuoted = (saidWordForWord: boolean | null | undefined): boolean => saidWordForWord === true;
