import { EntryService } from './entry.service';
import { RECOMMENDED_CADENCE, DEFAULT_TIMELINE_DAYS } from '../grounds/grounds.service';
import { totalSessionsFor } from '../grounds/session-count';
import { withoutACannotApprove } from '../conversation/a-request-offered-in-the-check-in';
import { anAnswerToTheIdeaOffer } from '../conversation/ideas-from-the-team';

/**
 * THE ANCHOR'S LEAD AND ITS MONTH (known issues B11 and B12; requests 167 and 168), AS THEY ARE SAVED AND READ.
 * Only with the anchor switch on. Her set-up conversation is her part: it is saved done, as a set-up and not a session, she is marked as managing so no
 * later session is made for her, the month is weekly and ends in a month, and the idea offer's own yes is never read as an answer.
 */
function makeService(switchOn: boolean) {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => ({ role: 'ADMIN', email: 'rehema@sokoni.test' })) },
    organization: { findUnique: jest.fn(async () => ({ whoMayOpenCheckIns: 'NAMED_LEADS', checkInsNeedApproval: true })), update: jest.fn(async () => ({})) },
    platformSetting: { findUnique: jest.fn(async () => (switchOn ? { value: { on: true } } : null)) },
    entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]), findFirst: jest.fn(async () => ({ id: 'p1' })), update: jest.fn(async () => ({})) },
    roundCompletion: { create: jest.fn(async (a: any) => a.data) },
    checkIn: { count: jest.fn(async () => 1), findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
    conversationTurn: { createMany: jest.fn(async () => ({ count: 0 })) },
    leadContextNote: { create: jest.fn(async () => ({})) },
    ground: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ joinToken: 'jt' })) },
  };
  const grounds: any = { create: jest.fn(async () => ({ id: 'g-self', joinToken: 'jt' })), createForLead: jest.fn(), addParticipant: jest.fn(async () => ({})) };
  const conversation: any = { extractRecordEntries: jest.fn(async () => undefined), extractExpectations: jest.fn(async () => undefined), ensureNextSession: jest.fn(async () => undefined), buildSoloArtifact: jest.fn(async () => undefined) };
  const service = new EntryService({} as any, prisma, grounds, {} as any, {} as any, conversation, { emit: jest.fn() } as any);
  return { service, prisma, grounds };
}
const save = (service: EntryService, scenario: string) =>
  service.commit('org1', 'user1', { groundLabel: 'Help my team understand', scenario, cadence: 'FORTNIGHTLY', cadenceChosen: true, runsUntilEnded: true, history: [{ role: 'user', content: 'hi' }] as any, report: null, contributors: [] } as any);

describe('the lead who sets the anchor up', () => {
  it('has her set-up saved as done and as a set-up, never as a first check-in still to start', async () => {
    const { service, prisma } = makeService(true);
    await save(service, 'HELP_TEAM_UNDERSTAND');
    const done = prisma.checkIn.update.mock.calls.map((c: any[]) => c[0]).find((a: any) => a.data.status === 'COMPLETED');
    expect(done).toMatchObject({ where: { id: 'ci1' }, data: { status: 'COMPLETED', isSetup: true } });
  });

  it('is marked as managing, so no later session is made for her, and the month is weekly with an end', async () => {
    const { service, grounds } = makeService(true);
    await save(service, 'HELP_TEAM_UNDERSTAND');
    const made = grounds.create.mock.calls[0][2];
    expect(made.managingOnly).toBe(true);
    expect(made.cadence).toBe('WEEKLY');
    expect(made.runsUntilEnded).toBeUndefined();
    const days = (new Date(made.endsAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31);
  });

  it('changes nothing for any other check-in, or with the switch off', async () => {
    for (const [on, scenario] of [[false, 'HELP_TEAM_UNDERSTAND'], [true, 'NEW_PROJECT']] as const) {
      const { service, prisma, grounds } = makeService(on);
      await save(service, scenario);
      expect(prisma.checkIn.update.mock.calls.filter((c: any[]) => c[0].data.status === 'COMPLETED')).toEqual([]);
      expect(grounds.create.mock.calls[0][2].managingOnly).toBeUndefined();
      expect(grounds.create.mock.calls[0][2].cadence).toBe('FORTNIGHTLY');
    }
  });
});

describe('the anchor month, when nobody chose', () => {
  it('is weekly for thirty days, which is four sessions and not twelve', () => {
    expect(RECOMMENDED_CADENCE.HELP_TEAM_UNDERSTAND).toBe('WEEKLY');
    expect(DEFAULT_TIMELINE_DAYS.HELP_TEAM_UNDERSTAND).toBe(30);
    expect(totalSessionsFor(DEFAULT_TIMELINE_DAYS.HELP_TEAM_UNDERSTAND, RECOMMENDED_CADENCE.HELP_TEAM_UNDERSTAND as any)).toBe(4);
  });
});

describe('what a member reads when she asks about time off, with leave on', () => {
  it('never reads that Groundwork cannot help with it, in either wording', () => {
    for (const refusal of ["I can't directly help with time off requests.", "I cannot help with leave requests myself.", "We are not able to assist with annual leave."]) {
      const r = withoutACannotApprove(`${refusal} How is the Naivas order going?`);
      expect(r.text).toBe('How is the Naivas order going?');
      expect(r.cut).toHaveLength(1);
    }
  });
  it('keeps a sentence that only mentions leave', () => {
    expect(withoutACannotApprove('Thanks for telling me you are on leave on Friday.').text).toBe('Thanks for telling me you are on leave on Friday.');
  });
});

describe('the idea offer\'s own answer', () => {
  it('is only the button\'s yes or no, never an answer that happens to start with yes', () => {
    expect(anAnswerToTheIdeaOffer('Yes, capture it')).toBe(true);
    expect(anAnswerToTheIdeaOffer('Not now')).toBe(true);
    expect(anAnswerToTheIdeaOffer('Yes, I sent the deck to Naivas')).toBe(false);
  });
});
