import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OnboardingBoardService, BOARD_REFUSED } from './the-onboarding-board.service';

/**
 * THE ONBOARDING BOARD, AS EACH PERSON IS SERVED IT (E1, U.17).
 *
 * Baridi Appliances. Grace is an admin. Wairimu is the Sales lead; Kamau is the Operations lead.
 * Faith joined Sales on 21 September as a sales rep, with Wairimu as her manager; she has done 2 of
 * the 4 steps for her role. Otieno joined Operations on 14 September. Miriam, a sales rep, finished
 * being set up months ago. Aisha joined long ago and is past the 90-day window, with steps still open.
 *
 * The rules under test, each read from what the server actually hands each reader:
 *   - nobody reads the board while the onboarding suite is off;
 *   - an admin reads everybody still being set up, with each person's steps and how far they are;
 *   - a lead reads only the new people in their own team: by manager, or by department;
 *   - the new person herself, a colleague and a guest are refused;
 *   - nothing is served about how anybody's work is going, and no label on anybody.
 */

const ORG = 'org-baridi';
const NOW = new Date('2026-09-27T09:00:00Z');
const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-kamau': 'LEAD', 'u-faith': 'MEMBER', 'u-miriam': 'MEMBER', 'u-tomas': 'GUEST', 'u-lina': 'LEAD',
};
const directory = [
  { externalId: 'p-wairimu', linkedUserId: 'u-wairimu', displayName: 'Wairimu Kamau', givenName: 'Wairimu', familyName: 'Kamau', department: 'Sales', managerExternalId: null, active: true },
  { externalId: 'p-kamau', linkedUserId: 'u-kamau', displayName: 'Kamau Njenga', givenName: 'Kamau', familyName: 'Njenga', department: 'Operations', managerExternalId: null, active: true },
  { externalId: 'p-lina', linkedUserId: 'u-lina', displayName: 'Lina Mutua', givenName: 'Lina', familyName: 'Mutua', department: '', managerExternalId: null, active: true },
  { externalId: 'p-faith', linkedUserId: 'u-faith', displayName: 'Faith Kerubo', givenName: 'Faith', familyName: 'Kerubo', department: null, managerExternalId: 'p-wairimu', active: true },
  { externalId: 'p-otieno', linkedUserId: null, displayName: 'Otieno Ouma', givenName: 'Otieno', familyName: 'Ouma', department: 'Operations', managerExternalId: null, active: true },
  { externalId: 'p-miriam', linkedUserId: 'u-miriam', displayName: 'Miriam Wanjiku', givenName: 'Miriam', familyName: 'Wanjiku', department: 'Sales', managerExternalId: 'p-wairimu', active: true },
  { externalId: 'p-aisha', linkedUserId: null, displayName: 'Aisha Otieno', givenName: 'Aisha', familyName: 'Otieno', department: 'Sales', managerExternalId: 'p-wairimu', active: true },
];
const assignments = [
  { personExternalId: 'p-faith', roleName: 'Sales rep', startedAt: new Date('2026-09-21T08:00:00Z'), endedAt: null },
  { personExternalId: 'p-otieno', roleName: 'Driver', startedAt: new Date('2026-09-14T08:00:00Z'), endedAt: null },
  { personExternalId: 'p-miriam', roleName: 'Sales rep', startedAt: new Date('2026-03-01T08:00:00Z'), endedAt: null },
  { personExternalId: 'p-aisha', roleName: 'Sales rep', startedAt: new Date('2026-01-10T08:00:00Z'), endedAt: null },
];
const gate = (id: string, name: string, ordinal: number, over: any = {}) => ({ id, key: id, name, description: null, ordinal, required: true, ...over });
const tracks = [
  { roleName: 'Sales rep', gates: [
    gate('g-id', 'Send your ID and tax PIN to Grace', 0),
    gate('g-laptop', 'Collect your laptop and phone from Kamau', 1),
    gate('g-security', 'Finish the security training', 2, { description: 'About 30 minutes' }),
    gate('g-meet', 'Meet Wairimu about your first 90 days', 3, { required: false }),
  ] },
  { roleName: 'Driver', gates: [gate('d-licence', 'Show your driving licence to Grace', 0)] },
];
const statuses = [
  { personExternalId: 'p-faith', gateId: 'g-id', state: 'DONE', completedAt: new Date('2026-09-22T10:00:00Z') },
  { personExternalId: 'p-faith', gateId: 'g-laptop', state: 'WAIVED', completedAt: new Date('2026-09-22T10:00:00Z') },
  ...['g-id', 'g-laptop', 'g-security', 'g-meet'].map((g) => ({ personExternalId: 'p-miriam', gateId: g, state: 'DONE', completedAt: new Date('2026-03-05') })),
];

