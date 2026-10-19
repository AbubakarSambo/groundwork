import { sendTheLeadsDailyNudges } from './the-leads-daily-nudge';
import { toCloseTheGap } from '../board/to-close-the-gap';
import { theFirstTimeThisWaitWasSaid } from './the-sales-morning-from-the-record';

/**
 * ONE WAIT SAID TWICE IS WAITED FOR SINCE THE FIRST TIME (Drop Access, messages test, fourth run). Mercy said on Monday 12 October "I can't
 * show Peter samples until Joseph brings me the sample units he promised.", and on Wednesday 14 October "I'm waiting on him for the Tuskys
 * Westgate samples." The record holds two waits, Monday's and Wednesday's (due Thursday). Grace's summary on Thursday 15 October said
 * "Joseph promised Mercy the Tuskys Westgate samples today. Mercy has been waiting since Wednesday 14 October."
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
const SAMPLES_UNUSED = { id: 'w-samples', groundId: G, fromParticipantId: 'gp-mercy', onParticipantId: 'gp-joseph', onLabel: null, what: 'samples', status: 'WAITING', clearedAt: null, dueOn: new Date('2026-10-15T00:00:00Z'), createdAt: new Date('2026-10-12T11:07:08.086Z'), namedTheThing: true };

/* Grace's board as she was served it that morning: its own decisions, and its own "To close the gap" from the open deals on record. */
const deal = (name: string, units: string | null, ownerParticipantId: string | null = null) => ({ kind: 'deal', id: `d-${name}`, name, group: 'possible', owner: null, ownerParticipantId, fields: units ? { Units: units } : {} });
const OPEN = [deal('Ngong Road Minimart', '4', 'gp-kevin'), deal('Juja Hardware', '5', 'gp-joseph'), deal('Mama Pima', '10', 'gp-joseph'), deal('Savannah Cafe', '6', 'gp-kevin'), deal('Westlands Pharmacy', '2'), deal('Upper Hill Offices', null, 'gp-kevin')];
/* What was said in the check-in, as the run's record holds it (Monday 12 October): Joseph at 11:09 in Nairobi, Grace in her own check-in. */
const SAID = [
  { participantId: 'gp-joseph', type: 'WORRY', text: 'Wanjiru is still deciding. She wants a discount.', createdAt: new Date('2026-10-12T11:09:19.756Z') },
  { participantId: 'gp-joseph', type: 'WORRY', text: "She's waiting to see if I'll give her the discount. That's what she said.", createdAt: new Date('2026-10-12T11:09:19.756Z') },
  { participantId: 'gp-joseph', type: 'INTENT', text: "I'm working on getting 10 units confirmed from Mama Pima Stores.", createdAt: new Date('2026-10-12T11:09:19.756Z') },
  { participantId: 'gp-grace', type: 'COMMITMENT', text: 'I need to make a decision about his KES 4,500 pricing request.', createdAt: new Date('2026-10-12T08:33:26.128Z') },
  /* Mercy, Wednesday 14 October: which customer the samples are for. */
  { participantId: 'gp-mercy', type: 'WORRY', text: 'The samples from Joseph are holding up Tuskys Westgate.', createdAt: new Date('2026-10-14T06:32:53.832Z') },
];
/* The deals on record, as the run holds them: Tuskys is Mercy's. */
const ON_RECORD = [
  { id: 'wi-tuskys', groundId: G, kind: 'deal', name: 'Tuskys', stage: null, ownerParticipantId: 'gp-mercy', fields: {}, createdAt: new Date('2026-10-12T11:07:08Z') },
  { id: 'wi-pima', groundId: G, kind: 'deal', name: 'Mama Pima', stage: null, ownerParticipantId: 'gp-joseph', fields: { Units: '10' }, createdAt: new Date('2026-10-12T11:00:52Z') },
];
const AIM = { id: 'obj-120', name: 'Units sold by 30 October', target: 120, count: 65, ownerParticipantId: null, dueOn: new Date('2026-10-30T00:00:00Z'), direction: 'AIM', fromTheDeals: { counts: 'units' } };
const BOARD = {
  decisions: [
    { question: 'Kevin Omondi is waiting on a decision on the quote for 4 units, so it needs deciding.', why: 'They cannot move until this is decided.', owner: 'Ngong Road Minimart', source: 'blocker' },
    { question: 'People in this check-in said different things. A decision on a discount for a potential 10-unit sale is holding up progress. This needs settling.', why: 'What people said about this does not match, so nobody can assume it is agreed.', owner: 'You', source: 'divergence' },
  ],
  leadActions: [{ id: 'the-stall-rule', kind: 'decision', text: 'No stall rule set yet' }],
  /* The board's own read of the difference, as served to Grace: what each person said about it. */
  divergence: { items: [{ topic: 'A decision on a discount for a potential 10-unit sale is holding up progress.', settledBy: "The initiator needs to provide a 'yes' or 'no' answer on the discount request.", positions: [
    { who: 'Joseph Kariuki', view: 'Joseph Kariuki is waiting on a decision about a discount request for the Mama Pima Stores deal.' },
    { who: 'You', view: "You have noted the need to make a decision on Joseph Kariuki's pricing request." },
  ] }] },
  objectives: [AIM],
  workRecords: [{ rows: OPEN }],
  toCloseTheGap: toCloseTheGap('sales team', [{ rows: OPEN }] as any, [AIM], new Date('2026-10-30T00:00:00Z'), NOW, { nothingBooked: true, inShort: true }),
};

