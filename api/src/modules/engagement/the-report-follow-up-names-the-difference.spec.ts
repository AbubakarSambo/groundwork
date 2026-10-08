import { sendTheReportFollowUps, theFollowUpWords } from './the-report-follow-up';
import { theFirstOpenDifference } from './the-first-insight';
import { ENGAGEMENT_MOMENT_KEY as RELEASE_MOMENT_KEY } from './the-engagement-release-moment';

/**
 * JOURNEY 6 AGAIN, WITH THE FINDING (engagement spec sections 11 and 36), AS WAIRIMU READS IT.
 *
 * A week after the shared picture for "Sales team, Q4" went out, with no next check-in held, she is sent one message. It used to say only how many things
 * had moved. It now says what the picture found the people differ on, and that no check-in has been held since, so it has not been looked at again. It does
 * not say the difference is "unresolved", because only a later check-in could say so. Where the report cannot be read for her, the message is what it was.
 */
const WENT_OUT = new Date('2026-10-12T09:00:00Z');
const NOW = new Date('2026-10-20T10:00:00Z');

function world(theDifference?: (r: any) => Promise<string | null>) {
  const told = new Set<string>();
  const sent: any[] = [];
  const asked: any[] = [];
  const prisma: any = {
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (where.key === RELEASE_MOMENT_KEY ? { value: { at: '2026-10-01T00:00:00Z' } } : told.has(where.key) ? { key: where.key } : null)),
      create: jest.fn(async ({ data }: any) => { told.add(data.key); return data; }),
    },
    report: { findMany: jest.fn(async () => [{ groundId: 'g1', releasedAt: WENT_OUT, releasedSessions: [1, 2], ground: { label: 'Sales team, Q4', scenario: 'ALIGNMENT', organizationId: 'org1', initiatorId: 'u-w', initiator: { email: 'wairimu@x.test', firstName: 'Wairimu', deletedAt: null, isActive: true } } }]) },
    checkIn: { findFirst: jest.fn(async () => null) },
    groundCommitment: { count: jest.fn(async ({ where }: any) => (where.status === 'DONE' ? 2 : 4)) },
    groundDependency: { count: jest.fn(async ({ where }: any) => (where.status === 'CLEARED' ? 1 : 3)) },
  };
  const email = { sendTheReportFollowUp: jest.fn(async (to: string, subject: string, lines: string[]) => { sent.push({ to, subject, lines }); return 'sent'; }) };
  const wrapped = theDifference ? async (r: any) => { asked.push(r); return theDifference(r); } : undefined;
  return { run: () => sendTheReportFollowUps({ prisma, email, frontendUrl: 'https://app.test/', theDifference: wrapped }, NOW), sent, asked };
}

describe('the follow-up names what the people differ on', () => {
  it('in the subject and the body, as the lead is served the latest picture', async () => {
    const w = world(async () => 'the people differ on "Who owns the next step with the distributor"');
    expect(await w.run()).toEqual({ tried: 1 });
    expect(w.asked).toEqual([{ groundId: 'g1', organizationId: 'org1', leadUserId: 'u-w', lastReleasedSession: 2 }]);
    expect(w.sent[0].subject).toBe('In "Sales team, Q4", the people differ on "Who owns the next step with the distributor", and it has not been looked at again');
    expect(w.sent[0].lines).toEqual([
      expect.stringMatching(/^Hello Wairimu\. The report for "Sales team, Q4" went out on /),
      'The shared picture found that the people differ on "Who owns the next step with the distributor". No check-in has been held since, so that has not been looked at again.',
      'Since then, two things people said they would do were done and one handoff was cleared.',
      'Three handoffs are still waiting and four things people said they would do are still open.',
      expect.stringMatching(/^Groundwork suggests /),
    ]);
    const read = [w.sent[0].subject, ...w.sent[0].lines].join(' ');
    expect(read).not.toMatch(/unresolved|;| - |→/);
  });

  it('is what it was where the report cannot be read for her, or names nothing open', async () => {
    for (const w of [world(async () => null), world(async () => { throw new Error('not let in'); }), world()]) {
      await w.run();
      expect(w.sent[0].subject).toBe('Three things on "Sales team, Q4" moved after the report, and three handoffs still wait');
      expect(w.sent[0].lines.join(' ')).not.toContain('differ on');
    }
  });
});

describe('the difference is read from the served report', () => {
  it('a phrase is "the people differ on ...", with no full stop at its end', () => {
    expect(theFirstOpenDifference({ whereThingsStand: { open: ['', 'The unit of measurement for success.', 'Pricing'] } })).toBe('the people differ on "The unit of measurement for success"');
  });
  it('a whole sentence is the sentence itself, so it does not read "differ on" a sentence', () => {
    expect(theFirstOpenDifference({ whereThingsStand: { open: ['Who owns the next step with the distributor is not agreed upon by the team.'] } })).toBe('who owns the next step with the distributor is not agreed upon by the team');
  });
  it('nothing for a report with nothing open, or one withheld until the person answers', () => {
    expect(theFirstOpenDifference({ whereThingsStand: { open: [] } })).toBeNull();
    expect(theFirstOpenDifference({ withheldUntilYouAnswer: true, whereThingsStand: { open: ['x'] } })).toBeNull();
    expect(theFirstOpenDifference(null)).toBeNull();
  });
  it('and the words alone carry it only when it is given', () => {
    const w = theFollowUpWords('W', 'X', WENT_OUT, { done: 0, cleared: 0, waiting: 0, open: 0, difference: 'who signs off is not agreed' });
    expect(w.lines[1]).toBe('The shared picture found that who signs off is not agreed. No check-in has been held since, so that has not been looked at again.');
    expect(w.subject).toBe('In "X", who signs off is not agreed, and it has not been looked at again');
    expect(theFollowUpWords('W', 'X', WENT_OUT, { done: 0, cleared: 0, waiting: 0, open: 0 }).lines.join(' ')).not.toContain('found that');
  });
});
