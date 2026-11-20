import { ReportsService } from '../reports/reports.service';
import { EmailService } from './email.service';

/**
 * ONE MAIL PER REPORT EVENT PER PERSON (fix plan 16 November, group 6; end-to-end check I-12 and I-13).
 *
 * Five weeks of a sales team: the lead had three differently worded "your report is ready" mails for each report, and Ruth, Sam and Asha,
 * who were invited and never started, were told their report was ready six times each. This runs five weekly report events through the
 * one sender (`tellThemTheReportIsReady`), reading the mail as each person received it.
 */
const people = [
  { id: 'lucy', email: 'lucy@sales.test', userId: 'u-lucy', partyType: 'INITIATOR', inviteToken: null, user: { passwordHash: 'h', firstName: 'Lucy', lastName: 'Eze' } },
  { id: 'joel', email: 'joel@sales.test', userId: 'u-joel', partyType: 'PARTICIPANT', inviteToken: null, user: { passwordHash: 'h', firstName: 'Joel', lastName: 'Ade' } },
  { id: 'mary', email: 'mary@sales.test', userId: 'u-mary', partyType: 'PARTICIPANT', inviteToken: null, user: { passwordHash: 'h', firstName: 'Mary', lastName: 'Obi' } },
  { id: 'ruth', email: 'ruth@sales.test', userId: null, partyType: 'PARTICIPANT', inviteToken: 'tok-ruth', user: null },
  { id: 'sam', email: 'sam@sales.test', userId: null, partyType: 'PARTICIPANT', inviteToken: 'tok-sam', user: null },
];
const started = new Set(['joel', 'mary']);

function fiveWeeks() {
  const mails: { to: string; subject: string; text: string }[] = [];
  const notices = new Set<string>();
  const mailer: any = {
    sendEmail: async (m: any) => { mails.push({ to: m.to, subject: m.subject, text: m.html.replace(/<[^>]+>/g, '') }); },
    layout: (h: string) => h,
    whoSeesWhatYouSay: async () => '',
  };
  const service: any = Object.create(ReportsService.prototype);
  service.prisma = {
    ground: { findUnique: jest.fn(async () => ({ id: 'g', label: 'Sales updates', initiatorId: 'u-lucy', scenario: 'GOAL_ALIGNMENT', participants: people })) },
    reportNotice: {
      findMany: jest.fn(async ({ where }: any) => [...notices].filter((k) => k.endsWith(`|${where.sessionNumber}`)).map((k) => ({ participantId: k.split('|')[0] }))),
      create: jest.fn(async ({ data }: any) => { notices.add(`${data.participantId}|${data.sessionNumber}`); return {}; }),
      deleteMany: jest.fn(),
    },
    checkIn: {
      findMany: jest.fn(async ({ where }: any) => {
        if (where.closedReason) return [];
        if (where.status?.in) return [...started].map((participantId) => ({ participantId }));
        return [...started].map((participantId) => ({ participantId, status: 'COMPLETED' }));
      }),
    },
  };
  service.config = { get: () => 'http://localhost:5196' };
  service.email = { sendReportReady: (...a: any[]) => (EmailService.prototype as any).sendReportReady.apply(mailer, a) };
  service.logger = { log: jest.fn(), error: jest.fn() };
  service.theInsightFor = jest.fn(async () => null);
  service.theReportReadySubject = jest.fn(async () => undefined);
  return { service, mails };
}

describe('a report event sends one mail to each person who has a report to read', () => {
  it('over five weeks, and with the event announced twice each week, Lucy, Joel and Mary get one mail a week and nobody gets two for one report', async () => {
    const { service, mails } = fiveWeeks();
    for (let week = 1; week <= 5; week++) {
      await service.tellThemTheReportIsReady('g', week);
      await service.tellThemTheReportIsReady('g', week);
    }
    for (const who of ['lucy', 'joel', 'mary']) expect(mails.filter((m) => m.to === `${who}@sales.test`)).toHaveLength(5);
    expect(new Set(mails.filter((m) => m.to === 'joel@sales.test').map((m) => m.subject))).toEqual(new Set(['Your report for "Sales updates" is ready']));
  });

  it('Ruth and Sam, who were invited and never started, are sent no report mail at all', async () => {
    const { service, mails } = fiveWeeks();
    for (let week = 1; week <= 5; week++) await service.tellThemTheReportIsReady('g', week);
    expect(mails.filter((m) => /^(ruth|sam)@/.test(m.to))).toEqual([]);
  });

  it('Ruth is sent the report as soon as she has started a check-in', async () => {
    const { service, mails } = fiveWeeks();
    await service.tellThemTheReportIsReady('g', 1);
    started.add('ruth');
    try { await service.tellThemTheReportIsReady('g', 2); } finally { started.delete('ruth'); }
    const ruths = mails.filter((m) => m.to === 'ruth@sales.test');
    expect(ruths).toHaveLength(1);
    expect(ruths[0].text).toContain('Sales updates');
  });

  it('there is no second sender: no "ready to view" mail, and no "ready to read" line in the week', () => {
    const { readFileSync } = require('fs');
    const { join } = require('path');
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(strip(readFileSync(join(__dirname, 'email.service.ts'), 'utf8'))).not.toContain('is ready to view');
    expect(strip(readFileSync(join(__dirname, '..', 'engagement', 'the-participants-week.ts'), 'utf8'))).not.toContain('ready to read');
  });
});
