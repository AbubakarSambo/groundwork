import { ForbiddenException } from '@nestjs/common';
import { SpendingService, SPEND_REFUSED } from './the-spending.service';
import { whatWaitsForYouToDecide } from './what-waits-for-you-to-decide';
import { aDecisionSaidBack, aDecisionDone } from './a-request-in-words';
import { spendingSaidBack } from './spend-said-in-chat';
import { waitingForYouToApprove } from '../grounds/waiting-for-you-to-approve';
import { aRequestIsWaiting, aRequestWasDecided } from '../whatsapp/what-goes-to-a-phone';

/**
 * THE PERSON NAMED FOR LARGE SPENDING CAN DECIDE IT (bug 1 of docs/suites-against-the-workflow-model.md).
 *
 * Baridi Appliances, 27 September 2026. The admin, Grace, switched spending on with KES, a limit of
 * 20,000, and named somebody who is not an admin for anything above it: in the first organisation
 * Omar, a member who keeps the books, and in the second Fatuma, who leads Operations. Lina (Product)
 * asks for KES 95,000 for a new laptop. Kamau (Operations, Fatuma's team) asks for KES 18,000 for fuel.
 * Miriam (Sales) asks for KES 5,000 for transport.
 *
 * Before this change, every way of deciding read what waits from the board, the board refused a
 * member and left out of a lead's list anybody outside their team, so Omar and Fatuma were told on
 * WhatsApp that Lina's request waited for them and then found nothing to approve. Each reader is
 * served here exactly as the app, Today, Ask Groundwork and a WhatsApp reply read it.
 */

