import { RemindService } from '../conversation/remind.service';

/**
 * JOURNEY 3: FOUR PEOPLE INVITED, NOBODY STARTED (decision 109; spec section 36), AS WAIRIMU READS THE ONE MESSAGE SHE GETS.
 *
 * It says who has not started, what Groundwork sent and when, that Groundwork has stopped, and that she need do nothing; it offers words she may send.
 * It never tells her the chasing is hers now. Only people really sent a reminder are said to have been reminded.
 */
const NOW = new Date('2026-10-25T08:00:00.000Z');

function sweep(sentTo: { toAddress: string; createdAt: Date }[]) {
  const lead = { email: 'wairimu@x.test', firstName: 'Wairimu' };
  const ground = { label: 'Kenya launch', organizationId: 'org', initiatorId: 'u-w', brief: null, chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: lead };
  const people = [['Omar', 'omar@x.test'], ['Vera', 'vera@x.test'], ['Bisi', 'bisi@x.test'], ['Femi', 'femi@x.test']];
  const rows = people.map(([name, email], i) => ({
    id: `c${i}`, createdAt: new Date('2026-10-05T08:00:00.000Z'), sessionNumber: 1, availableFrom: null, participantId: `p${i}`, groundId: 'g1', leadToldAt: null, ground,
    participant: { id: `p${i}`, email, userId: `u${i}`, lastNudgedAt: new Date('2026-10-19T08:00:00.000Z'), user: { firstName: name, emailNotifications: true, isActive: true, deletedAt: null } },
  }));
  const told: { subject: string; text: string }[] = [];
  const prisma: any = {
    checkIn: { findMany: jest.fn(async (a: any) => (a.where?.status === 'NOT_STARTED' && a.select?.leadToldAt ? rows : [])), updateMany: jest.fn(async () => ({})) },
    groundParticipant: { findMany: jest.fn(async () => []), update: jest.fn(async () => ({})), findUnique: jest.fn(async () => null) },
    leaveRequest: { findMany: jest.fn(async () => []) },
    notification: { findMany: jest.fn(async () => sentTo) },
  };
  const email: any = {
    sendNudge: jest.fn(async () => undefined),
    sendWhoHasNotStarted: jest.fn(async (_to: string, subject: string, text: string) => { told.push({ subject, text }); }),
    buildCheckInUrl: (id: string) => `https://app.test/checkin/${id}`,
    frontendUrl: 'https://app.test',
  };
  return { service: new RemindService(prisma, email, { tell: async () => [] } as any), told };
}

describe('what Wairimu reads when four people have not started', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  it('who, what Groundwork sent and when, that it has stopped, and that she need do nothing', async () => {
    const w = sweep(['omar', 'vera', 'bisi', 'femi'].map((n) => ({ toAddress: `${n}@x.test`, createdAt: new Date('2026-10-19T08:00:00.000Z') })));
    await w.service.sendScheduledNudges();
    expect(w.told).toHaveLength(1);
    expect(w.told[0].subject).toBe('Omar, Vera, Bisi and Femi have not started "Kenya launch", and Groundwork has reminded them');
    const lines = w.told[0].text.split('\n').filter(Boolean);
    expect(lines).toEqual([
      'Wairimu,',
      'Omar, Vera, Bisi and Femi have not started their check-in on "Kenya launch".',
      expect.stringMatching(/^Groundwork reminded them, the last time on .*19.*, and has now stopped reminding them\.$/),
      'You do not need to do anything. If you would like to write to them yourself, this message is ready for you to send:',
      '"I would value your view on Kenya launch. It takes about five minutes, and the link in the email Groundwork sent you opens it."',
      'https://app.test/grounds',
    ]);
    expect(w.told[0].text).not.toMatch(/yours now|this is yours|your job|you should chase/i);
  });

  it('says only the people who were really sent a reminder were reminded', async () => {
    const w = sweep([{ toAddress: 'omar@x.test', createdAt: new Date('2026-10-19T08:00:00.000Z') }]);
    await w.service.sendScheduledNudges();
    expect(w.told[0].text).toMatch(/Groundwork reminded Omar, the last time on .*, and has now stopped reminding those people\./);
    expect(w.told[0].text).not.toMatch(/reminded Vera|reminded them/);
  });

  it('and says nothing false when none was sent', async () => {
    const w = sweep([]);
    await w.service.sendScheduledNudges();
    expect(w.told[0].text).toContain('Groundwork has stopped sending them reminders.');
    expect(w.told[0].subject).toBe('Omar, Vera, Bisi and Femi have not started "Kenya launch"');
  });
});

describe('the lead is one of the people who has not started', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());
  it('reads "you", never her own name, and the verb agrees', async () => {
    const w = sweep([]);
    /* Omar is the lead of this check-in. */
    const rows = (w.service as any).prisma.checkIn.findMany;
    const orig = rows.getMockImplementation();
    rows.mockImplementation(async (a: any) => {
      const r: any[] = await orig(a);
      return r.map((x) => (x.participant.user.firstName === 'Omar' ? { ...x, ground: { ...x.ground, initiatorId: 'u0' } } : x));
    });
    await w.service.sendScheduledNudges();
    expect(w.told[0].subject).toBe('You, Vera, Bisi and Femi have not started "Kenya launch"');
    expect(w.told[0].text).toContain('You, Vera, Bisi and Femi have not started their check-in on "Kenya launch".');
    expect(w.told[0].text).not.toMatch(/Omar/);
  });
});
