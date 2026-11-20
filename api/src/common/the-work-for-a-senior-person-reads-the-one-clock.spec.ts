import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * FATIMA ROUND 2, D2: the standing-instruction sweep passed `new Date()`, so a run on the test clock did nothing and a Thursday ask could not be tested. One owner for
 * "now" (the-clock.ts); the places that do the work for a senior person read it. A source test, because a clock read nobody ran can hide in a path no test takes.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const read = (rel: string) => strip(readFileSync(join(__dirname, '..', 'modules', rel), 'utf8'));

describe('what Groundwork does for a senior person asks the one clock what time it is', () => {
  it.each(['team-loop/team-loop.service.ts', 'year-end/year-end.service.ts', 'executive-onboarding/executive-onboarding.service.ts'])('%s never reads the wall clock for "now"', (file) => {
    expect(read(file)).not.toMatch(/new Date\(\)|Date\.now\(\)/);
  });

  it('the nightly year-end pass is given the same clock', () => {
    const cron = read('grounds/grounds.cron.ts');
    const pass = cron.slice(cron.indexOf('async advanceThePrincipalsJobs'), cron.indexOf('async advanceThePrincipalsJobs') + 600);
    expect(pass).toMatch(/const now = theQuietHoursNow\(\)/);
  });

  it('a message from the number a held introduction waits for sends it before anything else is said', () => {
    const service = read('executive-onboarding/executive-onboarding.service.ts');
    const body = service.slice(service.indexOf('async onWhatsApp'));
    expect(body.indexOf('releaseTheIntroductionHeldForANumber')).toBeGreaterThan(0);
    expect(body.indexOf('releaseTheIntroductionHeldForANumber')).toBeLessThan(body.indexOf('hearHer('));
  });
});
