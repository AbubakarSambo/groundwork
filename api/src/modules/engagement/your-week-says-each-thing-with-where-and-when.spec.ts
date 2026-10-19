import { sendTheParticipantsWeeks, theirWeekInWords } from './the-participants-week';
import { ENGAGEMENT_MOMENT_KEY } from './the-engagement-release-moment';

/**
 * "YOUR WEEK" QUOTED LOOSE FRAGMENTS, ONE WAIT TWICE, AND "YOU KEPT THE ONE THING" WITHOUT WHICH (messages test, 19 October, finding 14
 * in Hafsah's list, 15 in the findings file).
 *
 * Thursday 15 October. Joseph read "Eight things you said you would do are still open, "I am working on a few leads", "Call her next week,
 * as she asked" and "I need to ask Grace if that price is okay", and five more." with no check-in or day for any of them. David read "You
 * are waiting for "the next steps for the Jamii Clinics employment claim" from the lawyers." and then the same line again without "from the
 * lawyers". Mercy read "You kept the one thing you said you would do in the last four weeks." and not which.
 */
describe('your week says each thing with where and when it was said', () => {
  it('Joseph reads the latest three, each with its check-in and day, and where the other five are', () => {
    const open = [
      ['I need to follow up with Wanjiru about the KES 12,000 discount she wants', 'Monday 12 October'],
      ['Chase Grace for the Juja Hardware pricing', 'Wednesday 14 October'],
      ['Call Wanjiru next week', 'Wednesday 14 October'],
      ['Take them to her on Thursday', 'Wednesday 14 October'],
      ['Deliver samples to Mercy', 'Wednesday 14 October'],
      ['I need to ask Grace if that price is okay', 'Wednesday 14 October'],
      ['Call her next week, as she asked', 'Wednesday 14 October'],
      ['I am working on a few leads', 'Wednesday 14 October'],
    ].map(([text, day]) => ({ text, checkIn: 'Sales team, Q4', day }));
    const m = theirWeekInWords('Joseph', { kept: null, open: open.map((o) => o.text), openSaid: open, waitingOn: [], waitingOnYou: [] })!;
    expect(m.lines.slice(1)).toEqual([
      'Eight things you said you would do are still open.',
      'On Wednesday 14 October, in "Sales team, Q4", you said "I am working on a few leads".',
      'On Wednesday 14 October, in "Sales team, Q4", you said "Call her next week, as she asked".',
      'On Wednesday 14 October, in "Sales team, Q4", you said "I need to ask Grace if that price is okay".',
      'The other five are on your page.',
    ]);
  });

  it('David reads the thing he waits for once, with who from', () => {
    const m = theirWeekInWords('David', {
      kept: null, open: [], waitingOnYou: [],
      waitingOn: [
        { what: 'the next steps for the Jamii Clinics employment claim', from: 'the lawyers' },
        { what: 'the next steps for the Jamii Clinics employment claim', from: null },
      ],
    })!;
    expect(m.lines.filter((l) => l.startsWith('You are waiting for'))).toEqual(['You are waiting for "the next steps for the Jamii Clinics employment claim" from the lawyers.']);
  });

  it('Mercy reads which thing she kept', async () => {
    const now = new Date('2026-10-15T11:15:00Z');
    const sent: any[] = [];
    const prisma: any = {
      platformSetting: { findUnique: async ({ where }: any) => (where.key === ENGAGEMENT_MOMENT_KEY ? { value: { at: '2026-10-01T00:00:00Z' } } : null) },
      groundParticipant: { findMany: async () => [{ id: 'b6906770-b285-4677-9fe5-c4390c1db17d', userId: 'u-mercy', groundId: 'g', partyType: 'PARTICIPANT', ground: { label: 'Sales team, Q4', runsUntilEnded: true }, checkIns: [] }] },
      user: { findUnique: async () => ({ email: 'mercy@dropaccess.test', firstName: 'Mercy', role: 'MEMBER', organizationId: 'drop', isActive: true, deletedAt: null, awaitingOrgApproval: false }) },
      groundDependency: { findMany: async () => [] },
      groundCommitment: { findMany: async () => [{ status: 'DONE', text: "I'll call Mrs. Njeri tomorrow, Tuesday, October 13th.", createdAt: new Date('2026-10-12T11:06:00Z'), settledAt: new Date('2026-10-14T06:33:00Z') }] },
      organization: { findUnique: async () => ({ timeZone: 'Africa/Nairobi' }) },
    };
    const board = { forReader: async () => ({
      keptLately: { kept: 1, of: 1 },
      saidYoudDo: [{ text: 'Call Rose tomorrow to follow up on the two units', checkIn: 'Sales team, Q4', state: 'open', saidAt: '2026-10-14T11:04:00.000Z' }],
      askedOfYou: { items: [] },
    }) };
    await sendTheParticipantsWeeks({ prisma, board, email: { sendYourWeek: async (to: string, subject: string, lines: string[]) => { sent.push({ to, subject, lines }); } }, frontendUrl: 'http://localhost:5196' }, now);
    /* Said on Monday 12 October, read that week: "since Monday 12 October", not "in the last four weeks" (engine test, Mercy's week). */
    expect(sent[0].lines).toContain('You kept the one thing you said you would do since Monday 12 October, "Call Mrs. Njeri tomorrow, Tuesday, October 13th".');
    expect(sent[0].lines).toContain('On Wednesday 14 October, in "Sales team, Q4", you said "Call Rose tomorrow to follow up on the two units".');
  });
});
