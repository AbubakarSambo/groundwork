import { theNudgeLineFor, theirPromiseToFollowUp } from './a-follow-up-from-their-own-record';
import { ENGAGEMENT_MOMENT_KEY as RELEASE_MOMENT_KEY } from './the-engagement-release-moment';

/**
 * VALUE FIRST, THEN ASK, FOR A PERSON WITH A WAIT BUT NO PROMISE (engagement spec sections 17 and 18; section 36, journey 8), AS JAMES READS IT.
 *
 * James answered a check-in in "Kenya launch" and said he was waiting for the implementation date. He made no promise of his own. When he ignores the next
 * session he is not sent the same generic chase: the reminder says what he said he was waiting for, and asks whether it moved. Only his own words, only
 * while the wait is open, and only for a session that began after the release.
 */
const RELEASE = new Date('2026-10-01T00:00:00Z');
const BEFORE = new Date('2026-09-20T00:00:00Z');
const AFTER = new Date('2026-10-05T00:00:00Z');
const ground = { id: 'g1', startedFrom: null };

function world(waits: any[], promises: any[] = []) {
  return {
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key === RELEASE_MOMENT_KEY ? { value: { at: RELEASE.toISOString() } } : null)) },
    groundCommitment: { findMany: jest.fn(async () => promises) },
    groundDependency: { findMany: jest.fn(async () => waits) },
  } as any;
}
const WAIT = { what: 'the implementation date.', fromParticipantId: 'p-james' };

describe('James, who answered and said he was waiting', () => {
  it('is reminded of his own wait, and asked whether it moved', async () => {
    expect(await theNudgeLineFor(world([WAIT]), ground, AFTER, 'p-james')).toBe('You said you were waiting for "the implementation date". I\'d love to hear whether that has moved.');
  });
  it('asks only for waits that are open, and his own', async () => {
    const w = world([WAIT]);
    await theNudgeLineFor(w, ground, AFTER, 'p-james');
    const where = w.groundDependency.findMany.mock.calls[0][0].where;
    expect(where).toEqual({ groundId: 'g1', fromParticipantId: 'p-james', status: { in: ['WAITING', 'BLOCKING'] }, clearedAt: null });
    expect(await theNudgeLineFor(world([{ what: 'the budget.', fromParticipantId: 'p-lucy' }]), ground, AFTER, 'p-james')).toBeNull();
    expect(await theNudgeLineFor(world([{ what: '  ', fromParticipantId: 'p-james' }]), ground, AFTER, 'p-james')).toBeNull();
  });
  it('his own promise comes first, as before', async () => {
    const line = await theNudgeLineFor(world([WAIT], [{ text: 'I will send the plan', explicit: true, participantId: 'p-james', source: 'CHECK_IN', status: 'UNKNOWN' }]), ground, AFTER, 'p-james');
    expect(line).toBe("You mentioned you would send the plan. I'd love to hear how it went.");
  });
  it('is not on WhatsApp, whose template says "you said you would", which a wait is not', async () => {
    expect(await theirPromiseToFollowUp(world([WAIT]), ground, AFTER, 'p-james')).toBeNull();
  });
  it('is not said for a session that began before the release (an existing client\'s)', async () => {
    expect(await theNudgeLineFor(world([WAIT]), ground, BEFORE, 'p-james')).toBeNull();
    expect(await theNudgeLineFor(world([WAIT]), ground, null, 'p-james')).toBeNull();
  });
  it('and a person with nothing of their own gets the ordinary reminder', async () => {
    expect(await theNudgeLineFor(world([]), ground, AFTER, 'p-james')).toBeNull();
  });
});

/**
 * VALUE FIRST, THEN ASK, WHEN THE WAIT HAS CLEARED (engagement spec section 17), AS JAMES READS IT.
 * He said he was waiting for the implementation date, and answered. Since then it was cleared. He ignores the next session, and is told so before he is asked.
 */
describe('James, whose wait has cleared since he last answered', () => {
  const LAST = new Date('2026-10-06T10:00:00Z');
  function cleared(rows: any[], answered: Date | null = LAST) {
    const w = world([]);
    w.checkIn = { findFirst: jest.fn(async () => (answered ? { completedAt: answered } : null)) };
    w.groundDependency = { findMany: jest.fn(async ({ where }: any) => (where.status === 'CLEARED' ? rows : [])) };
    return w;
  }
  it('is told it has cleared, and that his check-in is open when he is ready', async () => {
    const line = await theNudgeLineFor(cleared([{ what: 'the implementation date.', fromParticipantId: 'p-james' }]), ground, AFTER, 'p-james');
    expect(line).toBe('You said you were waiting for "the implementation date". That has now been cleared. Your check-in is open when you are ready to tell me what changed.');
  });
  it('asks only for his own, cleared after his last answer', async () => {
    const w = cleared([{ what: 'the implementation date.', fromParticipantId: 'p-james' }]);
    await theNudgeLineFor(w, ground, AFTER, 'p-james');
    expect(w.groundDependency.findMany.mock.calls[0][0].where).toEqual({ groundId: 'g1', fromParticipantId: 'p-james', status: 'CLEARED', clearedAt: { gt: LAST } });
    expect(await theNudgeLineFor(cleared([{ what: 'the budget.', fromParticipantId: 'p-lucy' }]), ground, AFTER, 'p-james')).toBeNull();
  });
  it('his own promise still comes first, and a person who has not answered yet is told nothing of the kind', async () => {
    const withPromise = cleared([{ what: 'the implementation date.', fromParticipantId: 'p-james' }]);
    withPromise.groundCommitment = { findMany: jest.fn(async () => [{ text: 'I will send the plan', explicit: true, participantId: 'p-james', source: 'CHECK_IN', status: 'UNKNOWN' }]) };
    expect(await theNudgeLineFor(withPromise, ground, AFTER, 'p-james')).toBe("You mentioned you would send the plan. I'd love to hear how it went.");
    expect(await theNudgeLineFor(cleared([{ what: 'the implementation date.', fromParticipantId: 'p-james' }], null), ground, AFTER, 'p-james')).toBeNull();
  });
  it('and not for a session that began before the release', async () => {
    expect(await theNudgeLineFor(cleared([{ what: 'the implementation date.', fromParticipantId: 'p-james' }]), ground, BEFORE, 'p-james')).toBeNull();
  });
});
