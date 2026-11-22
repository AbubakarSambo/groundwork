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
    'src/modules/board/board.service.ts',
    'src/modules/grounds/participant-requests.controller.ts',
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

  it('and not in lower case either, which is how one slipped past', () => {
    /*
     * The first version of this matched `/\bGrounds?\b/` - capitalised, because that is how the
     * schema writes it. "This ground is beyond your ten free grounds" sailed through twice.
     *
     * `ground` is also an ordinary English word, so this looks only for the shapes where a
     * determiner or a number governs it, which is what makes it the product's noun rather than
     * common ground or gaining ground.
     */
    const asTheThing = /\b(this|that|the|a|your|their|each|every|\d+|ten|free)\s+grounds?\b/i;
    for (const f of FILES) {
      const offenders = userFacing(strip(f)).filter(s => asTheThing.test(s));
      expect(offenders).toEqual([]);
    }
  });

  it('and no message names the schema role instead of the person', () => {
    /* "the initiator" is a database enum. The good messages in these files say "the lead". */
    for (const f of FILES) {
      const offenders = userFacing(strip(f)).filter(s => /\binitiator\b/i.test(s));
      expect(offenders).toEqual([]);
    }
  });

  /* Updated 23 November 2026: there is no free plan of check-ins to refuse from (Hafsah, 22 November). */
  it('the no-plan refusal says check-ins, and says what to do, and nothing names free check-ins', () => {
    const billing = strip('src/modules/billing/billing.service.ts');
    expect(billing).toContain('Your organisation has no plan yet. Choose one on Plan and billing to open a check-in.');
    expect(billing).not.toMatch(/free plan includes|free check-ins/);
  });
});
