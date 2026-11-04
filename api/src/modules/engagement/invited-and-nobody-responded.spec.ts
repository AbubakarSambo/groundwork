import { RemindService } from '../conversation/remind.service';

/**
 * JOURNEY 3: FOUR PEOPLE INVITED, NOBODY STARTED (decision 109; spec section 36), AS WAIRIMU READS THE ONE MESSAGE SHE GETS.
 *
 * It says who has not started, what Groundwork sent and when, that Groundwork has stopped, and that she need do nothing; it offers words she may send.
 * It never tells her the chasing is hers now. Only people really sent a reminder are said to have been reminded.
 */
const NOW = new Date('2026-10-25T08:00:00.000Z');

function sweep(nudged: Record<string, Date | null>) {
  const lead = { email: 'wairimu@x.test', firstName: 'Wairimu' };
  /* Since one calendar for each check-in (29 October), no days given is Monday to Friday, and this test's clock is a Sunday: the team says it works every day, so the test stays about what it was written for. */
  const ground = { label: 'Kenya launch', organizationId: 'org', initiatorId: 'u-w', brief: null, workingDays: [0, 1, 2, 3, 4, 5, 6], chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: lead };
  const people = [['Omar', 'omar@x.test'], ['Vera', 'vera@x.test'], ['Bisi', 'bisi@x.test'], ['Femi', 'femi@x.test']];
  const rows = people.map(([name, email], i) => ({
    id: `c${i}`, createdAt: new Date('2026-10-05T08:00:00.000Z'), sessionNumber: 1, availableFrom: null, participantId: `p${i}`, groundId: 'g1', leadToldAt: null, ground,
    participant: { id: `p${i}`, email, userId: `u${i}`, lastNudgedAt: nudged[name] ?? null, user: { firstName: name, emailNotifications: true, isActive: true, deletedAt: null } },
  }));
  const told: { subject: string; text: string }[] = [];
  const prisma: any = {
    checkIn: { findMany: jest.fn(async (a: any) => (a.where?.status === 'NOT_STARTED' && a.select?.leadToldAt ? rows : [])), updateMany: jest.fn(async () => ({})) },
    groundParticipant: { findMany: jest.fn(async () => []), update: jest.fn(async () => ({})), findUnique: jest.fn(async () => null) },
    leaveRequest: { findMany: jest.fn(async () => []) },
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

  /* Changed 8 October: the greeting is one line with the first sentence, it says 'the check-in', and 'will not remind them again' is gone because it said the same thing twice. */
  it('who, what Groundwork sent and when, and that it has stopped, said once', async () => {
    const at = new Date('2026-10-19T08:00:00.000Z');
    const w = sweep({ Omar: at, Vera: at, Bisi: at, Femi: at });
    await w.service.sendScheduledNudges();
    expect(w.told).toHaveLength(1);
    expect(w.told[0].subject).toBe('Omar, Vera, Bisi and Femi have not started "Kenya launch", and Groundwork has reminded them');
    const lines = w.told[0].text.split('\n').filter(Boolean);
    expect(lines).toEqual([
      'Hi Wairimu, Omar, Vera, Bisi and Femi have not started the check-in on "Kenya launch".',
      expect.stringMatching(/^Groundwork reminded them, the last time on .*19.*, and has now stopped reminding them\.$/),
      'If you still want their view, a short note from you is the next step. You can send a fresh link from the check-in page with Resend invite.',
      'You could write, "I would value your view on Kenya launch. It takes about ten minutes, and I will send you a fresh link if you reply."',
      'https://app.test/grounds',
    ]);
    expect(w.told[0].text).not.toMatch(/yours now|this is yours|your job|you should chase|the link in the email|do not need to do anything/i);
    expect(w.told[0].text).not.toMatch(/:\s*$/m);
  });

  it('a reminder about another check-in to the same address is not claimed: only this check-in\'s own record counts', async () => {
    const w = sweep({});
    await w.service.sendScheduledNudges();
    expect(w.told[0].text).not.toMatch(/reminded|19 October/);
  });

  it('says only the people who were really sent a reminder were reminded', async () => {
    const w = sweep({ Omar: new Date('2026-10-19T08:00:00.000Z') });
    await w.service.sendScheduledNudges();
    expect(w.told[0].text).toMatch(/Groundwork reminded Omar, the last time on .*, and has now stopped reminding that person\./);
    expect(w.told[0].text).not.toMatch(/reminded Vera|reminded them/);
  });

  it('and says nothing false when none was sent', async () => {
    const w = sweep({});
    await w.service.sendScheduledNudges();
    expect(w.told[0].text).toContain('Groundwork has stopped sending them reminders.');
    expect(w.told[0].subject).toBe('Omar, Vera, Bisi and Femi have not started "Kenya launch"');
  });
});

describe('the lead has not started either', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());
  function asLead(w: ReturnType<typeof sweep>, who: string[]) {
    const rows = (w.service as any).prisma.checkIn.findMany;
    const orig = rows.getMockImplementation();
    rows.mockImplementation(async (a: any) => {
      const r: any[] = await orig(a);
      return r.filter((x) => who.includes(x.participant.user.firstName)).map((x) => (x.participant.user.firstName === 'Omar' ? { ...x, ground: { ...x.ground, initiatorId: 'u0' } } : x));
    });
  }
  it('in a mixed round she is left out of the list, and has her own line', async () => {
    const w = sweep({});
    asLead(w, ['Omar', 'Vera', 'Bisi']);
    await w.service.sendScheduledNudges();
    expect(w.told[0].subject).toBe('Vera and Bisi have not started "Kenya launch"');
    const lines = w.told[0].text.split('\n').filter(Boolean);
    expect(lines[0]).toBe('Hi Wairimu, Vera and Bisi have not started the check-in on "Kenya launch". Your own check-in is still open too.');
    expect(w.told[0].text).not.toMatch(/Omar|You, /);
    expect(w.told[0].text).toContain('You can send a fresh link from the check-in page with Resend invite.');
  });
  it('when she is the only one, nothing is sent, because there is nobody else to tell her about', async () => {
    const w = sweep({});
    asLead(w, ['Omar']);
    await w.service.sendScheduledNudges();
    expect(w.told).toEqual([]);
  });
});
