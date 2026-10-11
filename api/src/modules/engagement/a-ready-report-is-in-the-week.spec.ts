import { sendTheParticipantsWeeks, theirWeekInWords } from './the-participants-week';
import { ENGAGEMENT_MOMENT_KEY } from './the-engagement-release-moment';

/**
 * DECISION 117, D14: after "your report is ready" has gone twice, the report appears only in the person's regular summary, their week.
 * Read as Luis, who answered in a check-in whose report was released, and as the lead of it, who reads the report without a reminder.
 */
const NOW = new Date('2026-10-20T08:00:00Z');
const answered = [{ id: 'c1' }];
function world(rows: any[]) {
  const sent: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: async ({ where }: any) => (where.key === ENGAGEMENT_MOMENT_KEY ? { value: { at: '2026-10-01T00:00:00Z' } } : null) },
    groundParticipant: { findMany: async () => rows },
    user: { findUnique: async () => ({ email: 'luis@x.test', firstName: 'Luis', role: 'MEMBER', organizationId: 'o1', isActive: true, deletedAt: null, awaitingOrgApproval: false }) },
    groundDependency: { findMany: async () => [] },
    groundCommitment: { findMany: async () => [] },
  };
  const email = { sendYourWeek: jest.fn(async (to: string, subject: string, lines: string[]) => { sent.push({ to, subject, lines }); }) };
  return { run: () => sendTheParticipantsWeeks({ prisma, board: { forReader: async () => ({ saidYoudDo: [], askedOfYou: { items: [] } }) }, email, frontendUrl: 'https://app.test/' }, NOW), sent };
}
const ground = (label: string, released: boolean) => ({ label, runsUntilEnded: true, report: released ? { releasedAt: new Date('2026-10-10') } : null });

describe('a ready report in the person\'s week', () => {
  it('Luis reads that his report is ready, in a full sentence, and nothing about a reminder', async () => {
    const w = world([{ id: 'p1', userId: 'u1', groundId: 'g1', partyType: 'PARTICIPANT', ground: ground('Okr alignment', true), checkIns: answered }]);
    expect(await w.run()).toEqual({ tried: 1 });
    expect(w.sent[0].subject).toBe('Your report is ready to read');
    expect(w.sent[0].lines).toContain('Your report for "Okr alignment" is ready to read.');
  });

  it('a check-in whose report is not out yet is not told', async () => {
    const w = world([{ id: 'p1', userId: 'u1', groundId: 'g1', partyType: 'PARTICIPANT', ground: ground('Okr alignment', false), checkIns: answered }]);
    expect(await w.run()).toEqual({ tried: 0 });
  });

  it('the lead of the check-in is not told that a report is ready for them', async () => {
    const w = world([{ id: 'p1', userId: 'u1', groundId: 'g1', partyType: 'INITIATOR', ground: ground('Okr alignment', true), checkIns: answered }]);
    expect(await w.run()).toEqual({ tried: 0 });
  });

  it('two reports are said together, in words', () => {
    const out = theirWeekInWords('Luis', { kept: null, open: [], waitingOn: [], waitingOnYou: [], reportsReady: ['Okr alignment', 'Sales team, Q3'] })!;
    expect(out.subject).toBe('Two of your reports are ready to read');
    expect(out.lines).toContain('Your reports for "Okr alignment" and "Sales team, Q3" are ready to read.');
  });
});
