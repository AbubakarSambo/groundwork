import { saidTheyWouldDoIt, withTheirWordsChecked } from './the-handoff-words-the-person-typed';
import { whatItIsHoldingUp } from './the-blockers';

/**
 * B-093. Halima said "Nobody tells the shop. I don't have the shop numbers, and I assumed the drivers or sales would call them." The board
 * turned it into a blocker and a promise she never made: "Once it is cleared, Halima Yusuf will call them." and to her "you will call them".
 */
const SAID = ["Nobody tells the shop. I don't have the shop numbers, and I assumed the drivers or sales would call them."];

describe('B-093: a promise is only written down for someone who made it', () => {
  it('"I assumed the drivers or sales would call them" is not Halima saying she will call them', () => {
    expect(saidTheyWouldDoIt('call them', SAID)).toBe(false);
  });
  it('"I will call the shops each evening" is', () => {
    expect(saidTheyWouldDoIt('call the shops each evening', ["Once I have the numbers I will call the shops each evening."])).toBe(true);
    expect(saidTheyWouldDoIt('call the shops', ["I'll call the shops as soon as I have the list."])).toBe(true);
  });
  it('a line that cannot be found in their words is left as it was', () => {
    expect(saidTheyWouldDoIt('lead the client meetings', ['It is mostly about the handover.'])).toBe(true);
  });
  it('the board says nothing instead of "Halima Yusuf will call them", to Baraka and to Halima', () => {
    const [d] = withTheirWordsChecked([{ fromParticipantId: 'p1', sourceCheckInId: 'c1', then: 'call them' }], new Map([['c1', SAID]]));
    expect(d.thenIsTheirPromise).toBe(false);
    expect(whatItIsHoldingUp('call them', d.thenTheirWords, 'Halima Yusuf', d.thenIsTheirPromise)).toBeNull();
    expect(whatItIsHoldingUp('call them', d.thenTheirWords, 'You', d.thenIsTheirPromise)).toBeNull();
  });
  it('and still says it for someone who did promise it', () => {
    expect(whatItIsHoldingUp('lead the client meetings', null, 'You', true)).toBe('Once it is cleared, you will lead the client meetings.');
  });
});
