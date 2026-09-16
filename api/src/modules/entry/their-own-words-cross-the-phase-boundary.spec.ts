import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "A NAME NOBODY SAID (KANO)". SHE TYPED KANO IN HER FIRST SENTENCE.
 *
 * From the log, on the run that also produced this fix:
 *
 *   dropped a sentence: a name nobody said (Kano) in "Twice a month for the Kano distributor. "
 *   dropped a sentence: a name nobody said (Amina) in "And what about Amina's part in this? "
 *
 * Both were in "I want 40 shops in Kano stocking our tea by the end of Q4, and Sahar and Amina each
 * need their own number under that." The gate is right and was reading the wrong list: the user
 * turns of the CURRENT phase, and the check-in starts a new one. So every word of setup - the
 * place, the people, the deadline - became an invention the moment the check-in began, and whole
 * sentences were deleted mid-reply. What reached the screen was "What does her goal look like?"
 *
 * This is the same shape as the months and the day of the month: not a filter that is too weak, a
 * filter looking at a list that is missing what it is supposed to compare against.
 */
const SERVICE = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const CONTROLLER = readFileSync(join(__dirname, 'entry.controller.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('their own words cross the phase boundary', () => {
  it('the endpoint carries what they said in setup', () => {
    expect(CONTROLLER).toMatch(/alreadySaid\?: string\[\];/);
    expect(CONTROLLER).toMatch(/dto\.peopleNamed, dto\.alreadySaid/);
  });

  it('and the guard counts it as theirs, with the roster and the name they gave it', () => {
    expect(SERVICE).toMatch(/\[\.\.\.\(peopleNamed \?\? \[\]\), groundLabel \?\? '', \.\.\.\(alreadySaid \?\? \[\]\)\]/);
    expect(SERVICE).toMatch(/\.\.\.\(alsoTheirs \?\? \[\]\)\.filter\(Boolean\)/);
  });

  it('and the drop log says which sentence went and why, not how many', () => {
    /* "Dropped 1 sentence(s)" six times in one conversation is what hid this for two days. */
    expect(SERVICE).toMatch(/Entry path dropped a sentence/);
    expect(SERVICE).toMatch(/hit\.check/);
    expect(SERVICE).toMatch(/hit\.offending/);
    expect(SERVICE).not.toMatch(/sentence\(s\) with an invented name/);
  });
});
