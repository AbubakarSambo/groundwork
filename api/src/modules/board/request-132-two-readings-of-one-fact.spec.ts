import { theQuickReadAgreesWithTheReport } from './the-quick-read-agrees-with-the-report';

/** Request 132 (c): the report said "They give different numbers for the total plan." and the Differences tile said nobody sees anything differently. */
describe('the Differences tile, as the lead and a participant read it', () => {
  const tiles = [{ label: 'Differences', value: 'None', sub: 'Nobody sees anything differently. The written report finds no disagreement.' }];
  it('says the difference the report opens with', () => {
    const t = theQuickReadAgreesWithTheReport(tiles, 'The plan is on track. They give different numbers for the total plan. The ministry has not answered.')!;
    expect(t[0].value).toBe('1');
    expect(t[0].sub).not.toMatch(/Nobody sees anything differently|no disagreement/);
    expect(t[0].sub).toMatch(/total plan/);
  });
  it('leaves the tile alone where the report names no difference', () => {
    expect(theQuickReadAgreesWithTheReport(tiles, 'They give the same numbers for the total plan.')).toEqual(tiles);
  });
});
