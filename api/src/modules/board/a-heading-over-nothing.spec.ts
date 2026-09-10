import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "MY PRIVATE REPORT DIDN'T RENDER" - IT DID, AND THAT WAS THE PROBLEM.
 *
 * Everything on the page drew: the card, the header, the status, "Too little to say", "0 areas
 * settled". What was blank was one band - a heading reading "WHERE THIS STANDS, ACROSS EVERYONE"
 * over an empty paragraph, because `sharedPicture` is empty until enough has been said to make one.
 *
 * A heading with nothing under it is indistinguishable from a page that failed to load, which is
 * exactly how it was read. The state is not a fault and is worth saying: one person has spoken, and
 * a picture across the accounts needs more than one account.
 *
 * AND THE FOUR TILES ABOVE IT ON THE BOARD HAD THE OPPOSITE FAULT - full of words that answered
 * nothing. "ALIGNED? 1 open". "MOVING? no change". "STUCK? clear". "SOLID? moderate". Reported as
 * "aligned, moving etc, but it is not clear what it means". None of the four is an answer to the
 * question above it: "1 open" does not say whether anybody is aligned, and "clear" under "Stuck?"
 * reads as confirming that they are.
 *
 * A question-mark label also forces the value to be a verdict, on a board whose own panel says
 * three lines higher that it is never a verdict.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
/* The tiles live with their counts now, in one builder both surfaces call (what-this-session-holds.ts). */
const SERVICE = strip(readFileSync(join(__dirname, '..', 'reports', 'what-this-session-holds.ts'), 'utf8'));
const CARD = strip(
  readFileSync(
    join(__dirname, '..', '..', '..', '..', 'client', 'src', 'components', 'gw', 'SessionReportCard.tsx'),
    'utf8',
  ),
);

describe('the quick read', () => {
  it('labels a thing rather than asking a question', () => {
    for (const asked of ['Aligned?', 'Moving?', 'Stuck?', 'Solid?']) {
      expect(SERVICE).not.toContain(`label: '${asked}'`);
    }
    for (const named of ['Differences', 'Movement', 'Blockers', 'How much was said']) {
      expect(SERVICE).toContain(`label: '${named}'`);
    }
  });

  it('and every tile says in a whole clause what its number is of', () => {
    /* The sub-line used to be a fragment - "differences between accounts", "across targets this
       session" - which is a caption on a number nobody could read. */
    expect(SERVICE).toContain('still open, as the written report reads it');
    expect(SERVICE).toContain('no target moved this session');
    expect(SERVICE).toContain('nobody named anything holding work up');
    expect(SERVICE).toContain('of what was said is anchored to a document');
  });

  it('and none of them reads as a verdict on a person', () => {
    /* "clear", "no change" and "moderate" were verdict words on a board that says it never gives
       one. What is left is a count and what the count is of. */
    expect(SERVICE).not.toContain("value: blockers ? `${blockers} blocked` : 'clear'");
    expect(SERVICE).not.toContain("`no change`");
  });
});

describe('and the band that had nothing to show', () => {
  it('says why rather than leaving the space blank', () => {
    expect(CARD).toContain('Not enough has been said yet to draw one');
  });

  it('in one component both bands use', () => {
    /* Both bands render <ThePicture>, which carries the sentence once. */
    const hits = CARD.match(/Not enough has been said yet to draw one/g) ?? [];
    expect(hits.length).toBe(1);
    expect((CARD.match(/<ThePicture picture=\{picture\} dark \/>/g) ?? []).length).toBe(2);
  });

  it('and never renders an empty paragraph', () => {
    /* The exact shape of the fault: a bare `{report.sharedPicture}` with no fallback. */
    expect(CARD).not.toMatch(/>\{report\.sharedPicture\}</);
  });
});
