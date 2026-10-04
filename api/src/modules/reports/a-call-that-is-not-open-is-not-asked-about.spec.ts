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

describe('several waits and one "it" (request 132 g)', () => {
  it('says them, stored or new', () => {
    expect(aStoredSentenceReadsRight('2 things are waiting on somebody outside this check-in, and nothing on record says anybody has chased it. Ask what has been tried beyond writing to them.'))
      .toBe('2 things are waiting on somebody outside this check-in, and nothing on record says anybody has chased them. Ask what has been tried beyond writing to those people.');
    expect(aStoredSentenceReadsRight('One thing is waiting on somebody outside this check-in, and nothing on record says anybody has chased it. Ask what has been tried beyond writing to them.'))
      .toMatch(/has chased it\./);
  });
  it('writes them for several and it for one', () => {
    const { toSettleFirst } = require('./what-the-record-shows-over-time');
    const dep = (i: number) => ({ chased: false, onParticipantId: null, say: `x${i}` });
    const two = toSettleFirst({ commitments: [], dependencies: [dep(1), dep(2)], patterns: [], documentsAttached: 1, anybodySaidWhoArrangedThings: true }).join(' ');
    expect(two).toMatch(/has chased them\. Ask what has been tried beyond writing to those people\./);
    const one = toSettleFirst({ commitments: [], dependencies: [dep(1)], patterns: [], documentsAttached: 1, anybodySaidWhoArrangedThings: true }).join(' ');
    expect(one).toMatch(/has chased it\. Ask what has been tried beyond writing to them\./);
  });
});

describe('coaching under "Worth asking" (requests 130 e, 134 item 3)', () => {
  it('asks, and never says "worth showing ... rather than asking about", stored or new', () => {
    expect(aStoredSentenceReadsRight('Amani Wekesa has been waiting for the tax view, and nothing on record says it was raised higher. This early, that is worth showing Amani Wekesa rather than asking about.'))
      .toBe('Amani Wekesa has been waiting for the tax view, and nothing on record says it was raised higher. It is early, so ask Amani Wekesa what is being held up and whether help raising it would be useful.');
    expect(aStoredSentenceReadsRight('You have been waiting for it. This early, that is worth showing you rather than asking about.'))
      .toBe('You have been waiting for it. It is early. What is being held up, and would help raising it be useful?');
  });
});
