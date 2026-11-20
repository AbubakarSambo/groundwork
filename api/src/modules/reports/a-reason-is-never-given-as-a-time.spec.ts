import { aCommitmentSaid } from './what-the-record-shows-over-time';
import { theWorkPlan } from '../board/the-switchboards-own-sections';

/**
 * "THE TIME YOU GAVE FOR IT WAS "GIVEN THEIR HISTORIES"" (messages test, 19 October, finding 11).
 *
 * Muchemi & Co. (test), the Fee notes board, What needs you, Wednesday to Friday. On Monday 12 October Wanjiru said "For Jamii Clinics
 * and Upendo Schools, given their histories, I will be stepping in to assist Aisha directly." The record kept "given their histories"
 * as the time she gave, word for word, and the board read: In session 1, you said, "I will be stepping in to assist Aisha directly."
 * The time you gave for it was "given their histories". A phrase is said as the time only where it reads as one, quoted or not.
 */
const wanjirus = {
  who: 'You', what: 'I will be stepping in to assist Aisha directly.', when: 'given their histories', statedInSession: 1, restatedIn: [] as number[],
  status: 'UNKNOWN', theySaidIt: true, settledBy: null, fromAPaste: false, leadLabel: 'You', saidWordForWord: true, whenSaidWordForWord: true,
};

describe('a reason is never given as a time', () => {
  it('Wanjiru reads what she said, and no time, on the Fee notes board', () => {
    expect(aCommitmentSaid(wanjirus, 1)).toBe('In check-in 1, you said, "I will be stepping in to assist Aisha directly." Nobody has said yet whether it happened.');
  });

  it('and the same on the work plan the board serves her', () => {
    const r: any = {
      mayReadEveryone: true, theLeadsId: 'p-wanjiru', personMayBeRead: () => true, commitmentMayBeRead: () => true,
      nameOf: () => 'Wanjiru Muchemi', aColleague: () => 'a colleague', readerParticipantId: 'p-wanjiru', isTheLead: true,
    };
    const rows = theWorkPlan([{
      id: 'c-1', participantId: 'p-wanjiru', text: wanjirus.what, whenSaid: 'given their histories', explicit: true, status: 'UNKNOWN', source: 'CHECK_IN',
      statedInSession: 1, saidAgainIn: [], settledBy: null, settledAt: null, saidWordForWord: true, whenSaidWordForWord: true, createdAt: new Date('2026-10-12T08:33:25Z'),
    }], [{ id: 's1', participantId: 'p-wanjiru', sessionNumber: 1, status: 'COMPLETED', completedAt: new Date('2026-10-12T08:40:00Z'), isSetup: false, closedReason: null, turns: [] }] as any, r);
    expect(rows[0].says).not.toContain('given their histories');
    expect(rows[0].when).toBeNull();
  });

  it('a time said word for word is still said: "by Friday"', () => {
    expect(aCommitmentSaid({ ...wanjirus, what: 'I will draft the reply and ensure it is filed', when: 'by Friday' }, 1))
      .toBe('In check-in 1, you said, "I will draft the reply and ensure it is filed". The time you gave for it was "by Friday". Nobody has said yet whether it happened.');
  });
});
