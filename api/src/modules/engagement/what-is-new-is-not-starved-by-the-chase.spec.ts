import { sendHeresWhatIsNew, MOST_LISTED } from './heres-what-is-new';
import { EmailService } from '../email/email.service';
import { ENGAGEMENT_MOMENT_KEY } from './the-engagement-release-moment';

/**
 * "HERE IS WHAT IS NEW" IS NOT STARVED BY THE DAILY CHASE (existing-users check, section 15), AS WAIRIMU READS IT.
 *
 * In a copy of a real database three leads who were chased every morning never got it: the chase went first and the one-a-day rule held the announcement back,
 * eight mornings running. It now goes early, as the day's one message, and the chase is tried the next morning. And a lead with many check-ins reads each once,
 * the most recent few by name, and a count of the rest.
 */
const RELEASE = new Date('2026-10-01T00:00:00Z');
const NOW = new Date('2026-10-02T05:30:00Z');
const row = (first: string, status: string) => ({ status, sessionNumber: 1, participant: { userId: `u-${first}`, managingOnly: false, nameGiven: null, user: { firstName: first, lastName: '', email: '', awaitingOrgApproval: false } } });

function lead(grounds: any[]) {
  const sent: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: async ({ where }: any) => (where.key === ENGAGEMENT_MOMENT_KEY ? { value: { at: RELEASE.toISOString() } } : null) },
    ground: { findMany: async () => grounds },
    checkIn: { findMany: async () => [row('Miriam', 'COMPLETED'), row('Omar', 'NOT_STARTED')] },
    user: { findUnique: async () => ({ email: 'wairimu@x.test', firstName: 'Wairimu', deletedAt: null, isActive: true }) },
    notification: { findFirst: async () => null }, scheduledEmail: { findFirst: async () => null },
  };
  const email = { sendHeresWhatIsNew: jest.fn(async (to: string, subject: string, lines: string[]) => { sent.push({ to, subject, lines }); return 'sent'; }) };
  return { run: () => sendHeresWhatIsNew({ prisma, email, frontendUrl: 'https://app.test' }, NOW), sent };
}
const g = (id: string, label: string, day: number) => ({ id, label, initiatorId: 'u-w', runsUntilEnded: true, createdAt: new Date(Date.UTC(2026, 8, day)) });

describe('a lead with many check-ins', () => {
  it('reads each once, the most recent five by name, and a count of the rest', async () => {
    const grounds = [g('g1', 'Sales team, Q4', 1), g('g2', 'Kenya launch', 2), g('g3', 'Product', 3), g('g4', 'Operations', 4), g('g5', 'Finance', 5), g('g6', 'Hiring', 6), g('g7', 'Sales team, Q4', 7), g('g8', 'Sales team, q4', 8)];
    const w = lead(grounds);
    expect(await w.run()).toEqual({ tried: 1 });
    const lines: string[] = w.sent[0].lines;
    const named = lines.filter((l) => l.startsWith('In "'));
    expect(named).toHaveLength(MOST_LISTED);
    expect(new Set(named.map((l) => l.split('"')[1].toLowerCase())).size).toBe(MOST_LISTED);
    expect(lines).toContain('One more is still going.');
    expect(w.sent[0].subject).toBe('Here is where your six check-ins stand, and what is new');
    expect(lines.join(' ')).not.toMatch(/Sales team, Q4.*Sales team, Q4/i);
  });
  it('and a lead with a few reads them all, with no count of the rest', async () => {
    const w = lead([g('g1', 'Sales team, Q4', 1), g('g2', 'Kenya launch', 2)]);
    await w.run();
    expect(w.sent[0].lines.filter((l: string) => l.startsWith('In "'))).toHaveLength(2);
    expect(w.sent[0].lines.join(' ')).not.toMatch(/more (is|are) still going/);
  });
});

describe('the announcement goes first, and the chase is tried the next morning', () => {
  it('the one routine message of the day is the announcement, and the chase after it is refused and not used up', async () => {
    const notifications: any[] = [];
    const prisma: any = {
      notification: { create: jest.fn(async ({ data }: any) => { notifications.push({ ...data, createdAt: new Date() }); return data; }), findMany: jest.fn(async ({ where }: any) => notifications.filter((n) => n.outcome === where.outcome && where.toAddress.in.includes(n.toAddress) && where.sender.in.includes(n.sender))) },
      whatsAppSend: { findMany: jest.fn(async () => []) }, person: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) }, user: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      emailPreference: { findMany: jest.fn(async () => []) }, emailAddressPreference: { findUnique: jest.fn(async () => null) }, emailDelivery: { findFirst: jest.fn(async () => null) }, groundParticipant: { findUnique: jest.fn(async () => null) }, scheduledEmail: { create: jest.fn() },
    };
    const email: any = new EmailService({ get: () => undefined } as any, {} as any, prisma);
    email.deliverNow = jest.fn(async (o: any, _c: any, sender: string) => { await email.writeItDown(o, sender, 'sent', null); return 'sent'; });
    email.holdForTheMorning = jest.fn(async () => false);
    email.theWayToStopBeingChased = jest.fn(async () => '');
    await email.sendHeresWhatIsNew('wairimu@x.test', 'What is new', ['Hello.'], 'See', 'https://app.test');
    const chase = await email.sendNudge('wairimu@x.test', 'Kenya launch', 'https://app.test/c', undefined, undefined, null, 'p1');
    expect(chase).toBe('suppressed');
    expect(notifications.map((n) => [n.sender, n.outcome])).toEqual([['sendHeresWhatIsNew', 'sent'], ['sendNudge', 'suppressed']]);
  });
});
