import { YourBoardService } from './your-board.service';
import { theOwnWeekOf } from './your-board';
import { theirWeekInWords } from '../engagement/the-participants-week';

/**
 * A PROMISE THE RECORD SAYS IS DONE IS NOT LISTED AS OPEN, ON MERCY'S YOU BOARD OR IN HER WEEK (messages test, third run, item 4).
 *
 * Drop Access (test). On Monday 12 October Mercy said "As for the samples, I'll follow up with Joseph again." On Wednesday 14 October
 * she said "I called Joseph yesterday about the samples, and he said he'll have them ready by Thursday." Her "Your week" email on
 * Thursday 15 October 14:15 still said, under "Two things you said you would do are still open", "On Monday 12 October, in "Sales
 * team, Q4", you said "Follow up with Joseph again"". Read here as Mercy is served her board, and as her week is written from it.
 */
const ORG = 'org-drop';
const at = (s: string) => new Date(s);
const sales = {
  id: 'g-sales', label: 'Sales team, Q4', status: 'ACTIVE', organizationId: ORG, initiatorId: 'u-grace', closedAt: null, resolvedAt: null,
  participants: [{ id: 'p-grace', userId: 'u-grace' }, { id: 'p-mercy', userId: 'u-mercy' }, { id: 'p-joseph', userId: 'u-joseph' }],
  checkIns: [{ id: 'c-m2', participantId: 'p-mercy', sessionNumber: 2, status: 'COMPLETED', completedAt: at('2026-10-14T06:33:14Z'), availableFrom: at('2026-10-13T05:00:00Z'), isSetup: false }],
};
const NAMES: Record<string, [string, string]> = { 'p-grace': ['Grace', 'Achieng'], 'p-mercy': ['Mercy', 'Wairimu'], 'p-joseph': ['Joseph', 'Kariuki'] };

function mercysBoard(wednesday: string) {
  const prisma: any = {
    personObjective: { findMany: jest.fn(async () => []) },
    groundObjective: { findMany: jest.fn(async () => []) },
    groundCommitment: { findMany: jest.fn(async () => [
      { id: 'k-joseph', groundId: 'g-sales', participantId: 'p-mercy', text: 'Follow up with Joseph again', whenSaid: null, status: 'UNKNOWN', settledBy: null, settledAt: null, createdAt: at('2026-10-12T11:06:49.574Z') },
    ]) },
    coachingState: { findMany: jest.fn(async () => []) },
    person: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    todo: { findMany: jest.fn(async () => []) },
    groundDependency: { findMany: jest.fn(async () => []) },
    patternDetection: { findMany: jest.fn(async () => []), updateMany: jest.fn(async () => ({ count: 0 })) },
    recordEntry: { findMany: jest.fn(async () => []) },
    groundParticipant: { findMany: jest.fn(async (q: any) => (q?.where?.userId || q?.where?.heldForASeat !== undefined || !q?.select?.nameGiven ? [] : sales.participants.map((p) => ({ id: p.id, groundId: 'g-sales', nameGiven: null, user: { firstName: NAMES[p.id][0], lastName: NAMES[p.id][1] } })))) },
    checkIn: { findMany: jest.fn(async () => [{ id: 'c-m2', participantId: 'p-mercy', turns: [
      { role: 'AI', content: "You've recorded 25 units for Greenfield. What has been done about the samples for Joseph's since you said you'd follow up again?", createdAt: at('2026-10-14T06:31:09.285Z') },
      { role: 'PERSON', content: wednesday, createdAt: at('2026-10-14T06:31:10.118Z') },
    ] }]) },
  };
  const grounds: any = { list: jest.fn(async () => [sales]) };
  return new YourBoardService(prisma, grounds).forReader({ userId: 'u-mercy', email: 'mercy@dropaccess.test', organizationId: ORG, role: 'MEMBER' });
}

describe("Mercy's follow-up with Joseph, said done on Wednesday", () => {
  it('is kept on her board, and her week does not list it as open', async () => {
    const b = await mercysBoard("I actually have 25 units for Greenfield, bringing the target to 120, not 40. I called Joseph yesterday about the samples, and he said he'll have them ready by Thursday.");
    expect(b.saidYoudDo.map((s) => [s.text, s.stateSays])).toEqual([['Follow up with Joseph again', 'Kept']]);
    const own = theOwnWeekOf(b);
    expect(own.open).toEqual([]);
    const words = theirWeekInWords('Mercy', { kept: null, open: own.open.map((o) => o.text), waitingOn: [], waitingOnYou: [] });
    expect(JSON.stringify(words ?? '')).not.toContain('Follow up with Joseph again');
  });
  it('but "I called Joseph about the samples but he hasn\'t answered." leaves it open, and her week says so', async () => {
    const b = await mercysBoard("I called Joseph about the samples but he hasn't answered.");
    const own = theOwnWeekOf(b);
    expect(own.open.map((o) => o.text)).toEqual(['Follow up with Joseph again']);
    const words = theirWeekInWords('Mercy', { kept: null, open: own.open.map((o) => o.text), waitingOn: [], waitingOnYou: [] });
    expect(words?.lines.join(' ')).toContain('One thing you said you would do is still open');
  });
});
