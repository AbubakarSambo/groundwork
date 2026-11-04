import { EntryService } from './entry.service';

/**
 * PILOTS, 13 OCTOBER 2026, E5, and CHANGED 4 NOVEMBER 2026. Njeri's conversation used to be copied onto her session 1, and this
 * pinned the order it was copied in. Hafsah, 4 November: "setup stays private to whoever runs the check-in", and the conversation
 * holds her setup as well as her first update, so it is no longer copied at all. What this pins now: nothing from it becomes a
 * turn or a record line on session 1, session 1 is still closed as answered (she counts in it), and her targets are still read
 * from the whole conversation, which is their proper place.
 */
const NJERI = [
  { role: 'assistant', content: "To help keep a clear record of the litigation team's work this week, what is the most advanced piece of work?" },
  { role: 'user', content: 'The Kamau v. Apex defence. Brian files it tomorrow, Tuesday.' },
  { role: 'assistant', content: 'What are the one or two things that would make this week a good one?' },
  { role: 'user', content: 'That it is filed on time and stamped by the registry.' },
  { role: 'assistant', content: 'Asking David for the documents by Wednesday morning. That is what you will do. Your report is ready now. Speak soon. [[SESSION_COMPLETE]]' },
];

describe("the lead's first check-in, as it is kept", () => {
  it('is closed as answered, and her conversation is not copied onto it as turns or record lines', async () => {
    const written: any[] = [];
    const prisma: any = {
      user: { findUnique: jest.fn(async () => ({ role: 'ADMIN', email: 'njeri@muchemi.test' })) },
      organization: { findUnique: jest.fn(async () => ({ whoMayOpenCheckIns: 'NAMED_LEADS', checkInsNeedApproval: false })), update: jest.fn(async () => ({})) },
      platformSetting: { findUnique: jest.fn(async () => null) },
      entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
      groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]), findFirst: jest.fn(async () => ({ id: 'p1' })), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) },
      roundCompletion: { create: jest.fn(async (a: any) => a.data) },
      checkIn: { count: jest.fn(async () => 1), findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
      conversationTurn: { createMany: jest.fn(async (a: any) => { written.push(...a.data); return { count: a.data.length }; }) },
      leadContextNote: { create: jest.fn(async () => ({})) },
      ground: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ joinToken: 'jt' })) },
    };
    const grounds: any = { create: jest.fn(async () => ({ id: 'g1', joinToken: 'jt' })), createForLead: jest.fn(), addParticipant: jest.fn(async () => ({})) };
    const conversation: any = { extractRecordEntries: jest.fn(async () => undefined), extractExpectations: jest.fn(async () => undefined), ensureNextSession: jest.fn(async () => undefined), buildSoloArtifact: jest.fn(async () => undefined) };
    const service = new EntryService({} as any, prisma, grounds, {} as any, {} as any, conversation, { emit: jest.fn() } as any);
    await service.commit('org1', 'user1', { groundLabel: 'Litigation team daily', scenario: 'PULSE_CHECK', history: NJERI as any, report: null, contributors: [] } as any);
    expect(written).toEqual([]);
    expect(conversation.extractRecordEntries).not.toHaveBeenCalled();
    expect(prisma.checkIn.update).toHaveBeenCalledWith({ where: { id: 'ci1' }, data: { status: 'COMPLETED', completedAt: expect.any(Date), optional: true } });
    expect(conversation.extractExpectations).toHaveBeenCalledWith('ci1', 'p1', 'g1', NJERI);
  });
});
