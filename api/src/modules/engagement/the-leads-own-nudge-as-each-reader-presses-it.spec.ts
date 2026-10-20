import { ForbiddenException } from '@nestjs/common';
import { TheLeadsOwnNudgeService, theNudgeSays, theNudgesOnTheBoard } from './the-leads-own-nudge';
import { theNightRunsDatabase, theLeadOf, N } from './the-night-run-bed';
import { OUTSIDE_THE_WINDOW, THEY_SAID_STOP, THEY_SAID_NOT_NOW, TEMPLATES, fill } from '../whatsapp/a-message-outside-the-window';
import { QUIET_HOURS_HELD } from '../whatsapp/quiet-hours-are-the-organisations';

/**
 * "NUDGE JOSEPH", AS EACH READER PRESSES IT (nudges that get answers, 20 October 2026), from the second night run (gw_night_run2). Grace
 * runs Sales team, Q4 at Drop Access (test); it is 3:30pm in Nairobi on Tuesday 20 October and nobody has checked in today.
 */
const DROP = N.drop.ground.id;
const AFTERNOON = new Date('2026-10-20T12:30:00Z');
const JOSEPH = '2274e6af-8d37-4388-bd39-8a7aeb582d7b';
const KEVIN_USER = (N.drop.participants as any[]).find((p) => p.user?.firstName === 'Kevin').userId;
const GRACE = theLeadOf('drop').userId;

function aWorld(opts: { directMorning?: boolean; whatsapp?: (text: string, ctx: any) => any; email?: 'sent' | 'held' | 'suppressed' } = {}) {
  const db = theNightRunsDatabase('drop', { directMorning: opts.directMorning ?? true });
  const sent: any[] = [];
  const mails: any[] = [];
  const whatsapp: any = { sendFor: jest.fn(async (_org: string, phone: string, text: string, ctx: any) => { sent.push({ phone, text, ctx }); return opts.whatsapp ? opts.whatsapp(text, ctx) : { sent: true }; }) };
  const email: any = {
    buildCheckInUrl: (id: string) => `http://localhost:5220/checkin/${id}`,
    sendTheLeadsNudge: jest.fn(async (...a: any[]) => { mails.push(a); return opts.email ?? 'sent'; }),
  };
  return { db, sent, mails, svc: new TheLeadsOwnNudgeService(db, email, whatsapp), whatsapp, email };
}

