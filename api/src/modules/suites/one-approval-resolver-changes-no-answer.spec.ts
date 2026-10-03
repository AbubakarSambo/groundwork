import { theirSignIn } from './a-roster-entry-and-its-sign-in';
import { readDuties, whoHolds } from './who-holds-each-duty';
import { mayApproveFor, whoApprovesFor } from './who-approves';
import { decidesIt, theOneWhoDecides, theStepsFor, whoMayDecide, couldBeNamed } from './who-may-decide';
import { ReviewsService } from './the-reviews.service';
import { SpendingService } from './the-spending.service';

/**
 * ONE APPROVAL RESOLVER, AND NOTHING ALREADY SWITCHED ON CHANGES (decision 85, build step 3).
 *
 * Three rules used to say who decides: `mayApprove` (reviews), `mayApproveFor` (leave and time
 * sheets) and `SpendingService.approverOf` (spending). All three now ask `who-may-decide.ts`. The rules
 * as they were on 3 October (commit b7ff00b4) are copied below, word for word, as BEFORE. For every
 * answer an admin can give today, for every kind of requester, and for every reader, the same people
 * may decide before and after. The only two differences are tested on their own at the end: in both,
 * nobody at all could decide before.
 */

const ORG = 'org-t';
const roles: Record<string, string> = {
  'u-admin': 'ADMIN', 'u-admin2': 'ADMIN', 'u-lead': 'LEAD', 'u-lead2': 'LEAD', 'u-member': 'MEMBER', 'u-member2': 'MEMBER',
  'u-mgrmember': 'MEMBER', 'u-guest': 'GUEST',
  'u-r1': 'MEMBER', 'u-r2': 'MEMBER', 'u-r3': 'MEMBER', 'u-r4': 'MEMBER', 'u-r5': 'MEMBER', 'u-r6': 'MEMBER', 'u-r7': 'MEMBER', 'u-r8': 'MEMBER', 'u-r11': 'MEMBER',
};
const READERS = [...Object.keys(roles), 'u-gone'];
const userEmails: Record<string, string> = Object.fromEntries([...Object.keys(roles), 'u-gone'].map((u) => [u, `${u.slice(2)}@t.example`]));
const e = (externalId: string, linkedUserId: string | null, department: string | null, managerExternalId: string | null, extra: Record<string, unknown> = {}) =>
  ({ externalId, linkedUserId, email: linkedUserId ? userEmails[linkedUserId] : null, givenName: externalId.slice(2), displayName: externalId.slice(2), familyName: null, department, managerExternalId, active: true, ...extra });
const DIRECTORY = [
  e('p-admin', 'u-admin', null, null), e('p-admin2', 'u-admin2', null, null), e('p-lead', 'u-lead', 'Sales', 'p-admin'), e('p-lead2', null, 'Ops', null, { email: userEmails['u-lead2'] }),
  e('p-member', 'u-member', 'Sales', 'p-lead'), e('p-member2', 'u-member2', 'Finance', null), e('p-mgrmember', 'u-mgrmember', 'Ops', null), e('p-guest', 'u-guest', null, null),
  e('p-nosignin', null, 'Sales', null), e('p-inactive', 'u-lead', 'Sales', null, { active: false, externalId: 'p-inactive' }),
  /* The requesters: */
  e('p-r1', 'u-r1', 'Sales', 'p-lead'),          // a lead manages them
  e('p-r2', 'u-r2', 'Product', 'p-admin'),       // an admin manages them
  e('p-r3', 'u-r3', 'Ops', 'p-mgrmember'),       // a member manages them
  e('p-r4', 'u-r4', 'Product', null),            // nobody manages them
  e('p-r5', 'u-r5', 'Sales', 'p-nosignin'),      // their manager does not sign in
  e('p-r6', 'u-r6', 'Sales', 'p-inactive'),      // their manager's entry is no longer active
  e('p-r7', 'u-r7', 'Sales', 'p-r7'),            // the directory names them as their own manager
  e('p-r8', 'u-r8', 'Sales', 'p-guest'),         // a guest manages them
  e('p-r10', null, 'Sales', 'p-lead'),           // no sign-in at all (a review can still be about them)
  e('p-r11', 'u-r11', 'Ops', 'p-lead2'),         // their manager is matched to a sign-in by address
];
const REQUESTERS = ['p-r1', 'p-r2', 'p-r3', 'p-r4', 'p-r5', 'p-r6', 'p-r7', 'p-r8', 'p-r10', 'p-r11', 'p-lead', 'p-member'];

