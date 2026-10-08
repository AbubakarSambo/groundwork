import { sendTheLeadsWeeklyLetters } from '../email/the-leads-weekly-letter';
import { whatTheLeadsWeeklyReportSays } from './the-leads-own-weekly-report';
import { EmailService } from '../email/email.service';

/**
 * THE LEAD'S WEEK, FOR ANY CHECK-IN (engagement spec section 24; section 36 for the 12-person Ground), AS THE LEAD READS IT ON A FRIDAY.
 *
 * The weekly letter was for check-ins started from the anchor link, and the anchor is off at release, so no lead was sent one. It is now for every check-in
 * that is still going: the week's counts, what moved, who has been reminded, at most three things to do (the lead's own weekly report, as she is served
 * it), and one real next check-in. Nothing is written about a quiet week or a lead alone, and nobody but the lead is sent it.
 *
 * Wairimu leads "Kenya launch", a 12-person Ground: eleven others and herself. Nine checked in this week, and Eric, Mercy and Omar did not. Eric and Mercy
 * were sent reminders on Tuesday. Abigail finished four things. Two handoffs are waiting, both on James.
 */
const NOW = new Date('2026-10-09T14:00:00Z');
const person = (id: string, userId: string | null, first: string, extra: any = {}) => ({ id, userId, managingOnly: false, nameGiven: null, lastNudgedAt: null, user: { firstName: first, lastName: null, awaitingOrgApproval: false }, ...extra });
const TUESDAY = new Date('2026-10-06T07:00:00Z');

