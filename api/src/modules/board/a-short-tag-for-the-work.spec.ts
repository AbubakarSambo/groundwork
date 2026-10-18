import { readFileSync } from 'fs';
import { join } from 'path';
import { aShortTagForTheWork } from './a-short-tag-for-the-work';

/** board-as-lead.txt, "The team today": Brian "Many visits, few moves", David "Visits without names". */
describe('a short tag for the work, from a pattern on record', () => {
  it('heavy communication with nothing unblocked reads as many visits, few moves; tasks without their purpose, as visits without names', () => {
    expect(aShortTagForTheWork(['B5'])).toBe('Many visits, few moves');
    expect(aShortTagForTheWork(['K5'])).toBe('Visits without names');
    expect(aShortTagForTheWork(['K4', 'K5'])).toBe('Visits without names');
  });
  it('no other pattern gives a tag, and a label never does', () => {
    for (const code of ['B1', 'B3', 'K3', 'K4', 'E1', '']) expect(aShortTagForTheWork([code])).toBeNull();
  });
  it('the board serves it only on the lead’s own rows, from the patterns that reader is served, and only on a sales board', () => {
    const src = readFileSync(join(__dirname, 'board.service.ts'), 'utf8');
    const at = src.indexOf('A SHORT TAG FOR THE WORK, ON A SALES BOARD');
    const block = src.slice(src.lastIndexOf('if ((isInitiator || adminHere) && Array.isArray(out.eachPerson))', at), at + 1400);
    expect(block).toContain("x?.about === 'the work'");
    expect(block).toContain("kind === 'sales org'");
    expect(block).toMatch(/where: \{ id: \{ in: served\.map\(\(x\) => x\.id\) \}, groundId \}/);
  });
});
