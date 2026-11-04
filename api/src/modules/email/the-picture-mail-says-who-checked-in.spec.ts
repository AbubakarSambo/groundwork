import { ReportsService } from '../reports/reports.service';
import { EmailService } from './email.service';

/**
 * "EVERYBODY ON SALES TEAM, Q4 HAS NOW CHECKED IN" WHEN TWO HAD NOT (messages test, 19 October, finding 2).
 *
 * Drop Access (test), Tuesday 13 October 18:30. The picture for session 2 went out with only Kevin Omondi and Amos
 * Kiprono checked in for it. Mercy Wairimu answered late, on Wednesday morning, and Joseph Kariuki ignored the day.
 * Both were sent "Everybody on Sales team, Q4 has now checked in, so the shared picture is open to all of you at the
 * same moment." These read the mail as each of them received it, from the session's own rows.
 */
const people = [
  { id: 'grace', email: 'grace@dropaccess.test', userId: 'u-grace', partyType: 'INITIATOR', inviteToken: null, user: { passwordHash: 'h', firstName: 'Grace', lastName: 'Achieng' } },
  { id: 'kevin', email: 'kevin@dropaccess.test', userId: 'u-kevin', partyType: 'PARTICIPANT', inviteToken: null, user: { passwordHash: 'h', firstName: 'Kevin', lastName: 'Omondi' } },
  { id: 'mercy', email: 'mercy@dropaccess.test', userId: 'u-mercy', partyType: 'PARTICIPANT', inviteToken: null, user: { passwordHash: 'h', firstName: 'Mercy', lastName: 'Wairimu' } },
  { id: 'joseph', email: 'joseph@dropaccess.test', userId: 'u-joseph', partyType: 'PARTICIPANT', inviteToken: null, user: { passwordHash: 'h', firstName: 'Joseph', lastName: 'Kariuki' } },
  { id: 'amos', email: 'amos@dropaccess.test', userId: 'u-amos', partyType: 'PARTICIPANT', inviteToken: null, user: { passwordHash: 'h', firstName: 'Amos', lastName: 'Kiprono' } },
];

async function theMails(session2: { participantId: string; status: string }[], ground: Record<string, unknown> = {}) {
  const mails: { to: string; html: string }[] = [];
  const mailer: any = {
    sendEmail: async (m: any) => { mails.push({ to: m.to, html: m.html }); },
    layout: (h: string) => h,
    whoSeesWhatYouSay: async () => 'The people in this check-in, including your manager, can see what you say in it.',
  };
  const service: any = Object.create(ReportsService.prototype);
  service.prisma = {
    ground: { findUnique: jest.fn(async () => ({ id: 'g', label: 'Sales team, Q4', initiatorId: 'u-grace', scenario: 'GOAL_ALIGNMENT', participants: people, ...ground })) },
    reportNotice: { findMany: jest.fn(async () => []), create: jest.fn(async () => ({})), deleteMany: jest.fn() },
    checkIn: {
      findMany: jest.fn(async ({ where }: any) => (where.closedReason ? [] : session2)),
    },
  };
  service.config = { get: () => 'http://localhost:5196' };
  service.email = { sendReportReady: (...a: any[]) => (EmailService.prototype as any).sendReportReady.apply(mailer, a) };
  service.logger = { log: jest.fn(), error: jest.fn() };
  service.theInsightFor = jest.fn(async () => null);
  service.theReportReadySubject = jest.fn(async () => undefined);
  await service.tellThemTheReportIsReady('g', 2);
  return (to: string) => (mails.find((m) => m.to === to)?.html ?? '').replace(/<[^>]+>/g, '');
}

describe('the shared picture mail says who checked in, from the session\'s own rows', () => {
  const tuesday = [
    { participantId: 'kevin', status: 'COMPLETED' },
    { participantId: 'amos', status: 'COMPLETED' },
    { participantId: 'mercy', status: 'NOT_STARTED' },
    { participantId: 'joseph', status: 'NOT_STARTED' },
  ];

  it('never tells Mercy, who had not answered, that everybody has checked in', async () => {
    const read = await theMails(tuesday);
    expect(read('mercy@dropaccess.test')).not.toContain('Everybody on Sales team, Q4 has now checked in');
    expect(read('mercy@dropaccess.test')).toContain('Kevin Omondi and Amos Kiprono have checked in for session 2 of Sales team, Q4, and the shared picture is made from what they said.');
    expect(read('mercy@dropaccess.test')).toContain('You and Joseph Kariuki have not checked in for it yet.');
  });

  it('tells Kevin, who did answer, that he is one of the two and who is still to come', async () => {
    const read = await theMails(tuesday);
    expect(read('kevin@dropaccess.test')).toContain('You and Amos Kiprono have checked in for session 2 of Sales team, Q4, and the shared picture is made from what you each said.');
    expect(read('kevin@dropaccess.test')).toContain('Mercy Wairimu and Joseph Kariuki have not checked in for it yet.');
  });

  it('says it by count, never by name, where people in the check-in are not named to each other', async () => {
    const read = await theMails(tuesday, { peersVisibleToEachOther: false });
    const mercy = read('mercy@dropaccess.test');
    expect(mercy).toContain('Two other people have checked in for session 2 of Sales team, Q4, and the shared picture is made from what they said.');
    expect(mercy).toContain('You and one other person have not checked in for it yet.');
    expect(mercy).not.toMatch(/Kevin|Amos|Joseph/);
  });

  it('still says everybody has checked in when everybody has', async () => {
    const read = await theMails(tuesday.map((r) => ({ ...r, status: 'COMPLETED' })));
    expect(read('mercy@dropaccess.test')).toContain('Everybody on Sales team, Q4 has checked in, and the report is ready.');
  });
});
