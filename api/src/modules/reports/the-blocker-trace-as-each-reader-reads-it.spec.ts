import { GroundScenario, PartyType } from '@prisma/client';
import { TheBlockerTraceService } from './the-blocker-trace.service';
import { ReportsService } from './reports.service';
import { whichTeamItIsWaitingOn } from './the-blocker-trace';

/**
 * DECISION 75, ITEM 5: ON A BLOCKER THAT CROSSES TEAMS, THE LEAD SEES ONLY THEIR OWN TEAM'S STEPS, BUT
 * ALWAYS SEES WHICH TEAM IT IS WAITING ON, AND SINCE WHEN.
 *
 * The prototype's B5 "Where the blocker started": Miriam asked Finance for Westgate's credit terms on
 * 14 September; Finance waits on Amani's sign-off in Leadership. Wairimu runs Sales and cannot open
 * Finance's or Leadership's check-ins. Before, she read the Sales steps and nothing to say what they
 * waited on, and where the chain started in Finance she read nothing at all.
 */
const at = (d: string) => new Date(`2026-09-${d}T09:00:00Z`);
const party = (id: string, userId: string, first: string, last: string, lead = false) => ({
  id, userId, partyType: lead ? PartyType.INITIATOR : PartyType.PARTICIPANT, managingOnly: lead, roleAsDescribed: null, createdAt: at('01'),
  email: `${userId}@baridi.test`, nameGiven: null, organisationGiven: null, user: { firstName: first, lastName: last },
});
const SALES = { id: 'g-sales', label: 'Sales team, Q3', initiatorId: 'u-wairimu', scenario: GroundScenario.OKR_ALIGNMENT, peersVisibleToEachOther: true, report: null,
  participants: [party('p-wairimu', 'u-wairimu', 'Wairimu', 'Kamau', true), party('p-miriam', 'u-miriam', 'Miriam', 'Wanjiku'), party('p-joseph', 'u-joseph', 'Joseph', 'Ouma')] };
const FINANCE = { id: 'g-fin', label: 'Finance, Q3', initiatorId: 'u-grace', scenario: GroundScenario.OKR_ALIGNMENT, peersVisibleToEachOther: true, report: null,
  participants: [party('p-grace', 'u-grace', 'Grace', 'Achieng', true)] };
const LEADERSHIP = { id: 'g-lead', label: 'Leadership, Q3', initiatorId: 'u-amani', scenario: GroundScenario.OKR_ALIGNMENT, peersVisibleToEachOther: true, report: null,
  participants: [party('p-amani', 'u-amani', 'Amani', 'Njoroge', true)] };
const step = (kind: string, groundId: string, personId: string, text: string) => ({ kind, groundId, personId, text, sourceId: `d-${kind}` });
const STEPS = [
  step('need', 'g-sales', 'p-miriam', 'Westgate Deli’s deposit is needed before 30 September.'),
  step('request', 'g-sales', 'p-miriam', 'Credit terms were asked for on 14 September, without the trade references.'),
  step('question', 'g-fin', 'p-grace', 'The question about the references was not answered for 6 days.'),
  step('priority', 'g-lead', 'p-amani', 'The sign-off is queued behind the supplier decision.'),
  step('effect', 'g-sales', 'p-wairimu', 'One of the three sales that close the gap is at risk.'),
];
const TRACE = {
  id: 't-1', organizationId: 'org-1', anchorDependencyId: 'd-anchor', endGroundId: 'g-sales', startGroundId: 'g-sales', steps: STEPS,
  whereItStarted: 'Where it started: the request went to Finance without the references.', decisionNeeded: 'Decision needed: sign off the credit terms this week?',
  decisionOwnerParticipantId: 'p-amani',
};
const ANCHOR = { id: 'd-anchor', groundId: 'g-sales', fromParticipantId: 'p-miriam', onParticipantId: null, onLabel: 'Finance', waitingOnGroundId: 'g-fin', createdAt: at('14') };

function readAs(userId: string, role: string, opts: { trace?: any; sales?: any; anchor?: any; canOpen?: string[] } = {}) {
  const grounds = [opts.sales ?? SALES, FINANCE, LEADERSHIP];
  const canOpen = opts.canOpen ?? (role === 'ADMIN' ? grounds.map((g) => g.id) : grounds.filter((g) => g.participants.some((p: any) => p.userId === userId)).map((g) => g.id));
  const prisma: any = {
    blockerTrace: { findMany: jest.fn(async () => [structuredClone(opts.trace ?? TRACE)]) },
    ground: { findMany: jest.fn(async (a: any) => structuredClone(grounds.filter((g) => a.where.id.in.includes(g.id)))) },
    groundDependency: { findUnique: jest.fn(async () => structuredClone(opts.anchor ?? ANCHOR)) },
  };
  const list = { list: jest.fn(async () => canOpen.map((id) => ({ id, organizationId: 'org-1' }))) };
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  return new TheBlockerTraceService(prisma, list as any, reports)
    .forReader('g-sales', { userId, email: `${userId}@baridi.test`, organizationId: 'org-1', role }, new Date('2026-10-02T12:00:00Z'));
}

