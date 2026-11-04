import { EntryService, theQuestionEachAnswered } from './entry.service';

/**
 * PILOTS, 13 OCTOBER 2026, E5. Njeri's session 1 was written with one time on every turn, so it came back out of order:
 * her closing turn ("...Speak soon. [[]]") mid-transcript and two of Groundwork's turns together. Each turn is written
 * with its own moment, in the order it was said, and the close marker never reaches the record.
 *
 * CHANGED 4 NOVEMBER (Hafsah: one conversation on screen, stored in two parts). The conversation is no longer copied onto session 1
 * whole, which is how setup's words reached the team. Her messages reach the assessment once, in the order she said them, each with the
 * question it answered and no marker; the read names her own update, and only that is written onto session 1, each turn with its own
 * moment in order (assess-the-conversation.ts, herFirstCheckIn; setup-stays-with-whoever-runs-the-check-in.spec.ts).
 */
const NJERI = [
  { role: 'assistant', content: "To help keep a clear record of the litigation team's work this week, what is the most advanced piece of work?" },
  { role: 'user', content: 'The Kamau v. Apex defence. Brian files it tomorrow, Tuesday.' },
  { role: 'assistant', content: 'What are the one or two things that would make this week a good one?' },
  { role: 'user', content: 'That it is filed on time and stamped by the registry.' },
  { role: 'assistant', content: 'Asking David for the documents by Wednesday morning. That is what you will do. Your report is ready now. Speak soon. [[SESSION_COMPLETE]]' },
];

describe("the lead's first check-in, as it is kept", () => {
  it('hands her messages to the assessment in the order said, each with the question it answered and no marker, and copies no turn', async () => {
    const assessed: any[] = [];
    const prisma: any = {
      user: { findUnique: jest.fn(async () => ({ role: 'ADMIN', email: 'njeri@muchemi.test' })) },
      organization: { findUnique: jest.fn(async () => ({ whoMayOpenCheckIns: 'NAMED_LEADS', checkInsNeedApproval: false })), update: jest.fn(async () => ({})) },
      platformSetting: { findUnique: jest.fn(async () => null) },
      entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
      groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]), findFirst: jest.fn(async () => ({ id: 'p1' })), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) },
      roundCompletion: { create: jest.fn(async (a: any) => a.data) },
      checkIn: { count: jest.fn(async () => 1), findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
      conversationTurn: { createMany: jest.fn(async (a: any) => ({ count: a.data.length })) },
      leadContextNote: { create: jest.fn(async () => ({})) },
      ground: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ joinToken: 'jt' })) },
    };
    const grounds: any = { create: jest.fn(async () => ({ id: 'g1', joinToken: 'jt' })), createForLead: jest.fn(), addParticipant: jest.fn(async () => ({})) };
    const conversation: any = {
      extractRecordEntries: jest.fn(async () => undefined), extractExpectations: jest.fn(async () => undefined), ensureNextSession: jest.fn(async () => undefined), buildSoloArtifact: jest.fn(async () => undefined),
      assessAndThenRead: jest.fn(async (_c: any, how: any) => { assessed.push(how); }),
    };
    const service = new EntryService({} as any, prisma, grounds, {} as any, {} as any, conversation, { emit: jest.fn() } as any);
    const hers = NJERI.filter((t) => t.role === 'user').map((t) => t.content);
    await service.commit('org1', 'user1', { groundLabel: 'Litigation team daily', scenario: 'PULSE_CHECK', history: NJERI as any, leadsOwnWords: hers, report: null, contributors: [] } as any);
    expect(prisma.conversationTurn.createMany).not.toHaveBeenCalled();
    expect(assessed[0].setup.words).toEqual(hers);
    expect(assessed[0].setup.asked).toEqual([NJERI[0].content, NJERI[2].content]);
  });

  it('the question before each message is read without the close marker, and none where she wrote first', () => {
    expect(theQuestionEachAnswered(['Thanks.'], [{ role: 'assistant', content: 'Speak soon. [[SESSION_COMPLETE]]' }, { role: 'user', content: 'Thanks.' }])).toEqual(['Speak soon.']);
    expect(theQuestionEachAnswered(['Hello'], [{ role: 'user', content: 'Hello' }])).toEqual([null]);
  });
});