function setup(on = true) {
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) =>
      where.organizationId_suite.organizationId === ORG && where.organizationId_suite.suite === 'onboard' ? { isOn: on } : null) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => {
      const { userId, organizationId } = where.userId_organizationId;
      return organizationId === ORG && roles[userId] ? { role: roles[userId] } : null;
    }) },
    person: {
      findFirst: jest.fn(async ({ where }: any) => directory.find((p) => p.linkedUserId === where.linkedUserId) ?? null),
      findMany: jest.fn(async ({ where }: any) => directory.filter((p) => where.externalId.in.includes(p.externalId))),
    },
    roleAssignment: { findMany: jest.fn(async () => assignments) },
    onboardingTrack: { findMany: jest.fn(async () => tracks) },
    onboardingStatus: { findMany: jest.fn(async () => statuses) },
  };
  const svc = new OnboardingBoardService(prisma);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { svc, as };
}
const names = (r: any) => r.people.map((p: any) => p.name);

describe('while the onboarding suite is off', () => {
  it('nobody reads the board, not even an admin', async () => {
    const { svc, as } = setup(false);
    await expect(svc.forReader(as('u-grace'), NOW)).rejects.toThrow(new NotFoundException(BOARD_REFUSED.notOn));
    await expect(svc.forReader(as('u-wairimu'), NOW)).rejects.toThrow(NotFoundException);
  });
});

describe('Grace, an admin', () => {
  it('reads everybody still being set up, and nobody who has finished or is past the window', async () => {
    const { svc, as } = setup();
    expect(names(await svc.forReader(as('u-grace'), NOW))).toEqual(['Faith Kerubo', 'Otieno Ouma']);
  });

  it('reads each person’s steps, in order, with what is done and how far they are', async () => {
    const { svc, as } = setup();
    const faith = (await svc.forReader(as('u-grace'), NOW)).people[0];
    expect(faith).toEqual({
      id: 'p-faith', name: 'Faith Kerubo', firstName: 'Faith', startedAt: '2026-09-21T08:00:00.000Z', done: 2, of: 4,
      steps: [
        { name: 'Send your ID and tax PIN to Grace', description: null, optional: false, state: 'done', doneAt: '2026-09-22T10:00:00.000Z' },
        { name: 'Collect your laptop and phone from Kamau', description: null, optional: false, state: 'not needed', doneAt: null },
        { name: 'Finish the security training', description: 'About 30 minutes', optional: false, state: 'to do', doneAt: null },
        { name: 'Meet Wairimu about your first 90 days', description: null, optional: true, state: 'to do', doneAt: null },
      ],
    });
  });
});

describe('a lead reads only the new people in their own team', () => {
  it('Wairimu reads Faith, whose manager she is, and not Otieno in Operations', async () => {
    const { svc, as } = setup();
    expect(names(await svc.forReader(as('u-wairimu'), NOW))).toEqual(['Faith Kerubo']);
  });

  it('Kamau reads Otieno, who shares his department, and not Faith', async () => {
    const { svc, as } = setup();
    expect(names(await svc.forReader(as('u-kamau'), NOW))).toEqual(['Otieno Ouma']);
  });

  it('a lead with a blank department and nobody reporting to her reads nobody', async () => {
    const { svc, as } = setup();
    expect(names(await svc.forReader(as('u-lina'), NOW))).toEqual([]);
  });
});

describe('everybody else is refused, in a plain sentence', () => {
  for (const [who, userId] of [['Faith, the new person herself', 'u-faith'], ['Miriam, a colleague', 'u-miriam'], ['a guest from another company', 'u-tomas'], ['somebody not in the organisation', 'u-nobody']]) {
    it(who, async () => {
      const { svc, as } = setup();
      await expect(svc.forReader(as(userId), NOW)).rejects.toThrow(new ForbiddenException(BOARD_REFUSED.onlyAdminsAndLeads));
    });
  }
});

describe('what the board never holds', () => {
  it('no label on anybody, no rating, and no email address', async () => {
    const { svc, as } = setup();
    const served = JSON.stringify(await svc.forReader(as('u-grace'), NOW));
    expect(served).not.toMatch(/\b(PIP|at[- ]risk|exit|behind|late|score|rating|severity)\b|@/i);
  });
});
