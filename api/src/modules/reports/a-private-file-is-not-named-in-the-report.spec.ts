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
    const at = GROUNDS.indexOf('The numbers on this check-in come from');
    const near = GROUNDS.slice(at - 200, at + 300);
    expect(near).toMatch(/visibility === 'OPEN'/);
    expect(near).toContain('a document that was attached when it was set up');
  });

  it('the session report lists by name only the documents this reader may open', () => {
    const at = REPORTS.indexOf("select: { fileName: true, participantId: true, origin: true }");
    const near = REPORTS.slice(at - 400, at);
    expect(near).toMatch(/OR: \[\{ visibility: 'OPEN' as any \}, \.\.\.\(me \? \[\{ participantId: me\.id \}\] : \[\]\)\]/);
  });
});
