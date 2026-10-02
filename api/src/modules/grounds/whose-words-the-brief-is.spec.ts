import { GroundsService } from './grounds.service';
import { EntryService } from '../entry/entry.service';

/**
 * WHAT THIS CHECK-IN IS FOR: WHAT EACH READER IS SENT, AND WHOSE WORDS IT IS (U.7 review).
 *
 * The Context page told Wanjiru "Your words, from setup. Everyone reads this before they answer."
 * over her own words, while Aisha was shown a different text, the short read Groundwork writes from
 * the brief. Now whoever runs the check-in is also sent what the people in it read, and the page is
 * told whether that is the lead's own words and who last changed it, so it says only what is true.
 */
const WANJIRU = 'u-wanjiru';
const AISHA = 'u-aisha';
const OTIENO = 'u-otieno';
const HER_WORDS = 'Twenty-five water pumps this quarter. I want to see what actually moved each week.';
const TOLD = 'This check-in follows the water pump sales this quarter.';

function getAs(userId: string, over: any = {}, setupWords: { authorUserId: string; text: string } | null = null) {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', initiatorId: WANJIRU, createdAt: new Date(), timelineDays: null,
    restrictExternalVisibility: true, peersVisibleToEachOther: true, whoSeesTargets: 'THEIR_OWN',
    brief: HER_WORDS, toldToParticipants: TOLD, groundAuditLog: null,
    participants: [
      { id: 'p-w', userId: WANJIRU, email: 'w@x.test', partyType: 'INITIATOR', roleAsDescribed: null, createdAt: new Date(), user: { firstName: 'Wanjiru', lastName: 'Mwangi' } },
      { id: 'p-a', userId: AISHA, email: 'a@x.test', partyType: 'PARTICIPANT', roleAsDescribed: null, createdAt: new Date(), user: { firstName: 'Aisha', lastName: 'Otieno' } },
    ],
    checkIns: [], resolution: null, patternDetections: [], objectives: [],
    report: { id: 'r1', releasedAt: new Date(), sharedPicture: null, createdAt: new Date() },
    ...over,
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: {
      findUnique: jest.fn(async (a: any) => {
        if (a?.select?.firstName) return { firstName: a.where.id === OTIENO ? 'Otieno' : 'Wanjiru' };
        return { role: userId === OTIENO ? 'ADMIN' : 'MEMBER', organizationId: 'org1' };
      }),
    },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
    leadSetupWords: { findUnique: jest.fn(async () => setupWords) },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any)
    .get('g1', 'org1', userId) as Promise<any>;
}

describe('what this check-in is for, as each reader is sent it', () => {
  it('Wanjiru gets her own words to rewrite, and what her people read, which is not her words', async () => {
    const got = await getAs(WANJIRU);
    expect(got.brief).toBe(HER_WORDS);
    expect(got.briefAsEveryoneReadsIt).toBe(TOLD);
    expect(got.briefIsTheLeadsOwnWords).toBe(false);
    expect(got.briefChangedBy).toBeNull();
  });

  /* Changed with decision 75, item 13: the brief is never quoted into a participant's check-in, so where nothing
     was rewritten, the people in it read nothing of it, and it is not said that they read her own words. */
  it('where nothing was rewritten, the people in it read nothing of her brief', async () => {
    const got = await getAs(WANJIRU, { toldToParticipants: null, brief: 'Twenty-five water pumps this quarter.' });
    expect(got.briefAsEveryoneReadsIt).toBeNull();
    expect(got.briefIsTheLeadsOwnWords).toBe(false);
  });

  it('Aisha gets only what everyone reads, and not who changed it', async () => {
    const got = await getAs(AISHA, { groundAuditLog: { timeline: [], contextNotes: [], briefChangedBy: { userId: OTIENO, at: '2026-09-26T10:00:00Z' } } });
    expect(got.brief).toBe(TOLD);
    expect(JSON.stringify(got)).not.toContain('I want to see what actually moved');
    expect(got.briefAsEveryoneReadsIt).toBeUndefined();
    expect(got.briefChangedBy).toBeUndefined();
    expect(got.groundAuditLog).toBeUndefined();
    expect(JSON.stringify(got)).not.toContain(OTIENO);
  });

  it('where Otieno rewrote it, Wanjiru is told it was Otieno, and it is not called her words', async () => {
    const audit = { groundAuditLog: { timeline: [], contextNotes: [], briefChangedBy: { userId: OTIENO, at: '2026-09-26T10:00:00Z' } }, toldToParticipants: null };
    const hers = await getAs(WANJIRU, audit);
    expect(hers.briefChangedBy).toEqual({ firstName: 'Otieno', isYou: false, isTheLead: false });
    expect(hers.briefIsTheLeadsOwnWords).toBe(false);
    const his = await getAs(OTIENO, audit);
    expect(his.briefChangedBy).toEqual({ firstName: 'Otieno', isYou: true, isTheLead: false });
  });
});

