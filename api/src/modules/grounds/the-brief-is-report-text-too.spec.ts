import { notTheWordParty } from '../reports/not-the-word-party';

/**
 * REPORT TEXT REACHES A READER BY TWO PATHS, AND ONLY ONE OF THEM HAD THE RULES.
 *
 * Seen in the running product, on one page, in the same paragraph position:
 *
 *   report tab   "Both agree that the Sam Okoro is responsible for twelve dormant accounts..."
 *   check-in     "Both parties agree that the Renewals owner is responsible for twelve..."
 *
 * The reports service does its work in its own read - the party rewrite, and the names a viewer is
 * entitled to. This path selects `report.sharedPicture` straight out of the column and serves it as
 * the check-in's brief, so it had none of that.
 *
 * The rewrite is applied here now. Names deliberately are NOT: who may see whose name is decided
 * with a viewer in hand and this has no viewer, so a role label is the honest thing to show.
 */
const src = require('fs')
  .readFileSync(__dirname + '/grounds.service.ts', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

describe('the brief is report text too', () => {
  it('reads the real file', () => {
    expect(src.length).toBeGreaterThan(20000);
  });

  it('runs the party rewrite over the brief before it is served', () => {
    expect(src).toMatch(/const brief = typeof rawBrief === 'string' \? notTheWordParty\(rawBrief\) : rawBrief/);
  });

  it('and the rewrite still does what this path needs from it', () => {
    /* The exact sentence that was showing on the check-in page while the report tab was clean. */
    expect(notTheWordParty('Both parties agree that the Renewals owner is responsible.'))
      .toBe('Both agree that the Renewals owner is responsible.');
  });

  it('does not try to resolve names here, which needs a viewer this path does not have', () => {
    const brief = src.slice(src.indexOf('const rawBrief'), src.indexOf('const rawBrief') + 400);
    expect(brief).not.toMatch(/withNames/);
  });
});
