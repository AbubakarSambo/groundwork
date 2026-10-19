import { sendTheLeadsDailyNudges } from './the-leads-daily-nudge';
import { aDecisionSheOwes, theGapSaid } from './the-summary-reads-the-board';
import { toCloseTheGap } from '../board/to-close-the-gap';
import { TEMPLATES, fill } from '../whatsapp/a-message-outside-the-window';

/**
 * GRACE'S MORNING SUMMARY SAYS WHAT HER BOARD SAYS (Hafsah, 19 October, point 1). lead_daily_summary is unchanged; only its {{2}}.
 *
 * Drop Access, Thursday 15 October 2026, 11:00 in Nairobi. Grace's WhatsApp summary in the messages test was the one line
 * "Joseph promised Mercy samples today." Her board the same morning said, under What needs you, "People in this check-in said
 * different things. A decision on a discount for a potential 10-unit sale is holding up progress. This needs settling." (the Mama Pima
 * deal), and "Kevin Omondi is waiting on a decision on the quote for 4 units", which is Ngong Road Minimart's to make, not hers; and the
 * team, at 65 of 120 units, still needed 55 more. Read here from the run's own record and board, as Grace reads it on her phone.
 */
const NOW = new Date('2026-10-15T08:00:00.000Z');
const G = 'ac3b4070-27f1-4dc4-a2ea-b027f8fc72d1';
const ORG = '017b3b44-850c-481f-964b-6bc41ece4dce';
const GROUND = { id: G, label: 'Sales team, Q4', scenario: 'PULSE_CHECK', organizationId: ORG, overWhatsApp: null, initiatorId: 'u-grace', timelineDays: 18, cadence: 'DAILY', workingDays: [], workStages: null, endsAt: null, createdAt: new Date('2026-10-12T05:30:00Z'), startsAt: null, runsUntilEnded: false };
const PEOPLE = [
  { id: 'gp-grace', userId: 'u-grace', partyType: 'INITIATOR', nameGiven: null, user: { firstName: 'Grace' } },
  { id: 'gp-mercy', userId: 'u-mercy', partyType: 'PARTICIPANT', nameGiven: null, user: { firstName: 'Mercy' } },
  { id: 'gp-joseph', userId: 'u-joseph', partyType: 'PARTICIPANT', nameGiven: null, user: { firstName: 'Joseph' } },
  { id: 'gp-kevin', userId: 'u-kevin', partyType: 'PARTICIPANT', nameGiven: null, user: { firstName: 'Kevin' } },
];
/* Mercy waits on Joseph for the samples, due today: the one line the summary had. */
const SAMPLES = { id: 'w-samples', groundId: G, fromParticipantId: 'gp-mercy', onParticipantId: 'gp-joseph', onLabel: null, what: 'samples', status: 'WAITING', clearedAt: null, dueOn: new Date('2026-10-15T00:00:00Z'), createdAt: new Date('2026-10-12T11:07:08.086Z'), namedTheThing: true };

/* Grace's board as she was served it that morning: its own decisions, and its own "To close the gap" from the open deals on record. */
const deal = (name: string, units: string | null) => ({ kind: 'deal', id: `d-${name}`, name, group: 'possible', owner: null, fields: units ? { Units: units } : {} });
const OPEN = [deal('Ngong Road Minimart', '4'), deal('Juja Hardware', '5'), deal('Mama Pima', '10'), deal('Savannah Cafe', '6'), deal('Westlands Pharmacy', '2'), deal('Upper Hill Offices', null)];
const AIM = { id: 'obj-120', name: 'Units sold by 30 October', target: 120, count: 65, ownerParticipantId: null, dueOn: new Date('2026-10-30T00:00:00Z'), direction: 'AIM', fromTheDeals: { counts: 'units' } };
const BOARD = {
  decisions: [
    { question: 'Kevin Omondi is waiting on a decision on the quote for 4 units, so it needs deciding.', why: 'They cannot move until this is decided.', owner: 'Ngong Road Minimart', source: 'blocker' },
    { question: 'People in this check-in said different things. A decision on a discount for a potential 10-unit sale is holding up progress. This needs settling.', why: 'What people said about this does not match, so nobody can assume it is agreed.', owner: 'You', source: 'divergence' },
  ],
  leadActions: [{ id: 'the-stall-rule', kind: 'decision', text: 'No stall rule set yet' }],
  objectives: [AIM],
  workRecords: [{ rows: OPEN }],
  toCloseTheGap: toCloseTheGap('sales team', [{ rows: OPEN }] as any, [AIM], new Date('2026-10-30T00:00:00Z'), NOW, { nothingBooked: true, inShort: true }),
};

