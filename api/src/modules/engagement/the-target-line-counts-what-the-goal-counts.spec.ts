import { theTargetLines } from './the-direct-morning';
import { whatASalesAimCounts } from '../board/a-sales-aim-is-counted-from-the-deals';

/**
 * RE-TEST, 22 NOVEMBER 2026 EVENING (R-7). Wairimu changed the sales team's goal to "Each person on the sales team builds a waitlist of 15
 * shops by 31 December". Her morning on WhatsApp and her weekly letter both read "Target: 2 of 15 sold, 0 paid, 13 short, and no open deal
 * covers any of it": the goal was counted from the deals because "sales team" holds the word "sales", so two orders were read as two of
 * the fifteen waitlist shops. What a goal counts is the thing its number counts ("15 shops"); the deals count it only where that thing is
 * sold. The board (theAimsCountedNow), the morning and the letter all read whatASalesAimCounts, so all three change together.
 */
const WAITLIST = 'Each person on the sales team builds a waitlist of 15 shops by 31 December';
const CHANGED = 'On 22 November the goal changed, because the freezers we sell are out of stock until January. Before that, the goal was the team’s “Freezers sold by the team this quarter”.';

describe('what a goal counts is the thing its number counts', () => {
  it('a waitlist of shops on a sales team is not counted from the deals', () => {
    expect(whatASalesAimCounts(WAITLIST)).toBeNull();
    expect(whatASalesAimCounts('The sales team signs 20 shops onto the waitlist')).toBeNull();
  });
  it('a goal that counts sales, deals, units or a thing sold still is', () => {
    expect(whatASalesAimCounts('Reach 25 sales by 30 September')).toMatchObject({ counts: 'sales' });
    expect(whatASalesAimCounts('The sales team closes 10 deals this month')).toMatchObject({ counts: 'sales' });
    expect(whatASalesAimCounts('Sell 40 units')).toMatchObject({ counts: 'units' });
    expect(whatASalesAimCounts('The team is aiming to sell 120 water dispensers')).toMatchObject({ counts: 'units', thing: 'water dispensers' });
  });
});

describe('Wairimu reads her morning target line against the waitlist', () => {
  /* The board as it now serves the goal: no count from the deals, Amani's 6 said against it, and the change. */
  const board = {
    objectives: [{ id: 'o1', name: WAITLIST, target: 15, count: 0, ownerParticipantId: null, changed: CHANGED, saidBy: [{ participantId: 'p-amani', name: 'Amani Wekesa', count: 6, atSession: 5 }] }],
    workRecords: [{ section: 'Deal grid', rows: [{ kind: 'deal', name: 'Mama Njeri Duka', stage: 'Won', group: 'won', fields: { Units: '20' } }, { kind: 'deal', name: 'Duka Bora', stage: 'Won', group: 'won', fields: {} }] }],
  };
  it('never says the waitlist is sold, and says the goal, what was said and the change', () => {
    const text = theTargetLines(board, new Date('2026-11-23T04:00:00Z'), 'Africa/Nairobi').lines[0].text;
    expect(text).not.toMatch(/of 15 sold|short/);
    expect(text).toBe(`The team’s goal is “${WAITLIST}”. Amani said 6, and none of it is on a deal yet, so none of it is proven. ${CHANGED}`);
  });
});
