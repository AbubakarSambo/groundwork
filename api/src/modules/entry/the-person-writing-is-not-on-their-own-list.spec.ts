/**
 * THE PERSON WRITING IS NOT ON THEIR OWN LIST (end-to-end check of 16 November, C-2; fix plan 17 November, group D).
 *
 * A first-time lead who wrote "I am Kofi" and named two people was shown Kofi in the team box, and the save said "Add an email for Kofi, or
 * take them off the list". Before sign-up there is no user to compare a name with, so the filter that leaves the person setting it up out
 * (withoutThePersonSettingItUp) had nothing to compare. Whom a sentence names is the model's to read, so the instructions the reading is
 * given say that the person writing is never somebody to invite. This reads those instructions, the ones the model actually receives.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { THE_EXTRACTION_SYSTEM } from './the-anchor-setup';

describe('what the reading of the setup conversation is told about who is on the list', () => {
  it('the ordinary setup reading says the person writing is never an entry, and names the ways they say who they are', () => {
    const src = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8');
    const prompt = src.slice(src.indexOf('const EXTRACT_SYSTEM'), src.indexOf('const EXTRACT_SYSTEM') + 9000);
    expect(prompt).toContain('THE PERSON WRITING IS NEVER AN ENTRY');
    expect(prompt).toContain('"I am Kofi"');
  });

  it('the anchor reading says the same of the lead', () => {
    expect(THE_EXTRACTION_SYSTEM).toContain('The lead is never an entry');
    expect(THE_EXTRACTION_SYSTEM).toContain('"I am Kofi"');
  });
});
