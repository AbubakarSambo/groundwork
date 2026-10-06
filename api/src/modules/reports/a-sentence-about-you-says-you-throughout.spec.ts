import { aStoredSentenceReadsRight, everyStoredSentenceReadsRight } from './a-stored-sentence-reads-right';
import { yourOwnRowsSayYou } from '../board/your-own-read-says-you';

/** Requests 127 item 5, 129 item 3, 131 item 1: "their" and "they" for the person reading. */
describe('a sentence about the reader', () => {
  it('says your own, not their own (the lead, support desk)', () => {
    expect(aStoredSentenceReadsRight('Your goal is not being met, and their own open task is part of the problem.')).toBe('Your goal is not being met, and your own open task is part of the problem.');
  });
  it('says you said you would, not they said they would (the lead, training programme)', () => {
    const board = everyStoredSentenceReadsRight({ whatTheAnswersSay: ['You have not yet made the visit to Kisumu they said they would.'] });
    expect(board.whatTheAnswersSay[0]).toBe('You have not yet made the visit to Kisumu you said you would.');
  });
  it('leaves a sentence about somebody else, and a quotation, alone', () => {
    expect(aStoredSentenceReadsRight('Amani Wekesa has not made the visit they said they would.')).toBe('Amani Wekesa has not made the visit they said they would.');
    expect(aStoredSentenceReadsRight('You said "and their own" plan.')).toBe('You said "and their own" plan.');
  });
  it('says most of your time on the reader\'s own row (the participant, drift)', () => {
    const board: any = yourOwnRowsSayYou({ coverage: { reads: [{ participantId: 'p1', what: 'Has been dedicating most of their time to sales support since March, as requested by Nadia Haddad.' }] } }, 'p1');
    expect(board.coverage.reads[0].what).toBe('Has been dedicating most of your time to sales support since March, as requested by Nadia Haddad.');
  });
});