function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (k === 'OR') return v.some((w: any) => matches(row, w));
    if (k === 'AND') return v.every((w: any) => matches(row, w));
    if (k === 'memberships') return !!roles[row.id];
    if (k === 'organizationId' && row.organizationId === undefined) return true;
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    if (v && typeof v === 'object' && 'equals' in v) return String(row[k] ?? '').toLowerCase() === String(v.equals).toLowerCase();
    return row[k] === v;
  });
}

function aPrisma(suites: Record<string, unknown> = {}) {
  const users = Object.entries(userEmails).map(([id, email]) => ({ id, email, firstName: id.slice(2), lastName: null, deletedAt: null }));
  return {
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => (roles[where.userId_organizationId.userId] ? { role: roles[where.userId_organizationId.userId] } : null)) },
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) => {
      const a = suites[where.organizationId_suite.suite];
      return a ? { isOn: true, answers: a } : null;
    }) },
    person: {
      findFirst: jest.fn(async ({ where }: any) => DIRECTORY.find((p) => matches(p, where)) ?? null),
      findMany: jest.fn(async ({ where }: any) => DIRECTORY.filter((p) => matches(p, where))),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => users.filter((u) => matches(u, where))),
      findUnique: jest.fn(async ({ where }: any) => users.find((u) => u.id === where.id) ?? null),
    },
  } as any;
}

/* ------------------------------ BEFORE: the three rules as they were ------------------------------ */

async function BEFORE_mayApprove(prisma: any, input: { organizationId: string; readerId: string; readerRole: string | null; personUserId: string; approver: string | null; managerExternalId: string | null }) {
  if (input.personUserId === input.readerId) return false;
  if (input.approver === 'Their manager' && input.managerExternalId) {
    const m = await prisma.person.findFirst({ where: { organizationId: input.organizationId, externalId: input.managerExternalId, active: true }, select: { linkedUserId: true, email: true } });
    const managerUserId = await theirSignIn(prisma, input.organizationId, m);
    if (managerUserId) {
      const r = await prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId: managerUserId, organizationId: input.organizationId } }, select: { role: true } });
      if (r?.role === 'LEAD' || r?.role === 'ADMIN') return managerUserId === input.readerId;
    }
  }
  return input.readerRole === 'ADMIN';
}

async function BEFORE_whoApprovesFor(prisma: any, input: { organizationId: string; personUserId: string; managerExternalId: string | null }) {
  const managerExternalId = input.managerExternalId;
  if (managerExternalId) {
    const m = await prisma.person.findFirst({ where: { organizationId: input.organizationId, externalId: managerExternalId, active: true }, select: {} });
    const managerUserId = await theirSignIn(prisma, input.organizationId, m);
    if (m && managerUserId && managerUserId !== input.personUserId) {
      const r = await prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId: managerUserId, organizationId: input.organizationId } }, select: { role: true } });
      if (r?.role === 'LEAD' || r?.role === 'ADMIN') return { kind: 'manager' as const, userId: managerUserId };
    }
  }
  return { kind: 'admin' as const };
}

async function BEFORE_mayApproveFor(prisma: any, input: { organizationId: string; readerId: string; readerRole: string | null; personUserId: string; managerExternalId: string | null }) {
  if (input.personUserId === input.readerId) return false;
  const who = await BEFORE_whoApprovesFor(prisma, input);
  return who.kind === 'manager' ? who.userId === input.readerId : input.readerRole === 'ADMIN';
}

