import { GroundsService } from './grounds.service';
import { PartyType } from '@prisma/client';

/**
 * PRIVACY SWEEP 5 OCTOBER 2026, FINDING 2 (decisions 17 and 75 item 14).
 *
 * `GET /grounds/:id` served the room's read raw, with every person's full name beside their aims. A cohort colleague read
 * the other borrowers by name (and what each one named: "bird", Halima Sule), and the person on a first-90-days check-in
 * read the name of the colleague giving views. The board has always served this through the wall and the reader's own
 * "you"; the page now does too, through the same function.
 */
const person = (id: string, userId: string, partyType: PartyType, first: string, last: string, createdAt: string, managingOnly = false) => ({
  id, userId, email: `${first}@x.test`, partyType, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly,
  invitedAt: new Date('2026-09-01T09:00:00Z'), notifiedAt: new Date('2026-09-01T09:05:00Z'), soloArtifactAt: null, soloArtifactShared: false,
  createdAt: new Date(createdAt), user: { firstName: first, lastName: last },
});

const COHORT = () => [
  person('p-lead', 'u-lead', PartyType.INITIATOR, 'Funmi', 'Eze', '2026-09-01', true),
  person('p-yusuf', 'u-yusuf', PartyType.PARTICIPANT, 'Yusuf', 'Garba', '2026-09-02'),
  person('p-halima', 'u-halima', PartyType.PARTICIPANT, 'Halima', 'Sule', '2026-09-03'),
  person('p-grace', 'u-grace', PartyType.PARTICIPANT, 'Grace', 'Danjuma', '2026-09-04'),
  person('p-aisha', 'u-aisha', PartyType.PARTICIPANT, 'Aisha', 'Bello', '2026-09-05'),
  person('p-musa', 'u-musa', PartyType.PARTICIPANT, 'Musa', 'Abdullahi', '2026-09-06'),
];
const THE_COHORTS_ROOM = {
  aims: [
    { aim: 'Pay the loan', held: ['Halima Sule', 'Grace Danjuma', 'Yusuf Garba', 'Aisha Bello'] },
    { aim: 'Get a better price', held: ['Aisha Bello', 'Musa Abdullahi'] },
    { aim: 'Halima Sule wants to replace the 220 birds she lost.', held: ['Halima Sule'] },
  ],
  places: [],
  things: [{ name: 'bird', named: ['Halima Sule'] }, { name: 'clutch', named: ['Yusuf Garba'] }],
};

const NEW_HIRE_PEOPLE = () => [
  person('p-boss', 'u-boss', PartyType.INITIATOR, 'Hafsah', 'Lead', '2026-09-01', true),
  person('p-tobi', 'u-tobi', PartyType.PARTICIPANT, 'Tobi', 'Adeyemi', '2026-09-02'),
  person('p-priya', 'u-priya', PartyType.PARTICIPANT, 'Priya', 'Nair', '2026-09-03'),
];
const THE_NEW_HIRES_ROOM = {
  aims: [
    { aim: 'Know how a team member is doing', held: ['Hafsah Lead', 'Priya Nair'] },
    { aim: 'Get clear information to do my job', held: ['Tobi Adeyemi'] },
  ],
  places: [],
  things: [{ name: 'payment service', named: ['Tobi Adeyemi'] }],
};

function pageFor(userId: string, role: string, check: { scenario: string; initiatorId: string; people: any[]; room: any; peersVisibleToEachOther: boolean | null }) {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: check.scenario, initiatorId: check.initiatorId, createdByUserId: null, createdAt: new Date('2026-09-20T09:00:00Z'), timelineDays: null,
    restrictExternalVisibility: false, peersVisibleToEachOther: check.peersVisibleToEachOther, whoSeesTargets: 'THEIR_OWN',
    participants: check.people, checkIns: [], resolution: null, patternDetections: [], objectives: [], report: null,
    whatTheRoomIsAbout: check.room, whatTheRoomIsAboutSession: 2,
  };
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
  const own: any = {
    patternDetection: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role, organizationId: 'org1' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
  };
  const prisma: any = new Proxy(own, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$') && prop !== 'then') target[prop] = { ...reads };
      return target[prop];
    },
  });
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any)
    .get('g1', 'org1', userId) as Promise<any>;
}

const cohort = { scenario: 'COHORT_CHECK', initiatorId: 'u-lead', people: COHORT(), room: THE_COHORTS_ROOM, peersVisibleToEachOther: false };
const newHire = { scenario: 'NEW_HIRE', initiatorId: 'u-boss', people: NEW_HIRE_PEOPLE(), room: THE_NEW_HIRES_ROOM, peersVisibleToEachOther: null };

describe('what the room is about, on the check-in page of a cohort where people do not see each other', () => {
  it('Yusuf reads no other borrower by name, and no row only one of them holds', async () => {
    const page = await pageFor('u-yusuf', 'MEMBER', cohort);
    const text = JSON.stringify(page.whatTheRoomIsAbout);
    for (const name of ['Halima', 'Grace', 'Aisha', 'Musa', 'Danjuma', 'Abdullahi']) expect(text).not.toContain(name);
    expect(text).not.toContain('220 birds');
    expect(page.whatTheRoomIsAbout.things.map((t: any) => t.name)).toEqual(['clutch']);
  });

  it('Yusuf reads his own part as "You", and the others as a count', async () => {
    const page = await pageFor('u-yusuf', 'MEMBER', cohort);
    const payTheLoan = page.whatTheRoomIsAbout.aims.find((a: any) => a.aim === 'Pay the loan');
    expect(payTheLoan.held).toEqual(['You']);
    expect(payTheLoan.andOthers).toBe(3);
    expect(page.whatTheRoomIsAbout.things[0].named).toEqual(['You']);
  });

  it('the lead reads every name, as before', async () => {
    const page = await pageFor('u-lead', 'LEAD', cohort);
    expect(page.whatTheRoomIsAbout.aims[0].held).toEqual(['Halima Sule', 'Grace Danjuma', 'Yusuf Garba', 'Aisha Bello']);
    expect(page.whatTheRoomIsAbout.aims).toHaveLength(3);
  });

  it('an admin of the organisation reads every name, as before', async () => {
    const page = await pageFor('u-admin', 'ADMIN', cohort);
    expect(page.whatTheRoomIsAbout.aims[0].held).toEqual(['Halima Sule', 'Grace Danjuma', 'Yusuf Garba', 'Aisha Bello']);
  });
});

describe('what the room is about, on the check-in page of a first 90 days (decision 17)', () => {
  it('Tobi does not read the name of the colleague giving views', async () => {
    const page = await pageFor('u-tobi', 'MEMBER', newHire);
    const text = JSON.stringify(page.whatTheRoomIsAbout);
    expect(text).not.toContain('Priya');
    expect(text).not.toContain('Nair');
    expect(page.whatTheRoomIsAbout.aims.find((a: any) => a.aim === 'Know how a team member is doing').held).toEqual(['Hafsah Lead']);
    expect(page.whatTheRoomIsAbout.aims.find((a: any) => /clear information/.test(a.aim)).held).toEqual(['You']);
  });

  it('the lead reads both names, as before', async () => {
    const page = await pageFor('u-boss', 'LEAD', newHire);
    expect(page.whatTheRoomIsAbout.aims[0].held).toEqual(['You', 'Priya Nair']);
  });
});
