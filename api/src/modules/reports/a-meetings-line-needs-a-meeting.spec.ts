import { meetingsOnRecordFor, overTimeAsServed, overTimeForThisReader } from './what-the-record-shows-over-time';

/**
 * Requests 127, 129, 130, 131, 132, 134, 135 and 136: a report stored before the rule that a meetings sentence needs
 * a meeting on the record still says "Nobody on record has said who arranged the meetings that happened". It is left
 * out when the record, read now, has no meeting in it, for the lead and for a participant alike.
 */
const STORED: any = {
  sessions: 1, commitments: [], dependencies: [], patterns: [], gaps: [], stillOpen: [],
  cannotTellYou: [
    'Nothing here is backed by a document. Every line is what somebody said, and none of it has been checked against anything outside this check-in.',
    'Nobody on record has said who arranged the meetings that happened, so this cannot tell you who secured them.',
  ],
  toSettleFirst: [
    'Nobody on record has said who arranged the meetings that happened. Ask who secured each one before crediting anybody with them.',
    'Nothing here is backed by a document. Ask for one thing in writing that you could check yourself.',
  ],
};
const prismaWith = (texts: string[]) => ({ recordEntry: { findMany: async () => texts.map((text) => ({ text })) } });

describe('the meetings sentence, as each reader reads it', () => {
  it('is not read by the lead or a participant when nobody spoke of a meeting (a support desk)', async () => {
    const meetings = await meetingsOnRecordFor(prismaWith(['I close refunds when I send the instruction.', 'Aisha is waiting for the macro.']), 'g');
    expect(meetings).toBe(false);
    const lead = overTimeAsServed(STORED, { meetingsOnRecord: meetings })!;
    const participant = overTimeForThisReader(STORED, { isLead: false, participantId: 'p1' }, { meetingsOnRecord: meetings })!;
    for (const text of [...lead.toSettleFirst, ...lead.cannotTellYou, ...participant.cannotTellYou]) {
      expect(text).not.toMatch(/arranged the meetings/);
    }
    expect(lead.toSettleFirst).toHaveLength(1);
    expect(lead.cannotTellYou).toHaveLength(1);
  });

  it('is still read when a meeting is on the record', async () => {
    const meetings = await meetingsOnRecordFor(prismaWith(['We met the Permanent Secretary on Tuesday.']), 'g');
    expect(meetings).toBe(true);
    const lead = overTimeAsServed(STORED, { meetingsOnRecord: meetings })!;
    expect(lead.toSettleFirst.join(' ')).toMatch(/arranged the meetings/);
    expect(lead.cannotTellYou.join(' ')).toMatch(/arranged the meetings/);
  });

  it('is left as stored when the record cannot be read', async () => {
    expect(await meetingsOnRecordFor({ recordEntry: { findMany: async () => { throw new Error('down'); } } }, 'g')).toBeUndefined();
    expect(overTimeAsServed(STORED, { meetingsOnRecord: undefined })!.toSettleFirst).toHaveLength(2);
  });
});
