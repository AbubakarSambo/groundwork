import { ConversationService } from './conversation.service';
import { whatTheYesSays, theNumbersIn } from './yes-but-a-new-number';

/**
 * "YES, BUT IT'S 45 NOW" KEEPS 45 (week 14, screens request 6c).
 *
 * Driven through whatTheDocumentWaitsFor, the step that writes a document's numbers when the person
 * says yes: what goes on the record, and what the person reads back.
 */
function aCheckInWaitingOn(waiting: { name: string; target: number; ownerParticipantId: string | null }[]) {
  const s = Object.create(ConversationService.prototype) as any;
  const written: any[] = [];
  const doc: any = { id: 'd-1', fileName: 'Q3 targets.pdf', holds: { fileName: 'Q3 targets.pdf', forOnePerson: [], forEverybody: [], dates: [], unmatched: [], waiting, takenAt: null } };
  s.prisma = {
    groundDocument: {
      findMany: jest.fn(async () => [doc]),
      update: jest.fn(async ({ data }: any) => { doc.holds = data.holds; return doc; }),
    },
    groundObjective: {
      findMany: jest.fn(async () => []),
      createMany: jest.fn(async ({ data }: any) => { written.push(...data); return { count: data.length }; }),
    },
  };
  s.logger = { log: jest.fn(), warn: jest.fn() };
  const say = (words: string) => s.whatTheDocumentWaitsFor({ id: 'c-1', groundId: 'g-1', participantId: 'p-ot' }, words);
  return { say, written, doc };
}

describe('a yes to a document\'s numbers', () => {
  it('a bare yes takes the number as the document has it', async () => {
    const { say, written } = aCheckInWaitingOn([{ name: 'Q3 sales', target: 40, ownerParticipantId: 'p-ot' }]);
    const reply = await say('Yes');
    expect(written.map((w) => [w.name, w.target])).toEqual([['Q3 sales', 40]]);
    /* Changed 29 Sep 2026: the reply is now plain full sentences (what-was-recorded-from-a-document). */
    expect(reply).toBe('I have recorded this from Q3 targets.pdf. One number is now set for the person it belongs to. Nobody is measured against a number until they have seen it.');
  });

  it('"Yes, but it\'s 45 now" takes 45, and says so', async () => {
    const { say, written } = aCheckInWaitingOn([{ name: 'Q3 sales', target: 40, ownerParticipantId: 'p-ot' }]);
    const reply = await say("Yes, but it's 45 now");
    expect(written.map((w) => [w.name, w.target])).toEqual([['Q3 sales', 45]]);
    expect(reply).toBe('I have recorded this from Q3 targets.pdf. For Q3 sales, I have written 45, as you said, instead of the 40 in the document. One number is now set for the person it belongs to. Nobody is measured against a number until they have seen it.');
  });

  it('with several numbers waiting, the new one goes on the line the answer names, and the rest as the document has them', async () => {
    const { say, written } = aCheckInWaitingOn([
      { name: 'Q3 sales', target: 40_000_000, ownerParticipantId: 'p-ot' },
      { name: 'New dealers', target: 6, ownerParticipantId: 'p-ot' },
    ]);
    await say('Yes, but new dealers is 8 since the region changed last week, the manager agreed it');
    expect(written.map((w) => [w.name, w.target])).toEqual([['Q3 sales', 40_000_000], ['New dealers', 8]]);
  });

  it('when it cannot tell which line the new number is for, it writes nothing and asks', async () => {
    const { say, written, doc } = aCheckInWaitingOn([
      { name: 'Q3 sales', target: 40, ownerParticipantId: 'p-ot' },
      { name: 'New dealers', target: 6, ownerParticipantId: 'p-ot' },
    ]);
    const reply = await say("Yes, but it's 45 now");
    expect(written).toEqual([]);
    expect(doc.holds.takenAt).toBeNull();
    expect(reply).toBe('Which number should be 45? Tell me what it is for, and I will write that one down with the new number and the rest as Q3 targets.pdf has them.');
  });

  it('a "yes, but" with no number writes nothing', async () => {
    const { say, written } = aCheckInWaitingOn([{ name: 'Q3 sales', target: 40, ownerParticipantId: 'p-ot' }]);
    expect(await say('Yes, but I need to check with Wairimu first')).toBeNull();
    expect(written).toEqual([]);
  });

  it('reads numbers the way people write them', () => {
    expect(theNumbersIn('45,000,000')).toEqual([45_000_000]);
    expect(theNumbersIn('45m')).toEqual([45_000_000]);
    expect(theNumbersIn('1.2 million')).toEqual([1_200_000]);
    expect(theNumbersIn('Q3 is 45k')).toEqual([45_000]);
    expect(whatTheYesSays('no', [])).toEqual({ kind: 'not a yes' });
  });
});
