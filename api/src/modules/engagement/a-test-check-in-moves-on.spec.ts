import { sendTheTestCheckInMessages, theTestWords, isATestCheckIn } from './a-test-check-in-moves-on';
import { ENGAGEMENT_MOMENT_KEY as RELEASE_MOMENT_KEY } from './the-engagement-release-moment';
import { whatThisMailIs } from '../email/nothing-goes-out-that-was-turned-off';

/**
 * A TEST CHECK-IN MOVES TOWARD ONE SMALL REAL ONE (decision 109 item 8), AS WAIRIMU READS IT.
 *
 * Wairimu made "Sales team, Q4" and took part alone; a week later she is sent one email that starts from what she tried. Nobody is written to
 * about a check-in somebody else has answered, one made before the release, one that is not yet a week old, or one she has already been sent for.
 */
const NOW = new Date('2026-10-20T09:00:00Z');
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const RELEASE = new Date('2026-10-01T00:00:00Z');

function world(grounds: any[], tookPart: Record<string, { userId: string }[]>, alreadySent = false, addedOthers = 0) {
  const sent: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: async () => ({ value: { at: RELEASE.toISOString() } }), create: async () => ({}) },
    ground: { findMany: async () => grounds },
    checkIn: { findMany: async ({ where }: any) => (tookPart[where.groundId] ?? []).map((p, i) => ({ participantId: `p${i}`, participant: { userId: p.userId, managingOnly: false, user: { awaitingOrgApproval: false } } })) },
    groundParticipant: { count: jest.fn(async () => addedOthers) },
    user: { findUnique: async () => ({ email: 'wairimu@baridi.test', deletedAt: null }) },
    notification: { findFirst: async () => (alreadySent ? { id: 'n1' } : null) },
  };
  const email = { sendTestCheckInMovesOn: jest.fn(async (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => { sent.push({ to, subject, lines, linkLabel, linkUrl }); }) };
  return { run: () => sendTheTestCheckInMessages({ prisma, email, frontendUrl: 'https://app.test/' }, NOW), sent };
}
const g = (over: any = {}) => ({ id: 'g1', label: 'Sales team, Q4', scenario: 'REALIGN_TEAM', startedFrom: null, createdAt: day(8), initiatorId: 'u-w', ...over });
const alone = { g1: [{ userId: 'u-w' }] };

describe('what Wairimu reads a week after trying it alone', () => {
  it('for a sales check-in: her own words and one small real step', async () => {
    const w = world([g()], alone);
    expect(await w.run()).toEqual({ tried: 1 });
    expect(w.sent).toEqual([{
      to: 'wairimu@baridi.test',
      subject: 'Try this with your real sales team',
      lines: [
        'You tried "Sales team, Q4" on your own, so you have seen how Groundwork works.',
        'Add 3 to 5 people around one live sales target. Groundwork will privately check whether everyone sees the target, opportunities and blockers the same way.',
      ],
      linkLabel: 'Start with your real sales team',
      linkUrl: 'https://app.test/start',
    }]);
    expect(JSON.stringify(w.sent)).not.toMatch(/organisation|roll|rollout|feature/i);
  });

  it('for a project, a new hire, and anything else, the same shape in its own kind', () => {
    expect(theTestWords({ label: 'Kenya launch', scenario: 'NEW_PROJECT' }).subject).toBe('Try it on one live project');
    expect(theTestWords({ label: 'Femi, first 30 days', scenario: 'NEW_HIRE' }).subject).toBe('Try it with one real new hire');
    expect(theTestWords({ label: 'Our priorities', scenario: 'REALIGN_TEAM' }).lines[1]).toBe('Choose one real situation and add 3 to 5 people involved. Groundwork will privately check whether everyone sees it the same way.');
  });

  it('the anchor trial is a test after three days, not a week', async () => {
    expect(await world([g({ startedFrom: 'anchor', createdAt: day(4) })], alone).run()).toEqual({ tried: 1 });
    expect(await world([g({ createdAt: day(4) })], alone).run()).toEqual({ tried: 0 });
  });
});

describe('who is not written to', () => {
  it('a check-in somebody was added to, who never answered, is a real one waiting and not a test', async () => {
    expect(await world([g()], alone, false, 1).run()).toEqual({ tried: 0 });
  });
  it('a check-in somebody else took part in is real, not a test', async () => {
    expect(await world([g()], { g1: [{ userId: 'u-w' }, { userId: 'u-omar' }] }).run()).toEqual({ tried: 0 });
  });
  it('a check-in nobody has taken part in is not a test either (that is a lead who has not started)', async () => {
    expect(await world([g()], { g1: [] }).run()).toEqual({ tried: 0 });
  });
  it('a lead who has already been sent it is not sent it again', async () => {
    expect(await world([g()], alone, true).run()).toEqual({ tried: 0 });
  });
  it('one email for a lead who has two test check-ins', async () => {
    const w = world([g(), g({ id: 'g2', label: 'Other' })], { g1: [{ userId: 'u-w' }], g2: [{ userId: 'u-w' }] });
    expect(await w.run()).toEqual({ tried: 1 });
  });
  it('the query leaves out check-ins made before the release', async () => {
    const find = jest.fn(async () => []);
    const prisma: any = { platformSetting: { findUnique: async () => ({ value: { at: RELEASE.toISOString() } }) }, ground: { findMany: find } };
    await sendTheTestCheckInMessages({ prisma, email: { sendTestCheckInMovesOn: jest.fn() }, frontendUrl: '' }, NOW);
    expect((find.mock.calls[0] as any)[0].where.createdAt.gte).toEqual(RELEASE);
  });
  it('and the pure rule agrees: too young is not a test', () => {
    expect(isATestCheckIn({ createdAt: day(6) }, [{ participantId: 'p', userId: 'u-w' }], 'u-w', NOW)).toBe(false);
  });
});

describe('it is a mail we decided to send', () => {
  it('so the stop link stops it', () => {
    expect(whatThisMailIs('sendTestCheckInMovesOn')).toBe('we decided to send it');
  });
});
