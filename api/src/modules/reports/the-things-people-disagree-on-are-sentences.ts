/**
 * THE THINGS PEOPLE DISAGREE ON ARE SENTENCES, NOT A LIST JOINED WITH SEMICOLONS (run-26, asset loans).
 *
 * The opening read "All nine people have answered. They disagree on three things: The loan's repayment schedule does
 * not align with the time it takes for a new business to generate income.; The loan program's scope of support is not
 * agreed upon.; There is no clear process for handling asset non-delivery or loss." The picture then split at each full
 * stop and the shared picture held two lines that began with "; ". The count is said as a sentence of its own and each
 * thing after it is a sentence, so a line never starts with a semicolon and nothing is joined with ".;".
 *
 * Only the product's own join is changed: a semicolon straight after a full stop, and the colon after "three things".
 */
const THE_COUNT_THEN_A_COLON = /\b(They|People|they|people) (disagree|differ) on (one thing|two things|three things|four things|five things|\d+ things?):\s*(\S)/g;
const A_SEMICOLON_AFTER_A_FULL_STOP = /([.!?])\s*;\s+(\S)/g;
const A_LINE_THAT_STARTS_WITH_A_SEMICOLON = /^(\s*);\s+(\S)/;

export function theThingsTheyDisagreeOnAreSentences(text: string): string {
  if (!text || (!/[.!?]\s*;\s/.test(text) && !/^\s*;\s/.test(text) && !THE_COUNT_THEN_A_COLON.test(text))) {
    THE_COUNT_THEN_A_COLON.lastIndex = 0;
    return text;
  }
  THE_COUNT_THEN_A_COLON.lastIndex = 0;
  return text
    .replace(THE_COUNT_THEN_A_COLON, (_m, who: string, verb: string, n: string, first: string) => `${who} ${verb} on ${n}. ${first.toUpperCase()}`)
    .replace(A_SEMICOLON_AFTER_A_FULL_STOP, (_m, stop: string, first: string) => `${stop} ${first.toUpperCase()}`)
    .replace(A_LINE_THAT_STARTS_WITH_A_SEMICOLON, (_m, lead: string, first: string) => `${lead}${first.toUpperCase()}`);
}