const ORG = 'org-baridi';
const TODAY = new Date('2026-09-27T09:00:00Z');
const SEPT = new Date('2026-09-01T00:00:00Z');
const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-fatuma': 'LEAD', 'u-kamau': 'MEMBER', 'u-lina': 'MEMBER', 'u-miriam': 'MEMBER', 'u-omar': 'MEMBER', 'u-tomas': 'GUEST',
};
const users: Record<string, [string, string]> = {
  'u-grace': ['Grace', 'Achieng'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-fatuma': ['Fatuma', 'Hassan'], 'u-kamau': ['Kamau', 'Njenga'],
  'u-lina': ['Lina', 'Mutua'], 'u-miriam': ['Miriam', 'Wanjiku'], 'u-omar': ['Omar', 'Abdi'], 'u-tomas': ['Tomas', 'Guest'],
};
const dir = (u: string, department: string | null, manager: string | null) => ({ externalId: `p-${u.slice(2)}`, linkedUserId: u, email: `${u}@baridi.example`, department, managerExternalId: manager, active: true });
const DIRECTORY = [
  dir('u-grace', null, null), dir('u-wairimu', 'Sales', 'p-grace'), dir('u-fatuma', 'Operations', 'p-grace'),
  dir('u-kamau', 'Operations', 'p-fatuma'), dir('u-lina', 'Product', 'p-grace'), dir('u-miriam', 'Sales', 'p-wairimu'),
  dir('u-omar', 'Finance', 'p-grace'),
];

function setup(opts: { above: string; duties?: Record<string, unknown> | null; steps?: unknown[] }) {
  let n = 0;
  const req = (userId: string, amount: number, what: string, team: string | null, status = 'waiting', createdAt = new Date('2026-09-25T08:00:00Z')) =>
    ({ id: `s-${++n}`, organizationId: ORG, userId, amount, what, team, status, createdAt, decidedById: null as string | null, decidedAt: null as Date | null });
  const requests = [
    req('u-kamau', 18000, 'fuel for Kisumu deliveries', 'Operations'),
    req('u-lina', 95000, 'a new laptop', 'Product'),
    req('u-miriam', 5000, 'transport to Westgate Deli', 'Sales'),
    req('u-lina', 60000, 'a data licence', 'Product', 'approved'),
  ];
  const budgets = [
    { organizationId: ORG, team: 'Sales', month: SEPT, amount: 400000 },
    { organizationId: ORG, team: 'Operations', month: SEPT, amount: 250000 },
    { organizationId: ORG, team: 'Product', month: SEPT, amount: 120000 },
  ];
  const matches = (r: any, w: any): boolean => Object.entries(w).every(([k, v]: [string, any]) => {
    if (k === 'OR') return v.some((x: any) => matches(r, x));
    if (v && typeof v === 'object' && 'gte' in v) return r[k] >= v.gte;
    return r[k] === v;
  });
  const told: { to: string; text: string }[] = [];
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) => {
      const k = where.organizationId_suite;
      if (k.organizationId !== ORG) return null;
      if (k.suite === 'spend') return { isOn: true, answers: { currency: 'KES' } };
      /* The limit of 20,000 and the person named above it are the lowest of the steps by amount, where they are kept (the-spending-rules.ts). */
      if (k.suite === 'spendRules') return { isOn: false, answers: { thresholds: [{ above: 20000, steps: opts.steps ?? [[{ named: opts.above }]] }] } };
      if (k.suite === 'duties' && opts.duties) return { isOn: false, answers: opts.duties };
      return null;
    }) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => {
      const { userId, organizationId } = where.userId_organizationId;
      return organizationId === ORG && roles[userId] ? { role: roles[userId] } : null;
    }) },
    person: {
      findMany: jest.fn(async () => DIRECTORY),
      findFirst: jest.fn(async ({ where }: any) => DIRECTORY.find((p) => (where.linkedUserId ? p.linkedUserId === where.linkedUserId : p.externalId === where.externalId)) ?? null),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => where.id.in.map((id: string) => ({ id, firstName: users[id][0], lastName: users[id][1] }))),
      findUnique: jest.fn(async ({ where }: any) => (users[where.id] ? { firstName: users[where.id][0], phoneNumber: `+2547000${where.id.length}`, deletedAt: null } : null)),
    },
    spendRequest: {
      findMany: jest.fn(async ({ where }: any) => requests.filter((r) => matches(r, where))),
      findUnique: jest.fn(async ({ where }: any) => requests.find((r) => r.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(requests.find((r) => r.id === where.id)!, data)),
      create: jest.fn(async ({ data }: any) => { const r = req(data.userId, data.amount, data.what, data.team); requests.push(r); return { id: r.id }; }),
    },
    teamBudget: {
      findMany: jest.fn(async ({ where }: any) => budgets.filter((b) => b.month.getTime() === where.month.getTime())),
      findUnique: jest.fn(async ({ where }: any) => {
        const k = where.organizationId_team_month;
        return budgets.find((b) => b.team === k.team && b.month.getTime() === k.month.getTime()) ?? null;
      }),
    },
  };
  /* The WhatsApp side, as the real ARequestToldOnWhatsApp words it, written down instead of sent. */
  const whatsapp = {
    approversOf: async (_org: string, who: any, personUserId: string) =>
      who.userId ? (who.userId === personUserId ? [] : [who.userId]) : Object.entries(roles).filter(([u, r]) => r === 'ADMIN' && u !== personUserId).map(([u]) => u),
    firstNameOf: async (userId: string) => users[userId]?.[0] ?? '',
    waiting: async (_org: string, to: string[], r: any) => { for (const u of to) told.push({ to: u, text: aRequestIsWaiting(users[u][0], r.firstName, r.what).text }); },
    decided: async (_org: string, r: any, outcome: 'approved' | 'declined', decider: string) => {
      told.push({ to: r.personUserId, text: aRequestWasDecided(users[r.personUserId][0], r.what, outcome, users[decider][0]).text });
      return true;
    },
  };
  const svc = new SpendingService(prisma, whatsapp as any);
  return { svc, as: (userId: string) => ({ userId, organizationId: ORG }), requests, told };
}

const lina = (b: any) => b.waiting.find((w: any) => w.name === 'Lina Mutua');

