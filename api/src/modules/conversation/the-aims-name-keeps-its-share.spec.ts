import { theAimsNameKeepsItsShare, theNameWithItsSum } from './the-aims-name-keeps-its-share';
import { aNumberPeopleCanRead } from '../board/an-aim-is-a-sentence-about-somebody';
import { toCloseTheGap } from '../board/to-close-the-gap';

const PLAN = 'Sales team plan.\n\nWe are at KES 9.6m for the quarter against KES 18m. The number I agreed with Grace is 18m. Credit must stay under 35% of sales.\n\nAmani Wekesa closed Harbor Foods this week.';

describe('an aim said as a share keeps its percent sign and its word', () => {
  it('"Credit of sales" is "Credit under 35% of sales" again, from the lead\'s own sentence', () => {
    expect(theAimsNameKeepsItsShare([{ name: 'Credit of sales', target: 35 }], PLAN)).toEqual([{ name: 'Credit under 35% of sales', target: 35 }]);
  });
  it('an aim whose name already says the share is left alone', () => {
    expect(theAimsNameKeepsItsShare([{ name: 'Credit under 35% of sales', target: 35 }], PLAN)).toEqual([{ name: 'Credit under 35% of sales', target: 35 }]);
  });
  it('an aim that was not said as a share is left alone, and so is a number nobody said as a share', () => {
    expect(theAimsNameKeepsItsShare([{ name: 'Sales for the quarter', target: 18 }], PLAN)).toEqual([{ name: 'Sales for the quarter', target: 18 }]);
    expect(theAimsNameKeepsItsShare([{ name: 'Credit of sales', target: 20 }], PLAN)).toEqual([{ name: 'Credit of sales', target: 20 }]);
  });
});

describe('the gap to close is never worked out for a limit', () => {
  const sections = [{ rows: [{ id: 'd1', kind: 'deal', name: 'Green Mart', group: 'likely', owner: 'Amani' }] }] as any;
  it('a limit of 35 with nothing counted is not "35 more are needed", and no deal is counted toward it', () => {
    const gap = toCloseTheGap('sales org' as any, sections, [{ name: 'Credit under 35% of sales', target: 35, count: 0, direction: 'LIMIT' } as any], null, new Date('2026-10-07'));
    expect(gap).toBeNull();
  });
  it('the team aim of 18 million is still the gap, as before', () => {
    const gap = toCloseTheGap('sales org' as any, sections, [
      { name: 'Credit under 35% of sales', target: 35, count: 0, direction: 'LIMIT' } as any,
      { name: 'Reach KES 18 million sales for the quarter', target: 18, count: 9, direction: 'AIM' } as any,
    ], null, new Date('2026-10-07'));
    expect(gap?.aim).toBe('Reach KES 18 million sales for the quarter');
  });
});

describe('a sum of money keeps its figure in the name', () => {
  it('"KES for the quarter" with 4,500,000 is "KES 4.5 million for the quarter"', () => {
    expect(theNameWithItsSum('KES for the quarter', 4_500_000, aNumberPeopleCanRead)).toBe('KES 4.5 million for the quarter');
  });
  it('a name that already holds a figure, or is not a sum, is left alone', () => {
    expect(theNameWithItsSum('KES 4.5m for the quarter', 4_500_000, aNumberPeopleCanRead)).toBe('KES 4.5m for the quarter');
    expect(theNameWithItsSum('Shops signed in Kilimani', 3, aNumberPeopleCanRead)).toBe('Shops signed in Kilimani');
  });
});