function graceMorning(o: { board?: any; releaseOne?: boolean; said?: any[] } = {}) {
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
    groundDependency: { findMany: jest.fn(async () => WAITS) },
    recordEntry: { findMany: jest.fn(async () => (o.said ?? SAID).map((l: any, i: number) => ({ id: `re-${i}`, checkInId: null, disputedAt: null, ...l }))) },
    workItem: { findMany: jest.fn(async () => ON_RECORD) },
  };
  const prisma: any = new Proxy(base, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: (_x: any, m: string) => jest.fn(async () => (m === 'findMany' ? [] : m === 'count' ? 0 : null)) }) });
  const whatsapp: any = { isEnabled: jest.fn(async () => true), hasSaidStop: jest.fn(async () => false), sendFor: jest.fn(async (_o: string, _t: string, text: string, context: any) => { whats.push({ text, context }); return { sent: true }; }) };
  const email: any = { sendTheLeadsDailyNudge: jest.fn(async () => 'sent') };
  const run = () => sendTheLeadsDailyNudges({ prisma, whatsapp, email, boards: {}, frontendUrl: 'http://localhost:5206', ...(o.board ? { board: { get: jest.fn(async () => o.board) } } : {}) }, NOW);
  return { run, whats };
}

const WAITS = [
  { id: 'w-monday', groundId: G, fromParticipantId: 'gp-mercy', onParticipantId: 'gp-joseph', onLabel: null, what: 'the sample units he promised', status: 'BLOCKING', clearedAt: null, dueOn: null, createdAt: new Date('2026-10-12T11:06:12.335Z'), namedTheThing: true },
  { id: 'w-wednesday', groundId: G, fromParticipantId: 'gp-mercy', onParticipantId: 'gp-joseph', onLabel: null, what: 'the Tuskys Westgate samples', status: 'BLOCKING', clearedAt: null, dueOn: new Date('2026-10-15T00:00:00Z'), createdAt: new Date('2026-10-14T06:33:09.842Z'), namedTheThing: true },
];

describe("Grace's summary on Thursday 15 October", () => {
  it('says Mercy has been waiting since Monday 12 October, the first time she said it', async () => {
    const m = graceMorning();
    await m.run();
    expect(m.whats[0].context.params[1]).toContain('Mercy has been waiting since Monday 12 October.');
    expect(m.whats[0].context.params[1]).not.toContain('since Wednesday 14 October');
  });
  it('a wait for another thing, or one that ended before, is not the same wait', () => {
    const w = WAITS[1];
    expect(theFirstTimeThisWaitWasSaid(w, [{ ...WAITS[0], what: 'the signed order' }, w]).toISOString()).toBe('2026-10-14T06:33:09.842Z');
    expect(theFirstTimeThisWaitWasSaid(w, [{ ...WAITS[0], clearedAt: new Date('2026-10-13T00:00:00Z') }, w]).toISOString()).toBe('2026-10-14T06:33:09.842Z');
    expect(theFirstTimeThisWaitWasSaid(w, WAITS).toISOString()).toBe('2026-10-12T11:06:12.335Z');
  });
});
