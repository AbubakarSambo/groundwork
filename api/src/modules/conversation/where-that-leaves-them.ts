/**
 * THEY SAID A NUMBER. TELL THEM WHERE IT LEAVES THEM.
 *
 * A lead came to set targets and track progress. Session two, she says "we are at sixty", and the
 * reply asks her the next question. The board knows she set a hundred and fifty, knows the date she
 * set, and knows what she was on last time. She hears none of it, and the one thing she came for -
 * tracking - happens somewhere she is not.
 *
 * This is the trade at its most obvious, and the safest one in the product: it is HER number against
 * HER target. Nothing about anybody else, no wall to apply, nothing that was not already hers.
 *
 * WHAT THIS DOES NOT DO. It does not read the number out of the sentence and it does not decide that
 * she reported progress. Both of those are readings, and this file makes none: it hands the model
 * her own targets and where the board has them, and the model places what she said or does not.
 * `what-the-record-says-a-number-is.ts` is the one that reads a value, it runs when a round closes,
 * and it asks her before changing anything. That division stays.
 *
 * A NUMBER IS THE ONLY TRIGGER. Where they said no number, this is silent, because a conversation
 * that recites somebody's targets back at them unprompted is the restating fault wearing a
 * different coat.
 */

export interface ATargetOfTheirs {
  name: string;
  target: number | null;
  /** Where the board has them, which is what a lead set or accepted, never a guess. */
  count: number;
}

/**
 * DIGITS, OR THE WORDS PEOPLE ACTUALLY USE FOR NUMBERS.
 *
 * The first list went from twenty upwards and had "a dozen" in it. Run against a real participant
 * check-in, Rita opened with "not great honestly, I have closed twelve" - against a target of 150
 * sitting on the board - and the most useful give-back in the product stayed silent. The reply asked
 * her what her target was. It was on the board.
 *
 * Small numbers are the ones people say in words. Nobody writes "we closed 3", they say "I closed
 * three", and a sales quarter is full of single figures. Starting the list at twenty missed the half
 * of this that matters.
 */
const SMALL_NUMBER_WORDS = [
  'zero', 'none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
  'hundred', 'thousand', 'half', 'dozen',
];

const SAYS_A_NUMBER = new RegExp(
  `\\b\\d[\\d,.]*\\b|\\b(?:${SMALL_NUMBER_WORDS.join('|')})\\b|\\ball of them\\b`,
  'i',
);

export function theySaidANumber(text: string): boolean {
  const said = (text ?? '').trim();
  if (said.length < 3) return false;
  /* A date on its own is not a report of progress, and "session 2" is not a count of anything. */
  const withoutDates = said
    .replace(/\b\d{1,2}[\/.-]\d{1,2}([\/.-]\d{2,4})?\b/g, ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, ' ')
    .replace(/\bsession\s*\d+\b/gi, ' ');
  return SAYS_A_NUMBER.test(withoutDates);
}

/**
 * Their own targets, put in front of the model, when they have just said a number.
 *
 * Only targets with a number to be against. An aim with no target cannot tell anybody where they
 * are, and listing it here would invite the model to invent a denominator.
 */
export function whereThatLeavesThem(theyJustSaid: string, theirs: ATargetOfTheirs[]): string {
  if (!theySaidANumber(theyJustSaid)) return '';
  const trackable = (theirs ?? []).filter((t) => t.name?.trim() && typeof t.target === 'number' && t.target! > 0);
  if (!trackable.length) return '';

  const lines = trackable
    .slice(0, 6)
    .map((t) => `- ${t.name.trim()}: the board has ${t.count} of ${t.target}.`);

  return [
    'WHAT THEY ARE TRACKING, AND WHERE THE BOARD HAS THEM.',
    '',
    ...lines,
    '',
    'They have just said a number. If it reports where one of these stands now, say where that leaves',
    'them in one short clause before your question - "that is sixty of the hundred and fifty" - in your',
    'own words and using the figures above, never a figure of your own.',
    '',
    'Say nothing about any of this if their number was about something else. Do not recite the list,',
    'do not ask them to confirm it, and do not tell them they are behind or ahead: the arithmetic is',
    'theirs to draw a conclusion from. Nothing here changes what the board holds - a number is only',
    'changed where they are asked and they accept.',
  ].join('\n');
}