describe('rewriting it: only the lead, unless the lead has left, and then who did it is told (decision 72)', () => {
  /* Hafsah, 1 October: rewriting a check-in's brief follows the same rule as other setup changes
     (decision 63). This test used to prove that any admin could rewrite a present lead's words; it
     now proves the rule that replaced that. */
  function makeService({ leadHasLeft = false }: { leadHasLeft?: boolean } = {}) {
    const g = { id: 'g1', organizationId: 'org1', initiatorId: WANJIRU, scenario: 'NEW_PROJECT', label: 'Sales', timelineDays: 90, timelineWeeks: 13, cadence: 'WEEKLY', mode: 'SHARED', brief: HER_WORDS, groundAuditLog: null };
    const updated = jest.fn(async (args: any) => ({ ...g, ...args.data }));
    const people: Record<string, any> = {
      [WANJIRU]: { role: 'MEMBER', organizationId: 'org1', firstName: 'Wanjiru', lastName: 'Mwangi', isActive: !leadHasLeft },
      [OTIENO]: { role: 'ADMIN', organizationId: 'org1', firstName: 'Otieno', lastName: 'Kamau', isActive: true },
      [AISHA]: { role: 'MEMBER', organizationId: 'org1', firstName: 'Aisha', lastName: 'Otieno', isActive: true },
    };
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => g), update: updated },
      groundParticipant: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      user: { findUnique: jest.fn(async (a: any) => people[a.where.id] ?? null) },
      checkIn: { findFirst: jest.fn(async () => null) },
    };
    return { service: new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any), updated };
  }

  it('the lead rewrites it, and is recorded as having changed it', async () => {
    const { service, updated } = makeService();
    await service.updateTimeline('g1', WANJIRU, { brief: 'Sell 25 water pumps this quarter.' });
    const log = updated.mock.calls[0][0].data.groundAuditLog;
    expect(log.briefChangedBy.userId).toBe(WANJIRU);
    expect(log.briefChangedBy.byAnAdminSentence).toBeUndefined();
  });

  it('an admin may not rewrite a present lead\'s words, and nothing is written', async () => {
    const { service, updated } = makeService();
    await expect(service.updateTimeline('g1', OTIENO, { brief: 'Sell 25 water pumps this quarter.' })).rejects.toThrow(/Wanjiru Mwangi/);
    expect(updated).not.toHaveBeenCalled();
  });

  it('once the lead has left, an admin may, and the sentence naming who did it is recorded', async () => {
    const { service, updated } = makeService({ leadHasLeft: true });
    await service.updateTimeline('g1', OTIENO, { brief: 'Sell 25 water pumps this quarter.' });
    const log = updated.mock.calls[0][0].data.groundAuditLog;
    expect(log.briefChangedBy.userId).toBe(OTIENO);
    expect(log.briefChangedBy.byAnAdminSentence).toBe('Otieno Kamau changed what this check-in is for because Wanjiru Mwangi has left the organisation.');
  });

  it('a participant may never rewrite it', async () => {
    const { service, updated } = makeService({ leadHasLeft: true });
    await expect(service.updateTimeline('g1', AISHA, { brief: 'Something else.' })).rejects.toThrow();
    expect(updated).not.toHaveBeenCalled();
  });

  it('saving the same words again records nothing', async () => {
    const { service, updated } = makeService();
    await service.updateTimeline('g1', WANJIRU, { brief: HER_WORDS });
    expect(updated.mock.calls[0][0].data.groundAuditLog.briefChangedBy).toBeUndefined();
  });
});

describe('who rewrote it, as each reader is told (decision 72)', () => {
  const SENTENCE = 'Otieno Kamau changed what this check-in is for because Wanjiru Mwangi has left the organisation.';
  const byAnAdmin = { groundAuditLog: { timeline: [], contextNotes: [], briefChangedBy: { userId: OTIENO, at: '2026-10-01T10:00:00Z', byAnAdminSentence: SENTENCE } }, toldToParticipants: null };
  it('Aisha, on the check-in, is told who did it', async () => {
    expect((await getAs(AISHA, byAnAdmin)).briefChangedByAnAdmin).toBe(SENTENCE);
  });
  it('whoever runs it is told too', async () => {
    expect((await getAs(OTIENO, byAnAdmin)).briefChangedByAnAdmin).toBe(SENTENCE);
  });
  it('a rewrite by the lead names nobody to Aisha', async () => {
    const byTheLead = { groundAuditLog: { timeline: [], contextNotes: [], briefChangedBy: { userId: WANJIRU, at: '2026-10-01T10:00:00Z' } } };
    expect((await getAs(AISHA, byTheLead)).briefChangedByAnAdmin).toBeNull();
  });
});