async function BEFORE_spendApproverOf(prisma: any, organizationId: string, r: { userId: string; amount: number; team: string | null }, answers: { limit: number | null; above: string | null }, p: any) {
  if (answers.limit != null && r.amount > answers.limit) {
    const duties = await readDuties(prisma, organizationId);
    const team = r.team?.trim() || p?.department?.trim() || null;
    for (const holder of [whoHolds(duties, 'budgetOwners', team), whoHolds(duties, 'finance')]) {
      if (!holder || holder === r.userId) continue;
      const role = roles[holder] ?? null;
      if (role && role !== 'GUEST') return { kind: 'person' as const, userId: holder };
    }
    if (answers.above && answers.above !== r.userId) return { kind: 'person' as const, userId: answers.above };
    return { kind: 'admin' as const };
  }
  const lead = await BEFORE_whoApprovesFor(prisma, { organizationId, personUserId: r.userId, managerExternalId: p?.managerExternalId ?? null });
  return lead.kind === 'manager' ? { kind: 'manager' as const, userId: lead.userId } : { kind: 'admin' as const };
}
function BEFORE_spendMayDecide(readerId: string, role: string | null, r: { userId: string }, who: { kind: string; userId?: string }) {
  if (r.userId === readerId) return false;
  if (who.kind === 'admin') return role === 'ADMIN';
  return who.userId === readerId;
}

/* ------------------------------------------- the table ------------------------------------------- */

const entry = (ext: string) => DIRECTORY.find((p) => p.externalId === ext && p.active)!;
const signInOf = (ext: string) => entry(ext).linkedUserId;
const said = (set: string[]) => (set.length ? set.join(', ') : 'nobody');

/** Rows of [suite, answer, requester, who may decide before, who may decide after]. Printed for the report. */
const TABLE: string[][] = [];

describe('leave and time sheets: every answer, every requester, every reader', () => {
  for (const answer of ['Their manager', 'An admin', null]) {
    for (const ext of REQUESTERS.filter((x) => signInOf(x))) {
      it(`${answer ?? 'no answer'}: ${ext}`, async () => {
        const prisma = aPrisma();
        const person = signInOf(ext)!;
        const before: string[] = []; const after: string[] = []; const afterResolver: string[] = [];
        const who = await theOneWhoDecides(prisma, theStepsFor('leave')[0], { organizationId: ORG, requesterUserId: person, managerExternalId: entry(ext).managerExternalId });
        for (const reader of READERS) {
          const input = { organizationId: ORG, readerId: reader, readerRole: roles[reader] ?? null, personUserId: person, managerExternalId: entry(ext).managerExternalId };
          if (await BEFORE_mayApproveFor(prisma, input)) before.push(reader);
          if (await mayApproveFor(prisma, input)) after.push(reader);
          if (decidesIt(who, { userId: reader, role: roles[reader] ?? null }, person)) afterResolver.push(reader);
        }
        TABLE.push(['leave and time', String(answer), ext, said(before), said(after)]);
        expect(after).toEqual(before);
        expect(afterResolver).toEqual(before);
      });
    }
  }

  it('the leave say-back names the same approver as before', async () => {
    const prisma = aPrisma();
    for (const ext of REQUESTERS.filter((x) => signInOf(x))) {
      const input = { organizationId: ORG, personUserId: signInOf(ext)!, managerExternalId: entry(ext).managerExternalId };
      const b = await BEFORE_whoApprovesFor(prisma, input);
      const a = await whoApprovesFor(prisma, input);
      expect([ext, a.kind, (a as any).userId]).toEqual([ext, b.kind, (b as any).userId]);
    }
  });
});

describe('reviews: every answer, every person, every reader', () => {
  for (const writer of ['Their manager', 'An admin', null]) {
    for (const ext of REQUESTERS) {
      it(`${writer ?? 'no answer'}: ${ext}`, async () => {
        const prisma = aPrisma();
        const svc = new ReviewsService(prisma);
        const p = { ...entry(ext), userId: signInOf(ext) };
        const before: string[] = []; const after: string[] = [];
        for (const reader of READERS) {
          const role = roles[reader] ?? null;
          if (await BEFORE_mayApprove(prisma, { organizationId: ORG, readerId: reader, readerRole: role, personUserId: p.userId ?? `person:${p.externalId}`, approver: writer, managerExternalId: p.managerExternalId })) before.push(reader);
          if (await (svc as any).writes({ userId: reader, organizationId: ORG }, role, p, writer)) after.push(reader);
        }
        TABLE.push(['reviews', String(writer), ext, said(before), said(after)]);
        expect(after).toEqual(before);
      });
    }
  }
});

