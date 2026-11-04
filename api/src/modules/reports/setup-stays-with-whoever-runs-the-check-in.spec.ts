import { EntryService } from '../entry/entry.service';
import { makeService, person, entry } from './__fixtures__/a-cohort-for-the-session-report';
import { theLinesAboutAColleaguesTargetLeftOut } from './their-words-about-a-target-follow-the-setting';
import { wasCopiedInOneGo } from '../../../scripts/setup-words-copied-into-the-leads-first-check-in';

/**
 * SETUP STAYS PRIVATE TO WHOEVER RUNS THE CHECK-IN, AND A PERSON'S WORDS ABOUT THEIR TARGET FOLLOW THE TARGET SETTING
 * (Hafsah, 4 November 2026).
 *
 * Proved first on staging's own code (237a36837): Amina saved setup saying "I do not know what Baraka is working on...", the save
 * copied it onto her session 1 and read record lines from it, and Baraka was served that sentence under her name in the session
 * report, and her target in her own words in "What success looks like". These read what each person is actually served.
 */
const PRIVATE = 'I do not know what Baraka is working on. That is what I want to find out from these check-ins.';
const TARGET = 'Success is 40 shops signed by the end of December, ten each.';
const BARAKAS_TARGET = 'Success for me is ten shops signed by December.';
const SETUP = [
  { role: 'assistant', content: 'What is this check-in for?' },
  { role: 'user', content: `A weekly check-in for the sales team. ${PRIVATE}` },
  { role: 'assistant', content: 'What does success look like?' },
  { role: 'user', content: TARGET },
  { role: 'assistant', content: 'Anything else I should know?' },
  { role: 'user', content: 'No, that is all.' },
];

async function commitTheSetup() {
  const turns: any[] = [];
  const prisma: any = {
    user: { findUnique: jest.fn(async () => ({ role: 'ADMIN', email: 'amina@test.com' })) },
    organization: { findUnique: jest.fn(async () => ({ whoMayOpenCheckIns: 'NAMED_LEADS', checkInsNeedApproval: false })), update: jest.fn(async () => ({})) },
    platformSetting: { findUnique: jest.fn(async () => null) },
    entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'lead' }]), findFirst: jest.fn(async () => ({ id: 'lead' })), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) },
    roundCompletion: { create: jest.fn(async (a: any) => a.data) },
    checkIn: { count: jest.fn(async () => 1), findFirst: jest.fn(async () => ({ id: 'c0' })), update: jest.fn(async () => ({})) },
    conversationTurn: { createMany: jest.fn(async (a: any) => { turns.push(...a.data); return { count: a.data.length }; }) },
    leadSetupWords: { upsert: jest.fn(async () => ({})) },
    leadContextNote: { create: jest.fn(async () => ({})) },
    ground: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ joinToken: 'jt' })) },
  };
  const grounds: any = { create: jest.fn(async () => ({ id: 'g1', joinToken: 'jt' })), createForLead: jest.fn(), addParticipant: jest.fn(async () => ({})) };
  const conversation: any = { extractRecordEntries: jest.fn(async () => undefined), extractExpectations: jest.fn(async () => undefined), ensureNextSession: jest.fn(async () => undefined), buildSoloArtifact: jest.fn(async () => undefined) };
  const service = new EntryService({} as any, prisma, grounds, {} as any, {} as any, conversation, { emit: jest.fn() } as any);
  await service.commit('org-1', 'user-lead', {
    groundLabel: 'Sales team', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', cadenceChosen: true, history: SETUP as any, report: null, contributors: [],
    leadsOwnWords: SETUP.filter((t) => t.role === 'user').map((t) => t.content),
  } as any);
  return { turns, prisma, conversation };
}

function aSalesTeam(whoSeesTargets: 'THEIR_OWN' | 'EVERYBODY') {
  return {
    id: 'g1', organizationId: 'org-1', initiatorId: 'user-lead', createdByUserId: null, scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', timelineDays: 90,
    brief: 'A weekly check-in for the sales team.', peersVisibleToEachOther: true, whoSeesTargets, objectives: [],
    report: { agreements: [], divergences: [], centralQuestion: null, releasedAt: new Date('2026-11-01T17:00:00Z'), releasedSessions: [1], findings: [], sharedAs: null },
    participants: [person('lead', 'user-lead', 'INITIATOR', 'Amina', 'Odhiambo', 0), person('baraka', 'user-baraka', 'PARTICIPANT', 'Baraka', 'Mwangi', 1)],
  };
}

/* The record as a database would answer the reads' own `where`: whose lines, and the lines about a colleague's target left out. */
function matches(row: any, where: any): boolean {
  if (!where) return true;
  if (where.OR && !where.OR.some((w: any) => matches(row, w))) return false;
  if (where.NOT && matches(row, where.NOT)) return false;
  const pid = where.participantId;
  if (pid?.in && !pid.in.includes(row.participantId)) return false;
  if (pid?.not && pid.not === row.participantId) return false;
  if (typeof pid === 'string' && pid !== row.participantId) return false;
  if (where.type && typeof where.type === 'string' && where.type !== row.type) return false;
  return true;
}