/*
 * U.7 RE-CHECK: WHAT THE LEAD TYPED IN SETUP. The Context page's "What you wrote" held the brief
 * setup put together from her answers. Her own messages are kept, and sent to her alone.
 */
const JUMA = 'Juma joined our warehouse team in January and his probation ends in March. I need to decide whether to confirm him. He is often late with the stock counts.';

describe('what the lead typed in setup, as each reader is sent it', () => {
  const hers = { authorUserId: WANJIRU, text: JUMA };
  it('Wanjiru, who typed it and leads it, is sent it', async () => {
    const got = await getAs(WANJIRU, {}, hers);
    expect(got.leadsOwnSetupWords).toBe(JUMA);
    expect(got.briefPutTogetherBySetup).toBe(true);
  });
  it('Aisha is not', async () => {
    const got = await getAs(AISHA, {}, hers);
    expect(got.leadsOwnSetupWords).toBeUndefined();
    expect(JSON.stringify(got)).not.toContain('often late with the stock counts');
  });
  it('Otieno, an admin, is not', async () => {
    const got = await getAs(OTIENO, {}, hers);
    expect(got.leadsOwnSetupWords).toBeUndefined();
    expect(JSON.stringify(got)).not.toContain('often late with the stock counts');
  });
  it('a lead the check-in was handed to, who did not type them, is not', async () => {
    const got = await getAs(WANJIRU, {}, { authorUserId: 'u-earlier-lead', text: JUMA });
    expect(got.leadsOwnSetupWords).toBeUndefined();
  });
  /* Changed with decision 75, item 13: the people in it no longer read the brief as it is. */
  it('and a brief setup put together is not called the lead’s own words, and nobody else reads it', async () => {
    const got = await getAs(WANJIRU, { toldToParticipants: null, brief: 'Juma’s probation needs review.' }, hers);
    expect(got.briefAsEveryoneReadsIt).toBeNull();
    expect(got.briefIsTheLeadsOwnWords).toBe(false);
  });
});

describe('setup keeps what the lead typed, and only that', () => {
  function commitWith(dto: any) {
    const upsert = jest.fn(async (a: any) => a.create);
    const prisma: any = {
      user: { findUnique: jest.fn(async () => ({ role: 'ADMIN' })) },
      organization: { findUnique: jest.fn(async () => ({ whoMayOpenCheckIns: 'NAMED_LEADS', checkInsNeedApproval: true })), update: jest.fn(async () => ({})) },
      entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
      groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]), findFirst: jest.fn(async () => ({ id: 'p1' })), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({ count: 1 })) },
      roundCompletion: { create: jest.fn(async (a: any) => a.data) },
      checkIn: { count: jest.fn(async () => 1), findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
      conversationTurn: { createMany: jest.fn(async () => ({ count: 0 })) },
      leadContextNote: { create: jest.fn(async () => ({})) },
      ground: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ joinToken: 'jt' })) },
      leadSetupWords: { upsert },
    };
    const grounds: any = {
      create: jest.fn(async () => ({ id: 'g-self', joinToken: 'jt' })),
      createForLead: jest.fn(async () => ({ id: 'g-lead', joinToken: 'lead-jt' })),
      addParticipant: jest.fn(async () => ({})),
    };
    const conversation: any = { extractRecordEntries: jest.fn(async () => undefined), extractExpectations: jest.fn(async () => undefined), ensureNextSession: jest.fn(async () => undefined), buildSoloArtifact: jest.fn(async () => undefined) };
    const service = new EntryService({} as any, prisma, grounds, {} as any, {} as any, conversation, { emit: jest.fn() } as any);
    return { run: () => service.commit('org1', WANJIRU, { groundLabel: 'Juma, probation', scenario: 'PROBATION_REVIEW', history: [{ role: 'user', content: 'hi' }], report: null, contributors: [], ...dto } as any), upsert };
  }

  it('keeps her own messages, without a folded-in document, against her as the author', async () => {
    const { run, upsert } = commitWith({ leadsOwnWords: ['Juma joined our warehouse team in January and his probation ends in March.', '[Document: "rota.pdf"]\nrows', 'He is often late with the stock counts.'] });
    await run();
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0].create).toEqual({
      groundId: 'g-self', authorUserId: WANJIRU,
      text: 'Juma joined our warehouse team in January and his probation ends in March.\n\nHe is often late with the stock counts.',
    });
  });

  it('keeps nothing when nothing was typed', async () => {
    const { run, upsert } = commitWith({});
    await run();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('and on the path where somebody sets it up for another lead, keeps nothing: they are not the lead’s words', async () => {
    const { run, upsert } = commitWith({ lead: { email: 'lead@test.com' }, brief: 'Context', leadsOwnWords: ['Set this up for Amina.'] });
    await run();
    expect(upsert).not.toHaveBeenCalled();
  });
});

