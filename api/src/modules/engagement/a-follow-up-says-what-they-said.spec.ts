import { theNudgeLineFor } from './a-follow-up-from-their-own-record';
import { RemindService } from '../conversation/remind.service';
import { ENGAGEMENT_MOMENT_KEY as RELEASE_MOMENT_KEY } from './the-engagement-release-moment';

/**
 * THE FOLLOW-UP SAYS WHAT THE PERSON SAID, AND ONLY FOR A SESSION THAT BEGAN AFTER THE RELEASE (review of 2e2af68e).
 *
 * "You mentioned you would will review..." was the defect: a promise that already began with "will" was said back after "would". And the lead's
 * Remind button judged the date by the check-in's own creation, not the person's session, so it could follow up a session that began before the release.
 */
const RELEASE = new Date('2026-10-01T00:00:00Z');
const AFTER = new Date('2026-10-05T00:00:00Z');
const BEFORE = new Date('2026-09-20T00:00:00Z');
const promise = (text: string) => ({ text, explicit: true, participantId: 'p-v', source: 'CHECK_IN', status: 'UNKNOWN' });
const prismaWith = (text: string) => ({
  platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key === RELEASE_MOMENT_KEY ? { value: { at: RELEASE.toISOString() } } : null)) },
  groundCommitment: { findMany: jest.fn(async () => [promise(text)]) },
});

describe('what Vera reads, whichever way she wrote her promise', () => {
  it.each([
    ['I will review the Q4 pipeline with James', "You mentioned you would review the Q4 pipeline with James. I'd love to hear how it went."],
    ['will review the Q4 pipeline with James', "You mentioned you would review the Q4 pipeline with James. I'd love to hear how it went."],
    ["I'll review the Q4 pipeline with James.", "You mentioned you would review the Q4 pipeline with James. I'd love to hear how it went."],
    ['going to review the Q4 pipeline with James', "You mentioned you would review the Q4 pipeline with James. I'd love to hear how it went."],
    ['review the Q4 pipeline with James', "You mentioned you would review the Q4 pipeline with James. I'd love to hear how it went."],
    ['send my manager the deck', "You mentioned you would send your manager the deck. I'd love to hear how it went."],
  ])('%s', async (said, line) => {
    expect(await theNudgeLineFor(prismaWith(said), { id: 'g', startedFrom: null }, AFTER, 'p-v')).toBe(line);
  });
  it('and never "would will"', async () => {
    const line = await theNudgeLineFor(prismaWith('I will review it'), { id: 'g', startedFrom: null }, AFTER, 'p-v');
    expect(line).not.toMatch(/would (will|\'ll|going)/);
  });
  it('a promise that is only the word "will" is not said at all', async () => {
    expect(await theNudgeLineFor(prismaWith('will'), { id: 'g', startedFrom: null }, AFTER, 'p-v')).toBeNull();
  });
});

describe('the lead pressing Remind', () => {
  function remind(sessionBegan: Date, groundMade: Date) {
    const lines: any[] = [];
    const base = prismaWith('I will review the Q4 pipeline with James');
    const prisma: any = {
      ...base,
      user: { findUnique: jest.fn(async () => ({ firstName: 'Ada' })) },
      checkIn: { findUnique: jest.fn(async () => ({ groundId: 'g1', sessionNumber: 1 })) },
      ground: { findUnique: jest.fn(async () => ({ id: 'g1', label: 'Sales team, Q4', createdAt: groundMade, startedFrom: null })) },
      groundParticipant: {
        findFirst: jest.fn(async () => ({ id: 'p-lead', groundId: 'g1', userId: 'lead-user' })),
        findMany: jest.fn(async () => [{ id: 'p-v', email: 'vera@x.test', userId: 'u-v', lastNudgedAt: null, managingOnly: false, user: { firstName: 'Vera', emailNotifications: true }, checkIns: [{ id: 'c1', status: 'NOT_STARTED', createdAt: sessionBegan }] }]),
        update: jest.fn(async () => ({})),
      },
    };
    const email: any = {
      sendNudgeFromAPress: jest.fn(async (...a: any[]) => { lines.push(a[5]); }),
      buildCheckInUrl: (id: string) => `https://app.test/checkin/${id}`,
    };
    const service = new RemindService(prisma, email, { tell: async () => [] } as any);
    return { run: () => service.sendReminder('ci1', 'lead-user'), lines };
  }
  it('follows up a session that began after the release', async () => {
    const r = remind(AFTER, AFTER);
    await r.run();
    expect(r.lines).toEqual(["You mentioned you would review the Q4 pipeline with James. I'd love to hear how it went."]);
  });
  it('does not, for a session that began before the release, even if the check-in itself was made after it', async () => {
    const r = remind(BEFORE, AFTER);
    await r.run();
    expect(r.lines).toEqual([null]);
  });
});
