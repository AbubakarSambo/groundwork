/**
 * A LENGTH PASS CANNOT LOSE A REPORT THAT ALREADY SUCCEEDED.
 *
 * Synthesis runs, and when the result is over five hundred words a second call asks the same model
 * for a shorter version. That second call had no catch. So a report whose substance was already in
 * hand could be thrown away by a cosmetic pass - and the session then reported a failure for a
 * report that existed.
 *
 * Long is a blemish. Nothing is a loss.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const CODE = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** The brevity block: from the word-count test to the end of the retry. */
const brevity = (() => {
  const start = CODE.indexOf('if (wordCount > 500)');
  expect(start).toBeGreaterThan(-1);
  return CODE.slice(start, start + 900);
})();

describe('the shorter-version pass', () => {
  it('cannot throw the report away', () => {
    expect(brevity).toMatch(/\.catch\(/);
  });

  it('keeps what it had when the retry fails', () => {
    /* The catch returns null, and null is not adopted - so `result` stays the long version. */
    expect(brevity).toMatch(/return null/);
    /* Changed 3 October 2026: a retry is adopted only through keepWhatTheFirstFound, so a shorter
       version cannot lose a difference or an agreement either. See a-second-ask-keeps-what-the-first-found. */
    expect(brevity).toMatch(/if \(retry\) \{\s*const kept = keepWhatTheFirstFound\(result, retry\)/);
    expect(brevity).toMatch(/result = kept\.report/);
  });

  it('and says so, rather than failing silently', () => {
    expect(brevity).toMatch(/logger\?\.warn\?\./);
  });
});