describe('spending: every answer, every amount, every set of duties, every requester, every reader', () => {
  const ABOVE = ['u-admin', 'u-member', 'u-lead2', 'u-lead'];
  const DUTIES: [string, Record<string, unknown> | null][] = [
    ['no duties', null],
    ['Sales budget held by u-member2', { budgetOwners: { Sales: 'u-member2' } }],
    ['finance held by u-member2', { finance: 'u-member2' }],
    ['Sales budget held by u-r1, finance by u-member2', { budgetOwners: { Sales: 'u-r1' }, finance: 'u-member2' }],
    ['finance held by a guest', { finance: 'u-guest' }],
    ['Ops budget held by u-lead2, finance by u-admin2', { budgetOwners: { Ops: 'u-lead2' }, finance: 'u-admin2' }],
  ];
  for (const above of ABOVE) {
    for (const [dutiesSaid, duties] of DUTIES) {
      for (const amount of [5000, 95000]) {
        it(`above ${above}, ${dutiesSaid}, KES ${amount}`, async () => {
          const answers = { currency: 'KES', limit: 20000, above };
          const prisma = aPrisma({ spend: answers, ...(duties ? { duties } : {}) });
          const svc = new SpendingService(prisma);
          const dir: Map<string, any> = await (svc as any).directory(ORG);
          const byUser = new Map([...dir.values()].filter((x: any) => x.linkedUserId).map((x: any) => [x.linkedUserId, x]));
          for (const ext of REQUESTERS.filter((x) => signInOf(x))) {
            const userId = signInOf(ext)!;
            const r = { userId, amount, team: null };
            const whoBefore = await BEFORE_spendApproverOf(prisma, ORG, r, answers, byUser.get(userId));
            const whoAfter = await (svc as any).approverOf(ORG, r, answers, byUser, dir);
            const before = READERS.filter((u) => BEFORE_spendMayDecide(u, roles[u] ?? null, r, whoBefore));
            const after = READERS.filter((u) => (svc as any).mayDecide({ userId: u, organizationId: ORG }, roles[u] ?? null, r, whoAfter));
            TABLE.push([`spending, KES ${amount}`, `above ${above}; ${dutiesSaid}`, ext, said(before), said(after)]);
            expect([ext, whoAfter]).toEqual([ext, whoBefore]);
            expect([ext, after]).toEqual([ext, before]);
          }
        });
      }
    }
  }

  it('a member is let onto the spending board as an approver exactly when they were before', async () => {
    for (const above of [...ABOVE, 'u-member2']) {
      for (const [, duties] of DUTIES) {
        const answers = { currency: 'KES', limit: 20000, above };
        const prisma = aPrisma({ spend: answers, ...(duties ? { duties } : {}) });
        const svc = new SpendingService(prisma);
        const d = await readDuties(prisma, ORG);
        for (const u of Object.keys(roles).filter((x) => roles[x] === 'MEMBER')) {
          const before = above === u || d.finance === u || Object.values(d.budgetOwners ?? {}).includes(u);
          expect([above, u, await (svc as any).approvesOverTheLimit(ORG, u, answers)]).toEqual([above, u, before]);
        }
      }
    }
  });
});

describe('the only two differences, where before nobody at all could decide', () => {
  it('reviews, "Their manager": a lead the directory names as their own manager is reviewed by an admin, where before nobody could start it', async () => {
    const prisma = aPrisma();
    const svc = new ReviewsService(prisma);
    const p = { ...entry('p-lead'), managerExternalId: 'p-lead', userId: 'u-lead' };
    const before: string[] = []; const after: string[] = [];
    for (const reader of READERS) {
      const role = roles[reader] ?? null;
      if (await BEFORE_mayApprove(prisma, { organizationId: ORG, readerId: reader, readerRole: role, personUserId: 'u-lead', approver: 'Their manager', managerExternalId: 'p-lead' })) before.push(reader);
      if (await (svc as any).writes({ userId: reader, organizationId: ORG }, role, p, 'Their manager')) after.push(reader);
    }
    TABLE.push(['reviews', 'Their manager', 'p-lead, named as their own manager', said(before), said(after)]);
    expect(before).toEqual([]);
    expect(after).toEqual(['u-admin', 'u-admin2']);
  });

  it('spending over the limit: a person named on the suite who is now a guest, or has left, is passed over for an admin, where before the request waited on somebody who could not open the board', async () => {
    for (const above of ['u-guest', 'u-gone']) {
      const answers = { currency: 'KES', limit: 20000, above };
      const prisma = aPrisma({ spend: answers });
      const svc = new SpendingService(prisma);
      const dir: Map<string, any> = await (svc as any).directory(ORG);
      const byUser = new Map([...dir.values()].filter((x: any) => x.linkedUserId).map((x: any) => [x.linkedUserId, x]));
      const r = { userId: 'u-r1', amount: 95000, team: null };
      expect(await BEFORE_spendApproverOf(prisma, ORG, r, answers, byUser.get('u-r1'))).toEqual({ kind: 'person', userId: above });
      expect(await (svc as any).approverOf(ORG, r, answers, byUser, dir)).toEqual({ kind: 'admin' });
      TABLE.push(['spending, KES 95000', `above ${above}`, 'p-r1', above, 'u-admin, u-admin2']);
    }
  });
});

