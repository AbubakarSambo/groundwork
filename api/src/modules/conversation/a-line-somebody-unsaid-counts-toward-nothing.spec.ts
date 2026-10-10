import { readFileSync } from 'fs';
import { join } from 'path';

/* Source assertion, so comments go first: a rule quoted in a comment must never be what satisfies
   an assertion about the code. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SERVICE = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));

describe('a line somebody unsaid counts toward nothing', () => {
  it('including toward what kind of work they do', () => {
    /*
     * The function read took the whole corpus, disputed lines included - so a wrongly extracted
     * line could pick the role map somebody is coached and probed against for the rest of the run,
     * and the louder the misreading the more it looked like a function.
     */
    const at = SERVICE.indexOf('detectFunction(\n      [p.roleAsDescribed');
    const from = SERVICE.lastIndexOf('recordEntry.findMany({', at);
    expect(from).toBeGreaterThan(-1);
    expect(SERVICE.slice(from, at)).toContain('disputedAt: null');
  });

  it('and it is not replayed to them as their own record either', () => {
    /* Their own page, so the harm is low - but a disputed line shown back with nothing marking it
       reads as still standing, which is the whole thing the press exists to stop. */
    const at = SERVICE.indexOf('where: { checkInId: ci.id, participantId: checkIn.participantId');
    expect(at).toBeGreaterThan(-1);
    expect(SERVICE.slice(at, at + 130)).toContain('disputedAt: null');
  });

  it('and the dispute itself still only ever marks, never deletes', () => {
    const at = SERVICE.indexOf('async disputeEntry(');
    expect(at).toBeGreaterThan(-1);
    const body = SERVICE.slice(at, at + 900);
    expect(body).toContain('disputedAt: new Date()');
    expect(body).not.toMatch(/\.delete\(|deleteMany/);
  });
});
