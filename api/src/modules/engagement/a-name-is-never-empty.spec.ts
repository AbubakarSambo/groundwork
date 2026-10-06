import { nameToCall } from './a-name-to-call-them';
import { RemindService } from '../conversation/remind.service';
import { theQuietIn } from './who-has-gone-quiet';

/**
 * A NAME IS NEVER EMPTY (existing-users check, section 15), AS WAIRIMU READS IT.
 *
 * 26 of 364 "has not started" subjects read ` has not started "...", and Groundwork has reminded them`. Somebody whose first name was left blank is now called
 * by the rest of the name they gave, then the name they were given, then the start of their address, then "Someone", with the verb that goes with one person.
 */
describe('the name to call somebody by', () => {
  it.each([
    [{ user: { firstName: 'Omar', lastName: 'Bello', email: 'omar@x.test' } }, 'Omar'],
    [{ user: { firstName: '', lastName: 'Bello', email: 'b@x.test' } }, 'Bello'],
    [{ user: { firstName: '  ', lastName: '', email: null }, nameGiven: 'Femi Ade' }, 'Femi Ade'],
    [{ user: { firstName: '', lastName: '', email: 'amina.otieno@x.test' } }, 'Amina Otieno'],
    [{ email: 'k.mensah2@x.test' }, 'K Mensah'],
    [{ user: { firstName: '', lastName: '', email: '' } }, 'Someone'],
    [null, 'Someone'],
  ])('%j reads %s', (p: any, name) => { expect(nameToCall(p)).toBe(name); });
});

describe('the not-started email, when somebody has no first name', () => {
  const NOW = new Date('2026-10-25T08:00:00.000Z');
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());
  it('never opens with a blank, and the verb agrees', async () => {
    const ground = { label: 'Kenya launch', organizationId: 'org', initiatorId: 'u-w', createdAt: new Date('2026-10-02T00:00:00Z'), brief: null, chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: { email: 'w@x.test', firstName: 'Wairimu' } };
    const row = (id: string, first: string, last: string, email: string) => ({ id: `c${id}`, createdAt: new Date('2026-10-05T08:00:00.000Z'), sessionNumber: 1, availableFrom: null, participantId: `p${id}`, groundId: 'g1', leadToldAt: null, ground, participant: { id: `p${id}`, email, userId: `u${id}`, lastNudgedAt: new Date('2026-10-19T08:00:00.000Z'), user: { firstName: first, lastName: last, emailNotifications: true, isActive: true, deletedAt: null } } });
    const told: any[] = [];
    const prisma: any = {
      checkIn: { findMany: jest.fn(async (a: any) => (a.where?.status === 'NOT_STARTED' && a.select?.leadToldAt ? [row('1', '', '', 'amina.otieno@x.test')] : [])), updateMany: jest.fn(async () => ({})) },
      groundParticipant: { findMany: jest.fn(async () => []), update: jest.fn(async () => ({})), findUnique: jest.fn(async () => null) },
      leaveRequest: { findMany: jest.fn(async () => []) },
    };
    const email: any = { sendNudge: jest.fn(), sendWhoHasNotStarted: jest.fn(async (_t: string, subject: string, text: string) => { told.push({ subject, text }); }), buildCheckInUrl: (i: string) => i, frontendUrl: 'https://app.test' };
    await new RemindService(prisma, email, { tell: async () => [] } as any).sendScheduledNudges();
    expect(told[0].subject).toBe('Amina Otieno has not started "Kenya launch", and Groundwork has reminded them');
    expect(told[0].subject.startsWith(' ')).toBe(false);
    expect(told[0].text).toContain('Amina Otieno has not started their check-in on "Kenya launch".');
  });
  it('two people with no name at all are two people, not one', async () => {
    const q = (n: string) => ({ participantId: n, sessionNumber: 2, status: 'NOT_STARTED', createdAt: new Date('2026-10-12T08:00:00Z'), participant: { userId: `u${n}`, managingOnly: false, nameGiven: null, user: { firstName: '', lastName: '', email: '', awaitingOrgApproval: false } } });
    const before = (n: string) => ({ ...q(n), sessionNumber: 1, status: 'COMPLETED' });
    const out = theQuietIn([q('a'), q('b'), before('a'), before('b')], 'X', 'u-lead', NOW, new Date('2026-10-01T00:00:00Z'));
    expect(out!.stoppedAfterAnswering).toEqual(['Someone', 'Someone']);
  });
});