describe('the resolver, rule by rule', () => {
  const ask = (requester: string, team?: string | null) => ({ organizationId: ORG, requesterUserId: requester, team });
  it('names each duty holder for the request’s team, or the requester’s team, never the requester, never a guest', async () => {
    const prisma = aPrisma({ duties: { finance: 'u-member2', hr: 'u-guest', chiefExecutive: 'u-admin', budgetOwners: { Sales: 'u-lead' }, departmentHeads: { Sales: 'u-r1', Ops: 'u-lead2' } } });
    expect(await whoMayDecide(prisma, 'finance', ask('u-r1'))).toEqual({ kind: 'person', rule: 'finance', userId: 'u-member2' });
    expect(await whoMayDecide(prisma, 'hr', ask('u-r1'))).toBeNull();
    expect(await whoMayDecide(prisma, 'chiefExecutive', ask('u-r1'))).toEqual({ kind: 'person', rule: 'chiefExecutive', userId: 'u-admin' });
    expect(await whoMayDecide(prisma, 'budgetOwner', ask('u-r1'))).toEqual({ kind: 'person', rule: 'budgetOwner', userId: 'u-lead' });
    expect(await whoMayDecide(prisma, 'departmentHead', ask('u-r1'))).toBeNull();
    expect(await whoMayDecide(prisma, 'departmentHead', ask('u-r1', 'Ops'))).toEqual({ kind: 'person', rule: 'departmentHead', userId: 'u-lead2' });
    expect(await whoMayDecide(prisma, 'departmentHead', ask('u-member'))).toEqual({ kind: 'person', rule: 'departmentHead', userId: 'u-r1' });
    expect(await whoMayDecide(prisma, 'manager', ask('u-member'))).toEqual({ kind: 'manager', rule: 'manager', userId: 'u-lead', firstName: 'lead' });
    expect(await whoMayDecide(prisma, 'admin', ask('u-member'))).toEqual({ kind: 'admin', rule: 'admin' });
    expect(await theOneWhoDecides(prisma, ['hr', 'departmentHead', 'chiefExecutive'], ask('u-r1'))).toEqual({ kind: 'person', rule: 'chiefExecutive', userId: 'u-admin' });
    expect(await theOneWhoDecides(prisma, ['hr'], ask('u-r1'))).toEqual({ kind: 'admin', rule: 'admin' });
  });

  it('says who could ever be named by a list of steps', async () => {
    const prisma = aPrisma({ duties: { finance: 'u-member2', departmentHeads: { Ops: 'u-mgrmember' } } });
    const as = (u: string) => ({ userId: u, role: roles[u] ?? null });
    expect(await couldBeNamed(prisma, ['manager', 'admin'], ORG, as('u-member'))).toBe(false);
    expect(await couldBeNamed(prisma, ['manager', 'admin'], ORG, as('u-lead'))).toBe(true);
    expect(await couldBeNamed(prisma, ['finance'], ORG, as('u-member2'))).toBe(true);
    expect(await couldBeNamed(prisma, ['departmentHead'], ORG, as('u-mgrmember'))).toBe(true);
    expect(await couldBeNamed(prisma, [{ named: 'u-guest' }], ORG, as('u-guest'))).toBe(false);
  });
});

afterAll(() => {
  if (process.env.PRINT_THE_APPROVER_TABLE) {
    // eslint-disable-next-line no-console
    console.log(['| Suite | Answer | Requester | Before | After |', '| --- | --- | --- | --- | --- |', ...TABLE.map((r) => `| ${r.join(' | ')} |`)].join('\n'));
  }
});
