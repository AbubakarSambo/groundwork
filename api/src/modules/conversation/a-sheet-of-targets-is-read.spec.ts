import { readFileSync } from 'fs';
import { join } from 'path';
import { whatTheSheetGave, A_SHEET_OF_TARGETS_PROMPT, MOST_OF_A_SHEET_WE_READ } from './a-sheet-of-targets-is-read';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const SERVICE = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));

/**
 * "I uploaded an excel sheet with my team targets, rather than just go through the conversation, but
 * it did not read the document and whose targets belong to who" (Hafsah, 22 Sep 2026).
 */
describe('a sheet of targets is read, and each number keeps its owner', () => {
  it('names what it took, whose it is, and asks whether that is right', () => {
    const said = whatTheSheetGave('Q3 targets.xlsx', [
      { who: 'Dayo Adebayo', what: 'Q3 sales', target: 45_000_000 },
      { who: 'Chika Nwosu', what: 'new dealers signed', target: 12 },
    ], []);
    expect(said).toContain('From Q3 targets.xlsx I have put these on the record');
    expect(said).toContain('- Dayo Adebayo: Q3 sales, 45m');
    expect(said).toContain('- Chika Nwosu: new dealers signed, 12');
    expect(said!.trimEnd().endsWith('Is that right?')).toBe(true);
  });

  it('says which names it could not match, rather than guessing or going quiet', () => {
    const said = whatTheSheetGave('targets.xlsx', [{ who: 'Dayo Adebayo', what: 'Q3 sales', target: 45_000_000 }], ['Musa', 'Halima']);
    expect(said).toContain('2 names in it are not on this check-in yet: Musa, Halima');
    const none = whatTheSheetGave('targets.xlsx', [], ['Musa']);
    expect(none).toContain('could not match any of its names to the people on this check-in');
    expect(none).toContain('The names it has: Musa.');
    expect(whatTheSheetGave('notes.docx', [], [])).toBeNull();
  });

  it('the prompt takes only a person, a thing and a number, and leaves a team total alone', () => {
    expect(A_SHEET_OF_TARGETS_PROMPT).toContain("A team total with no person's name against it is not a row");
    expect(A_SHEET_OF_TARGETS_PROMPT).toContain('Do not correct it, expand it, or match it to anybody');
    expect(A_SHEET_OF_TARGETS_PROMPT).toContain('An empty answer is a correct answer');
  });

  it('runs when a document lands mid-session, and its rows go through the one target writer', () => {
    const doc = SERVICE.slice(SERVICE.indexOf('private async whatASheetOfTargetsGave('), SERVICE.indexOf('async documentReceived('));
    expect(doc).toContain('A_SHEET_OF_TARGETS_PROMPT');
    expect(doc).toContain('await this.putOwnedTargetsOnTheRecord(');
    /* Only the lead may set somebody else's number; a participant's attachment is read for their own rows. */
    expect(doc).toContain('(isLead || p.id === checkIn.participantId)');
    /* A name that matches nobody is said out loud, never guessed onto the nearest person. */
    expect(doc).toContain('if (!who) { if (!unmatched.includes(r.personName.trim())) unmatched.push(r.personName.trim()); continue; }');
    const received = SERVICE.slice(SERVICE.indexOf('async documentReceived('), SERVICE.indexOf('async documentReceived(') + 3000);
    expect(received).toContain('const fromTheSheet = doc?.content ? await this.whatASheetOfTargetsGave(');
  });

  it('and what they attached reaches the extraction that writes targets, with its numbers counted as theirs', () => {
    expect(SERVICE).toContain('THEY ATTACHED "${d.fileName}"');
    expect(SERVICE).toMatch(/\.concat\(theirDocuments\.map\(\(d\) => d\.content \?\? ''\)\)/);
    expect(MOST_OF_A_SHEET_WE_READ).toBeGreaterThan(1000);
    const prompts = strip(readFileSync(join(__dirname, 'prompt-library.ts'), 'utf8'));
    expect(prompts).toContain('it counts as theirs the same as a sentence they typed');
  });
});
