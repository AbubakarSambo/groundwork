import { EntryService } from './entry.service';

/**
 * A SAVE MADE BEFORE THE REPORT WAS READY HAS ITS REPORT MADE BY THE SERVER (Hafsah's blocker, 31 October 2026: "nothing anyone says
 * in setup is ever lost").
 *
 * The save card's team box and Save waited about thirty-five seconds for the report, and round 5's impatient leads left before then.
 * They are there the moment setup ends now, so a lead can save before the report exists. The save is not held for it: the report is
 * made from the same conversation after the save has answered, and kept where a report lives (CheckIn.sessionReport).
 *
 * UPDATED (round 7, the sales lead): the report read "The members of the sales team have not been named" though he gave all four in the
 * team box, because it was made from the conversation alone. It is made at the save from the conversation and the names of who is on
 * the saved check-in, whether or not the page sent one; a report the page sent is kept at once until then.
 */
function makeService(numberWriter: jest.Mock) {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => ({ role: 'ADMIN', email: 'wanjiku@law.test' })) },
    organization: { findUnique: jest.fn(async () => ({ whoMayOpenCheckIns: 'EVERYONE', checkInsNeedApproval: false })), update: jest.fn(async () => ({})) },
    platformSetting: { findUnique: jest.fn(async () => null) },
    entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
    groundParticipant: { findMany: jest.fn(async (a: any) => (a?.where?.partyType ? [{ nameGiven: null, email: 'k@x.test', user: { firstName: 'Kwame', lastName: 'Owusu' } }, { nameGiven: 'Akua Boateng', email: 'a@x.test', user: null }] : [{ id: 'p-lead' }])), findFirst: jest.fn(async () => ({ id: 'p-lead' })), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) },
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
    keepWhatSetupGave: jest.fn(async () => undefined),
  };
  const conversation: any = { extractRecordEntries: jest.fn(async () => undefined), extractExpectations: jest.fn(async () => undefined), ensureNextSession: jest.fn(async () => undefined), buildSoloArtifact: jest.fn(async () => undefined) };
  const service = new EntryService({} as any, prisma, grounds, {} as any, {} as any, conversation, { emit: jest.fn() } as any);
  return { service, grounds, prisma };
}

const THE_SETUP = [{ role: 'assistant', content: 'Who is on the team?' }, { role: 'user', content: 'My reps.' }];
const save = (service: EntryService, report: unknown) =>
  service.commit('org1', 'u-ama', { groundLabel: 'Water filter sales', scenario: 'NEW_PROJECT', history: THE_SETUP as any, report, contributors: [], leadsOwnWords: ['Sell more water filters.'] } as any);
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r)); };

describe('a lead saves the setup', () => {
  it('before the report was ready: the save answers, and the report is made with the names of who is on the check-in', async () => {
    const { service, prisma } = makeService(jest.fn());
    const made = { alignmentStatus: 'Clear', whatGroundworkSaw: 'Kwame and Akua sell.' };
    const report = jest.spyOn(service, 'report').mockResolvedValue(made as any);
    const out: any = await save(service, null);
    await flush();

    expect(out.groundId).toBe('g1');
    expect(report).toHaveBeenCalledWith(THE_SETUP, 'NEW_PROJECT', 'Water filter sales', undefined, ['Kwame Owusu', 'Akua Boateng'], ['Sell more water filters.']);
    expect(prisma.checkIn.update).toHaveBeenCalledWith({ where: { id: 'ci1' }, data: { sessionReport: made } });
  });

  it('after the page’s report was ready: it is kept at once, then made again knowing the team', async () => {
    const { service, prisma } = makeService(jest.fn());
    const read = { alignmentStatus: 'Clear', whatGroundworkSaw: 'The team has not been named.' };
    const made = { alignmentStatus: 'Clear', whatGroundworkSaw: 'Kwame and Akua sell.' };
    jest.spyOn(service, 'report').mockResolvedValue(made as any);
    await save(service, read);
    await flush();

    const writes = prisma.checkIn.update.mock.calls.map((c: any) => c[0]?.data?.sessionReport).filter(Boolean);
    expect(writes[0]).toEqual(read);
    expect(writes[writes.length - 1]).toEqual(made);
  });

  /* Changed 3 November (F1 part 2): setup is read once, by its assessment, so what setup gave is kept from that check-in's assessment. */
  it('and keeps everything else the lead said in setup, from the setup’s assessment', async () => {
    const { service, grounds } = makeService(jest.fn());
    jest.spyOn(service, 'report').mockResolvedValue(null);
    await save(service, null);
    await flush();
    expect(grounds.keepWhatSetupGave).toHaveBeenCalledWith('g1', 'u-ama', 'ci1');
  });

  it('a report that cannot be made does not undo the save', async () => {
    const { service } = makeService(jest.fn());
    jest.spyOn(service, 'report').mockRejectedValue(new Error('model down'));
    const out: any = await save(service, null);
    await flush();
    expect(out.groundId).toBe('g1');
  });
});
