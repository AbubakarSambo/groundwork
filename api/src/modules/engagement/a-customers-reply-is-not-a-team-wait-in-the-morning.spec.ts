import { whatIsOutstandingFor, theTemplateParagraph, theseForAPhone, withPlacesWhereTheyTellApart } from './the-leads-daily-nudge';
import { BoardService } from '../board/board.service';
import { TEMPLATES } from '../whatsapp/a-message-outside-the-window';

/**
 * A CUSTOMER'S REPLY IS ON ITS DEAL, IN THE MORNING SUMMARY AND IN WHAT THE WHOLE PLACE IS WAITING ON TOO (Drop Access,
 * 17 October 2026). The board took "Kevin is waiting on Ali for a decision on the quote" off its Blockers (Hafsah's answer of
 * 17 October: "A customer's reply updates its deal, going under Blockers only if it stops the deal."). Grace's morning summary
 * and the organisation's list of what it is waiting on still read it as a wait on the team. The template lead_daily_summary is
 * unchanged: only the words that go into it change.
 */
const NOW = new Date('2026-10-29T05:00:00Z');
const day = (s: string) => new Date(`${s}T15:00:00Z`);
const person = (userId: string, first: string, last: string) => ({ userId, nameGiven: null, email: `${first.toLowerCase()}@drop.test`, managingOnly: false, leftAt: null, partyType: 'RESPONDENT', user: { firstName: first, lastName: last, awaitingOrgApproval: false } });
const PEOPLE: Record<string, any> = {
  'p-kevin': { id: 'p-kevin', groundId: 'g-sales', ...person('u-kevin', 'Kevin', 'Omondi') },
  'p-mercy': { id: 'p-mercy', groundId: 'g-sales', ...person('u-mercy', 'Mercy', 'Wairimu') },
  'p-joseph': { id: 'p-joseph', groundId: 'g-sales', ...person('u-joseph', 'Joseph', 'Kariuki') },
};
const SALES = { id: 'g-sales', label: 'Sales team, Q4', scenario: 'SALES_TEAM_CHECK', overWhatsApp: null, organizationId: 'org', initiatorId: 'u-grace', timelineDays: 20, cadence: 'DAILY' };
const wait = (id: string, from: string, onLabel: string | null, onId: string | null, what: string, status = 'WAITING', dueOn: Date | null = null) => ({
  id, groundId: 'g-sales', what, namedTheThing: true, onLabel, status, createdAt: day('2026-10-14'), dueOn, blockerKind: null, triedSaid: null,
  fromParticipantId: from, onParticipantId: onId, fromParticipant: PEOPLE[from], onParticipant: onId ? PEOPLE[onId] : null, escalatedAt: null,
});
const WAITS = [
  /* On a customer of a deal: on its deal, not on the team. */
  wait('w-ali', 'p-kevin', 'Ali', null, 'a decision on the quote for 4 units'),
  wait('w-gym', 'p-kevin', 'the owner of Kasarani Gym', null, 'a decision on 3 units'),
  /* On a customer, said to stop the deal: stays. */
  wait('w-jane', 'p-kevin', 'Jane', null, 'the deposit before anything is delivered', 'BLOCKING'),
  /* On a colleague, a fortnight old and late: the team's own. */
  wait('w-samples', 'p-mercy', null, 'p-joseph', 'the sample units', 'WAITING', day('2026-10-15')),
];
const DEALS = [
  { id: 'd-ngong', groundId: 'g-sales', name: 'Ngong Road Minimart', ownerParticipantId: 'p-kevin', fields: { Units: '4', Contact: 'Ali' } },
  { id: 'd-gym', groundId: 'g-sales', name: 'Kasarani Gym', ownerParticipantId: 'p-kevin', fields: { Units: '3', Contact: 'Faith' } },
  { id: 'd-savannah', groundId: 'g-sales', name: 'Savannah Cafe', ownerParticipantId: 'p-kevin', fields: { Units: '6', Contact: 'Jane' } },
];

/* Release 1's sales board is on for Drop Access (release-one-sales-board): what this file reads is behind it. */
const RELEASE_ONE_ON = { findUnique: jest.fn(async () => ({ release1SalesBoardOn: true })) };

