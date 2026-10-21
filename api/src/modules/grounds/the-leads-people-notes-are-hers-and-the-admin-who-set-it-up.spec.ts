import { GroundsService } from './grounds.service';
import { readsTheLeadsPeopleNotes } from './who-may-read-this-check-in';
import { theAdminsWhoAlsoReadYourPeopleNotes, whoReadsAPlan, theLeadActsOnAPerson } from '../board/your-team-person-by-person';
import { PartyType } from '@prisma/client';

/**
 * PRIVACY: THE LEAD'S PEOPLE NOTES AND HER PLAN FOR A PERSON (Hafsah, 21 October; browser test, finding 26).
 *
 * Grace runs "Sales team, Q4" at Drop Access. Her note on Joseph and the plan she started for him from the board ("Start a plan", kept
 * as what she wants to help him with) are served, on GET /grounds/:id, to Grace, and to an admin only if that admin set the check-in up
 * or approved it. Amina, an admin who did neither, was served the plan (finding 26) and is now refused it. Otieno, the admin who set it
 * up, and Halima, the admin who approved it, are served it. Joseph, whom it is about, and Kevin, a colleague, are refused it. Every
 * reader who reads the check-in's shared lines still reads them, so this is not a page that lost its lines.
 */
const GRACE = 'u-grace';
const AMINA = 'u-amina';
const OTIENO = 'u-otieno';
const HALIMA = 'u-halima';
const JOSEPH = 'u-joseph';
const KEVIN = 'u-kevin';
const ROLE: Record<string, string> = { [GRACE]: 'LEAD', [AMINA]: 'ADMIN', [OTIENO]: 'ADMIN', [HALIMA]: 'ADMIN', [JOSEPH]: 'MEMBER', [KEVIN]: 'MEMBER' };
const FIRST: Record<string, string> = { [GRACE]: 'Grace', [AMINA]: 'Amina', [OTIENO]: 'Otieno', [HALIMA]: 'Halima', [JOSEPH]: 'Joseph', [KEVIN]: 'Kevin' };

const NOTE_ON_JOSEPH = 'Joseph needs a day on every next step before he leaves a visit.';
const PLAN_FOR_JOSEPH = 'Help Joseph get a signed order form for each sale he says is made.';
const A_SHARED_RULE = 'Every sale needs a signed order form or a payment record.';

const person = (id: string, userId: string, lead = false) => ({
  id, userId, email: `${FIRST[userId].toLowerCase()}@dropaccess.test`, partyType: lead ? PartyType.INITIATOR : PartyType.PARTICIPANT, roleAsDescribed: null,
  nameGiven: null, organisationGiven: null, managingOnly: lead, invitedAt: new Date(), notifiedAt: new Date(), soloArtifactAt: null,
  soloArtifactShared: false, createdAt: new Date('2026-10-01'), user: { firstName: FIRST[userId], lastName: 'Test' },
});

function theCheckIn(over: { createdByUserId?: string; approvedById?: string | null } = {}) {
  return {
    id: 'g-sales', label: 'Sales team, Q4', organizationId: 'org-drop', scenario: 'OKR_ALIGNMENT', initiatorId: GRACE,
    createdByUserId: over.createdByUserId ?? OTIENO, approvedById: over.approvedById === undefined ? HALIMA : over.approvedById,
    createdAt: new Date(), timelineDays: null, restrictExternalVisibility: true, peersVisibleToEachOther: true, whoSeesTargets: 'EVERYBODY',
    participants: [person('p-grace', GRACE, true), person('p-joseph', JOSEPH), person('p-kevin', KEVIN)],
    checkIns: [], resolution: null, patternDetections: [], objectives: [],
    report: { id: 'r1', releasedAt: new Date(), sharedPicture: null, createdAt: new Date() },
  };
}

const LINES = [
  { id: 'l-rule', kind: 'WAY_OF_WORKING', text: A_SHARED_RULE, saidAs: null, audience: 'EVERYONE', aboutParticipantId: null, closedAt: null, createdAt: new Date('2026-10-02') },
  { id: 'l-note', kind: 'PERSON_NOTE', text: NOTE_ON_JOSEPH, saidAs: null, audience: 'LEAD_ONLY', aboutParticipantId: 'p-joseph', closedAt: null, createdAt: new Date('2026-10-03') },
  { id: 'l-plan', kind: 'HELP_WITH', text: PLAN_FOR_JOSEPH, saidAs: null, audience: 'LEAD_ONLY', aboutParticipantId: 'p-joseph', closedAt: null, createdAt: new Date('2026-10-04') },
];

function servedTo(userId: string, ground = theCheckIn()) {
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0) };
  const own: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role: ROLE[userId], organizationId: 'org-drop', email: `${FIRST[userId].toLowerCase()}@dropaccess.test` })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
    groundContextItem: { findMany: async () => LINES.map((l) => ({ ...l })) },
  };
  /* Anything else the read asks for is empty. */
  const prisma: any = new Proxy(own, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$') && prop !== 'then') target[prop] = { ...reads };
      return target[prop];
    },
  });
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any)
    .get('g-sales', 'org-drop', userId) as Promise<any>;
}

