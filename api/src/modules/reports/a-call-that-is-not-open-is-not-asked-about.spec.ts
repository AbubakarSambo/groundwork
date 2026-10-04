import { aStoredSentenceReadsRight, everyStoredSentenceReadsRight } from './a-stored-sentence-reads-right';
import { ROLE_MAPS } from '../board/role-maps';

/** Requests 135 and 136: "That call has been open a while - what is the decision, and when?" on a check-in answered once. */
describe('the question about a call', () => {
  it('is not joined by a dash and does not say the call has been open, in a stored sentence', () => {
    expect(aStoredSentenceReadsRight('That call has been open a while - what is the decision, and when?')).toBe('What is the decision, and when will it be made?');
    const board = everyStoredSentenceReadsRight({ divergence: { centralQuestion: 'That call has been open a while - what is the decision, and when?' }, overTime: { toSettleFirst: ['That call has been open a while. What is the decision, and when?'] } });
    expect(JSON.stringify(board)).not.toMatch(/open a while| - /);
  });
  it('is not asked that way by the founder\'s role map any more', () => {
    expect(JSON.stringify(ROLE_MAPS)).not.toMatch(/open a while/);
  });
});
