import { readFileSync } from 'fs';
import { join } from 'path';

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/**
 * Request 46, 28 September 2026: "The attached team-plan.txt document confirms the split…" on a
 * board everybody read, about a file only the lead could open. See
 * documents/a-private-file-is-not-named.ts for the rule and the route it came by.
 */
describe('a private file is not named in the report, the board or anybody else\'s check-in', () => {
  const REPORTS = read('reports/reports.service.ts');
  const GROUNDS = read('grounds/grounds.service.ts');

  it('the synthesis reads every record line with private file names taken out', () => {
    expect(REPORTS).toMatch(/const privateFileNames = namesNotEverybodyMayOpen\(/);
    expect(REPORTS).toMatch(/\(\$\{r\.type\}\) \$\{withoutPrivateFileNames\(r\.text, privateFileNames\)\}/);
  });

  it('the note that reaches everybody\'s check-in names a file only when everybody may open it', () => {
    /* The write moved into one shared place on 30 September (58960b6d), called by the setup chat,
       the check-in and Ask Groundwork, so the note is checked where it is now written. */
    const WRITER = read('documents/write-a-documents-numbers.ts');
    expect(WRITER).toContain('text: theNoteAboutWhereTheNumbersCameFrom(input.fileName, input.documentVisibility)');
    /* Changed 30 September (request 92): the private wording said "attached when it was set up",
       untrue for a document added later. The sentence is now one function, read as a person reads it. */
    const { theNoteAboutWhereTheNumbersCameFrom } = jest.requireActual('../documents/the-note-about-where-numbers-came-from');
    expect(theNoteAboutWhereTheNumbersCameFrom('team-plan.xlsx', 'OPEN')).toBe('The numbers on this check-in come from team-plan.xlsx.');
    expect(theNoteAboutWhereTheNumbersCameFrom('team-plan.xlsx', 'OWN')).toBe('The numbers on this check-in come from a document the person running it added.');
  });

  it('the session report lists by name only the documents this reader may open', () => {
    /* Anchored on the query itself, not on its exact select: the select gained `createdAt` (B-103,
       counting files sent with a session), which broke an anchor on the whole select line. The
       guarantee is the same: the query that lists names by file keeps the OPEN-or-their-own filter. */
    const listing = REPORTS.match(/groundDocument\.findMany\(\{\s*where: \{((?:(?!findMany)[\s\S])*?)\},\s*select: \{ fileName: true, participantId: true, origin: true[^}]*\}/);
    expect(listing).not.toBeNull();
    expect(listing![1]).toMatch(/OR: \[\{ visibility: 'OPEN' as any \}, \.\.\.\(me \? \[\{ participantId: me\.id \}\] : \[\]\)\]/);
  });

  it("and the lines everybody reads on the check-in's page, and in anybody else's check-in, lose the name too", () => {
    expect(GROUNDS).toMatch(/const privateFileNamesHere = theLeadReadsThese \? \[\] : namesNotEverybodyMayOpen\(/);
    expect(GROUNDS).toMatch(/text: withoutPrivateFileNames\(l\.text \?\? '', privateFileNamesHere\)/);
    const CONVERSATION = read('conversation/conversation.service.ts');
    expect(CONVERSATION).toMatch(/const privateFileNamesHere = isTheLead \? \[\] : namesNotEverybodyMayOpen\(/);
    expect(CONVERSATION).toMatch(/withoutPrivateFileNames\(\(l\.text \?\? ''\)\.trim\(\), privateFileNamesHere\)/);
  });
});