/*
 * U.7 THIRD REVIEW: THE LIST SENT THE RAW BRIEF TO EVERYONE. Aisha, the person on probation, got the
 * lead's setup answers about her from GET /grounds. It was so before the U.7 fixes too: `list()`
 * spread the whole row. Now the list follows the check-in's own read.
 */
describe('what the check-ins list sends about what a check-in is for', () => {
  const PUT_TOGETHER = 'Aisha’s probation in the warehouse team needs a decision. When asked why this matters now, the answer was taken to mean this. Decide whether to confirm Aisha for her role. When asked what the questions should focus on, the answer was taken to mean this. Aisha is often late with stock counts.';
  const TOLD_AISHA = 'This check-in looks at how your first months in the warehouse have gone.';
  function listAs(userId: string, role: string, told: string | null) {
    const g: any = {
      id: 'g1', organizationId: 'org1', initiatorId: WANJIRU, label: 'Aisha, probation', status: 'ACTIVE', scenario: 'PROBATION_REVIEW',
      cadence: 'WEEKLY', timelineDays: 84, updatedAt: new Date('2026-09-20'), joinToken: 'jt', groundAuditLog: null, restrictExternalVisibility: true,
      peersVisibleToEachOther: true, brief: PUT_TOGETHER, toldToParticipants: told,
      participants: [
        { id: 'p-w', userId: WANJIRU, email: 'w@x.test', partyType: 'INITIATOR', createdAt: new Date('2026-09-01'), user: { firstName: 'Wanjiru', lastName: 'Lead' } },
        { id: 'p-a', userId: AISHA, email: 'a@x.test', partyType: 'PARTICIPANT', createdAt: new Date('2026-09-02'), user: { firstName: 'Aisha', lastName: 'Otieno' } },
        { id: 'p-b', userId: 'u-baraka', email: 'b@x.test', partyType: 'PARTICIPANT', createdAt: new Date('2026-09-03'), user: { firstName: 'Baraka', lastName: 'Kip' } },
      ],
      checkIns: [], report: null, reportRounds: [], dependencies: [], reportActivations: [],
    };
    const prisma: any = {
      ground: { findMany: jest.fn().mockResolvedValue([g]) },
      groundParticipant: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
    };
    const reports = { theReportAsItWasShared: jest.fn() };
    const svc = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => reports } as any);
    return svc.list('org1', userId, `${userId}@x.test`, role).then((rows: any[]) => rows[0]);
  }

  it('Wanjiru, who leads it, gets her brief', async () => {
    expect((await listAs(WANJIRU, 'MEMBER', TOLD_AISHA)).brief).toBe(PUT_TOGETHER);
  });
  it('Aisha, the person it is about, gets the version everyone reads, and none of the lead’s answers', async () => {
    const row = await listAs(AISHA, 'MEMBER', TOLD_AISHA);
    expect(row.brief).toBe(TOLD_AISHA);
    expect(JSON.stringify(row)).not.toContain('often late with stock counts');
    expect(JSON.stringify(row)).not.toContain('Decide whether to confirm');
  });
  /* Changed with decision 75, item 13: where that version is missing, nothing of the brief, not even its situation. */
  it('and where that version is missing, nothing of the brief, never the answers', async () => {
    const row = await listAs(AISHA, 'MEMBER', null);
    expect(row.brief).toBeNull();
    expect(JSON.stringify(row)).not.toContain('often late with stock counts');
  });
  it('Baraka, another participant, gets the same', async () => {
    const row = await listAs('u-baraka', 'MEMBER', null);
    expect(JSON.stringify(row)).not.toContain('often late with stock counts');
  });
  it('an admin, who runs it by the list’s rule, gets the brief as the check-in’s own read gives it him', async () => {
    expect((await listAs(OTIENO, 'ADMIN', TOLD_AISHA)).brief).toBe(PUT_TOGETHER);
  });
  it('and the check-in’s own read never gives Aisha the answers either, with or without the short version', async () => {
    for (const told of [TOLD_AISHA, null]) {
      const got = await getAs(AISHA, { brief: PUT_TOGETHER, toldToParticipants: told });
      expect(JSON.stringify(got)).not.toContain('often late with stock counts');
      expect(JSON.stringify(got)).not.toContain('Decide whether to confirm');
    }
  });
});