describe('Wairimu, who runs Sales and cannot open Finance or Leadership', () => {
  it('reads only the Sales steps, and which team it waits on and since when', async () => {
    const { traces } = await readAs('u-wairimu', 'MEMBER');
    expect(traces).toHaveLength(1);
    expect(traces[0].steps.map((s) => s.checkIn)).toEqual(['Sales team, Q3', 'Sales team, Q3', 'Sales team, Q3']);
    expect(traces[0].waitingOn).toBe('This is waiting on Finance since 14 September.');
    expect(JSON.stringify(traces)).not.toMatch(/references was not answered|supplier decision|Grace|Amani|Leadership|Finance, Q3/);
    expect(traces[0].whereItStarted).toBeNull();
    expect(traces[0].decidedBy).toBeNull();
  });

  it('where the chain started in Finance, she still reads her own steps and which team it waits on', async () => {
    const trace = { ...TRACE, startGroundId: 'g-fin', steps: [step('approval', 'g-fin', 'p-grace', 'Terms over 30 days need a sign-off since August.'), ...STEPS.slice(1)] };
    const { traces } = await readAs('u-wairimu', 'MEMBER', { trace });
    expect(traces).toHaveLength(1);
    expect(traces[0].steps[0].checkIn).toBe('Sales team, Q3');
    expect(traces[0].waitingOn).toBe('This is waiting on Finance since 14 September.');
    expect(JSON.stringify(traces)).not.toMatch(/August|sign-off since/);
  });

  it('where Miriam named nobody for the team, it says another team, never the other check-in\'s name', async () => {
    const { traces } = await readAs('u-wairimu', 'MEMBER', { anchor: { ...ANCHOR, onLabel: null } });
    expect(traces[0].waitingOn).toBe('This is waiting on another team since 14 September.');
  });
});

describe('the others who read it', () => {
  it('Miriam, in Sales where people see each other, reads the same', async () => {
    const { traces } = await readAs('u-miriam', 'MEMBER');
    expect(traces[0].waitingOn).toBe('This is waiting on Finance since 14 September.');
    expect(traces[0].steps).toHaveLength(3);
  });

  it('Joseph, where people in Sales do not see each other, reads nothing of Miriam\'s wait', async () => {
    const { traces } = await readAs('u-joseph', 'MEMBER', { sales: { ...SALES, peersVisibleToEachOther: false } });
    expect(traces).toEqual([]);
  });

  it('an admin who only reads, and may open every check-in, reads the whole chain and needs no such sentence', async () => {
    const { traces } = await readAs('u-juma', 'ADMIN');
    expect(traces[0].steps).toHaveLength(5);
    expect(traces[0].waitingOn).toBeNull();
    expect(traces[0].whereItStarted).toBe('Where it started: the request went to Finance without the references.');
  });

  it('the admin who set Sales up reads it as an admin does', async () => {
    const { traces } = await readAs('u-setup', 'ADMIN');
    expect(traces[0].waitingOn).toBeNull();
  });

  it('Grace, who runs Finance and cannot open Sales, is not served the Sales check-in\'s trace', async () => {
    await expect(readAs('u-grace', 'MEMBER')).rejects.toThrow('That check-in could not be found, so go back to your check-ins and open it from the list.');
  });

  it('on a performance plan in Sales, the person reviewed reads nothing of a chain that ends on the lead\'s step', async () => {
    const { traces } = await readAs('u-miriam', 'MEMBER', { sales: { ...SALES, scenario: GroundScenario.PIP, peersVisibleToEachOther: false } });
    expect(traces).toEqual([]);
  });
});

describe('the sentence', () => {
  const day = (d: Date) => `${d.getUTCDate()} September`;
  it('only where it waits on a check-in this reader cannot open', () => {
    expect(whichTeamItIsWaitingOn(ANCHOR, ['g-fin'], day)).toBe('This is waiting on Finance since 14 September.');
    expect(whichTeamItIsWaitingOn(ANCHOR, ['g-lead'], day)).toBeNull();
    expect(whichTeamItIsWaitingOn({ ...ANCHOR, onParticipantId: 'p-grace', onLabel: 'Grace' }, ['g-fin'], day)).toBe('This is waiting on another team since 14 September.');
  });
});