describe('the lead’s People notes and her plan for a person, as each reader is served them (GET /grounds/:id)', () => {
  it('Grace, who runs it, is served her note on Joseph and her plan for him', async () => {
    const words = JSON.stringify(await servedTo(GRACE));
    expect(words).toContain(NOTE_ON_JOSEPH);
    expect(words).toContain(PLAN_FOR_JOSEPH);
  });

  it('Amina, an admin who neither set it up nor approved it, is refused both, and still reads the shared rule', async () => {
    const served = await servedTo(AMINA);
    const words = JSON.stringify(served);
    expect(words).not.toContain(NOTE_ON_JOSEPH);
    expect(words).not.toContain(PLAN_FOR_JOSEPH);
    expect((served.contextItems ?? []).map((l: any) => l.text)).toContain(A_SHARED_RULE);
  });

  it('Otieno, the admin who set it up, is served both', async () => {
    const words = JSON.stringify(await servedTo(OTIENO));
    expect(words).toContain(NOTE_ON_JOSEPH);
    expect(words).toContain(PLAN_FOR_JOSEPH);
  });

  it('Halima, the admin who approved it, is served both', async () => {
    const words = JSON.stringify(await servedTo(HALIMA));
    expect(words).toContain(NOTE_ON_JOSEPH);
    expect(words).toContain(PLAN_FOR_JOSEPH);
  });

  it('once nobody but Grace set it up and nobody approved it, Otieno and Halima are refused too', async () => {
    const lone = theCheckIn({ createdByUserId: GRACE, approvedById: null });
    for (const admin of [OTIENO, HALIMA, AMINA]) {
      const words = JSON.stringify(await servedTo(admin, lone));
      expect(words).not.toContain(NOTE_ON_JOSEPH);
      expect(words).not.toContain(PLAN_FOR_JOSEPH);
    }
  });

  it('Joseph, whom it is about, and Kevin, a colleague, are refused both', async () => {
    for (const member of [JOSEPH, KEVIN]) {
      const served = await servedTo(member);
      const words = JSON.stringify(served);
      expect(words).not.toContain(NOTE_ON_JOSEPH);
      expect(words).not.toContain(PLAN_FOR_JOSEPH);
      expect((served.contextItems ?? []).map((l: any) => l.text)).toContain(A_SHARED_RULE);
    }
  });

  it('the rule itself: the lead, and an admin of this organisation who set it up or approved it, and nobody else', () => {
    const g = theCheckIn();
    const v = (userId: string, organizationId = 'org-drop') => ({ userId, role: ROLE[userId] as any, organizationId });
    expect(readsTheLeadsPeopleNotes(v(GRACE), g)).toBe(true);
    expect(readsTheLeadsPeopleNotes(v(OTIENO), g)).toBe(true);
    expect(readsTheLeadsPeopleNotes(v(HALIMA), g)).toBe(true);
    expect(readsTheLeadsPeopleNotes(v(AMINA), g)).toBe(false);
    expect(readsTheLeadsPeopleNotes(v(JOSEPH), g)).toBe(false);
    /* An admin of another organisation who somehow set it up is a stranger here. */
    expect(readsTheLeadsPeopleNotes(v(OTIENO, 'org-other'), g)).toBe(false);
    expect(readsTheLeadsPeopleNotes(null, g)).toBe(false);
  });
});

describe('the sentence Grace reads says who else reads a plan, exactly', () => {
  const users = (rows: { id: string; firstName: string; role: string }[]) => ({
    user: { findMany: async ({ where }: any) => rows.filter((u) => where.id.in.includes(u.id)).map((u) => ({ ...u, organizationId: 'org-drop' })) },
  });
  const ADMINS = [{ id: OTIENO, firstName: 'Otieno', role: 'ADMIN' }, { id: HALIMA, firstName: 'Halima', role: 'ADMIN' }];

  it('names the admin who set it up and the admin who approved it', async () => {
    const also = await theAdminsWhoAlsoReadYourPeopleNotes(users(ADMINS), theCheckIn());
    expect(whoReadsAPlan(also)).toBe('Only you read it, and Otieno, the admin who set up this check-in, and Halima, the admin who approved it.');
  });

  it('one admin who did both is named once', async () => {
    const also = await theAdminsWhoAlsoReadYourPeopleNotes(users(ADMINS), theCheckIn({ createdByUserId: OTIENO, approvedById: OTIENO }));
    expect(whoReadsAPlan(also)).toBe('Only you read it, and Otieno, the admin who set up and approved this check-in.');
  });

  it('says only you where Grace set it up herself and nobody approved it', async () => {
    const also = await theAdminsWhoAlsoReadYourPeopleNotes(users(ADMINS), theCheckIn({ createdByUserId: GRACE, approvedById: null }));
    expect(whoReadsAPlan(also)).toBe('Only you read it.');
  });

  it('never says "your organisation’s admins" when Grace starts a plan for Joseph from the board', async () => {
    const ground = { ...theCheckIn({ createdByUserId: OTIENO, approvedById: null }), participants: [person('p-grace', GRACE, true), { ...person('p-joseph', JOSEPH), leftAt: null }] };
    const prisma: any = {
      ...users(ADMINS),
      ground: { findUnique: async () => ground },
      organization: { findUnique: async () => ({ directMorningOn: true }) },
      groundContextItem: { create: async () => ({ id: 'l-new' }) },
      personLeadAction: { create: async () => ({}) },
    };
    const r = await theLeadActsOnAPerson(prisma, { updateWorkItem: async () => null }, 'g-sales', 'p-joseph', GRACE, { kind: 'plan', text: PLAN_FOR_JOSEPH } as any);
    expect(r.says).toBe('Your plan for Joseph is kept here and under People on References and resources. Only you read it, and Otieno, the admin who set up this check-in.');
    expect(r.says).not.toMatch(/organisation’s admins/);
  });
});
