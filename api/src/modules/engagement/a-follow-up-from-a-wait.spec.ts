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
