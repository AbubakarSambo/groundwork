import { sendTheLeadsWeeklyLetters } from './the-leads-weekly-letter';

/**
 * "I HAVE ALREADY SENT REMINDERS TO BRIAN THIS WEEK." NONE WAS SENT (final evaluation, profile 1, problem 2; decision 139, must-fix 3).
 *
 * Wairimu leads "Westlands route, new shops" with Brian, Amani and Chidi. In week 2 Brian did not check in. That week Groundwork sent him
 * two "your report is ready" mails, which stamp his row's `lastNudgedAt`, and no reminder to check in. Amani did not check in either, and
 * she really was sent a reminder on Tuesday. Wairimu's Friday letter, as she reads it, says Amani was reminded and never says Brian was.
 */
const NOW = new Date('2026-10-16T14:00:00Z');
const TUESDAY = new Date('2026-10-13T07:00:00Z');
const WEDNESDAY = new Date('2026-10-14T08:00:00Z');

const person = (id: string, userId: string, first: string, lastNudgedAt: Date | null = null) => ({
  id, userId, email: `${first.toLowerCase()}@msingi.test`, managingOnly: false, nameGiven: null, lastNudgedAt,
  user: { firstName: first, lastName: null, awaitingOrgApproval: false },
});

function aFriday(ledger: { channel: string; outcome: string; sender: string; toAddress: string; createdAt: Date }[]) {
  const people = [
    person('p-w', 'u-wairimu', 'Wairimu'),
    person('p-b', 'u-b', 'Brian', WEDNESDAY),
    person('p-a', 'u-a', 'Amani', TUESDAY),
    person('p-c', 'u-c', 'Chidi'),
  ];
  const prisma: any = {
    ground: { findMany: async () => [{ id: 'g1', label: 'Westlands route, new shops', initiatorId: 'u-wairimu', scenario: 'ALIGNMENT' }] },
    user: { findUnique: async ({ where }: any) => (where.id === 'u-wairimu' ? { email: 'wairimu@msingi.test', deletedAt: null } : null) },
    groundParticipant: { findMany: async () => people },
    checkIn: { findMany: async () => [{ participantId: 'p-w' }, { participantId: 'p-c' }] },
    groundCommitment: { findMany: async () => [], count: async () => 0 },
    groundDependency: { findMany: async () => [], count: async () => 0 },
    notification: {
      findMany: async ({ where: w }: any) => ledger.filter((n) => n.channel === w.channel && n.outcome === w.outcome && w.sender.in.includes(n.sender)
        && n.createdAt >= w.createdAt.gte && n.createdAt <= w.createdAt.lte
        && w.OR.some((o: any) => o.toAddress.equals.toLowerCase() === n.toAddress.toLowerCase())),
    },
  };
  const sent: { lines: string[] }[] = [];
  const email = { sendTheLeadsWeeklyLetter: jest.fn(async (_to: string, _subject: string, lines: string[]) => { sent.push({ lines }); }) };
  return { prisma, email, sent };
}

const send = (w: ReturnType<typeof aFriday>) =>
  sendTheLeadsWeeklyLetters({ prisma: w.prisma, email: w.email, frontendUrl: 'https://app.test', everyCheckIn: { anchorIsOn: false, weeklyReport: async () => null } }, NOW);

describe('the lead\'s letter says somebody was reminded only when a reminder to check in really went', () => {
  it('Brian, sent only "your report is ready" mails, is not said to have been reminded; Amani, really reminded, is', async () => {
    const w = aFriday([
      { channel: 'email', outcome: 'sent', sender: 'sendActivationRevealReminder', toAddress: 'brian@msingi.test', createdAt: WEDNESDAY },
      { channel: 'email', outcome: 'sent', sender: 'sendActivationRevealReminder', toAddress: 'brian@msingi.test', createdAt: TUESDAY },
      { channel: 'email', outcome: 'sent', sender: 'sendNudge', toAddress: 'amani@msingi.test', createdAt: TUESDAY },
    ]);
    await send(w);
    const read = w.sent[0].lines;
    expect(read).toContain('I have already sent reminders to Amani this week.');
    expect(read.join(' ')).not.toMatch(/reminders? to [^.]*Brian/);
  });

  it('a reminder that was held back and never went is not a reminder sent', async () => {
    const w = aFriday([
      { channel: 'email', outcome: 'suppressed', sender: 'sendNudge', toAddress: 'brian@msingi.test', createdAt: WEDNESDAY },
      { channel: 'email', outcome: 'held', sender: 'sendNudge', toAddress: 'amani@msingi.test', createdAt: TUESDAY },
    ]);
    await send(w);
    expect(w.sent[0].lines.join(' ')).not.toMatch(/reminder/i);
  });

  it('when the record of messages cannot be read, nobody is said to have been reminded', async () => {
    const w = aFriday([]);
    delete w.prisma.notification;
    await send(w);
    expect(w.sent[0].lines.join(' ')).not.toMatch(/reminder/i);
    expect(w.sent[0].lines.join(' ')).toContain('Brian and Amani did not check in.');
  });
});
