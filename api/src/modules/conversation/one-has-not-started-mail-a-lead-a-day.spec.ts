import { RemindService } from './remind.service';
import { theOneEmailForTheLead, theEmailForTheLead } from './chasing-belongs-to-the-lead';
import { ROUTINE_EMAILS } from '../engagement/one-routine-message-a-day';
import { whatThisMailIs } from '../email/nothing-goes-out-that-was-turned-off';

/**
 * ONE "HAS NOT STARTED" MAIL A LEAD A DAY (after-piece check, 8 October). Mira, who leads three check-ins, was sent the what-is-new letter and three
 * "has not started" mails on one morning, because that mail was marked "asked for" and gathered per check-in. It is a chase Groundwork decided to send:
 * one mail to the lead, every check-in in it, counted as her one routine message of the day.
 */
const NOW = new Date('2026-10-25T08:00:00.000Z');
const lead = { email: 'mira@x.test', firstName: 'Mira' };
const ground = (id: string, label: string) => ({ label, organizationId: 'org', initiatorId: 'u-mira', createdAt: new Date('2026-10-02T00:00:00Z'), brief: null, chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: lead, id });
const row = (n: string, groundId: string, label: string, first: string) => ({
  id: `c${n}`, createdAt: new Date('2026-10-05T08:00:00.000Z'), sessionNumber: 1, availableFrom: null, participantId: `p${n}`, groundId, leadToldAt: null,
  ground: ground(groundId, label),
  participant: { id: `p${n}`, email: `${first}@x.test`, userId: `u${n}`, lastNudgedAt: new Date('2026-10-19T08:00:00.000Z'), user: { firstName: first, lastName: '', emailNotifications: true, isActive: true, deletedAt: null } },
});

async function sweep(outcome: 'sent' | 'suppressed') {
  const rows = [row('1', 'g1', 'Sales plan', 'Grace'), row('2', 'g1', 'Sales plan', 'Alan'), row('3', 'g2', 'Hiring', 'Ines'), row('4', 'g3', 'Launch', 'Omar')];
  const told: { to: string; subject: string; text: string }[] = [];
  const stamped: string[][] = [];
  const prisma: any = {
    checkIn: {
      findMany: jest.fn(async (a: any) => (a.where?.status === 'NOT_STARTED' && a.select?.leadToldAt ? rows : [])),
      updateMany: jest.fn(async (a: any) => { stamped.push(a.where.id.in); return {}; }),
    },
    groundParticipant: { findMany: jest.fn(async () => []), update: jest.fn(async () => ({})), findUnique: jest.fn(async () => null) },
    leaveRequest: { findMany: jest.fn(async () => []) },
  };
  const email: any = { sendNudge: jest.fn(), sendWhoHasNotStarted: jest.fn(async (to: string, subject: string, text: string) => { told.push({ to, subject, text }); return outcome; }), buildCheckInUrl: (i: string) => i, frontendUrl: 'https://app.test' };
  await new RemindService(prisma, email, { tell: async () => [] } as any).sendScheduledNudges();
  return { told, stamped };
}

describe('one has-not-started mail a lead a day', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  it('a lead with three check-ins is sent one mail with all three in it, and every check-in is marked told', async () => {
    const { told, stamped } = await sweep('sent');
    expect(told).toHaveLength(1);
    expect(told[0].to).toBe('mira@x.test');
    for (const w of ['"Sales plan"', '"Hiring"', '"Launch"', 'Grace and Alan', 'Ines', 'Omar']) expect(told[0].text).toContain(w);
    expect(stamped).toHaveLength(1);
    expect(stamped[0].sort()).toEqual(['c1', 'c2', 'c3', 'c4']);
  });

  it('it is the lead\'s one routine message of the day, not something she asked for', () => {
    expect(ROUTINE_EMAILS.has('sendWhoHasNotStarted')).toBe(true);
    expect(whatThisMailIs('sendWhoHasNotStarted')).toBe('we decided to send it');
  });

  it('when her one message of the day had gone, nothing is marked told, so she is told tomorrow', async () => {
    const { told, stamped } = await sweep('suppressed');
    expect(told).toHaveLength(1);
    expect(stamped).toHaveLength(0);
  });
});

describe('what the lead reads', () => {
  const g = (over: any = {}) => ({ groundLabel: 'Sales plan', whoHasNotStarted: ['Ines'], chasedOn: [3, 7, 14], remindedNames: ['Ines'], lastRemindedOn: '19 October', ...over });

  it('never puts a capital letter after the comma that follows her name', () => {
    for (const who of [['Someone'], ['Someone', 'Someone'], ['Ines'], ['Grace', 'Alan']]) {
      const text = theOneEmailForTheLead({ leadName: 'Mira', grounds: [g({ whoHasNotStarted: who, remindedNames: who })], link: 'https://app.test' })!.text;
      expect(text.split('\n')[0]).not.toMatch(/, [A-Z](?!ra|lan|nes)/);
    }
    expect(theOneEmailForTheLead({ leadName: 'Mira', grounds: [g({ whoHasNotStarted: ['Someone', 'Someone'], remindedNames: ['Someone', 'Someone'] })], link: 'x' })!.text.split('\n')[0])
      .toBe('Hi Mira, two people have not started the check-in on "Sales plan".');
  });

  it('says the reminders have stopped once, not twice', () => {
    const text = theOneEmailForTheLead({ leadName: 'Mira', grounds: [g()], link: 'x' })!.text;
    expect(text).toContain('Groundwork reminded Ines, the last time on 19 October, and has now stopped reminding Ines.');
    expect(text).not.toContain('will not remind');
    const none = theOneEmailForTheLead({ leadName: 'Mira', grounds: [g({ remindedNames: [] })], link: 'x' })!.text;
    expect(none).toContain('Groundwork has stopped sending Ines reminders.');
    expect((none.match(/Groundwork/g) ?? []).length).toBe(1);
  });

  it('after one named person it does not say "their"', () => {
    const text = theEmailForTheLead({ leadName: 'Mira', ...g(), link: 'x' })!.text;
    expect(text).toContain('Hi Mira, Ines has not started the check-in on "Sales plan".');
    expect(text.split('\n').slice(0, 3).join(' ')).not.toMatch(/\btheir check-in\b/);
  });

  it('with three check-ins, reads as one mail, check-in by check-in, and never a count of people', () => {
    const m = theOneEmailForTheLead({ leadName: 'Mira', grounds: [g(), g({ groundLabel: 'Hiring', whoHasNotStarted: ['Grace', 'Alan'], remindedNames: ['Grace', 'Alan'] }), g({ groundLabel: 'Launch', leadIsOpenToo: true })], link: 'https://app.test/grounds' })!;
    expect(m.subject).toBe('Some of the people you invited have not started their check-ins');
    expect(m.text).toContain('On "Sales plan", Ines has not started.');
    expect(m.text).toContain('On "Hiring", Grace and Alan have not started.');
    expect(m.text).toContain('Your own check-in on "Launch" is still open too.');
    expect(m.text).not.toMatch(/\d+\s+(people|of them|outstanding)/i);
  });
});
