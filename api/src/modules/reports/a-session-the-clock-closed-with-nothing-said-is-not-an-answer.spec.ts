import { howManyHaveAnswered } from './how-many-have-answered';
import { recordRoundCompletion } from '../grounds/round-completion';
import { ReportsService } from './reports.service';
import { theCountSaidRight, howManyAnsweredInWords } from './the-picture-in-plain-sentences';
import { atAGlance } from '../grounds/what-a-manager-needs-at-a-glance';

/**
 * A SESSION THE CLOCK CLOSED WHERE THE PERSON SAID NOTHING IS NOT AN ANSWER (final check, 9 October).
 *
 * The auto-close marks it COMPLETED so the round can close, and it was then counted as answered
 * everywhere: "All three people have answered", the picture for that person, the shared-picture
 * mail. These specs read what comes out: the count a person reads, who is mailed, and that the round
 * still closes for the people who did answer.
 */
const quiet = { status: 'COMPLETED', closedReason: 'auto_closed', turns: [] as any[] };
const said = { status: 'COMPLETED', closedReason: null, turns: [{ id: 't1' }] };
const closedAfterTalking = { status: 'COMPLETED', closedReason: 'auto_closed', turns: [{ id: 't1' }] };

describe('the count of who has answered', () => {
  const prismaWith = (rows: any[]) => ({
    ground: { findUnique: jest.fn(async () => ({ scenario: 'GOAL_ALIGNMENT' })) },
    groundParticipant: { findMany: jest.fn(async () => rows) },
  }) as any;

  it('reads two of three, not all three, and does not wait on the one the clock closed', async () => {
    const r = await howManyHaveAnswered(prismaWith([
      { id: 'a', userId: 'u1', checkIns: [said] },
      { id: 'b', userId: 'u2', checkIns: [closedAfterTalking] },
      { id: 'c', userId: 'u3', checkIns: [quiet] },
    ]), 'g', 1);
    expect(r.answered).toBe(2);
    expect(r.expected).toBe(3);
    expect(r.completed).toBe(2);
    expect(r.waitingOn).toEqual([]);
    expect(howManyAnsweredInWords(r.answered, r.expected)).toBe('Two of the three people have answered so far.');
    /* The model's own "All three people have answered." is replaced by that count. */
    expect(theCountSaidRight('All three people have answered. Two see it the same way.', r.answered, r.expected)).toBe('Two of the three people have answered so far. Two see it the same way.');
  });
});

describe('the count the board, the check-in list and Today read', () => {
  /* Found on test bed copy a, 9 October: Today read "In Sales team, Q4, 4 of 6 have checked in for the second check-in" with Zawadi, whom the clock
     closed on with nothing said, counted among the four. The glance counts from rows in hand, so it reads the close reason and the person's turns too. */
  it('reads three of six, not four, when the clock closed one session with nothing said', () => {
    const people = ['w', 'a', 'c', 'z', 'j', 'n'].map((id) => ({ id, userId: `u-${id}` }));
    const glance = atAGlance({
      roundsDone: 1, roundsPlanned: 12, people, sessionNumber: 2, scenario: 'GOAL_ALIGNMENT', dependencies: [],
      thisRound: [
        { participantId: 'w', ...said }, { participantId: 'a', ...said }, { participantId: 'c', ...said },
        { participantId: 'z', ...quiet }, { participantId: 'j', status: 'IN_PROGRESS' }, { participantId: 'n', status: 'NOT_STARTED' },
      ] as any,
    });
    expect(glance.progress.answeredThisRound).toBe(3);
    expect(glance.progress.ofPeople).toBe(6);
    /* Closed, so not waited on or chased either. */
    expect(glance.progress.waitingOn).toEqual(['j', 'n']);
  });
});

describe('the round', () => {
  const run = (checkIns: any[], completedCount: (where: any) => number) => {
    const events = { emit: jest.fn() } as any;
    const prisma = {
      groundParticipant: { findMany: jest.fn(async () => checkIns.map((c, i) => ({ id: `p${i}`, userId: `u${i}` }))) },
      checkIn: {
        findMany: jest.fn(async () => []),
        count: jest.fn(async ({ where }: any) => (where.status === 'COMPLETED' ? completedCount(where) : checkIns.length)),
      },
      roundCompletion: { create: jest.fn(async () => ({})) },
      groundObjective: { findMany: jest.fn(async () => []) },
      groundObjectiveSnapshot: { createMany: jest.fn() },
    } as any;
    return { prisma, events, done: recordRoundCompletion(prisma, events, 'g', 1) };
  };

  it('asks for an account that was not a quiet close, and still closes when the others have answered', async () => {
    const { prisma, done } = run([said, said, quiet], () => 2);
    expect(await done).toBe(true);
    const asked = prisma.checkIn.count.mock.calls.map((c: any) => c[0].where).find((w: any) => w.status === 'COMPLETED');
    expect(JSON.stringify(asked.AND)).toContain('auto_closed');
    expect(JSON.stringify(asked.AND)).toContain('PERSON');
  });

  it('does not close a round where the only ones who finished said nothing', async () => {
    const { done } = run([quiet, quiet], () => 0);
    expect(await done).toBe(false);
  });
});

describe('the shared picture mail', () => {
  it('is not sent to the person the clock closed on, and is sent to the others', async () => {
    const sent: string[] = [];
    const people = [
      { id: 'a', email: 'a@x.test', userId: 'u1', inviteToken: null, user: { passwordHash: 'h' } },
      { id: 'c', email: 'c@x.test', userId: 'u3', inviteToken: null, user: { passwordHash: 'h' } },
    ];
    const service: any = Object.create(ReportsService.prototype);
    service.prisma = {
      ground: { findUnique: jest.fn(async () => ({ id: 'g', label: 'Sales team', initiatorId: 'u1', scenario: 'GOAL_ALIGNMENT', participants: people })) },
      reportNotice: { findMany: jest.fn(async () => []), create: jest.fn(async () => ({})), deleteMany: jest.fn() },
      checkIn: { findMany: jest.fn(async ({ where }: any) => (where.closedReason === 'auto_closed' ? [{ participantId: 'c' }] : [])) },
    };
    service.config = { get: () => 'https://app.test' };
    service.email = { sendReportReady: jest.fn(async (to: string) => { sent.push(to); }) };
    service.logger = { log: jest.fn(), error: jest.fn() };
    service.theInsightFor = jest.fn(async () => null);
    service.theReportReadySubject = jest.fn(async () => undefined);
    const r = await service.tellThemTheReportIsReady('g', 1);
    expect(sent).toEqual(['a@x.test']);
    expect(r.attempted).toBe(1);
  });
});
