import { theBriefAsTheLeadReadsIt, withoutTheSetupAnswers } from './what-a-participant-is-told-about-this';

/** User journeys F-1: the lead read "When asked who is part of this, the answer was taken to mean this." in her own description. */
const STORED = 'Sales team performance against target for the quarter ending December 31st. When asked who is part of this, the answer was taken to mean this. The sales team. When asked why this matters now, the answer was taken to mean this. Current sales are significantly below target, requiring immediate attention. When asked what this is aiming at, the answer was taken to mean these 4 things. Reach KES 18m sales target for the quarter. Keep credit under 35% of sales. Amani Wekesa to achieve KES 4.5m in sales for the quarter. Baraka Mutua to confirm Fresh Basket delivery date with the warehouse by Friday 16 October. When asked what the questions should focus on, the answer was taken to mean this. Address Amani Wekesa\'s delayed Green Mart renewal proposal.';

describe('the brief, as the person who runs the check-in reads it', () => {
  const read = theBriefAsTheLeadReadsIt(STORED);
  it('says nothing about questions being asked and answers being taken to mean something', () => {
    expect(read).not.toMatch(/When asked|taken to mean/);
  });
  it('reads as each plain question and its answer', () => {
    expect(read).toBe('Sales team performance against target for the quarter ending December 31st. Who is part of this? The sales team. Why does this matter now? Current sales are significantly below target, requiring immediate attention. What is this aiming at? Reach KES 18m sales target for the quarter. Keep credit under 35% of sales. Amani Wekesa to achieve KES 4.5m in sales for the quarter. Baraka Mutua to confirm Fresh Basket delivery date with the warehouse by Friday 16 October. What should the questions focus on? Address Amani Wekesa\'s delayed Green Mart renewal proposal.');
  });
  it('is only a reading: what the people in the check-in are told is still cut from the stored words, and never holds the lead\'s answers', () => {
    expect(withoutTheSetupAnswers(STORED)).toBe('Sales team performance against target for the quarter ending December 31st.');
  });
  it('leaves a brief with no setup answers, and nothing at all, as they are', () => {
    expect(theBriefAsTheLeadReadsIt('The team wants an honest read.')).toBe('The team wants an honest read.');
    expect(theBriefAsTheLeadReadsIt(null)).toBeNull();
  });
});
