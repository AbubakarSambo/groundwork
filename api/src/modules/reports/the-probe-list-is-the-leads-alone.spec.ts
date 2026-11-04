import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE PROBE LIST IS THE LEAD'S AND NOBODY ELSE'S.
 *
 * It says what to ask each person about. Handed to a participant it becomes a list of what their
 * colleagues are being questioned on, which is the single worst thing this product could leak.
 *
 * SO THE GUARD IS INSIDE THE BUILDER, NOT AT THE CALL SITE. `whatToProbeOn` returns null unless the
 * reader is the lead or an org admin, before it reads a row. A surface that is lead-only because a
 * caller remembered to check is one refactor away from not being lead-only, and the refactor will
 * look harmless.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const SERVICE = strip(readFileSync(join(__dirname, 'reports.service.ts'), 'utf8'));

describe('who can reach it', () => {
  it('refuses before it reads anything, on the builder itself', () => {
    const at = SERVICE.indexOf('private async whatToProbeOn');
    expect(at).toBeGreaterThan(-1);
    const body = SERVICE.slice(at, at + 400);
    expect(body).toContain('if (!viewerIsLead) return null');
    /* Before the query, not after it. Reading the rows and then discarding them is a leak waiting
       for somebody to add a log line. */
    expect(body.indexOf('return null')).toBeLessThan(body.indexOf('whatTheRecordHoldsFor'));
  });

  /*
   * Decision 58 (screens request 84, 30 September 2026): `isInitiator || isOrgAdmin` let every
   * admin of the organisation read the probe list - exactly the leak this file exists to guard
   * against, for a reader who does not even run the check-in. The caller now passes
   * `patternRunsIt`, built from `runsItForAPattern` (patterns/who-reads-a-pattern.ts): the lead, or
   * the admin who set this particular check-in up for them, never every admin of the organisation.
   */
  it('and the caller passes the pattern access rule rather than a flag of its own', () => {
    expect(SERVICE).toMatch(/whatToProbeOn\(\s*groundId,\s*ground as any,\s*patternRunsIt/);
    expect(SERVICE).toMatch(/const patternRunsIt = runsItForAPattern\(/);
  });
});

describe('what it is allowed to say', () => {
  const PROBE = strip(readFileSync(join(__dirname, 'what-to-probe.ts'), 'utf8'));

  it('reports the record being silent as the record being silent', () => {
    /* The one line most likely to become a verdict. Reading effort out of an empty table is how a
       product ends up telling a manager that somebody is not trying. */
    /* 2 November 2026 (f76a189df): silence is never a finding, so the line no longer says what the record does not show at all;
       it says the wait and "It was asked for." The sentence that read effort out of the empty record is asserted gone. */
    expect(PROBE).not.toContain('nothing on record shows it was taken any further');
    expect(PROBE).toContain('It was asked for.');
  });

  it('carries none of the words that would make it a judgement', () => {
    expect(PROBE).not.toMatch(/\b(making excuses|not trying|underperforming|lazy|unmotivated)\b/i);
  });

  it('and every read it renders is a count, a date or something somebody said', () => {
    /* No field on the shape invites a conclusion: two lists of observations and one sentence about
       what the record shows was done. */
    expect(PROBE).toMatch(/probe: string\[\]/);
    expect(PROBE).toMatch(/encourage: string\[\]/);
    expect(PROBE).toMatch(/triedToUnblock: string/);
    expect(PROBE).not.toMatch(/verdict|rating|score:/i);
  });
});
