import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * WHAT A METRIC HAS TO CARRY BEFORE IT IS ALLOWED IN.
 *
 * "crash_rate: 8" in front of a non-technical reader is worse than silence, because it looks like
 * information. A number that reaches a report has to say what it counts, when it was true, and
 * where it came from - those three are what let somebody weigh it, and without them it is a digit
 * with authority it has not earned.
 *
 * Comments stripped: this explanation names the code it protects.
 */
const SRC = readFileSync(join(__dirname, 'grounds-by-api.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

const PUSH = SRC.slice(SRC.indexOf('async pushMetrics('), SRC.indexOf('return { results };'));

describe('a metric needs words, a number and a date', () => {
  it('finds the push, so an empty slice cannot pass', () => {
    expect(PUSH.length).toBeGreaterThan(400);
  });

  it('refuses one that does not say what it counts', () => {
    expect(PUSH).toContain('Say what this counts, in words');
  });

  it('refuses one with no date, because that is a claim about right now', () => {
    expect(PUSH).toContain('A number with no date is a claim about right now');
  });

  it('refuses a batch that does not say which system it came from', () => {
    /* A dashboard export and a database read are not the same evidence, and the reader is the one
       who has to decide which they are looking at. */
    expect(PUSH).toContain('Say which system these came from');
  });

  it('refuses a value that is not a finite number', () => {
    expect(PUSH).toContain("typeof m.value !== 'number' || !Number.isFinite(m.value)");
  });

  it('answers per metric rather than failing the batch', () => {
    /* One bad row in fifty should not lose the other forty-nine, and the sender needs to know
       which one it was. */
    expect(PUSH).toContain('results.push({ key');
    expect(PUSH).toContain('because:');
  });

  it('upserts on the organisation, the key and the date it was true', () => {
    /* So re-sending yesterday's figure is harmless and correcting it is a re-send. */
    expect(PUSH).toContain('organizationId_key_asOf');
  });
});