describe('Grace nudges Joseph', () => {
  it('one WhatsApp message from Grace by name, about Joseph’s one thing today, and the button then says when', async () => {
    const w = aWorld();
    const r = await w.svc.nudge(DROP, JOSEPH, GRACE, AFTERNOON);
    expect(r).toEqual({ nudged: true, at: '15:30', channel: 'whatsapp', says: 'Nudged at 15:30' });
    expect(w.sent).toHaveLength(1);
    expect(w.sent[0].phone).toBe('+254700500004');
    expect(w.sent[0].text).toBe('Joseph, this is from Grace. Juja Hardware is waiting on the KES 4,500 price for 5 units. What\'s happening with it, and what\'s next?');
    expect(w.sent[0].ctx.kind).toBe('lead-nudge');
    /* Outside the 24 hours, the approved template that fits, word for word, naming Grace. */
    expect(w.sent[0].ctx.params).toEqual(['Joseph', 'Sales team, Q4', 'Grace']);
    expect(fill(TEMPLATES['lead-nudge'].body, w.sent[0].ctx.params)).toBe("Hi Joseph, your check-in for Sales team, Q4 is still waiting. Your answers help Grace understand what's in your way, and where they can help. It takes about five minutes, and you can answer here.");
    expect(w.mails).toHaveLength(0);
  });

  it('at most once a day: pressed again, nothing more is sent and the button reads "Nudged at 15:30"', async () => {
    const w = aWorld();
    await w.svc.nudge(DROP, JOSEPH, GRACE, AFTERNOON);
    const again = await w.svc.nudge(DROP, JOSEPH, GRACE, new Date('2026-10-20T13:10:00Z'));
    expect(again).toEqual({ nudged: true, at: '15:30', says: 'Nudged at 15:30' });
    expect(w.sent).toHaveLength(1);
    const board = await theNudgesOnTheBoard(w.db, N.drop.ground.organizationId, [{ participantId: JOSEPH, firstName: 'Joseph' }, { participantId: 'dfda363d-d9f3-4f01-bcb0-ae9f8d722f6f', firstName: 'Peter' }], new Date('2026-10-20T13:10:00Z'));
    expect(board.map((b) => b.says)).toEqual(['Nudged at 15:30', 'Nudge Peter']);
    /* The next day it may be pressed again. */
    expect((await theNudgesOnTheBoard(w.db, N.drop.ground.organizationId, [{ participantId: JOSEPH, firstName: 'Joseph' }], new Date('2026-10-21T12:30:00Z')))[0].says).toBe('Nudge Joseph');
  });

  it('where WhatsApp cannot take it (outside the 24 hours, no approved template), it goes by email instead: one channel', async () => {
    const w = aWorld({ whatsapp: () => ({ sent: false, error: OUTSIDE_THE_WINDOW }) });
    const r = await w.svc.nudge(DROP, JOSEPH, GRACE, AFTERNOON);
    expect(r).toMatchObject({ nudged: true, channel: 'email', says: 'Nudged at 15:30' });
    expect(w.mails).toHaveLength(1);
    const [to, subject, lines, label, link, pid] = w.mails[0];
    expect(to).toBe('joseph@dropaccess.test');
    expect(subject).toBe('Grace has a question for you today');
    expect(lines).toEqual(['Joseph, this is from Grace. Juja Hardware is waiting on the KES 4,500 price for 5 units. What\'s happening with it, and what\'s next?']);
    expect(label).toBe('Open your check-in');
    expect(link).toMatch(/^http:\/\/localhost:5220\/checkin\//);
    expect(pid).toBe(JOSEPH);
  });

  it('in quiet hours it is held until seven, and nothing goes by email in its place', async () => {
    const w = aWorld({ whatsapp: () => ({ sent: false, error: QUIET_HOURS_HELD(new Date('2026-10-21T04:00:00Z')) }) });
    const r = await w.svc.nudge(DROP, JOSEPH, GRACE, new Date('2026-10-20T19:30:00Z'));
    expect(r.says).toBe('You nudged Joseph at 22:30, and it goes at 7am, after quiet hours.');
    expect(w.mails).toHaveLength(0);
  });

  it('STOP and "Not now" are Joseph’s own word: nothing is sent, by any channel, and Grace is told to call', async () => {
    for (const error of [THEY_SAID_STOP, THEY_SAID_NOT_NOW]) {
      const w = aWorld({ whatsapp: () => ({ sent: false, error }) });
      const r = await w.svc.nudge(DROP, JOSEPH, GRACE, AFTERNOON);
      expect(r.nudged).toBe(false);
      expect(r.says).toMatch(/so no nudge was sent, and you can call Joseph instead\.$/);
      expect(w.mails).toHaveLength(0);
      /* Not recorded, so it is not "Nudged at" on her board. */
      expect((await theNudgesOnTheBoard(w.db, N.drop.ground.organizationId, [{ participantId: JOSEPH, firstName: 'Joseph' }], AFTERNOON))[0].says).toBe('Nudge Joseph');
    }
  });

  it('his own stop link stops the email, and Grace is told so', async () => {
    const w = aWorld({ whatsapp: () => ({ sent: false, error: OUTSIDE_THE_WINDOW }), email: 'suppressed' });
    expect((await w.svc.nudge(DROP, JOSEPH, GRACE, AFTERNOON)).says).toBe('Joseph has turned these messages off, so no nudge was sent, and you can call Joseph instead.');
  });

  it('nobody is nudged who has already checked in today, or has nothing open', async () => {
    const w = aWorld();
    const rows = (N.drop.checkIns as any[]).map((c) => ({ ...c }));
    const seven = rows.find((c) => c.participantId === JOSEPH && c.sessionNumber === 7);
    Object.assign(seven, { status: 'COMPLETED', completedAt: '2026-10-20T11:00:00.000Z' });
    w.db.checkIn.findMany = jest.fn(async ({ where }: any) => rows.filter((c) => c.participantId === where.participantId).map((c) => ({ ...c, completedAt: c.completedAt && new Date(c.completedAt), availableFrom: c.availableFrom && new Date(c.availableFrom), createdAt: new Date(c.createdAt) })));
    expect((await w.svc.nudge(DROP, JOSEPH, GRACE, AFTERNOON)).says).toBe('Joseph has already checked in today, so no nudge was sent.');
    expect(w.sent).toHaveLength(0);
  });
});

describe('only Grace may, and only with the switch on: decided on the server', () => {
  it('Kevin, a team member, is refused (403) and nothing is sent', async () => {
    const w = aWorld();
    await expect(w.svc.nudge(DROP, JOSEPH, KEVIN_USER, AFTERNOON)).rejects.toBeInstanceOf(ForbiddenException);
    expect(w.sent).toHaveLength(0);
  });
  it('somebody outside the check-in is refused (403)', async () => {
    const w = aWorld();
    await expect(w.svc.nudge(DROP, JOSEPH, 'somebody-else', AFTERNOON)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('Grace cannot nudge herself', async () => {
    const w = aWorld();
    await expect(w.svc.nudge(DROP, '9594ee31-5f40-41d2-97fe-e87527405712', GRACE, AFTERNOON)).rejects.toThrow(/nobody to nudge/);
  });
  it('with the direct morning off, the route refuses, the board serves no button, and nothing is sent', async () => {
    const w = aWorld({ directMorning: false });
    await expect(w.svc.nudge(DROP, JOSEPH, GRACE, AFTERNOON)).rejects.toBeInstanceOf(ForbiddenException);
    expect(w.sent).toHaveLength(0);
    expect(await theNudgesOnTheBoard(w.db, N.drop.ground.organizationId, [{ participantId: JOSEPH, firstName: 'Joseph' }], AFTERNOON)).toEqual([]);
  });
});

describe('the words', () => {
  it('with nothing specific on record, the check-in itself, still from the lead by name', () => {
    expect(theNudgeSays('Peter', 'Grace', null, 'Sales team, Q4')).toEqual({
      text: 'Peter, this is from Grace. Your check-in for Sales team, Q4 is still open today. Can you answer it now?',
      subject: 'Grace is asking you to answer your check-in for Sales team, Q4 today',
    });
  });
});
