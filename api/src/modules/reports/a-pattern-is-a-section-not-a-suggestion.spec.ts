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
const CLIENT = strip(readFileSync(join(__dirname, '../../../../client/src/components/gw/TheSessionsReport.tsx'), 'utf8'));

describe('one route for patterns', () => {
  it('the synthesis prompt no longer carries pattern notices', () => {
    expect(SERVICE).not.toMatch(/longitudinal pattern evidence/);
    expect(SERVICE).not.toMatch(/patternNotices\.map/);
    expect(SERVICE).toMatch(/const patternNotice = '';/);
  });

  it('the session report reads surfaced detections as its own field', () => {
    /* Computed once above the return, so the section and the picture draft read the same rows. */
    const at = SERVICE.indexOf('const patternsForPage = (await this.prisma.patternDetection.findMany(');
    expect(at).toBeGreaterThan(-1);
    const block = SERVICE.slice(at, at + 1200);
    expect(block).toContain('PatternStatus.SURFACED');
    expect(block).not.toContain('CANDIDATE');
    expect(block).toContain('ALIGNMENT_FEED_ONLY_CODES.has(r.code)');
    /* The library's own wording, not the code and not a paraphrase. */
    expect(block).toContain('signal: lib.signal');
  });

  it('and the page renders it as a section with the count that makes it a pattern', () => {
    expect(CLIENT).toContain('What keeps showing up');
    expect(CLIENT).toMatch(/Seen across \{p\.periodsObserved\} session/);
    expect(CLIENT).toContain('{p.signal}');
  });
});
