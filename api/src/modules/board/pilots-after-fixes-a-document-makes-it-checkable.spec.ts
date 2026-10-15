import { aRoundCanBeChecked } from './a-round-backed-by-a-document-can-be-checked';
import { readFileSync } from 'fs';
import { join } from 'path';

/** PILOTS AFTER FIXES, 14 OCTOBER (A5): Brian's PDF and photo, and Aisha's receipt, make their round checkable. */
describe('a document or a photo backing a line makes the round checkable', () => {
  it('Brian\'s session read as vague, with his PDF backing a line, can be checked', () => {
    expect(aRoundCanBeChecked({ specificityLevel: 'vague' }, true, true)).toBe(true);
  });
  it('without a backing document, the check-in\'s own read still decides', () => {
    expect(aRoundCanBeChecked({ specificityLevel: 'vague' }, true, false)).toBe(false);
    expect(aRoundCanBeChecked({ specificityLevel: 'specific' }, false, false)).toBe(true);
    expect(aRoundCanBeChecked(null, true, false)).toBe(true);
  });
  it('the board reads each check-in\'s backing documents this round', () => {
    const src = readFileSync(join(__dirname, 'board.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).toMatch(/const backedByADocument = new Set\(thisRoundsLines\.filter\(\(e: any\) => !!e\.anchoredDocumentId\)/);
    expect(src).toMatch(/aRoundCanBeChecked\(c, recordHasSomething, backedByADocument\.has\(c\?\.id\)\)/);
  });
});
