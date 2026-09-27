import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE PATTERN ENGINE RENDERS. IT DOES NOT ASK THE MODEL TO MENTION IT.
 *
 * Three hundred surfaced detections in the database, each one having survived a three-period rule,
 * and the only way any of them reached the shared report was a paragraph per row telling the
 * synthesis model to note it "if the record itself corroborates this". A finding handed to a model
 * as a suggestion is not a finding on the page. And when the model did comply, the same fact could
 * reach the reader twice - once in the model's words, once in the engine's - and disagree.
 *
 * So there is one route, and it is a section. This file keeps the other route from coming back.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const SERVICE = strip(readFileSync(join(__dirname, 'reports.service.ts'), 'utf8'));
/**
 * THE SECTION MOVED, AND THE RULE DID NOT.
 *
 * This read the session report, because that is where the section was when the model route was
 * taken out. It is on the BOARD now: a pattern says "seen across N periods", which is a claim about
 * a run, and the report for one session cannot support it - so the session page was the same
 * content in two places, one of which could not carry it.
 *
 * The rule this file exists for is untouched and the assertions for it below are unchanged: one
 * route, and it is a section the engine renders, never a paragraph asking a model to mention it.
 * Only where that section lives has changed.
 */
const CLIENT = strip(readFileSync(join(__dirname, '../../../../client/src/pages/board/BoardPage.tsx'), 'utf8'));
const SESSION_PAGE = strip(readFileSync(join(__dirname, '../../../../client/src/components/gw/TheSessionsReport.tsx'), 'utf8'));

describe('one route for patterns', () => {
  it('the synthesis prompt no longer carries pattern notices', () => {
    expect(SERVICE).not.toMatch(/longitudinal pattern evidence/);
    expect(SERVICE).not.toMatch(/patternNotices\.map/);
    expect(SERVICE).toMatch(/const patternNotice = '';/);
  });

  /*
   * THROUGH THE ONE RULE SINCE 28 SEPTEMBER 2026. The section used to read SURFACED rows with the
   * library's signal; SURFACED is not decision 8 (good news is SURFACED after one period) and the
   * signal is not the plain name decision 19 asks for. So it reads every row and serves what
   * patterns/who-reads-a-pattern lets this reader read, and the filters are pinned there.
   */
  it('the session report reads patterns as its own field, through the one rule', () => {
    const at = SERVICE.indexOf('const patternRowsForPage = PATTERNS_ARE_SERVED');
    expect(at).toBeGreaterThan(-1);
    const block = SERVICE.slice(at, at + 1200);
    expect(block).toContain('const patternsForPage = servedPatterns(');
    expect(block).toContain('runsIt: viewerIsLead');
    const RULES = strip(readFileSync(join(__dirname, '../patterns/who-reads-a-pattern.ts'), 'utf8'));
    expect(RULES).toContain('ALIGNMENT_FEED_ONLY_CODES.has(row.code)');
    expect(RULES).toContain('hasBeenSeenInThreePeriods(row)');
    /* The plain name, not the code, the internal name or the library's signal. */
    expect(RULES).toContain('heading: plain.name');
  });

  it('and the board renders it as a section with the count that makes it a pattern', () => {
    expect(CLIENT).toContain('Patterns this phase');
    /* The board names the same two things the session page did, in its own words: the engine's
       sentence, and the span that makes it a pattern rather than a week. */
    expect(CLIENT).toContain('{p.text}');
    expect(CLIENT).toMatch(/\{p\.periods\} periods/);
  });

  it('and the report for one session does not carry it, because it cannot support the span', () => {
    expect(SESSION_PAGE).not.toContain('What keeps showing up');
    expect(SESSION_PAGE).not.toContain('periodsObserved');
  });
});
