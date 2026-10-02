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
/*
 * THE CARD THIS USED TO READ NO LONGER EXISTS, AND THE RULE OUTLIVED IT.
 *
 * `SessionReportCard` opened with the shared picture in a dark band, which is what the band-with-
 * nothing-to-show rule below was written about. The end of a signed-in check-in is now A - what
 * one person said this time - and the shared picture is a different report on a different surface,
 * so there is no band here to be empty.
 *
 * The rule is kept as its stronger form: the card must not draw the shared picture at all.
 */
const CARD = strip(
  readFileSync(
    join(__dirname, '..', '..', '..', '..', 'client', 'src', 'components', 'gw', 'TheCheckInYouJustFinished.tsx'),
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
    expect(SERVICE).toContain('The written report reads this as still open.');
    expect(SERVICE).toContain('No target changed this session.');
    expect(SERVICE).toContain('Nobody named anything holding work up.');
    /* Request 67: the last tile's sub is now a whole sentence of its own, "15 of every 100 things
       people said have a document behind them.", so the old fragment is gone. */
    expect(SERVICE).toContain('of every 100 things people said');
    expect(SERVICE).not.toContain('of what was said is anchored to a document');
  });

  it('and none of them reads as a verdict on a person', () => {
    /* "clear", "no change" and "moderate" were verdict words on a board that says it never gives
       one. What is left is a count and what the count is of. */
    expect(SERVICE).not.toContain("value: blockers ? `${blockers} blocked` : 'clear'");
    expect(SERVICE).not.toContain("`no change`");
  });
});

describe('and the band that had nothing to show', () => {
  it('is gone, because the close no longer draws the shared picture', () => {
    /* The band cannot be empty if it is not there. A - what you said this time - is the whole
       card; the shared picture has its own surface and is a door at the foot, not a copy. */
    expect(CARD).not.toContain('ThePicture');
    expect(CARD).not.toContain('sharedPicture');
    expect(CARD).toContain('See the shared picture for this session');
  });

  it('and never renders an empty paragraph', () => {
    /* The exact shape of the original fault: a bare value with no fallback. Kept because it is the
       shape, not the field, that mattered. */
    expect(CARD).not.toMatch(/>\{report\.\w+\}</);
  });
});
