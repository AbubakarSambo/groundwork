import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleMapService } from './the-role-map.service';
import { RoleInterviewService, INTERVIEW_REFUSED } from './the-role-interview.service';
import { RoleGapNotesService } from './the-role-gap-notes.service';
import { notesFrom, theSentenceFor, whatWasWaitedFor } from './the-role-gap-notes';

/**
 * THE ROLE INTERVIEW'S DOOR, AND WHY A JOB NOBODY OWNS MATTERS (request 25), AS EACH READER IS SERVED.
 *
 * Baridi Appliances. Grace is an admin, Wairimu a lead (not an admin), Miriam a member, and Kwame a
 * member who waited for freezers. Stock planning is a role the organisation's system names and
 * nobody holds. Kwame raised a handoff in his own check-in, waiting on "Stock planning" for freezers,
 * three weeks ago, and it is still open.
 */
const ORG = 'org-baridi';
const roleOf: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-miriam': 'MEMBER', 'u-kwame': 'MEMBER', 'u-faith': 'ADMIN' };
const NOW = new Date('2026-10-01T10:00:00Z');
const threeWeeksAgo = new Date(NOW.getTime() - 21 * 86_400_000);

const people = [
  { externalId: 'p-grace', displayName: 'Grace Achieng', givenName: 'Grace', familyName: 'Achieng', title: null, active: true, linkedUserId: 'u-grace', email: 'grace@baridi.example' },
  { externalId: 'p-miriam', displayName: 'Miriam Wanjiku', givenName: 'Miriam', familyName: 'Wanjiku', title: 'Sales rep', active: true, linkedUserId: 'u-miriam', email: 'miriam@baridi.example' },
  { externalId: 'p-aisha', displayName: 'Aisha Otieno', givenName: 'Aisha', familyName: 'Otieno', title: 'Sales rep', active: true, linkedUserId: null, email: 'aisha@baridi.example' },
  { externalId: 'p-kwame', displayName: 'Kwame Mensah', givenName: 'Kwame', familyName: 'Mensah', title: null, active: true, linkedUserId: 'u-kwame', email: 'kwame@baridi.example' },
];
const roles = [
  { key: 'sales-rep', name: 'Sales rep', description: 'Their own customers and deals' },
  { key: 'stock', name: 'Stock planning', description: 'Booking freezers before customers need them' },
];
const participants = [
  { id: 'pt-lead', userId: 'u-wairimu', partyType: 'INITIATOR', roleAsDescribed: null, createdAt: new Date('2026-08-01'), email: 'wairimu@baridi.example', nameGiven: null, organisationGiven: null, user: { firstName: 'Wairimu', lastName: 'Kamau', email: 'wairimu@baridi.example' } },
  { id: 'pt-kwame', userId: 'u-kwame', partyType: 'PARTICIPANT', roleAsDescribed: 'Branch manager', createdAt: new Date('2026-08-02'), email: 'kwame@baridi.example', nameGiven: null, organisationGiven: null, user: { firstName: 'Kwame', lastName: 'Mensah', email: 'kwame@baridi.example' } },
];

function world(opts: { scenario?: string; peers?: boolean; clearedAt?: Date | null; stored?: any[] } = {}) {
  const proposals: any[] = [];
  const store: any[] = opts.stored ?? [];
  const interviews: any[] = [{ personExternalId: 'p-miriam', roleName: 'Sales rep', owns: 'My own customers', decides: 'The discount', dependsOn: 'The Sales lead', dependedOnBy: 'New customers', createdAt: NOW }];
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async () => ({ isOn: true })) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => (roleOf[where.userId_organizationId.userId] ? { role: roleOf[where.userId_organizationId.userId] } : null)) },
    role: { findMany: jest.fn(async () => roles) },
    roleAssignment: { findMany: jest.fn(async () => []) },
    person: {
      findMany: jest.fn(async ({ where }: any) => people.filter((p) => !where?.active || p.active)),
      findFirst: jest.fn(async ({ where }: any) => people.find((p) => p.linkedUserId === where.linkedUserId) ?? null),
    },
    assistantProposal: {
      findMany: jest.fn(async ({ where }: any) => proposals.filter((p) => p.personExternalId === where.personExternalId && p.state === 'PARKED' && p.kind === where.kind)),
      create: jest.fn(async ({ data }: any) => { proposals.push({ state: 'PARKED', ...data }); return data; }),
    },
    /* 10 October 2026: reading your own answers now also reads the title on your account and your latest row (decision 129), so the hand-built database has both. */
    user: { findUnique: jest.fn(async () => ({ jobTitle: null })) },
    roleInterviewAnswer: {
      findMany: jest.fn(async ({ where }: any) => interviews.filter((i) => !where.personExternalId || (where.personExternalId.in ?? [where.personExternalId]).includes(i.personExternalId))),
      findFirst: jest.fn(async ({ where }: any) => interviews.filter((i) => !where.personExternalId || (where.personExternalId.in ?? [where.personExternalId]).includes(i.personExternalId))[0] ?? null),
    },
    groundDependency: {
      findMany: jest.fn(async () => [{
        groundId: 'g1', fromParticipantId: 'pt-kwame', onLabel: 'Stock planning', what: 'freezers',
        createdAt: threeWeeksAgo, clearedAt: opts.clearedAt ?? null, ground: { participants },
      }]),
    },
    roleGapNote: {
      findMany: jest.fn(async ({ where }: any) => store.filter((n) => (where?.groundId?.not === null ? n.groundId : true))),
      deleteMany: jest.fn(async () => { store.length = 0; }),
      createMany: jest.fn(async ({ data }: any) => { store.push(...data.map((d: any) => ({ createdAt: NOW, ...d }))); }),
    },
    ground: {
      findUnique: jest.fn(async () => ({ organizationId: ORG })),
      findFirst: jest.fn(async () => ({
        organizationId: ORG, scenario: opts.scenario ?? 'DRIFT', initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu',
        peersVisibleToEachOther: opts.peers ?? true, participants,
      })),
    },
  };
  return {
    prisma, proposals, store,
    interview: new RoleInterviewService(prisma), map: new RoleMapService(prisma), gaps: new RoleGapNotesService(prisma),
    as: (userId: string) => ({ userId, organizationId: ORG }),
  };
}