describe('Omar, a member named for anything over KES 20,000', () => {
  it('opens the spending board and reads only Lina’s request, which waits for him, with what Product has left', async () => {
    const { svc, as } = setup({ above: 'u-omar' });
    const b = await svc.board(as('u-omar'), TODAY);
    expect(b.reader).toBe('approver');
    expect(b.waiting).toEqual([{
      id: 's-2', name: 'Lina Mutua', firstName: 'Lina', amount: 95000, what: 'a new laptop', team: 'Product',
      /* Added by request 162, item 3. */
      says: 'Lina: KES 95,000 for a new laptop',
      left: 60000, over: true, approver: { kind: 'person', firstName: 'Omar' }, mayDecide: true,
      /* Where it is, in a full sentence (decision 85, build step 4). */
      where: 'It is waiting for you.',
      /* The spending rules (build step 9): none set, so no category and no evidence. */
      category: null, needs: [], attached: null,
      /* Questions about it (build step 9): none asked. */
      questions: [],
    }]);
    /* Not the rest of the board: the prototype shows each team's budget to an admin only. */
    expect(b.budgets).toEqual([]);
    expect(b.teams).toEqual([]);
  });

  it('reads it on Today as "Lina asked to spend KES 95,000 on a new laptop."', async () => {
    const { svc, as } = setup({ above: 'u-omar' });
    const b = await svc.board(as('u-omar'), TODAY);
    const today = waitingForYouToApprove({ spend: b.waiting, currency: b.currency }, ORG);
    expect(today.map((t) => [t.title, t.detail])).toEqual([['Lina asked to spend KES 95,000 on a new laptop.', 'It is waiting for you to approve.']]);
  });

  it('is told on WhatsApp when Lina asks, replies "approve", is asked to confirm, and on the yes it is decided and Lina is told', async () => {
    const { svc, as, told, requests } = setup({ above: 'u-omar' });
    await svc.ask(ORG, 'u-lina', { amount: 30000, what: 'a printer' });
    expect(told).toEqual([{ to: 'u-omar', text: expect.stringContaining('Lina') }]);

    /* What Ask Groundwork and a WhatsApp reply read as waiting for Omar. */
    const waiting = await whatWaitsForYouToDecide(as('u-omar'), { spending: svc });
    expect(waiting.map((w) => w.thing)).toEqual(["Lina's request to spend KES 95,000 for a new laptop", "Lina's request to spend KES 30,000 for a printer"]);
    expect(aDecisionSaidBack(waiting[0], 'approved')).toBe("You are approving Lina's request to spend KES 95,000 for a new laptop. Is that right?");

    /* The yes goes through the board's own decide, which checks again that Omar decides it. */
    await svc.decide(as('u-omar'), waiting[0].ref, 'approved', TODAY);
    expect(requests.find((r) => r.id === 's-2')).toMatchObject({ status: 'approved', decidedById: 'u-omar' });
    expect(aDecisionDone(waiting[0], 'approved')).toBe("Lina's request to spend KES 95,000 for a new laptop is approved now. I have let Lina know.");
    expect(told[told.length - 1]).toEqual({ to: 'u-lina', text: expect.stringContaining('Omar') });
  });

  it('cannot decide Kamau’s or Miriam’s, which are under the limit and go to their leads', async () => {
    const { svc, as } = setup({ above: 'u-omar' });
    await expect(svc.decide(as('u-omar'), 's-1', 'approved')).rejects.toThrow(new ForbiddenException(SPEND_REFUSED.notYours));
    await expect(svc.decide(as('u-omar'), 's-3', 'approved')).rejects.toThrow(new ForbiddenException(SPEND_REFUSED.notYours));
  });

  it('Lina is told before her yes that Omar approves it', async () => {
    const { svc } = setup({ above: 'u-omar' });
    const c = await svc.checkForChat(ORG, 'u-lina', 95000, TODAY);
    expect(c.approverFirstName).toBe('Omar');
    expect(spendingSaidBack({ amount: 95000, currency: 'KES', what: 'a new laptop' }, c, 'September')).toBe(
      'You asked to spend KES 95,000 on a new laptop. Product has KES 60,000 left for September, and all of it is already asked for and waiting, so none of it is free. This is over KES 20,000, so Omar must approve it. Shall I still send it to Omar to approve?',
    );
  });
});

