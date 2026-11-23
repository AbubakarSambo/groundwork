import { ReportsService } from './reports.service';

/**
 * NO FIELD NAMES ON THE PAGE, AND NO SENTENCE TWICE (journey walk, 11 October, rows 1 and 2).
 * A report stored before the rebuild ("Fola joining the ward team") joined its fields into the
 * title: "Clarity on onboarding support. atStake: If this holds, ...". Served through the route,
 * as the lead, a participant and an admin, the heading is the topic, the at-stake text is under
 * "Why this matters", and the conversation worth having says each sentence once.
 */
const person = (id: string, first: string | null, extra: Record<string, any> = {}) => ({
  id, userId: first ? `u-${id}` : null, partyType: 'PARTICIPANT', managingOnly: false, email: `${id}.u8@example.test`,
  nameGiven: null, organisationGiven: null, roleAsDescribed: null, createdAt: new Date('2026-09-20'),
  invitedAt: new Date('2026-09-20'), inviteTokenExpiresAt: new Date('2026-09-21'),
  user: first ? { firstName: first, lastName: 'Test' } : null, ...extra,
});

const AT_STAKE = 'If this holds, the new coordinator may not get the foundational knowledge to perform his role.';
const OLD_DIVERGENCES = [
  /* The old shape: the field joined onto the topic, and also stored on its own. */
  { topic: `Clarity on onboarding support. atStake: ${AT_STAKE}`, atStake: AT_STAKE, positions: [{ participantLabel: 'Amani', view: 'Nobody has shown me the escalation process.' }], evidence: [] },
  /* The old shape with the field only inside the topic. */
  { topic: 'Team integration. atStake: If this holds, the coordinator may keep feeling left out. settledBy: Asking him to lunch.', positions: [{ participantLabel: 'Juma', view: 'He eats alone.' }], evidence: [] },
];
const OLD_QUESTION = `Clarity on onboarding support. atStake: ${AT_STAKE} ${AT_STAKE}`;

const ground = () => ({
  id: 'g-1', organizationId: 'org-1', initiatorId: 'u-lead', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', brief: null, objectives: [], timelineDays: 84,
  peersVisibleToEachOther: true,
  participants: [
    { ...person('lead', 'Rukia'), userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true },
    person('amani', 'Amani'), person('juma', 'Juma'), person('neema', 'Neema'), person('baraka', 'Baraka'), person('halima', 'Halima'),
    /* Invited, never joined, and her invitation has lapsed. */
    person('zawadi', null),
  ],
  report: { releasedAt: new Date('2026-09-23'), agreements: [], divergences: OLD_DIVERGENCES, centralQuestion: OLD_QUESTION, findings: [], direction: null },
});

async function serve(reader: string) {
  /* An admin of the organisation reads this ordinary team check-in as the lead does (decision 5). */
  const svc = Object.create(ReportsService.prototype) as any;
  const reads = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 1, aggregate: async () => ({ _max: {} }) };
  const answered = ['amani', 'juma', 'neema', 'baraka'].map((participantId) => ({ participantId, status: 'COMPLETED' }));
  svc.prisma = new Proxy({
    ground: {
      ...reads,
      findUnique: async (q: any) => {
        const g: any = ground();
        if (!q?.select) return g;
        return Object.fromEntries(Object.keys(q.select).filter((k) => k in g).map((k) => [k, g[k]]));
      },
    },
    checkIn: { ...reads, findMany: async (q: any) => (q?.where?.sessionNumber === 2 && q?.where?.status ? answered : []) },
  } as any, { get: (t: any, k: string) => t[k] ?? reads });
  svc.isAnAdminOf = async () => reader === 'u-admin';
  return svc.sessionReport('g-1', 2, reader, 'org-1');
}

describe.each([['the lead', 'u-lead'], ['a participant', 'u-amani'], ['an admin', 'u-admin']])('as %s', (_who, reader) => {
  it('reads each heading as the topic alone, and the at-stake text under it', async () => {
    const served = await serve(reader);
    const open = served.whereThingsStand.openWithReasons;
    expect(open.map((o: any) => o.topic)).toEqual(['Clarity on onboarding support.', 'Team integration.']);
    expect(open[0].atStake).toBe(AT_STAKE);
    expect(open[1].atStake).toBe('If this holds, the coordinator may keep feeling left out.');
    expect(open[1].settledBy).toBe('Asking him to lunch.');
  });

  it('carries no field name anywhere, and the conversation worth having says each sentence once', async () => {
    const served = await serve(reader);
    expect(JSON.stringify(served)).not.toMatch(/\b(atStake|settledBy|whyItMatters):/);
    /* Changed 24 November (page audit, row 6): the difference is said once, under where things stand, and not again as the question. */
    expect(served.theConversationWorthHaving).toBeNull();
    expect(JSON.stringify(served).split(AT_STAKE).length).toBe(2);
  });
});
