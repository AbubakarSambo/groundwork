/* Changed 22 November 2026 (release test): "handoffs" in what a lead reads is work jargon, so the mails say "people are still waiting on two things" and the like; the expectations below follow the new words. */
import { sendTheReportFollowUps, theFollowUpWords, cutAtAWord } from './the-report-follow-up';
import { ENGAGEMENT_MOMENT_KEY as RELEASE_MOMENT_KEY } from './the-engagement-release-moment';

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
  const checkInWhere: any[] = [];
  const sent: any[] = [];
  const c = { done: 2, cleared: 1, waiting: 3, open: 4, ...(opts.counts ?? {}) };
  const prisma: any = {
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (where.key === RELEASE_MOMENT_KEY ? { value: { at: RELEASE.toISOString() } } : told.has(where.key) ? { key: where.key } : null)),
      create: jest.fn(async ({ data }: any) => { told.add(data.key); return data; }),
    },
    report: { findMany: jest.fn(async (a: any) => { asked.push(a.where); return [{ groundId: 'g1', releasedAt: WENT_OUT, ground: { label: 'Sales team, Q4', initiatorId: 'u-w', initiator: { email: 'wairimu@x.test', firstName: 'Wairimu', deletedAt: null, isActive: true } } }]; }) },
    checkIn: { findFirst: jest.fn(async ({ where }: any) => { checkInWhere.push(where); return opts.nextSession ? { id: 'next' } : null; }) },
    groundCommitment: { count: jest.fn(async ({ where }: any) => (where.status === 'DONE' ? c.done : c.open)) },
    groundDependency: { count: jest.fn(async ({ where }: any) => (where.status === 'CLEARED' ? c.cleared : c.waiting)) },
  };
  const email = { sendTheReportFollowUp: jest.fn(async (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => { sent.push({ to, subject, lines, linkLabel, linkUrl }); return opts.outcome ?? 'sent'; }) };
  return { run: () => sendTheReportFollowUps({ prisma, email, frontendUrl: 'https://app.test/' }, NOW), sent, asked, told, checkInWhere };
}

describe('what Wairimu reads a week after the report', () => {
  it('what changed, what has not, and the offer', async () => {
    const w = world();
    expect(await w.run()).toEqual({ tried: 1 });
    expect(w.sent).toHaveLength(1);
    expect(w.sent[0].to).toBe('wairimu@x.test');
    expect(w.sent[0].subject).toBe('Three things on "Sales team, Q4" moved after the report, and people wait on three things');
    expect(w.sent[0].subject.length).toBeLessThan(100);
    expect(w.sent[0].lines).toEqual([
      expect.stringMatching(/^Hello Wairimu\. The report for "Sales team, Q4" went out on .*12.*\.$/),
      'Since then, two things people said they would do were done and people stopped waiting on one thing.',
      'People are still waiting on three things and four things people said they would do are still open.',
      'Groundwork suggests running the same check-in again, because some things have moved and some have not, and asking the same people again shows which.',
    ]);
    expect(w.sent[0].linkUrl).toBe('https://app.test/grounds/g1/board');
  });

  it('when nothing was marked done, says so plainly and does not pretend a change', () => {
    const w = theFollowUpWords('Wairimu', 'Sales team, Q4', WENT_OUT, { done: 0, cleared: 0, waiting: 2, open: 0 });
    expect(w.subject).toBe('People on "Sales team, Q4" still wait on two things, and nothing has been marked done since the report');
    expect(w.lines[1]).toBe('Since then, nothing has been marked done or cleared.');
    expect(theFollowUpWords('W', 'X', WENT_OUT, { done: 0, cleared: 0, waiting: 0, open: 0 }).subject).toBe('Nothing has been marked done or cleared on "X" since the report went out');
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

describe('what counts as a next session opened', () => {
  it('asks for a later session that has been STARTED since the report, not for a row made after it (found on the test bed)', async () => {
    const w = world();
    await w.run();
    const where = w.checkInWhere[0];
    expect(where.sessionNumber).toEqual({ gt: 1 });
    expect(where.OR).toEqual([{ startedAt: { gt: WENT_OUT } }, { completedAt: { gt: WENT_OUT } }]);
    expect(where.createdAt).toBeUndefined();
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

describe('a long check-in name in a subject', () => {
  it('is cut at a word, never in the middle of one', () => {
    expect(cutAtAWord('Sales pipeline review for East Africa and the Gulf', 30)).toBe('Sales pipeline review for East...');
    expect(cutAtAWord('Sales team, Q4', 30)).toBe('Sales team, Q4');
    expect(cutAtAWord('Supercalifragilisticexpialidocious-pipeline-review', 30)).toMatch(/^Supercalifragilisticexpialid.*\.\.\.$/);
  });
});