describe('Fatuma, the lead of Operations, named for anything over KES 20,000', () => {
  it('reads her own team’s requests and also Lina’s from Product, which waits for her, and only her own team’s budget', async () => {
    const { svc, as } = setup({ above: 'u-fatuma' });
    const b = await svc.board(as('u-fatuma'), TODAY);
    expect(b.reader).toBe('lead');
    expect(b.waiting.map((w) => [w.name, w.mayDecide])).toEqual([['Kamau Njenga', true], ['Lina Mutua', true]]);
    expect(lina(b)).toMatchObject({ team: 'Product', left: 60000, over: true });
    expect(b.budgets.map((x) => x.team)).toEqual(['Operations']);
    const waiting = await whatWaitsForYouToDecide(as('u-fatuma'), { spending: svc });
    expect(waiting.map((w) => w.thing)).toEqual(["Kamau's request to spend KES 18,000 for fuel for Kisumu deliveries", "Lina's request to spend KES 95,000 for a new laptop"]);
    await svc.decide(as('u-fatuma'), 's-2', 'declined', TODAY);
  });
});

describe('everybody else, unchanged', () => {
  it('Grace, the admin, reads Lina’s request, sees that Omar approves it, and cannot decide it herself', async () => {
    const { svc, as } = setup({ above: 'u-omar' });
    const b = await svc.board(as('u-grace'), TODAY);
    expect(b.reader).toBe('admin');
    expect(lina(b)).toMatchObject({ approver: { kind: 'person', firstName: 'Omar' }, mayDecide: false });
    expect(b.budgets.map((x) => x.team)).toEqual(['Operations', 'Product', 'Sales']);
  });

  it('Miriam, a member who is not named, and a guest, are still refused the board and have nothing to decide', async () => {
    const { svc, as } = setup({ above: 'u-omar' });
    for (const u of ['u-miriam', 'u-tomas']) {
      await expect(svc.board(as(u), TODAY)).rejects.toThrow(new ForbiddenException(SPEND_REFUSED.onlyAdminsAndLeads));
      expect(await whatWaitsForYouToDecide(as(u), { spending: svc })).toEqual([]);
    }
  });

  it('Wairimu, a lead who is not named, still reads only Sales, and not Lina’s', async () => {
    const { svc, as } = setup({ above: 'u-omar' });
    const b = await svc.board(as('u-wairimu'), TODAY);
    expect(b.waiting.map((w) => w.name)).toEqual(['Miriam Wanjiku']);
  });
});

/*
 * WHO HOLDS EACH DUTY (who-holds-each-duty.ts). Grace named herself for anything over the limit, and
 * later said who holds each team's budget and who looks after finance. Spending over the limit now
 * goes to the holder of the requester's team's budget, then to finance, then to Grace.
 */
/*
 * Until 2 November, spending over the limit went first to whoever held the team's budget, then to finance, and only then to the
 * person named. The use-case walk found Brian's KES 65,000 waiting for Njeri in finance instead of Wanjiru, the person named. Now the
 * steps by amount are the one place that says who approves (Hafsah's plan, step 0): a duty decides only when a step names it, and
 * finance's part comes after the last approval.
 */
