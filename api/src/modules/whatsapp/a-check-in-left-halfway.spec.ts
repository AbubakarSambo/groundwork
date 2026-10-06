import { remindThemToCarryOn, warnTheirPhone, tellThemTheClockClosedIt, carryOnSaying, closesInHalfAnHourSaying, closedByTheClockSaying } from './a-check-in-left-halfway';
import { FIRST_MESSAGES, OPENING_OR_CLOSING, isBusinessInitiated } from './a-message-outside-the-window';

/**
 * AMANI STOPPED HALFWAY THROUGH HER CHECK-IN ON WHATSAPP. Her words are kept; her phone is reminded once,
 * warned before the clock closes it, and told when it did. What she reads, word for word.
 */
const HOUR = 3_600_000;
const NOON_LAGOS = new Date('2026-10-06T11:00:00Z');
function aWorld(o: { overWhatsApp?: boolean | null; wroteHere?: boolean; reminded?: boolean; closeTold?: boolean; releaseMoment?: string | null; began?: Date; away?: boolean } = {}) {
  const sent: any[] = [];
  const began = o.began ?? new Date(NOON_LAGOS.getTime() - 5 * HOUR);
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async () => (o.releaseMoment === null ? null : { value: { at: o.releaseMoment ?? '2026-10-05T12:00:00Z' } })) },
    checkIn: { findUnique: jest.fn(async () => ({ startedAt: began, createdAt: began, groundId: 'g-1', participantId: 'p-1', ground: { organizationId: 'org-1', label: 'Sales team, Q4', overWhatsApp: o.overWhatsApp ?? null, simplerWords: false }, participant: { email: 'amani@kito.test', user: { firstName: 'Amani', phoneNumber: null, deletedAt: null } } })) },
    person: { findFirst: jest.fn(async () => ({ phone: '+254700000001' })) },
    groundParticipant: { findMany: jest.fn(async () => (o.away ? [{ id: 'p-1', userId: 'u-1', ground: { organizationId: 'org-1' } }] : [])) },
    leaveRequest: { findMany: jest.fn(async () => [{ userId: 'u-1', organizationId: 'org-1', startsOn: new Date('2026-10-05T00:00:00Z'), endsOn: new Date('2026-10-09T00:00:00Z') }]) },
    whatsAppSend: {
      findFirst: jest.fn(async (q: any) => {
        const kind = q?.where?.kind;
        if (kind === 'answered-here') return o.wroteHere === false ? null : { id: 'w1' };
        if (kind?.startsWith === 'carry-on') return o.reminded ? { id: 'r1' } : null;
        if (kind?.startsWith === 'closed-by-the-clock') return o.closeTold ? { id: 'c1' } : null;
        return null;
      }),
    },
  };
  const whatsapp = { sendFor: jest.fn(async (_o: string, to: string, text: string, ctx: any) => { sent.push({ to, text, kind: ctx.kind }); return { sent: true }; }) };
  return { prisma, whatsapp, sent };
}
const lastAsked = (hoursAgo: number) => ({ role: 'AI', createdAt: new Date(NOON_LAGOS.getTime() - hoursAgo * HOUR) });