describe('sending the role interview', () => {
  it('an admin sends it to one person, and it waits for them in Ask Groundwork', async () => {
    const w = world();
    const r = await w.interview.send(w.as('u-grace'), { personId: 'p-miriam' });
    expect(r.sent).toEqual([{ personId: 'p-miriam', name: 'Miriam Wanjiku', roleName: 'Sales rep' }]);
    expect(w.proposals).toHaveLength(1);
    expect(w.proposals[0]).toMatchObject({ personExternalId: 'p-miriam', kind: 'role_interview', state: 'PARKED' });
    expect(w.proposals[0].summary).toContain('Your admin has asked you four short questions about your job as Sales rep');
  });

  it('sent to a role, it reaches everyone who holds it, and says plainly who it could not reach', async () => {
    const w = world();
    const r = await w.interview.send(w.as('u-grace'), { roleName: 'sales rep' });
    expect(r.sent.map((s) => s.name)).toEqual(['Miriam Wanjiku']);
    expect(r.notSent).toEqual([{ name: 'Aisha Otieno', why: 'Aisha Otieno has not signed in yet, so there is nowhere to ask them.' }]);
  });

  it('is not sent twice while the first is waiting', async () => {
    const w = world();
    await w.interview.send(w.as('u-grace'), { personId: 'p-miriam' });
    const again = await w.interview.send(w.as('u-grace'), { personId: 'p-miriam' });
    expect(again.sent).toHaveLength(0);
    expect(again.notSent[0].why).toBe('Miriam Wanjiku already has the role interview waiting for Sales rep.');
    expect(w.proposals).toHaveLength(1);
  });

  it('says what is wrong, in plain words, when nobody or no role is named', async () => {
    const w = world();
    await expect(w.interview.send(w.as('u-grace'), {})).rejects.toThrow(INTERVIEW_REFUSED.nobodyNamed);
    await expect(w.interview.send(w.as('u-grace'), { personId: 'p-kwame' })).rejects.toThrow(INTERVIEW_REFUSED.noRoleYet);
    await expect(w.interview.send(w.as('u-grace'), { roleName: 'Astronaut' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each(['u-wairimu', 'u-miriam', 'u-kwame', 'u-nobody'])('%s, who is not an admin, cannot send it', async (who) => {
    const w = world();
    await expect(w.interview.send(w.as(who), { personId: 'p-miriam' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(w.proposals).toHaveLength(0);
  });
});

describe('who reads the answers', () => {
  it('the person reads their own, and their query is for themselves alone', async () => {
    const w = world();
    const mine = await w.interview.mine(w.as('u-miriam'));
    expect(mine.answers).toHaveLength(1);
    expect(mine.answers[0].owns).toBe('My own customers');
    /* Its own roster key, and the account id under which a person who never used Ask yet is kept (decision 129). Nobody else's key. */
    expect(w.prisma.roleInterviewAnswer.findMany.mock.calls[0][0].where.personExternalId).toEqual({ in: ['p-miriam', 'u-miriam'] });
  });

  it('a colleague reads none of Miriam answers through the person route', async () => {
    const w = world();
    expect((await w.interview.mine(w.as('u-kwame'))).answers).toEqual([]);
  });

  it.each(['u-wairimu', 'u-miriam', 'u-kwame'])('%s, who is not an admin, cannot open the role map that shows them', async (who) => {
    const w = world();
    await expect(w.map.board(w.as(who))).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('why a job nobody owns matters, written from the record', () => {
  it('writes one plain sentence with the check-in label and never the name, and the same record again writes nothing', async () => {
    const w = world();
    expect(await w.gaps.rebuild(ORG, NOW)).toBe('built');
    expect(w.store).toHaveLength(1);
    expect(w.store[0]).toMatchObject({
      roleName: 'Stock planning', groundId: 'g1', promptVersionId: null,
      says: 'That is why Participant A has been waiting three weeks for freezers.',
    });
    expect(w.store[0].says).not.toMatch(/Kwame|Mensah|kwame@/i);
    expect(await w.gaps.rebuild(ORG, NOW)).toBe('unchanged');
    expect(w.prisma.roleGapNote.createMany).toHaveBeenCalledTimes(1);
  });

  it('says "waited" when the wait ended, and leaves out an evaluation check-in entirely', async () => {
    const ended = world({ clearedAt: NOW });
    await ended.gaps.rebuild(ORG, NOW);
    expect(ended.store[0].says).toBe('That is why Participant A waited three weeks for freezers.');
    const w = world();
    await w.gaps.rebuild(ORG, NOW);
    expect(w.prisma.groundDependency.findMany.mock.calls[0][0].where.ground.scenario.notIn.length).toBeGreaterThan(0);
  });

  it('writes nothing when a role is held, and nothing from a wait shorter than a week', async () => {
    const w = world();
    await w.gaps.rebuild(ORG, new Date(threeWeeksAgo.getTime() + 2 * 86_400_000));
    expect(w.store).toHaveLength(0);
    const held = world();
    held.prisma.person.findMany = jest.fn(async () => [...people, { externalId: 'p-x', displayName: 'Zawadi Ali', givenName: 'Zawadi', familyName: 'Ali', title: 'Stock planning', active: true, linkedUserId: null, email: 'z@baridi.example' }]);
    await held.gaps.rebuild(ORG, NOW);
    expect(held.store).toHaveLength(0);
  });

  it('is checked in code: a name, a score, a label or a number outside the record never gets through', () => {
    const w = { roleName: 'Stock planning', groundId: 'g1', label: 'Participant A', weeks: 3, ended: false };
    expect(theSentenceFor({ ...w, what: 'freezers' }, [])).toBe('That is why Participant A has been waiting three weeks for freezers.');
    expect(theSentenceFor({ ...w, what: 'freezers from Kwame' }, ['kwame'])).toBeNull();
    expect(whatWasWaitedFor('freezers from Kwame', ['kwame'])).toBeNull();
    expect(theSentenceFor({ ...w, what: 'a high score and 40 freezers' }, [])).toBeNull();
    expect(theSentenceFor({ ...w, what: 'a flight risk review' }, [])).toBeNull();
    expect(whatWasWaitedFor('the "price list": final', [])).toBeNull();
    expect(notesFrom([{ ...w, what: 'freezers', weeks: 0 }], [])).toEqual([]);
    expect(notesFrom([{ ...w, what: 'freezers', weeks: 2 }, { ...w, what: 'price lists', weeks: 5 }], []).map((n) => n.says))
      .toEqual(['That is why Participant A has been waiting five weeks for price lists.']);
  });

  const stored = [{ roleName: 'Stock planning', says: 'That is why Participant A has been waiting three weeks for freezers.', groundId: 'g1', createdAt: NOW }];

  it('the admin who may open the check-in reads it with the name swapped in', async () => {
    const w = world({ stored });
    const map = await w.map.board(w.as('u-grace'));
    expect(map.nobody).toEqual([{ name: 'Stock planning', why: 'That is why Kwame Mensah has been waiting three weeks for freezers.' }]);
  });

  it('an admin who was given no access to the check-in (a performance plan) is given no sentence, and no label', async () => {
    const w = world({ stored, scenario: 'PIP' });
    const map = await w.map.board(w.as('u-faith'));
    expect(map.nobody[0].why).toBeNull();
    expect(JSON.stringify(map)).not.toMatch(/Kwame|Participant [A-Z]/);
  });

  it('where the name would not be shown to this reader the sentence is left out rather than shown with a placeholder', async () => {
    const w = world({ stored, peers: false });
    const map = await w.map.board(w.as('u-grace'));
    /* Grace is not in the check-in and peers are hidden: Kwame is not hers to see by name. */
    expect(map.nobody[0].why).toBeNull();
  });

  it('a lead who is not an admin, a member and a colleague are all refused the map that carries it', async () => {
    const w = world({ stored });
    for (const who of ['u-wairimu', 'u-miriam', 'u-kwame']) await expect(w.map.board(w.as(who))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('what is read never carries a label on a person', async () => {
    const w = world({ stored });
    expect(JSON.stringify(await w.map.board(w.as('u-grace')))).not.toMatch(/\b(PIP|exit|at[- ]risk|low[- ]performer|flight risk|score|rating)\b/i);
  });
});
