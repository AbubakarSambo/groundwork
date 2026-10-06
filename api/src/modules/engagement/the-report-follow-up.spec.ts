import { sendTheReportFollowUps, theFollowUpWords } from './the-report-follow-up';
import { RELEASE_MOMENT_KEY } from '../grounds/the-release-moment';

/**
 * JOURNEY 6: THE LEAD WHO RECEIVED A REPORT AND DID NOT COME BACK (decision 109; spec sections 11 and 36), AS WAIRIMU READS IT.
 *
 * "Sales team, Q4"'s report went out on 12 October. A week on, with no next session opened, she is sent one message that says what has changed since
 * and what has not, and offers the check that asks the same people again. The dead activation reminder is not what sends it.
 */
const RELEASE = new Date('2026-10-01T00:00:00Z');
const WENT_OUT = new Date('2026-10-12T09:00:00Z');
const NOW = new Date('2026-10-20T10:00:00Z');

function world(opts: { counts?: any; nextSession?: boolean; told?: boolean; outcome?: 'sent' | 'held' | 'suppressed' } = {}) {
  const told = new Set<string>(opts.told ? ['engagement.once.report-follow-up:g1'] : []);
  const asked: any[] = [];
  const sent: any[] = [];
  const c = { done: 2, cleared: 1, waiting: 3, open: 4, ...(opts.counts ?? {}) };
  const prisma: any = {
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (where.key === RELEASE_MOMENT_KEY ? { value: { at: RELEASE.toISOString() } } : told.has(where.key) ? { key: where.key } : null)),
      create: jest.fn(async ({ data }: any) => { told.add(data.key); return data; }),
    },
    report: { findMany: jest.fn(async (a: any) => { asked.push(a.where); return [{ groundId: 'g1', releasedAt: WENT_OUT, ground: { label: 'Sales team, Q4', initiatorId: 'u-w', initiator: { email: 'wairimu@x.test', firstName: 'Wairimu', deletedAt: null, isActive: true } } }]; }) },
    checkIn: { findFirst: jest.fn(async () => (opts.nextSession ? { id: 'next' } : null)) },
    groundCommitment: { count: jest.fn(async ({ where }: any) => (where.status === 'DONE' ? c.done : c.open)) },
    groundDependency: { count: jest.fn(async ({ where }: any) => (where.status === 'CLEARED' ? c.cleared : c.waiting)) },
  };
  const email = { sendTheReportFollowUp: jest.fn(async (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => { sent.push({ to, subject, lines, linkLabel, linkUrl }); return opts.outcome ?? 'sent'; }) };
  return { run: () => sendTheReportFollowUps({ prisma, email, frontendUrl: 'https://app.test/' }, NOW), sent, asked, told };
}

describe('what Wairimu reads a week after the report', () => {
  it('what changed, what has not, and the offer', async () => {
    const w = world();
    expect(await w.run()).toEqual({ tried: 1 });
    expect(w.sent).toHaveLength(1);
    expect(w.sent[0].to).toBe('wairimu@x.test');
    expect(w.sent[0].subject).toBe('Since the report on "Sales team, Q4" went out, two things people said they would do were done and one handoff was cleared, and three handoffs are still waiting and four things people said they would do are still open');
    expect(w.sent[0].lines).toEqual([
      expect.stringMatching(/^Hello Wairimu\. The report for "Sales team, Q4" went out on .*12.*\.$/),
      'Since then, two things people said they would do were done and one handoff was cleared.',
      'Three handoffs are still waiting and four things people said they would do are still open.',
      'Do you want Groundwork to check whether the team now sees it the same way? Another check-in asks the same people again and shows what has moved.',
    ]);
    expect(w.sent[0].linkUrl).toBe('https://app.test/grounds/g1/board');
  });

  it('when nothing was marked done, says so plainly and does not pretend a change', () => {
    const w = theFollowUpWords('Wairimu', 'Sales team, Q4', WENT_OUT, { done: 0, cleared: 0, waiting: 2, open: 0 });
    expect(w.subject).toBe('Two handoffs are still waiting on "Sales team, Q4", and nothing has been marked done since the report went out');
    expect(w.lines[1]).toBe('Since then, nothing has been marked done or cleared.');
    expect(theFollowUpWords('W', 'X', WENT_OUT, { done: 0, cleared: 0, waiting: 0, open: 0 }).subject).toBe('Nothing has changed on "X" since the report went out');
  });

  it('says it once: not again after it went, and again another day if it was refused', async () => {
    const w = world();
    await w.run();
    expect(await w.run()).toEqual({ tried: 0 });
    const refused = world({ outcome: 'suppressed' });
    expect(await refused.run()).toEqual({ tried: 0 });
    expect(refused.told.size).toBe(0);
    expect(await refused.run()).toEqual({ tried: 0 });
    expect(refused.sent).toHaveLength(2);
  });
});

describe('who is not followed up', () => {
  it('a lead who opened a next session', async () => { expect(await world({ nextSession: true }).run()).toEqual({ tried: 0 }); });
  it('a lead already told', async () => { expect(await world({ told: true }).run()).toEqual({ tried: 0 }); });
  it('only reports released at or after the release, a week ago or more, on a check-in still going', async () => {
    const w = world();
    await w.run();
    expect(w.asked[0].releasedAt.gte).toEqual(RELEASE);
    expect(w.asked[0].releasedAt.lte).toEqual(new Date(NOW.getTime() - 7 * 86_400_000));
    expect(w.asked[0].ground.status.notIn).toEqual(expect.arrayContaining(['STALLED', 'PAUSED']));
  });
  it('and no word of it compares or judges', async () => {
    const w = world();
    await w.run();
    expect(JSON.stringify(w.sent)).not.toMatch(/ahead|behind|strong|weak|best|worst|failed/i);
  });
});