const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('Amani, who stopped halfway on WhatsApp', () => {
  it('is reminded once, after three hours of quiet', async () => {
    const w = aWorld();
    expect(await remindThemToCarryOn(w.prisma, w.whatsapp, { id: 'ci-1' }, lastAsked(3.5), NOON_LAGOS)).toBe(true);
    expect(w.sent).toEqual([{ to: '+254700000001', kind: 'carry-on', text: 'Hi Amani, your check-in for "Sales team, Q4" is still open, and everything you have said so far is kept. Reply here to carry on whenever you are ready.' }]);
  });

  it('not before three hours, not twice, not at night, and not when it was her turn last', async () => {
    let w = aWorld();
    expect(await remindThemToCarryOn(w.prisma, w.whatsapp, { id: 'ci-1' }, lastAsked(2), NOON_LAGOS)).toBe(false);
    w = aWorld({ reminded: true });
    expect(await remindThemToCarryOn(w.prisma, w.whatsapp, { id: 'ci-1' }, lastAsked(4), NOON_LAGOS)).toBe(false);
    w = aWorld();
    expect(await remindThemToCarryOn(w.prisma, w.whatsapp, { id: 'ci-1' }, lastAsked(4), new Date('2026-10-06T22:00:00Z'))).toBe(false);
    expect(await remindThemToCarryOn(w.prisma, w.whatsapp, { id: 'ci-1' }, { role: 'PERSON', createdAt: new Date(NOON_LAGOS.getTime() - 4 * HOUR) }, NOON_LAGOS)).toBe(false);
    expect(w.sent).toEqual([]);
  });

  it('nothing goes to her phone for a check-in kept in the app, or one she was doing in the app', async () => {
    for (const o of [{ overWhatsApp: false }, { wroteHere: false }]) {
      const w = aWorld(o);
      expect(await remindThemToCarryOn(w.prisma, w.whatsapp, { id: 'ci-1' }, lastAsked(4), NOON_LAGOS)).toBe(false);
      expect(await warnTheirPhone(w.prisma, w.whatsapp, 'ci-1')).toBe(false);
      expect(await tellThemTheClockClosedIt(w.prisma, w.whatsapp, 'ci-1')).toBe(false);
      expect(w.sent).toEqual([]);
    }
  });

  it('the reminder is never sent after the 11-hour warning, nor to somebody on approved leave', async () => {
    let w = aWorld();
    expect(await remindThemToCarryOn(w.prisma, w.whatsapp, { id: 'ci-1', warningFiredAt: new Date() }, lastAsked(4), NOON_LAGOS)).toBe(false);
    w = aWorld({ away: true });
    expect(await remindThemToCarryOn(w.prisma, w.whatsapp, { id: 'ci-1' }, lastAsked(4), NOON_LAGOS)).toBe(false);
    expect(await warnTheirPhone(w.prisma, w.whatsapp, 'ci-1', NOON_LAGOS)).toBe(false);
    expect(w.sent).toEqual([]);
  });

  it('the close says once, with the true reason', async () => {
    let w = aWorld();
    expect(await tellThemTheClockClosedIt(w.prisma, w.whatsapp, 'ci-1', 'age')).toBe(true);
    expect(w.sent[0].text).toBe('Your check-in for "Sales team, Q4" has closed, because it has been open for two days. Everything you said is kept on the record, and your report follows in a moment.');
    w = aWorld({ closeTold: true });
    expect(await tellThemTheClockClosedIt(w.prisma, w.whatsapp, 'ci-1')).toBe(false);
  });

  it('nothing when the release moment cannot be read, or for a session before the later of the two dates', async () => {
    let w = aWorld({ releaseMoment: null });
    expect(await warnTheirPhone(w.prisma, w.whatsapp, 'ci-1', NOON_LAGOS)).toBe(false);
    w = aWorld({ releaseMoment: '2026-10-06T00:00:00Z', began: new Date('2026-10-05T20:00:00Z') });
    expect(await warnTheirPhone(w.prisma, w.whatsapp, 'ci-1', NOON_LAGOS)).toBe(false);
    expect(w.sent).toEqual([]);
  });

  it('the half-hour warning reaches her phone, and so does the clock closing it', async () => {
    const w = aWorld();
    await warnTheirPhone(w.prisma, w.whatsapp, 'ci-1', NOON_LAGOS);
    await tellThemTheClockClosedIt(w.prisma, w.whatsapp, 'ci-1');
    expect(w.sent.map((s: any) => [s.kind, s.text])).toEqual([
      ['closes-in-half-an-hour', 'Your check-in for "Sales team, Q4" closes in 30 minutes if nothing else is said. Add anything you still want on the record now.'],
      ['closed-by-the-clock', 'Your check-in for "Sales team, Q4" has closed, because nothing was said for twelve hours. Everything you said is kept on the record, and your report follows in a moment.'],
    ]);
  });

  it('keeps the sender\'s gates: the reminder is the day\'s first message, the warning a closing', () => {
    expect([carryOnSaying('Amani', 'x'), closesInHalfAnHourSaying('x'), closedByTheClockSaying('x')].every((t) => !/\n/.test(t))).toBe(true);
    expect(FIRST_MESSAGES.has('carry-on')).toBe(true);
    expect(OPENING_OR_CLOSING.has('closes-in-half-an-hour')).toBe(true);
    expect(['carry-on', 'closes-in-half-an-hour', 'closed-by-the-clock'].every(isBusinessInitiated)).toBe(true);
  });
});

describe('off unless the row says on', () => {
  const { theHalfwayMessagesAreOn } = require('../admin/what-is-hidden-at-release');
  const row = (value: unknown) => ({ platformSetting: { findUnique: async () => (value === undefined ? null : { value }) } });

  it('a missing, broken or unreadable row reads as off; only { "on": true } switches it on', async () => {
    expect(await theHalfwayMessagesAreOn(row(undefined))).toBe(false);
    expect(await theHalfwayMessagesAreOn(row({ nonsense: 1 }))).toBe(false);
    expect(await theHalfwayMessagesAreOn({ platformSetting: { findUnique: async () => { throw new Error('no table'); } } })).toBe(false);
    expect(await theHalfwayMessagesAreOn(row({ on: false }))).toBe(false);
    expect(await theHalfwayMessagesAreOn(row({ on: true }))).toBe(true);
  });

  it('every one of the three asks it first', () => {
    const src = withoutComments(require('fs').readFileSync(require('path').join(__dirname, '..', 'grounds', 'grounds.cron.ts'), 'utf8'));
    expect(src).toContain('this.whatsapp && (await theHalfwayMessagesAreOn(this.prisma)) ? tellThemTheClockClosedIt(');
    expect(src).toContain('if (this.whatsapp && (await theHalfwayMessagesAreOn(this.prisma))) await warnTheirPhone(');
    expect(src).toContain('if (!this.whatsapp || !(await theHalfwayMessagesAreOn(this.prisma))) return { sent: 0 };');
  });
});

describe('the 12 hours run from the last real word, not from the warning', () => {
  const { theLastRealTurn, THE_WARNING_TURN } = require('./a-check-in-left-halfway');
  it('asks for the last turn that is not the injected warning', async () => {
    const q: any[] = [];
    const prisma: any = { conversationTurn: { findFirst: jest.fn(async (a: any) => { q.push(a); return { createdAt: new Date(), role: 'AI' }; }) } };
    await theLastRealTurn(prisma, 'ci-1');
    expect(q[0].where).toEqual({ checkInId: 'ci-1', NOT: { role: 'AI', content: THE_WARNING_TURN } });
  });
  it('the close sweep, the reminder sweep and the warning all use that one reading, the reminder under a lock', () => {
    const src = withoutComments(require('fs').readFileSync(require('path').join(__dirname, '..', 'grounds', 'grounds.cron.ts'), 'utf8'));
    expect(src).toContain('const latestTurn = await theLastRealTurn(this.prisma, checkIn.id);');
    expect(src).toContain('const last = await theLastRealTurn(this.prisma, c.id);');
    expect(src).toContain('if (c.warningFiredAt) continue;');
    expect(src).toContain('content: THE_WARNING_TURN,');
    expect(src).toContain('withAdvisoryLock(CronLock.HALFWAY_REMINDERS');
    expect(src).toContain("absoluteStale ? 'age' : 'quiet'");
  });
});