function aFriday(over: { people?: any[]; finished?: string[]; done?: number; waiting?: number; opens?: number } = {}) {
  const people = over.people ?? [
    person('p-w', 'u-wairimu', 'Wairimu'), person('p-a', 'u-a', 'Abigail'), person('p-j', 'u-j', 'James'), person('p-v', 'u-v', 'Vera'), person('p-l', 'u-l', 'Lucy'),
    person('p-d', 'u-d', 'Dayo'), person('p-n', 'u-n', 'Nia'), person('p-t', 'u-t', 'Tunde'), person('p-g', 'u-g', 'Grace'),
    person('p-e', 'u-e', 'Eric', { lastNudgedAt: TUESDAY }), person('p-m', 'u-m', 'Mercy', { lastNudgedAt: TUESDAY }), person('p-o', 'u-o', 'Omar'),
  ];
  const finished = over.finished ?? ['p-w', 'p-a', 'p-j', 'p-v', 'p-l', 'p-d', 'p-n', 'p-t', 'p-g'];
  const where: any[] = [];
  const prisma: any = {
    ground: { findMany: async (a: any) => { where.push(a.where); return [{ id: 'g1', label: 'Kenya launch', initiatorId: 'u-wairimu', scenario: 'ALIGNMENT' }]; } },
    user: { findUnique: async ({ where: w }: any) => (w.id === 'u-wairimu' ? { email: 'wairimu@x.test', deletedAt: null } : null) },
    groundParticipant: { findMany: async () => people },
    checkIn: { findMany: async () => finished.map((participantId) => ({ participantId })) },
    groundCommitment: {
      findMany: async (a: any) => (a.where.status === 'DONE' ? Array(over.done ?? 4).fill({ participantId: 'p-a', status: 'DONE' }) : []),
      count: async (a: any) => (a.where.status === 'DONE' ? over.done ?? 4 : over.opens ?? 0),
    },
    groundDependency: {
      count: async () => over.waiting ?? 2,
      findMany: async () => Array(over.waiting ?? 2).fill({ onParticipantId: 'p-j', status: 'WAITING' }),
    },
  };
  const sent: any[] = [];
  const email = { sendTheLeadsWeeklyLetter: jest.fn(async (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => { sent.push({ to, subject, lines, linkLabel, linkUrl }); }) };
  return { prisma, email, sent, where };
}
const REPORT = {
  moved: ['Abigail finished sending the price list to the distributor.', 'Abigail finished booking the Nairobi depot.'],
  toDo: [
    { do: 'Ask James what he needs to clear the two handoffs waiting on him.', why: 'Both were raised as blockers this week.' },
    { do: 'Decide who signs off the Mombasa order.', why: 'Two people named it.' },
    { do: 'Agree the launch date with Vera.', why: 'It was raised in two check-ins.' },
    { do: 'A fourth thing that must not appear.', why: 'There is room for three.' },
  ],
};

const send = (w: ReturnType<typeof aFriday>, everyCheckIn: any = { anchorIsOn: false, weeklyReport: async () => REPORT }) =>
  sendTheLeadsWeeklyLetters({ prisma: w.prisma, email: w.email, frontendUrl: 'https://app.test', everyCheckIn }, NOW);

describe('a 12-person Ground that is not the anchor\'s, as the lead reads her Friday letter', () => {
  it('carries the week, what moved, who was reminded and at most three things to do', async () => {
    const w = aFriday();
    expect(await send(w)).toEqual({ tried: 1 });
    expect(w.sent).toHaveLength(1);
    const m = w.sent[0];
    expect(m.to).toBe('wairimu@x.test');
    expect(m.subject).toBe('Four things people said they would do were done, all by Abigail; two handoffs are still waiting, both on James');
    expect(m.lines).toEqual([
      'Your team is starting to move.',
      'This week, nine of 12 people checked in. Four things people said they would do were done, all by Abigail. Two handoffs are still waiting, both on James. Eric, Mercy and Omar did not check in.',
      'Here is what moved this week. Abigail finished sending the price list to the distributor. Abigail finished booking the Nairobi depot.',
      'I have already sent reminders to Eric and Mercy this week.',
      'Here is what I would do this week.',
      'Ask James what he needs to clear the two handoffs waiting on him. Both were raised as blockers this week.',
      'Decide who signs off the Mombasa order. Two people named it.',
      'Agree the launch date with Vera. It was raised in two check-ins.',
    ]);
    expect(m.linkUrl).toBe('https://app.test/grounds/g1/board');
  });

  it('names a next check-in only when it is a different one and the record gives the reason', async () => {
    const w = aFriday({ done: 0, waiting: 3 });
    await send(w, { anchorIsOn: false, weeklyReport: async () => null });
    const next = w.sent[0].lines.find((l: string) => l.startsWith('Here is something worth doing next.'));
    expect(next).toBe('Here is something worth doing next. Groundwork suggests a check-in for work that has gone off track, because three handoffs are still waiting and nothing has been marked done or cleared since the report.');
    const quiet = aFriday();
    await send(quiet);
    expect(quiet.sent[0].lines.join(' ')).not.toContain('worth doing next');
  });

  it('says nothing of what it has no sentence for: no weekly report, no reminders, no things to do', async () => {
    const w = aFriday({ people: undefined });
    for (const p of await w.prisma.groundParticipant.findMany()) p.lastNudgedAt = null;
    await send(w, { anchorIsOn: false, weeklyReport: async () => null });
    const read = w.sent[0].lines.join(' ');
    expect(read).not.toMatch(/reminders|what I would do|moved this week/);
  });
});

describe('when nothing useful happened, nothing is sent', () => {
  it('a quiet week, where nobody checked in and nothing was settled', async () => {
    const w = aFriday({ finished: [], done: 0 });
    expect(await send(w, { anchorIsOn: false })).toEqual({ tried: 0 });
    expect(w.sent).toHaveLength(0);
  });
  it('a lead alone in her own check-in has no team to write to about', async () => {
    const w = aFriday({ people: [person('p-w', 'u-wairimu', 'Wairimu')], finished: ['p-w'], done: 0, waiting: 0 });
    expect(await send(w, { anchorIsOn: false })).toEqual({ tried: 0 });
  });
});

describe('who is sent it, and for which check-ins', () => {
  it('only the lead, at her own address, and no one else on the check-in', async () => {
    const w = aFriday();
    await send(w);
    expect(w.sent.map((m) => m.to)).toEqual(['wairimu@x.test']);
  });
  it('with the anchor off it asks for check-ins that are not the anchor\'s, and null started-from rows are among them', async () => {
    const w = aFriday();
    await send(w, { anchorIsOn: false });
    const text = JSON.stringify(w.where[0]);
    expect(text).toContain('"startedFrom":null');
    expect(text).toContain('"scenario":{"not":"HELP_TEAM_UNDERSTAND"}');
  });
  it('with the anchor on it asks for all of them', async () => {
    const w = aFriday();
    await send(w, { anchorIsOn: true });
    expect(JSON.stringify(w.where[0])).not.toContain('HELP_TEAM_UNDERSTAND');
  });
  it('a stalled, ended, held or waiting check-in is never asked for', async () => {
    const w = aFriday();
    await send(w);
    expect(JSON.stringify(w.where[0])).toMatch(/"status":\{"notIn":\[[^\]]*"STALLED"/);
  });
});

describe('the lead\'s own weekly report is used only for this week', () => {
  it('this week\'s moved and to-do sentences are used, and "nothing was marked done" is not a thing that moved', () => {
    const says = whatTheLeadsWeeklyReportSays({ weekStart: '2026-10-05', whatChanged: { moved: ['Nothing was marked as done this week yet.'] }, forNextWeek: [{ do: 'Ask James.', why: 'He is blocked.' }] }, NOW);
    expect(says).toEqual({ moved: [], toDo: [{ do: 'Ask James.', why: 'He is blocked.' }] });
  });
  it('a report kept in an earlier week says nothing about this one', () => {
    expect(whatTheLeadsWeeklyReportSays({ weekStart: '2026-09-21', whatChanged: { moved: ['Abigail finished it.'] } }, NOW)).toBeNull();
  });
});

describe('the mail itself goes through the one door and is escaped', () => {
  it('is a mail we decided to send, so the stop link stops it and the footer about what people say is left off', async () => {
    const posted: any[] = [];
    const svc: any = Object.create(EmailService.prototype);
    svc.layout = (b: string) => `<div>${b}</div>`;
    svc.sendEmail = jest.fn(async (o: any, _c: any, sender: string) => { posted.push({ ...o, sender }); });
    await svc.sendTheLeadsWeeklyLetter('wairimu@x.test', 'S', ['Here is what I would do this week.', 'Ask James & Vera.'], 'Open', 'https://app.test/grounds');
    expect(posted[0].sender).toBe('sendTheLeadsWeeklyLetter');
    expect(posted[0].html).toContain('Ask James &amp; Vera.');
  });
});