describe('spending over the limit goes to the person named, and a duty decides only when a step names it', () => {
  it('Omar holds the Product budget: Lina’s laptop still waits for Grace, the person named, and Omar is not let onto the board', async () => {
    const { svc, as, told } = setup({ above: 'u-grace', duties: { budgetOwners: { Product: 'u-omar' } } });
    const grace = await svc.board(as('u-grace'), TODAY);
    expect(lina(grace)).toMatchObject({ mayDecide: true });
    await expect(svc.board(as('u-omar'), TODAY)).rejects.toThrow(new ForbiddenException(SPEND_REFUSED.onlyAdminsAndLeads));
    const c = await svc.checkForChat(ORG, 'u-lina', 95000, TODAY);
    expect(spendingSaidBack({ amount: 95000, currency: 'KES', what: 'a new laptop' }, c, 'September')).toContain('This is over KES 20,000, so Grace must approve it.');
    await svc.ask(ORG, 'u-lina', { amount: 25000, what: 'a monitor' });
    expect(told.map((t) => t.to)).toEqual(['u-grace']);
  });

  it('with a step that names the budget holder, Lina’s laptop waits for Omar, he decides it, and Grace no longer does', async () => {
    const { svc, as, told } = setup({ above: 'u-grace', duties: { budgetOwners: { Product: 'u-omar' } }, steps: [['budgetOwner', 'admin']] });
    const omar = await svc.board(as('u-omar'), TODAY);
    expect(omar.reader).toBe('approver');
    expect(omar.waiting.map((w) => [w.name, w.mayDecide])).toEqual([['Lina Mutua', true]]);
    const grace = await svc.board(as('u-grace'), TODAY);
    expect(lina(grace)).toMatchObject({ approver: { kind: 'person', firstName: 'Omar' }, mayDecide: false });
    await expect(svc.decide(as('u-grace'), 's-2', 'approved')).rejects.toThrow(new ForbiddenException(SPEND_REFUSED.notYours));
    await svc.ask(ORG, 'u-lina', { amount: 25000, what: 'a monitor' });
    expect(told.map((t) => t.to)).toEqual(['u-omar']);
  });

  it('whoever looks after finance is never an approver unless a step says so', async () => {
    const { svc, as } = setup({ above: 'u-grace', duties: { finance: 'u-omar', budgetOwners: { Sales: 'u-wairimu' } } });
    expect((await svc.checkForChat(ORG, 'u-lina', 95000, TODAY)).approverFirstName).toBe('Grace');
    await expect(svc.board(as('u-omar'), TODAY)).rejects.toThrow(new ForbiddenException(SPEND_REFUSED.onlyAdminsAndLeads));
    /* Wairimu holds the Sales budget, but no step names it, so her list is her own team's, as it was. */
    expect((await svc.board(as('u-wairimu'), TODAY)).waiting.map((w) => [w.name, w.mayDecide])).toEqual([['Miriam Wanjiku', true]]);
    const asked = setup({ above: 'u-grace', duties: { finance: 'u-omar' }, steps: [['finance', 'admin']] });
    expect((await asked.svc.checkForChat(ORG, 'u-lina', 95000, TODAY)).approverFirstName).toBe('Omar');
  });

  it('nobody decides their own: Lina holds Product’s budget and a step names it, so hers goes to an admin', async () => {
    const { svc } = setup({ above: 'u-grace', duties: { finance: 'u-omar', budgetOwners: { Product: 'u-lina' } }, steps: [['budgetOwner', 'admin']] });
    expect((await svc.checkForChat(ORG, 'u-lina', 95000, TODAY)).approver).toBe('admin');
  });

  it('a holder who is now a guest is passed over, and with no duty held it is still the person Grace named', async () => {
    const guest = setup({ above: 'u-grace', duties: { finance: 'u-tomas' } });
    expect((await guest.svc.checkForChat(ORG, 'u-lina', 95000, TODAY)).approverFirstName).toBe('Grace');
    const none = setup({ above: 'u-grace', duties: null });
    expect((await none.svc.checkForChat(ORG, 'u-lina', 95000, TODAY)).approverFirstName).toBe('Grace');
    await expect(none.svc.board(none.as('u-omar'), TODAY)).rejects.toThrow(new ForbiddenException(SPEND_REFUSED.onlyAdminsAndLeads));
  });

  it('under the limit, the duties change nothing: Kamau’s fuel still goes to Fatuma, his lead', async () => {
    const { svc, as } = setup({ above: 'u-grace', duties: { finance: 'u-omar', budgetOwners: { Operations: 'u-omar' } } });
    const fatuma = await svc.board(as('u-fatuma'), TODAY);
    expect(fatuma.waiting.find((w) => w.name === 'Kamau Njenga')).toMatchObject({ approver: { kind: 'manager' }, mayDecide: true });
  });
});
