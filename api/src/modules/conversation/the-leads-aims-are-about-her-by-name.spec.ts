import { readFileSync } from 'fs';
import { join } from 'path';
import { READ_THE_AIMS } from './prompt-library';
import { THE_ASSESSMENT_PROMPT, THE_ASSESSMENT_SCHEMA, theMaterialAsText, type TheMaterial } from './the-assessment';
import { theSpeakerLine } from './the-person-speaking';

/**
 * THE LEAD'S AIMS ARE WRITTEN ABOUT HER, BY NAME (review of 1 October 2026, row 113).
 *
 * The run stored "I'm aiming for N120 million disbursed this quarter." (re-a sales), "I stop being
 * invited to every single call." (re-a seniorhire), "The person wants introductions to ..." (run-21
 * advisor) and "... enabling the speaker to focus on business growth" (run-21 cofounder). The
 * extraction read a transcript that said only "PERSON:", so it had no name to write. It is now given
 * the speaker's first name, and told to write each aim as a full sentence about whoever holds it.
 *
 * The aims are read by the conversation's assessment now (one source, 2 November 2026), under the same rules (READ_THE_AIMS). No
 * stored PromptVersion is seeded for the assessment, so the file's words run, and each assessment records their fingerprint.
 */
/** What the assessment reads, for a lead with this name: its first line is who is speaking. */
function whatTheAssessmentReads(lead: { firstName: string; lastName: string }): string {
  const m: TheMaterial = {
    who: `${lead.firstName} ${lead.lastName}`, speaking: theSpeakerLine({ user: lead }), isTheLead: true, checkIn: 'Disbursements', givenRole: null,
    priorities: [], turns: [{ role: 'person', content: "I'm aiming for N120 million disbursed this quarter.", n: 1 }], setup: null,
    draft: { claims: [], lines: [] }, previous: null, openPromises: [],
  };
  return theMaterialAsText(m);
}

describe('the assessment that reads the lead\'s aims is told who is speaking', () => {
  it('Bisi\'s session is read with her name at the top', () => {
    expect(whatTheAssessmentReads({ firstName: 'Bisi', lastName: 'Adeyemi' }).split('\n')[0]).toBe('THE PERSON SPEAKING: Bisi');
  });

  it('Dr Amina Bello is Amina, not Dr', () => {
    expect(whatTheAssessmentReads({ firstName: 'Dr Amina', lastName: 'Bello' }).split('\n')[0]).toBe('THE PERSON SPEAKING: Amina');
  });

  it('and the running assessment is given that line', () => {
    expect(readFileSync(join(__dirname, 'assess-the-conversation.ts'), 'utf8')).toMatch(/speaking: theSpeakerLine\(row\.participant\)/);
  });

  it('and the prompt asks for a full sentence about the person by name, never "I", "the person" or "the speaker"', () => {
    expect(THE_ASSESSMENT_PROMPT).toContain(READ_THE_AIMS);
    expect(READ_THE_AIMS).toContain('one plain, full sentence about whoever holds it, by name');
    expect(READ_THE_AIMS).toContain('Never "I", "we", "my", "the person" or "the speaker"');
    expect(READ_THE_AIMS).toContain('"120 million naira", not "N120m" or "120000000"');
    expect(JSON.stringify(THE_ASSESSMENT_SCHEMA.input_schema.properties.targets)).toContain('one plain, full sentence about whoever holds it, by first name');
    /* What it used to ask for, which is how "I'm aiming for N120 million" was stored. */
    expect(READ_THE_AIMS).not.toMatch(/the aim as one plain, full sentence, in their words/);
  });
});