function aPrisma(): any {
  return {
    organization: RELEASE_ONE_ON,
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => (where.userId ? [] : Object.values(PEOPLE))) },
    personObjective: { findMany: jest.fn(async () => []) },
    groundDependency: { findMany: jest.fn(async () => WAITS) },
    groundCommitment: { findMany: jest.fn(async () => []) },
    workItem: { findMany: jest.fn(async () => DEALS) },
    subject: { findMany: jest.fn(async () => []) },
    groundObjective: { findMany: jest.fn(async () => []) },
    groundObjectiveSnapshot: { findMany: jest.fn(async () => []) },
    checkIn: { findMany: jest.fn(async () => []) },
    person: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    notification: { findMany: jest.fn(async () => []) },
    platformSetting: { findUnique: jest.fn(async () => null) },
  };
}

describe('Grace\'s morning summary', () => {
  it('does not say a customer\'s reply is a wait on the team, and keeps the team\'s own waits and a reply said to stop the deal', async () => {
    const found = await whatIsOutstandingFor(aPrisma(), { userId: 'u-grace', organizationId: 'org', grounds: [SALES] }, { boards: {}, release: null }, NOW);
    const all = [...found.needsYou, ...found.overdueOnYourTeam, ...found.risks].map((t) => t.text).join('\n');
    expect(all).not.toMatch(/Ali|Kasarani/);
    expect(all).toMatch(/waiting on Joseph for the sample units/);
    expect(all).toMatch(/Kevin has been waiting on Jane for the deposit before anything is delivered/);
  });

  it('fills the same template, with only its words changed', async () => {
    const found = await whatIsOutstandingFor(aPrisma(), { userId: 'u-grace', organizationId: 'org', grounds: [SALES] }, { boards: {}, release: null }, NOW);
    const t = theTemplateParagraph('Grace', withPlacesWhereTheyTellApart(theseForAPhone(found)), 'http://localhost/today');
    expect(t.params).toHaveLength(3);
    expect(t.params[0]).toBe('Grace');
    /* Mercy's wait on Joseph is her account until Joseph's own promise confirms it (decision 137), so it reads as a risk here. */
    /* Changed 18 October (Drop Access run 1, item 18): a message no longer carries "Not backed: ... could have messaged ..." (clipped, judging, and untrue in the run); it says what was tried, in full with its day, or nothing. */
    /* Changed 22 November 2026 (release test, bug 34, commit 2b308fa48): this summary speaks with the morning's approved labels (Hafsah, 21 October: "Needs you today:", "Closing:", "Your team:"), the same as the direct morning, so the lead reads one shape every morning. A risk is said under "Your team:" with what is overdue, never with a label of its own. */
    expect(t.params[1]).toBe('Your team: Mercy says the work is waiting on Joseph for the sample units. Kevin has been waiting on Jane for the deposit before anything is delivered since Wednesday 14 October.');
    expect(TEMPLATES['lead-summary'].name).toBe('lead_daily_summary');
    expect(TEMPLATES['lead-summary'].body).toBe("Good morning {{1}}. Here is today's summary of your check-ins. {{2}} You can open your board for the full picture here {{3}} If you would rather not hear from us here again today, reply \"not now\".");
  });
});

describe('what the whole place is waiting on', () => {
  it('leaves out a customer\'s reply on a deal, and keeps the team\'s waits and a reply that stops a deal', async () => {
    const prisma: any = {
      groundDependency: { findMany: jest.fn(async () => WAITS.map((w) => ({ ...w, ground: { label: 'Sales team, Q4', scenario: 'SALES_TEAM_CHECK', initiatorId: 'u-grace', peersVisibleToEachOther: true, participants: Object.values(PEOPLE) } }))) },
      workItem: { findMany: jest.fn(async () => DEALS) },
      person: { findMany: jest.fn(async () => []) },
      organization: RELEASE_ONE_ON,
    };
    const board = new BoardService(prisma, {} as any, {} as any, {} as any);
    const { waiting } = await board.waitingAcrossTheOrg('org', NOW);
    const said = (waiting as any[]).map((w) => `${w.fromName} on ${w.onName ?? w.onLabel} for ${w.what}`);
    expect(said).toEqual(expect.arrayContaining(['Mercy Wairimu on Joseph Kariuki for the sample units', 'Kevin Omondi on Jane for the deposit before anything is delivered']));
    expect(said.join('\n')).not.toMatch(/Ali|Kasarani/);
  });
});