function graceMorning(o: { board?: any; releaseOne?: boolean } = {}) {
  const whats: any[] = [];
  const base: any = {
    ground: {
      findMany: jest.fn(async () => [GROUND]),
      findUnique: jest.fn(async () => ({ id: G, organizationId: ORG, kindOfWork: 'sales team', initiatorId: 'u-grace', participants: PEOPLE })),
    },
    organization: { findMany: jest.fn(async () => [{ id: ORG }]), findUnique: jest.fn(async () => ({ release1SalesBoardOn: o.releaseOne !== false })) },
    platformSetting: { findUnique: jest.fn(async () => ({ value: { at: '2026-09-01T00:00:00Z' } })), create: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Grace', email: 'grace@dropaccess.test', phoneNumber: null, deletedAt: null, isActive: true })), findMany: jest.fn(async () => []) },
    person: { findFirst: jest.fn(async () => ({ phone: '+254700300001', externalId: 'grace' })), findMany: jest.fn(async () => []) },
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => (where?.userId ? [{ id: 'gp-grace', groundId: G }] : PEOPLE.filter((p) => p.partyType !== 'INITIATOR').map((p) => ({ ...p, groundId: G, email: null, managingOnly: false, leftAt: null, user: { ...p.user, lastName: null, awaitingOrgApproval: false } })))) },
    groundDependency: { findMany: jest.fn(async () => [SAMPLES]) },
  };
  const prisma: any = new Proxy(base, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, m: string) => jest.fn(async () => (m === 'findMany' ? [] : m === 'count' ? 0 : null)) }) });
  const whatsapp: any = { isEnabled: jest.fn(async () => true), hasSaidStop: jest.fn(async () => false), sendFor: jest.fn(async (_o: string, _t: string, text: string, context: any) => { whats.push({ text, context }); return { sent: true }; }) };
  const email: any = { sendTheLeadsDailyNudge: jest.fn(async () => 'sent') };
  const run = () => sendTheLeadsDailyNudges({ prisma, whatsapp, email, boards: {}, frontendUrl: 'http://localhost:5206', ...(o.board ? { board: { get: jest.fn(async () => o.board) } } : {}) }, NOW);
  return { run, whats };
}
const onHerPhone = (w: any) => fill(TEMPLATES['lead-summary'].body, w.context.params);

describe("Grace's morning summary on Thursday 15 October", () => {
  it('before: from the record alone it is the one line the run sent', async () => {
    const m = graceMorning();
    await m.run();
    expect(m.whats[0].context.params[1]).toBe('Joseph promised Mercy samples today.');
  });

  it('now: all three parts the board has, most important first, never a single minor line', async () => {
    const m = graceMorning({ board: BOARD });
    await m.run();
    const p = m.whats[0].context.params[1];
    expect(p).toBe(
      'One thing needs you today. A decision on a discount for a potential 10-unit sale is holding up progress, and people said different things about it, so it needs settling. '
      + 'Joseph promised Mercy samples today. '
      + 'These are risks. 55 more units are needed to reach the target of 120 units. Even if all six open deals close, that is 27 units, 28 short. Upper Hill Offices has no number of units yet.',
    );
    /* The customer's decision is never put to her. */
    expect(p).not.toContain('Kevin Omondi is waiting on a decision on the quote');
    expect(onHerPhone(m.whats[0]).length).toBeLessThanOrEqual(1024);
    expect(onHerPhone(m.whats[0])).toMatch(/^Good morning Grace\. Here is today's summary of your check-ins\. /);
  });

  it('without Release 1\'s switch the decision she owes is still said, and the deals are not read', async () => {
    const m = graceMorning({ board: BOARD, releaseOne: false });
    await m.run();
    const p = m.whats[0].context.params[1];
    expect(p).toContain('A decision on a discount for a potential 10-unit sale is holding up progress');
    expect(p).not.toContain('55 more units');
  });
});

describe('the board\'s sentences, said for a message', () => {
  it('a decision people disagreed on is one plain sentence for her to settle', () => {
    expect(aDecisionSheOwes('People in this check-in said different things. There is no shared, standard price for a water dispenser unit. This needs settling.', 'divergence').replace('{in}', ''))
      .toBe('There is no shared, standard price for a water dispenser unit, and people said different things about it, so it needs settling.');
  });
  it('the gap says how many more, of what target, and never "here"', () => {
    const said = theGapSaid({ gap: 55, aim: 'Units sold by 30 October', says: 'Even if all five here close too, that is 27 units, 28 short.' }, 120, 'units')!.replace('{in}', '');
    expect(said).toBe('55 more units are needed to reach the target of 120 units. Even if all five open deals close too, that is 27 units, 28 short.');
  });
});