function readsOver(whoSeesTargets: 'THEIR_OWN' | 'EVERYBODY', lines: any[]) {
  const service: any = makeService(aSalesTeam(whoSeesTargets));
  service.prisma.recordEntry.findMany = jest.fn(async ({ where }: any) => lines.filter((l) => matches(l, where)));
  return {
    band: (user: string) => service.whereAgainstSuccess('g1', user, 'org-1').then((x: any) => JSON.stringify(x)),
    report: (user: string) => service.sessionReport('g1', 1, user, 'org-1').then((x: any) => JSON.stringify(x)),
  };
}

describe('saving setup', () => {
  it('closes her session 1 as answered, so she counts in it, and copies none of the conversation onto it', async () => {
    const { turns, prisma, conversation } = await commitTheSetup();
    expect(turns).toEqual([]);
    expect(conversation.extractRecordEntries).not.toHaveBeenCalled();
    expect(prisma.checkIn.update).toHaveBeenCalledWith({ where: { id: 'c0' }, data: { status: 'COMPLETED', completedAt: expect.any(Date), optional: true } });
  });

  it('keeps her own words for her (LeadSetupWords), and still reads her targets from the conversation, their proper place', async () => {
    const { prisma, conversation } = await commitTheSetup();
    expect(prisma.leadSetupWords.upsert.mock.calls[0][0].create.text).toContain(PRIVATE);
    expect(conversation.extractExpectations).toHaveBeenCalledWith('c0', 'lead', 'g1', SETUP);
  });
});

describe('what Baraka is served after Amina saves setup', () => {
  it('none of her setup words, in the session report (and so Ask and the phone report) or in What success looks like on My work', async () => {
    /* Her record after the save: nothing (above). Baraka's own line is there. */
    const lines = [entry('e3', 'PROGRESS', 'I signed two shops on Tuesday.', 'baraka')];
    const reads = readsOver('THEIR_OWN', lines);
    for (const served of [await reads.band('user-baraka'), await reads.report('user-baraka')]) {
      expect(served).not.toContain('I do not know what Baraka is working on');
      expect(served).not.toContain('40 shops');
    }
    expect(await reads.report('user-baraka')).toContain('I signed two shops on Tuesday.');
  });
});

describe("a person's words about their target follow the target setting", () => {
  const lines = [entry('e1', 'SUCCESS_DEFINITION', TARGET, 'lead'), entry('e4', 'SUCCESS_DEFINITION', BARAKAS_TARGET, 'baraka'), entry('e3', 'PROGRESS', 'I signed two shops on Tuesday.', 'baraka')];

  it('where each person sees only their own target, Baraka reads his own words about it and not Amina\'s', async () => {
    const reads = readsOver('THEIR_OWN', lines);
    for (const served of [await reads.band('user-baraka'), await reads.report('user-baraka')]) {
      expect(served).not.toContain('40 shops');
    }
    expect(await reads.band('user-baraka')).toContain(BARAKAS_TARGET);
  });

  it('the lead reads everybody\'s words about their target', async () => {
    const reads = readsOver('THEIR_OWN', lines);
    const band = await reads.band('user-lead');
    expect(band).toContain(TARGET);
    expect(band).toContain(BARAKAS_TARGET);
  });

  it('where everybody sees the targets, Baraka reads Amina\'s words about hers too', async () => {
    const reads = readsOver('EVERYBODY', lines);
    expect(await reads.band('user-baraka')).toContain(TARGET);
  });

  it('the rule the board reads its lines with is the same one', () => {
    expect(theLinesAboutAColleaguesTargetLeftOut('THEIR_OWN', { id: 'baraka' }, false)).toEqual({ NOT: { type: 'SUCCESS_DEFINITION', participantId: { not: 'baraka' } } });
    expect(theLinesAboutAColleaguesTargetLeftOut('THEIR_OWN', { id: 'lead' }, true)).toEqual({});
    expect(theLinesAboutAColleaguesTargetLeftOut('EVERYBODY', { id: 'baraka' }, false)).toEqual({});
  });
});

describe('the one-time script finds only what a save copied', () => {
  it('a copy is written in one go; a conversation she really had takes seconds a turn', () => {
    const t = new Date('2026-10-20T09:00:00Z').getTime();
    expect(wasCopiedInOneGo([t, t + 1, t + 2, t + 3])).toBe(true);
    expect(wasCopiedInOneGo([t, t, t])).toBe(true);
    expect(wasCopiedInOneGo([t, t + 8000, t + 21000])).toBe(false);
    expect(wasCopiedInOneGo([])).toBe(false);
  });
});
