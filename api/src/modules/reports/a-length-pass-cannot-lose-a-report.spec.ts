/**
 * A LENGTH PASS CANNOT LOSE A REPORT THAT ALREADY SUCCEEDED.
 *
 * Synthesis runs, and when the result is over five hundred words a second call asks the same model
 * for a shorter version. That second call had no catch. So a report whose substance was already in
 * hand could be thrown away by a cosmetic pass - and the session then reported a failure for a
 * report that existed.
 *
 * Long is a blemish. Nothing is a loss.
 *
 * Changed 2 November 2026: being too long is one more fault in the one re-ask the report makes
 * (faultsIn), not a re-ask of its own, so a long report with another fault costs one more call, not
 * two. The same three things hold, now on that one re-ask.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const CODE = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** The one re-ask: from the faults found to the end of adopting the second attempt. */
const reAsk = (() => {
  const start = CODE.indexOf('const faults = faultsIn(result);');
  expect(start).toBeGreaterThan(-1);
  return CODE.slice(start, start + 1600);
})();

describe('the one re-ask, which also asks for shorter', () => {
  it('counts over 500 words as a fault, and has no re-ask of its own for length', () => {
    expect(CODE).toMatch(/const faultsIn = \(r: SynthesisResult\) => \{[\s\S]{0,300}if \(wordCount > 500\) faults\.push\(/);
    expect(CODE.match(/wordCount > 500/g) ?? []).toHaveLength(1);
  });

  it('cannot throw the report away', () => {
    expect(reAsk).toMatch(/\.catch\(\(\) => null\)/);
  });

  it('keeps what it had when the retry fails, and never adopts one that lost a finding', () => {
    expect(reAsk).toMatch(/if \(secondPass && faultsIn\(secondPass\)\.length < faults\.length\) \{[\s\S]{0,200}const kept = keepWhatTheFirstFound\(result, secondPass\)/);
    expect(reAsk).toMatch(/result = kept\.report/);
  });

  it('and says so, rather than failing silently', () => {
    expect(reAsk).toMatch(/logger\?\.warn\?\./);
  });
});
