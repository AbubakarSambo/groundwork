import * as fs from 'fs';
import * as path from 'path';

import { theNamesBesideTheLabels } from './reports.service';

const SRC = fs.readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/*
 * Ten agribusinesses gave a name and an organisation at the end of an open link, and their lead's
 * own report listed them "Participant A" to "Participant D" while the paragraph above named them.
 */
describe('a name beside the label', () => {
  const visible = new Map([['Participant A', 'Ibrahim (Danladi Grains)'], ['Participant B', 'Chidinma (Freshline Cold Chain)']]);

  it('puts the name on a party the reader may see, and leaves the label alone', () => {
    const out = theNamesBesideTheLabels({ parties: [{ label: 'Participant A', sessions: 1 }] }, visible);
    expect(out.parties[0].who).toBe('Ibrahim (Danladi Grains)');
    expect(out.parties[0].label).toBe('Participant A');
    expect(out.parties[0].sessions).toBe(1);
  });

  /* The wall: a reader who may not see somebody gets the label back, never a name. */
  it('gives the label back for somebody this reader may not see', () => {
    const out = theNamesBesideTheLabels({ parties: [{ label: 'Participant Z' }] }, visible);
    expect(out.parties[0].who).toBe('Participant Z');
  });

  it('leaves an engagement header with no parties exactly as it was', () => {
    const e = { coverage: 'moderate', note: 'x' };
    expect(theNamesBesideTheLabels(e, visible)).toEqual(e);
    expect(theNamesBesideTheLabels(null, visible)).toBeNull();
  });

  /* The rule this must not break, from the note in applyNames. */
  it('and the label key is still never substituted', () => {
    expect(SRC).toMatch(/const NEVER_NAMED = new Set\(\['label', 'participantLabel'\]\)/);
    /* The third argument, added 26 September 2026, is the plain phrase for somebody this reader
       may not name. It is read the same way `visible` is - never into `label`. */
    expect(SRC).toMatch(/engagement: theNamesBesideTheLabels\(\s*walkTextOnly\(report\.engagement\),\s*visible/);
  });
});
