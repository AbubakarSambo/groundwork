import { remindThemToCarryOn, warnTheirPhone, tellThemTheClockClosedIt, carryOnSaying, closesInHalfAnHourSaying, closedByTheClockSaying } from './a-check-in-left-halfway';
import { FIRST_MESSAGES, OPENING_OR_CLOSING, isBusinessInitiated } from './a-message-outside-the-window';

/**
 * AMANI STOPPED HALFWAY THROUGH HER CHECK-IN ON WHATSAPP. Her words are kept; her phone is reminded once,
 * warned before the clock closes it, and told when it did. What she reads, word for word.
 */
const HOUR = 3_600_000;
const NOON_LAGOS = new Date('2026-10-06T11:00:00Z');
function aWorld(o: { overWhatsApp?: boolean | null; wroteOnWhatsApp?: boolean; reminded?: boolean } = {}) {
  const sent: any[] = [];
  const began = new Date(NOON_LAGOS.getTime() - 5 * HOUR);
  const prisma: any = {
    checkIn: { findUnique: jest.fn(async () => ({ startedAt: began, createdAt: began, ground: { organizationId: 'org-1', label: 'Sales team, Q4', overWhatsApp: o.overWhatsApp ?? null }, participant: { email: 'amani@kito.test', user: { firstName: 'Amani', phoneNumber: null, deletedAt: null } } })) },
    person: { findFirst: jest.fn(async () => ({ phone: '+254700000001', whatsappLastInboundAt: o.wroteOnWhatsApp === false ? null : new Date(began.getTime() + HOUR) })) },
    whatsAppSend: { findFirst: jest.fn(async () => (o.reminded ? { id: 'r1' } : null)) },
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
    for (const o of [{ overWhatsApp: false }, { wroteOnWhatsApp: false }]) {
      const w = aWorld(o);
      expect(await remindThemToCarryOn(w.prisma, w.whatsapp, { id: 'ci-1' }, lastAsked(4), NOON_LAGOS)).toBe(false);
      expect(await warnTheirPhone(w.prisma, w.whatsapp, 'ci-1')).toBe(false);
      expect(await tellThemTheClockClosedIt(w.prisma, w.whatsapp, 'ci-1')).toBe(false);
      expect(w.sent).toEqual([]);
    }
  });

  it('the half-hour warning reaches her phone, and so does the clock closing it', async () => {
    const w = aWorld();
    await warnTheirPhone(w.prisma, w.whatsapp, 'ci-1');
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
