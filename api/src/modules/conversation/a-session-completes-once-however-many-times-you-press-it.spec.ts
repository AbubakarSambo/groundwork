import { readFileSync } from 'fs';
import { join } from 'path';
import { CheckInStatus, GroundStatus } from '@prisma/client';
import { GroundworkEvents } from '../../common';
import { ConversationService, CLOSED_BY_THE_CLOCK } from './conversation.service';

/**
 * A SESSION COMPLETES ONCE, HOWEVER MANY TIMES YOU PRESS IT.
 *
 * complete() checked "already complete?" with an in-memory read at the top and then did everything -
 * so two presses of the button, or a retry after a timeout, ran every extractor twice and emitted
 * CHECK_IN_COMPLETED twice, which built the report twice and queued the webhook twice. The status
 * write is the claim now: guarded in its `where`, and only the winner emits.
 *
 * And the clock finishes a session the same way a person does. The sweep used to write COMPLETED
 * itself and do nothing else, which left the person who walked away with an empty record and no
 * next session. Both callers reach one method; `by` changes only the reason recorded.
 */
const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the shape of finishing', () => {
  it('complete() ends by handing the session to finishTheSession as the person', () => {
    const at = CODE.indexOf('async complete(');
    const body = CODE.slice(at, CODE.indexOf('async closeByTheClock('));
    /* Since task 2.7 it also says whether to wait for the end card being built: yes, unless the door cannot wait. */
    expect(body).toMatch(/return this\.finishTheSession\(checkIn, 'the person', \{ waitForTheCard: how\.waitForTheCard !== false \}\);/);
    /* The gates stay on the person's path and nowhere else. */
    expect(body).toMatch(/canContinue: true/);
  });

  it('closeByTheClock() loads the session and hands it over as the clock, with no gates', () => {
    const at = CODE.indexOf('async closeByTheClock(');
    const body = CODE.slice(at, CODE.indexOf('private async finishTheSession('));
    /* The clock never waits for an end card (task 2.7). */
    expect(body).toMatch(/return this\.finishTheSession\(checkIn, 'the clock', \{ waitForTheCard: false \}\);/);
    expect(body).not.toMatch(/canContinue/);
  });

  it('the status write is guarded in its where, and it is the only COMPLETED write in the file', () => {
    const writes = [...CODE.matchAll(/status:\s*CheckInStatus\.COMPLETED/g)].filter((m) =>
      /\bdata:\s*\{/.test(CODE.slice(Math.max(0, m.index! - 200), m.index!)),
    );
    /* Three since one state for a session (29 October): itIsFinished, the moment it closes, from IN_PROGRESS or NOT_STARTED only; the
       record's stamp, once, where completedAt is still empty; and closeAsMissed for a session nobody opened. Each is a claim guarded in
       its where, so none can complete a session twice. */
    expect(writes).toHaveLength(3);
    const around = writes.map((w) => CODE.slice(w.index! - 200, w.index!));
    expect(around.some((a) => /updateMany\(\{ where: \{ id: checkInId, status: \{ in: \[CheckInStatus\.IN_PROGRESS, CheckInStatus\.NOT_STARTED\] \} \}/.test(a))).toBe(true);
    expect(around.some((a) => /updateMany\(\{\s*where: \{ id: checkIn\.id, completedAt: null \}/.test(a))).toBe(true);
    expect(around.some((a) => /updateMany\(\{\s*where: \{ id: checkInId, status: CheckInStatus\.NOT_STARTED, turns: \{ none: \{ role: TurnRole\.PERSON \} \} \}/.test(a))).toBe(true);
  });

  it('ISSUE 6 stands: the record is extracted before the write, and the event is emitted after it', () => {
    const at = CODE.indexOf('private async finishTheSession(');
    const body = CODE.slice(at, at + 9000);
    /* Since the end card (task 2.7) the record is written through writeTheRecordAtTheEnd: the card's lines, or a fresh read. */
    const extract = body.indexOf('writeTheRecordAtTheEnd(');
    const write = body.indexOf('checkIn.updateMany(');
    const emit = body.indexOf('GroundworkEvents.CHECK_IN_COMPLETED');
    expect(extract).toBeGreaterThan(0);
    expect(extract).toBeLessThan(write);
    expect(write).toBeLessThan(emit);
  });
});

describe('behaviourally', () => {
  /**
   * A check-in whose status the mock lets us flip: the first guarded write wins, the second finds
   * nothing to update. Every extractor is stubbed to a no-op so the test is about the claim, not the
   * model.
   */
  const service = () => {
    const row: any = { id: 'ci', groundId: 'g', participantId: 'p', sessionNumber: 1, status: CheckInStatus.IN_PROGRESS, isSelfCorrection: false, participant: { id: 'p', userId: 'me', user: {} } };
    const emitted: any[] = [];
    const prisma: any = {
      checkIn: {
        findUnique: jest.fn(async () => ({ ...row })),
        updateMany: jest.fn(async (args: any) => {
          if (args.where.status?.not === CheckInStatus.COMPLETED && row.status === CheckInStatus.COMPLETED) return { count: 0 };
          if (args.where.completedAt === null && row.completedAt) return { count: 0 };
          if (args.where.status?.in && !args.where.status.in.includes(row.status)) return { count: 0 };
          Object.assign(row, args.data);
          return { count: 1 };
        }),
      },
      conversationTurn: { findMany: jest.fn(async () => []) },
      ground: { findUnique: jest.fn(async () => ({ status: GroundStatus.ACTIVE, cadence: 'ONE_TIME', timelineDays: 30, endsAt: null })) },
      roundCompletion: { findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), create: jest.fn(async () => ({})) },
      groundParticipant: { findMany: jest.fn(async () => []) },
    };
    const svc: any = new ConversationService(prisma, {} as any, {} as any, {} as any, { emit: jest.fn((...a: any[]) => { emitted.push(a); return true; }) } as any, {} as any, {} as any, {} as any, { emit: jest.fn(async () => undefined) } as any, { get: () => undefined } as any);
    for (const m of ['scoreSessionSpecificity', 'writeTheRecordAtTheEnd', 'extractRecordEntries', 'anchorRecordToDocuments', 'extractDependencies', 'extractWorkMentions', 'extractExpectations', 'extractAlignment', 'extractWhatTheySayHappened', 'extractProgress', 'extractOperatingDifferences', 'extractObjection', 'reviseDetectedFunction', 'observeForCoaching', 'rememberStyle', 'buildSoloArtifact', 'ensureNextSession']) {
      svc[m] = jest.fn(async () => null);
    }
    const completions = () => emitted.filter((a) => a[0] === GroundworkEvents.CHECK_IN_COMPLETED);
    return { svc, prisma, row, completions };
  };

  it('two completions of one session emit CHECK_IN_COMPLETED once and schedule the next session once', async () => {
    const { svc, row, completions } = service();
    const first = await svc.finishTheSession({ ...row }, 'the person');
    const second = await svc.finishTheSession({ ...row }, 'the person');
    expect(first).toEqual({ status: 'completed', groundId: 'g' });
    expect(second).toEqual({ status: 'completed', groundId: 'g' });
    expect(completions()).toHaveLength(1);
    expect(svc.ensureNextSession).toHaveBeenCalledTimes(1);
  });

  it('the clock records that it was the clock, and says so in the event', async () => {
    const { svc, prisma, completions } = service();
    await svc.closeByTheClock('ci');
    expect(prisma.checkIn.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: CheckInStatus.COMPLETED, closedReason: CLOSED_BY_THE_CLOCK }) }));
    expect(completions()[0][1]).toMatchObject({ checkInId: 'ci', source: 'auto-close' });
    /* And it does what a person's completion does: the record, the artifact, the next session. */
    expect(svc.writeTheRecordAtTheEnd).toHaveBeenCalledTimes(1);
    expect(svc.ensureNextSession).toHaveBeenCalledTimes(1);
  });

  it("a person's completion leaves closedReason alone", async () => {
    const { svc, prisma, row } = service();
    await svc.finishTheSession({ ...row }, 'the person');
    const data = prisma.checkIn.updateMany.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('closedReason');
  });
});
