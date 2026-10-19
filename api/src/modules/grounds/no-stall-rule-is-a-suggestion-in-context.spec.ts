import { APlanIsManyProposalsService } from './a-plan-is-many-proposals.service';
import { theStallRuleAsALine, theStallRuleDeclined } from '../board/the-stall-rule';

/**
 * NO STALL RULE SET YET, AS A SUGGESTION IN CONTEXT (Hafsah's standing decision 4, as changed on 18 October). On Grace's sales
 * check-in, with Release 1's board, "Waiting for you to confirm" holds "Drop a deal after 3 working days with no answer from the
 * customer" until she confirms it or says not now; either is kept in how we work. Nobody but the lead is served it.
 */
function aCheckIn(lines: string[], releaseOne = true, kindOfWork = 'sales team') {
  const made: any[] = [];
  const ground = { id: 'g1', organizationId: 'org', initiatorId: 'u-grace', status: 'ACTIVE', endState: null, scenario: 'OKR_ALIGNMENT', kindOfWork, participants: [] };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: releaseOne })) },
    planProposal: { findMany: jest.fn(async () => []) },
    groundContextItem: {
      findMany: jest.fn(async () => lines.map((text) => ({ kind: 'WAY_OF_WORKING', text, closedAt: null }))),
      create: jest.fn(async (a: any) => { made.push(a.data); return { id: 'c1' }; }),
    },
  };
  return { svc: new APlanIsManyProposalsService(prisma, null as any, null as any), made };
}

describe('no stall rule set yet, as a suggestion in Context', () => {
  it('Grace reads the suggested rule to confirm, quoting nobody', async () => {
    const { svc } = aCheckIn([]);
    const { proposals } = await svc.waiting('g1', 'u-grace');
    expect(proposals).toEqual([expect.objectContaining({ id: 'the-stall-rule', suggested: true, says: 'Drop a deal after 3 working days with no answer from the customer', note: 'Until you set a stall rule, no deal is marked cold or dropped for going quiet.' })]);
  });

  it('her confirm keeps the rule in how we work, and her not now is kept too', async () => {
    const a = aCheckIn([]);
    await a.svc.confirm('g1', 'u-grace', 'the-stall-rule');
    expect(a.made.map((m) => [m.kind, m.text])).toEqual([['WAY_OF_WORKING', theStallRuleAsALine(3)]]);
    const b = aCheckIn([]);
    await b.svc.notNow('g1', 'u-grace', 'the-stall-rule');
    expect(b.made.map((m) => m.text)).toEqual([theStallRuleDeclined]);
  });

  it('it is not offered once a rule is set or she said not now, off Release 1, or on a check-in that is not sales', async () => {
    for (const c of [aCheckIn([theStallRuleAsALine(3)]), aCheckIn([theStallRuleDeclined]), aCheckIn([], false), aCheckIn([], true, 'operations')]) {
      expect((await c.svc.waiting('g1', 'u-grace')).proposals).toEqual([]);
    }
  });

  it('nobody but the lead reads or answers it', async () => {
    const { svc } = aCheckIn([]);
    await expect(svc.waiting('g1', 'u-mercy')).rejects.toThrow();
    await expect(svc.confirm('g1', 'u-mercy', 'the-stall-rule')).rejects.toThrow();
  });
});
