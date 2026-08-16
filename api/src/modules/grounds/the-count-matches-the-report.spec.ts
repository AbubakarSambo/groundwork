import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "0 OF 3 CHECKED IN" PRINTED ABOVE A REPORT BUILT FROM THREE ACCOUNTS.
 *
 * Found on a live ground where Eric, Nate and Sahar had all completed session 1. The report body was
 * right - two gaps, both stakes named, a recommended next conversation. The header above it said
 * "Picture forming - 0 of 3 checked in. You haven't checked in yet for this round", to somebody who
 * had checked in minutes earlier.
 *
 * The cause was not a race. Completing session 1 creates the session 2 rows immediately, and this
 * counted the HIGHEST session any row existed for - so it flipped to session 2, where nobody had
 * answered yet, while the report described session 1. The count was accurate about a round nobody had
 * been asked to do, and useless about the one on screen.
 *
 * A leader cannot act on a page that contradicts itself, so this is pinned.
 */
const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const fn = CODE.slice(CODE.indexOf('async getSessionProgress('), CODE.indexOf('async getSessionProgress(') + 2600);

describe('the round counted is the round answered', () => {
  it('asks for the newest COMPLETED session, not the newest row', () => {
    expect(fn).toMatch(/status: CheckInStatus\.COMPLETED[\s\S]*?_max: \{ sessionNumber: true \}/);
  });

  it('and prefers it over the newest open round', () => {
    /**
     * Order matters: the fallback must only apply when nothing has been completed anywhere, which is
     * a genuinely-just-started ground.
     */
    expect(fn).toMatch(/lastAnswered\._max\.sessionNumber \?\? newestOpen\._max\.sessionNumber \?\? 1/);
  });

  it('a ground with nothing finished still reports on its open round', () => {
    expect(fn).toMatch(/newestOpen/);
  });
});

describe('who the denominator counts', () => {
  it('excludes a managing-only lead', () => {
    /**
     * They give no account by design. Counting them made the denominator unreachable: "2 of 3"
     * forever, on a ground where everybody who was ever going to answer already had.
     */
    expect(fn).toMatch(/managingOnly: false,/);
  });

  it('and still counts anyone who has actually completed this round', () => {
    expect(fn).toMatch(/checkIns: \{ some: \{ sessionNumber, status: CheckInStatus\.COMPLETED \} \}/);
  });
});
