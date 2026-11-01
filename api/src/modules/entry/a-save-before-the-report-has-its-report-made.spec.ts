import { EntryService } from './entry.service';

/**
 * A SAVE MADE BEFORE THE REPORT WAS READY HAS ITS REPORT MADE BY THE SERVER (Hafsah's blocker, 31 October 2026: "nothing anyone says
 * in setup is ever lost").
 *
 * The save card's team box and Save waited about thirty-five seconds for the report, and round 5's impatient leads left before then.
 * They are there the moment setup ends now, so a lead can save before the report exists. The save is not held for it: the same report
 * is made from the same conversation after the save has answered, and kept where a report the lead read is kept
 * (CheckIn.sessionReport). A report the lead did read is kept as it was, and never made a second time.
 */
function makeService(numberWriter: jest.Mock) {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => ({ role: 'ADMIN', email: 'wanjiku@law.test' })) },
    organization: { findUnique: jest.fn(async () => ({ whoMayOpenCheckIns: 'EVERYONE', checkInsNeedApproval: false })), update: jest.fn(async () => ({})) },
    platformSetting: { findUnique: jest.fn(async () => null) },
    entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p-lead' }]), findFirst: jest.fn(async () => ({ id: 'p-lead' })), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) },
    roundCompletion: { create: jest.fn(async (a: any) => a.data) },
    checkIn: { count: jest.fn(async () => 1), findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
    conversationTurn: { createMany: jest.fn(async () => ({ count: 0 })) },
    leadContextNote: { create: jest.fn(async () => ({})) },
    ground: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ joinToken: 'jt' })) },
  };
  const grounds: any = {
    create: jest.fn(async () => ({ id: 'g1', joinToken: 'jt' })),
    createForLead: jest.fn(),
    addParticipant: jest.fn(async (_g: string, _o: string, _u: string, dto: any) => ({ id: `p-${dto.email.split('@')[0]}`, email: dto.email, invitedAt: new Date() })),
    addTheirWhatsAppNumber: numberWriter,
  };
  const conversation: any = { extractRecordEntries: jest.fn(async () => undefined), extractExpectations: jest.fn(async () => undefined), ensureNextSession: jest.fn(async () => undefined), buildSoloArtifact: jest.fn(async () => undefined) };
  const service = new EntryService({} as any, prisma, grounds, {} as any, {} as any, conversation, { emit: jest.fn() } as any);
  return { service, grounds, prisma };
}

const THE_SETUP = [{ role: 'assistant', content: 'Who is on the team?' }, { role: 'user', content: 'Kwame Owusu and Akua Boateng.' }];
const save = (service: EntryService, report: unknown) =>
  service.commit('org1', 'u-ama', { groundLabel: 'Farmer training', scenario: 'NEW_PROJECT', history: THE_SETUP as any, report, contributors: [], leadsOwnWords: ['Track our farmer training.'] } as any);
const flush = () => new Promise((r) => setImmediate(r));

describe('a lead saves the setup', () => {
  it('before the report was ready: the save answers, and the report is made from the same conversation and kept on the check-in', async () => {
    const { service, prisma } = makeService(jest.fn());
    const made = { alignmentStatus: 'Clear', whatGroundworkSaw: 'Two field officers.' };
    const report = jest.spyOn(service, 'report').mockResolvedValue(made as any);
    const out: any = await save(service, null);
    await flush();

    expect(out.groundId).toBe('g1');
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(THE_SETUP, 'NEW_PROJECT', 'Farmer training', undefined, undefined, ['Track our farmer training.']);
    expect(prisma.checkIn.update).toHaveBeenCalledWith({ where: { id: 'ci1' }, data: { sessionReport: made } });
  });

  it('after the report was ready: the report the lead read is kept, and none is made', async () => {
    const { service, prisma } = makeService(jest.fn());
    const read = { alignmentStatus: 'Clear', whatGroundworkSaw: 'What she read.' };
    const report = jest.spyOn(service, 'report');
    await save(service, read);
    await flush();

    expect(report).not.toHaveBeenCalled();
    expect(prisma.checkIn.update).toHaveBeenCalledWith({ where: { id: 'ci1' }, data: { sessionReport: read } });
  });

  it('a report that cannot be made does not undo the save', async () => {
    const { service } = makeService(jest.fn());
    jest.spyOn(service, 'report').mockRejectedValue(new Error('model down'));
    const out: any = await save(service, null);
    await flush();
    expect(out.groundId).toBe('g1');
  });
});
