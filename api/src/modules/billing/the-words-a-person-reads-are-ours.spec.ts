import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "GROUND" IS THE SCHEMA'S WORD. NOTHING A PERSON READS SHOULD USE IT.
 *
 * The free-plan refusal is rendered verbatim by the client, directly beneath a heading that reads
 * "You have used all 10 of your free check-ins". One screen, two names for one object, at the exact
 * moment somebody is being asked to pay. The client already had the correct sentence written twice
 * and showed the server's instead.
 *
 * Asserted on the source of the messages rather than on a response, because the risk is a future
 * message written in schema vocabulary, not a present bug in this one.
 *
 * Comments stripped: this file quotes the words it protects, and the code it guards explains itself.
 */
const strip = (p: string) =>
  readFileSync(join(__dirname, '..', '..', '..', p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, '');

/** Every string that can reach a person from these files. */
function userFacing(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:reason:|message:|Exception\()\s*[`'"]((?:[^`'"\\]|\\.){10,240})[`'"]/g)) {
    out.push(m[1]);
  }
  return out;
}

describe('the words a person reads are the product\'s own', () => {
  const FILES = [
    'src/modules/billing/billing.service.ts',
    'src/modules/grounds/grounds.service.ts',
  ];

  it('finds messages to check, so an empty list cannot pass', () => {
    const all = FILES.flatMap(f => userFacing(strip(f)));
    expect(all.length).toBeGreaterThan(5);
  });

  it('no message a person reads calls a check-in a "Ground"', () => {
    for (const f of FILES) {
      const offenders = userFacing(strip(f)).filter(s => /\bGrounds?\b/.test(s));
      expect(offenders).toEqual([]);
    }
  });

  it('the free-plan refusal says check-ins, and says what to do', () => {
    const billing = strip('src/modules/billing/billing.service.ts');
    expect(billing).toContain('Your free plan includes ${freeGroundLimit} check-ins. Subscribe to open more.');
  });
});
