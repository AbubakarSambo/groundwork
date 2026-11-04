/**
 * THE REPORT WAITS FOR THE CONVERSATION'S ASSESSMENT (one source, 1 November 2026). A check-in's new promises and waits are
 * read from its assessment after the completion. The report used to be written on the completion itself, so it raced them and
 * could miss them. It is now written on ASSESSMENT_READY, which is said only once the promises and waits are written.
 *
 * Proved end to end with the real ConversationService.assessAndThenRead and the real ReportsListener, joined by an emitter: the
 * report built when the listener runs includes this check-in's new promise and new wait. The release and the notices are as before.
 */
import { EventEmitter } from 'events';
import { ConversationService } from '../conversation/conversation.service';
import { ReportsListener } from './reports.listener';
import { GroundworkEvents } from '../../common/events';

function aWorld() {
  const commitments: any[] = [];
  const dependencies: any[] = [];
  const seenByTheReport: { promises: string[]; waits: string[] }[] = [];
  const bus = new EventEmitter();
  const turns = [
    { id: 't0', role: 'AI', content: 'What is next on Westgate?', createdAt: new Date('2026-11-02T08:00:00Z'), recordDraft: null },
    { id: 't1', role: 'PERSON', content: 'I will send Westgate the quote by Friday. I am waiting on Grace for the price list.', createdAt: new Date('2026-11-02T08:01:00Z'), recordDraft: null },
  ];
  let column: any = null;
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async ({ select }: any) => ({
        id: 'ci-2', groundId: 'g', participantId: 'p-amani', sessionNumber: 2, isSetup: false, startedAt: new Date('2026-11-02T08:00:00Z'), completedAt: new Date('2026-11-02T08:05:00Z'),
        whatWeHave: null, sessionReport: column, turns: select?.turns?.where ? turns.filter((t) => t.role === 'PERSON') : turns,
        participant: { partyType: 'PARTICIPANT', user: { firstName: 'Amani', lastName: 'Wekesa' } }, ground: { label: 'Sales check-in' },
      })),
      findMany: jest.fn(async () => []),
      update: jest.fn(async ({ data }: any) => { if (data.sessionReport) column = data.sessionReport; return {}; }),
    },
    conversationTurn: { findMany: jest.fn(async () => turns) },
    ground: { findUnique: jest.fn(async () => ({ mode: 'SHARED', scenario: 'OKR_ALIGNMENT', organizationId: 'org', participants: [{ id: 'p-amani', email: 'a@x.test', user: { firstName: 'Amani', lastName: 'Wekesa' } }, { id: 'p-grace', email: 'g@x.test', user: { firstName: 'Grace', lastName: 'Mwangi' } }] })), findMany: jest.fn(async () => []) },
    organization: { findUnique: jest.fn(async () => ({})) },
    groundObjective: { findMany: jest.fn(async () => []) },
    groundParticipant: { findMany: jest.fn(async () => []) },
    groundCommitment: {
      findMany: jest.fn(async ({ where }: any) => (where?.status === 'UNKNOWN' && where?.createdAt ? [] : [...commitments])),
      create: jest.fn(async ({ data }: any) => { commitments.push(data); return { id: `c${commitments.length}` }; }),
      update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({ count: 0 })),
    },
    groundDependency: {
      findMany: jest.fn(async () => [...dependencies]),
      create: jest.fn(async ({ data }: any) => { dependencies.push(data); return { id: `d${dependencies.length}`, ...data }; }),
      update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({ count: 0 })),
    },
    blockerTrace: { deleteMany: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
    recordEntry: { count: jest.fn(async () => 1), findMany: jest.fn(async () => []) },
    report: { findUnique: jest.fn(async () => null) },
  };
  const answer = {
    summary: 'Amani will send the quote and is waiting on Grace.',
    promises: [{ words: 'I will send Westgate the quote by Friday', from: [1], byThePerson: true, action: 'I will send Westgate the quote by Friday', when: 'by Friday' }],
    blockers: [{ words: 'I am waiting on Grace for the price list', from: [1], what: 'the price list', onName: 'Grace', status: 'WAITING', namedTheThing: true }],
    nothingToRecord: [],
  };
  const anthropic: any = { extract: jest.fn(async (_s: string, _h: any, tool: any) => (tool?.name === 'emit_the_assessment' ? answer : null)) };
  const svc: any = Object.create(ConversationService.prototype);
  Object.assign(svc, {
    prisma, anthropic, events: { emit: (e: string, p: unknown) => bus.emit(e, p) },
    logger: { log: () => undefined, warn: () => undefined, error: () => undefined },
    prompts: { getActive: async () => { throw new Error('none'); } },
  });
  /* The report as it is built: here, what it reads of promises and waits at that moment. */
  const synthesize = jest.fn(async () => { seenByTheReport.push({ promises: commitments.map((c) => c.text), waits: dependencies.map((d) => d.what) }); return {}; });
  const listener: any = new ReportsListener(prisma, { isSessionReadyForReport: jest.fn(async () => false) } as any, { synthesize, tellThemTheReportIsReady: jest.fn() } as any, {} as any, { get: () => 'http://x' } as any);
  listener.warmTheReads = jest.fn(async () => undefined);
  listener.notifyAdminOnCheckIn = jest.fn(async () => undefined);
  listener.notifyOnLateCorrection = jest.fn(async () => undefined);
  const done = new Promise<void>((resolve) => bus.on(GroundworkEvents.ASSESSMENT_READY, async (e) => { await listener.onTheAssessmentReady(e); resolve(); }));
  return { svc, listener, synthesize, seenByTheReport, done };
}

describe('a check-in\'s report includes that check-in\'s new promise and wait', () => {
  it('is written once the assessment and what was read from it are in', async () => {
    const w = aWorld();
    await w.svc.assessAndThenRead({ id: 'ci-2', participantId: 'p-amani', groundId: 'g', sessionNumber: 2 }, { howItEnded: 'finished by the person', closedAt: new Date() });
    await w.done;
    expect(w.synthesize).toHaveBeenCalledTimes(1);
    expect(w.seenByTheReport[0].promises).toEqual(['I will send Westgate the quote by Friday']);
    expect(w.seenByTheReport[0].waits).toEqual(['the price list']);
  });

  it('the completion itself tells people as before and writes no report; a repair writes it at once', async () => {
    const w = aWorld();
    await w.listener.onCheckInCompleted({ checkInId: 'ci-2', groundId: 'g', participantId: 'p-amani', sessionNumber: 2 });
    expect(w.listener.notifyAdminOnCheckIn).toHaveBeenCalledTimes(1);
    expect(w.listener.notifyOnLateCorrection).toHaveBeenCalledTimes(1);
    expect(w.synthesize).not.toHaveBeenCalled();
    await w.listener.onCheckInCompleted({ checkInId: 'ci-2', groundId: 'g', participantId: 'p-amani', sessionNumber: 2, source: 'repair' });
    expect(w.synthesize).toHaveBeenCalledTimes(1);
    expect(w.listener.notifyAdminOnCheckIn).toHaveBeenCalledTimes(1);
  });

  it('a decline is not an account, and still writes no report', async () => {
    const w = aWorld();
    await w.listener.onTheAssessmentReady({ checkInId: 'ci-2', groundId: 'g', participantId: 'p-amani', sessionNumber: 2, howItEnded: 'declined' });
    expect(w.synthesize).not.toHaveBeenCalled();
  });
});
