import { TheWeeklyReportService } from './the-weekly-report.service';
import { theSalesWeek, theSalesWeekFigures } from './the-sales-week-in-numbers';
import { withTheStageKept } from '../board/a-deals-stages-are-kept';

/**
 * THE WEEK IN NUMBERS FOR A SALES CHECK-IN, AS EACH READER READS IT (Drop Access, 17 October 2026; Hafsah's answer: "the
 * weekly report gives check-ins made, deals that moved stage, deals won (proven and said), value won, new leads and deals that
 * stalled, showing only targets with numbers"). The prototype is B4-reports-and-sharing/weekly-report.txt. These tests read
 * the tiles each person is served, after the report is built from the record and kept without names.
 */

const party = (id: string, userId: string, partyType: string, first: string, last: string, t: number) => ({
  id, userId, partyType, createdAt: new Date(2026, 9, 1, 0, t), email: null, nameGiven: null, organisationGiven: null, roleAsDescribed: null,
  user: { firstName: first, lastName: last, email: null },
});
const PARTIES = [
  party('p-grace', 'u-grace', 'INITIATOR', 'Grace', 'Achieng', 0),
  party('p-kevin', 'u-kevin', 'RESPONDENT', 'Kevin', 'Omondi', 1),
  party('p-mercy', 'u-mercy', 'RESPONDENT', 'Mercy', 'Wairimu', 2),
  party('p-joseph', 'u-joseph', 'RESPONDENT', 'Joseph', 'Kariuki', 3),
];

const AT = new Date('2026-10-16T15:00:00Z'); // Friday; the week began Monday 12 October in Lagos
const MON = new Date('2026-10-12T15:00:00Z');
const TUE = new Date('2026-10-13T15:00:00Z');
const WED = new Date('2026-10-14T15:00:00Z');
const THU = new Date('2026-10-15T15:00:00Z');

const LINES = [
  { id: 'l-kilele', participantId: 'p-kevin', type: 'PROGRESS', text: 'Kilele Hotel is all done, 40 units sold. I have the M-Pesa message.', anchoredDocumentId: 'doc-1', recallBased: false, createdAt: WED, disputedAt: null },
  { id: 'l-green', participantId: 'p-mercy', type: 'PROGRESS', text: 'Greenfield Supermarket signed the order for 25 units.', anchoredDocumentId: null, recallBased: true, createdAt: THU, disputedAt: null },
  { id: 'l-savannah', participantId: 'p-kevin', type: 'PROGRESS', text: 'Savannah Cafe is confirmed for 6 units.', anchoredDocumentId: null, recallBased: true, createdAt: WED, disputedAt: null },
  { id: 'l-pima', participantId: 'p-joseph', type: 'WORRY', text: 'Mama Pima hasn\'t replied since Monday.', anchoredDocumentId: null, recallBased: true, createdAt: TUE, disputedAt: null },
  { id: 'l-pima2', participantId: 'p-joseph', type: 'PROGRESS', text: 'I am following up with Mama Pima Stores.', anchoredDocumentId: null, recallBased: true, createdAt: MON, disputedAt: null },
  { id: 'l-mboga', participantId: 'p-mercy', type: 'PROGRESS', text: 'Mama Mboga Mart wants two units.', anchoredDocumentId: null, recallBased: true, createdAt: WED, disputedAt: null },
];
/* The lines as each rep's assessment holds them: a line with a document behind it is a proven claim. */
const theAssessmentsOf = (lines: typeof LINES) => ['p-kevin', 'p-mercy', 'p-joseph'].map((pid) => ({
  sessionReport: {
    kind: 'assessment', version: 1, summary: '', setup: null, comparedWithLastTime: {},
    about: { checkInId: `c-${pid}`, groundId: 'g1', participantId: pid, who: pid, isTheLead: false, sessionNumber: 4, endedAt: THU.toISOString() },
    claims: lines.filter((l) => l.participantId === pid).map((l) => ({ id: l.id, words: l.text, from: [1], whoMaySee: 'the people in this check-in', saidWordForWord: true, proof: l.anchoredDocumentId ? 'proved' : 'said' })),
  },
}));
const deal = (id: string, name: string, stage: string, owner: string, source: string, created: Date, fields: Record<string, unknown>) =>
  ({ id, groundId: 'g1', kind: 'deal', name, stage, ownerParticipantId: owner, sourceEntryId: source, createdAt: created, fields });
const DEALS = [
  /* Won this week, with the payment shown. */
  deal('w-kilele', 'Kilele Hotel', 'Won', 'p-kevin', 'l-kilele', MON, { Units: '40', Value: 'KES 200,000' }),
  /* Won this week, said with no proof. */
  deal('w-green', 'Greenfield Supermarket', 'Won', 'p-mercy', 'l-green', MON, { Units: '25', Value: 'KES 125,000' }),
  /* Moved from Contacted to Quoted on Wednesday, kept with its day. */
  deal('w-savannah', 'Savannah Cafe', 'Quoted', 'p-kevin', 'l-savannah', TUE, withTheStageKept(withTheStageKept({ Units: '6' }, 'Contacted', TUE, 'check-in'), 'Quoted', WED, 'check-in')),
  /* Stalled: no answer since Monday. */
  deal('w-pima', 'Mama Pima Stores', 'Contacted', 'p-joseph', 'l-pima2', MON, { Value: 'KES 12,000' }),
  /* Not stalled: "Mama Pima" is another customer. */
  deal('w-mboga', 'Mama Mboga Mart', 'Contacted', 'p-mercy', 'l-mboga', WED, { Units: 'two' }),
];

/* What the lead set: the team's units and new leads on the board, each rep's units, and the same again said by her and by Kevin. */
const aim = (id: string, name: string, target: number, count: number, owner: string | null, setBy: string | null) =>
  ({ id, name, target, count, direction: null, ownerParticipantId: owner, setByParticipantId: setBy, isADecisionAboutAPerson: false });
const OBJECTIVES = [
  aim('o-units', 'Units sold by 30 October', 120, 0, null, null),
  aim('o-leads', 'New leads this week', 30, 0, null, null),
  aim('o-team-said', 'The team is aiming to sell 120 water dispensers', 120, 0, null, 'p-grace'),
  aim('o-kevin', 'units sold by 30 October', 40, 0, 'p-kevin', null),
  aim('o-kevin-said', 'Sell 40 units', 40, 0, 'p-kevin', 'p-grace'),
  aim('o-kevin-leads', 'Open 10 new leads weekly', 10, 0, 'p-kevin', 'p-grace'),
  aim('o-kevin-own', 'My target is actually 120 units', 120, 0, 'p-kevin', 'p-kevin'),
  aim('o-mercy', 'units sold by 30 October', 40, 0, 'p-mercy', null),
  aim('o-joseph', 'units sold by 30 October', 40, 0, 'p-joseph', null),
  /* A rep with no deal and nothing sold: a 0 with nothing behind it. */
];

const CHECK_INS = ['p-kevin', 'p-mercy', 'p-joseph'].map((pid, i) => ({
  id: `c-${pid}`, participantId: pid, sessionNumber: 4, status: 'COMPLETED', completedAt: THU, availableFrom: new Date('2026-10-15T13:00:00Z'), createdAt: new Date('2026-10-15T13:00:00Z'), isSetup: false, turns: [{ id: `t-${i}` }],
}));

function aSalesCheckIn(kindOfWork: string | null = 'sales org', deals = DEALS, releaseOne = true) {
  let stored: any = null;
  const ground = {
    id: 'g1', organizationId: 'org', initiatorId: 'u-grace', createdByUserId: 'u-grace', scenario: 'SALES_TEAM_CHECK', peersVisibleToEachOther: true,
    whoSeesTargets: 'THEIR_OWN', cadence: 'DAILY', kindOfWork, workStages: ['Contacted', 'Need established', 'Pitched', 'Quoted', 'Won'],
    participants: PARTIES, objectives: OBJECTIVES, personObjectives: [],
  };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    /* Release 1's sales board, switched on for the organisation unless a spec says otherwise (release-one-sales-board). */
    organization: { findUnique: jest.fn(async () => ({ id: 'org', release1SalesBoardOn: releaseOne, timeZone: null })) },
    /* What each rep said this week reaches the week from their assessments, through the one reader (1 November 2026): the same lines. */
    checkIn: { findMany: jest.fn(async ({ select }: any = {}) => (select?.sessionReport ? theAssessmentsOf(LINES) : CHECK_INS)) },
    recordEntry: { findMany: jest.fn(async () => LINES) },
    workItem: { findMany: jest.fn(async () => deals) },
    groundObjectiveSnapshot: { findMany: jest.fn(async () => []) },
    groundCommitment: { findMany: jest.fn(async () => []) },
    groundDependency: { findMany: jest.fn(async () => []) },
    patternDetection: { findMany: jest.fn(async () => []) },
    /* Changed 18 October (Hafsah's standing decision 4): the stall rule is the lead's own, so this run has the one she set, in how we work. */
    groundContextItem: { findMany: jest.fn(async (a: any) => (a?.where?.kind === 'WAY_OF_WORKING' ? [{ kind: 'WAY_OF_WORKING', text: 'A deal is dropped after 3 working days with no answer from the customer.', closedAt: null }] : [])) },
    weeklyReport: {
      upsert: jest.fn(async ({ create, update }: any) => { stored = { ...(stored ?? create), ...(update ?? {}), weekStart: create.weekStart, builtAt: new Date() }; return stored; }),
      findFirst: jest.fn(async () => stored),
    },
  };
  return { svc: new TheWeeklyReportService(prisma), prisma, stored: () => stored };
}

const GRACE = { userId: 'u-grace', role: 'MEMBER', organizationId: 'org' };
const MERCY = { userId: 'u-mercy', role: 'MEMBER', organizationId: 'org' };

beforeAll(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(AT); });
afterAll(() => { jest.useRealTimers(); });

async function tilesFor(reader: any, kind: string | null = 'sales org', deals = DEALS, releaseOne = true) {
  const c = aSalesCheckIn(kind, deals, releaseOne);
  await c.svc.build('g1', AT);
  const r = await c.svc.read('g1', reader, AT);
  return { ...c, tiles: (r.inNumbers ?? []).map((f) => `${f.figure} ${f.of}`), says: (r.inNumbers ?? []).map((f) => f.says) };
}

/*
 * Hafsah's point 23 (18 October) replaces her answer of 17 October: the week in numbers is the kit's five (check-ins made, deals
 * moved stage, moves backed by a photo or document, sales closed, deals at the stall rule), and the list of every target and aim
 * is gone from it. These tests read the tiles as each reader is served them; the earlier ones read value won, new leads and the
 * targets, which the kit does not have.
 */
describe('the week in numbers, as Grace who runs the sales check-in reads it', () => {
  it('reads the kit\'s five, in its order, and nothing else', async () => {
    const { tiles } = await tilesFor(GRACE);
    expect(tiles).toEqual([
      '100% of check-ins made this week',
      '1 deal moved stage, of the 1 whose moves are kept',
      /* Changed for the quality pass of 18 October (W-2): the kit's third tile counts the sales a document backs. */
      '1 sale backed by a document',
      '2 sales closed, 1 with proof of payment',
      '1 deal hit the stall rule',
    ]);
  });

  it('lists no target, no aim and no value won', async () => {
    const all = (await tilesFor(GRACE)).tiles.join('\n');
    expect(all).not.toMatch(/units sold|new leads|KES|won,|of 120|of 40|water dispensers|Sell 40 units|actually 120|own aim|things people said/);
  });

  it('says each tile as a full sentence too', async () => {
    const { says } = await tilesFor(GRACE);
    expect(says).toContain('2 sales were closed this week. Proof of payment shows 1, and the other is the word of the person who closed it.');
    expect(says).toContain('1 of the 2 sales closed this week has a payment record or a signed order behind it.');
    expect(says).toContain('1 open deal has gone 3 working days or more without the customer answering, as said in a check-in.');
    expect(says).toContain('1 deal moved from one stage to another this week. 4 deals were on record before each move between stages was kept, so a move of theirs is not counted.');
    for (const s of says) expect(s).toMatch(/^[A-Z0-9].*[.]$/);
  });

  it('never counts a move it did not keep: with no stages kept, the tile says it cannot count them yet', async () => {
    const plain = DEALS.map((d) => ({ ...d, fields: { Units: '1' } }));
    const { tiles, says } = await tilesFor(GRACE, 'sales org', plain);
    expect(tiles[1]).toBe('Not counted yet deals moved stage');
    expect(says[1]).toBe('The 5 deals were on record before each move between stages was kept, so no move this week can be counted yet.');
  });

  /*
   * Changed for point 24 and 25 (18 October): the week now keeps each deal that moved by the customer's name, so "What changed" can say
   * "Kilele Hotel bought." and the stalled deal can be asked about. Whose each deal is stays a participant id; no person's name is kept.
   */
  it('keeps no name of a person in what is stored; a deal is kept by its customer\'s name and its owner by id', async () => {
    const { stored } = await tilesFor(GRACE);
    const json = JSON.stringify(stored().eachPerson);
    for (const n of ['Grace', 'Kevin', 'Mercy', 'Joseph', 'Achieng', 'Omondi']) expect(json).not.toContain(n);
    expect(stored().eachPerson.sales.moves.map((m: any) => m.ownerParticipantId)).toEqual(expect.arrayContaining(['p-kevin', 'p-mercy']));
  });
});

describe('the week in numbers, as Mercy, a rep, reads it', () => {
  it('reads the same five team counts, and no target of anybody\'s', async () => {
    const { tiles } = await tilesFor(MERCY);
    expect(tiles).toEqual([
      '100% of check-ins made this week',
      '1 deal moved stage, of the 1 whose moves are kept',
      /* Changed for the quality pass of 18 October (W-2): the kit's third tile counts the sales a document backs. */
      '1 sale backed by a document',
      '2 sales closed, 1 with proof of payment',
      '1 deal hit the stall rule',
    ]);
    expect(tiles.join('\n')).not.toMatch(/Kevin|Joseph|of 40|of 120|units sold/);
  });
});

describe('a check-in that is not sales', () => {
  it('keeps the week in numbers it always had', async () => {
    const { tiles, stored } = await tilesFor(GRACE, null);
    expect(stored().eachPerson.sales).toBeUndefined();
    expect(tiles.join('\n')).not.toMatch(/sales closed|moved stage|stall rule/);
    expect(tiles.join('\n')).toMatch(/with a photo or document behind them/);
  });
});

describe('a sales team (Release 1) reads the same week as a sales organisation', () => {
  it('Grace reads the week\'s deals on a check-in whose kind is "sales team"', async () => {
    const team = await tilesFor(GRACE, 'sales team');
    const org = await tilesFor(GRACE, 'sales org');
    expect(team.tiles).toEqual(org.tiles);
    expect(team.tiles.join('\n')).toMatch(/sales closed/);
  });
});

describe('Release 1\'s sales board switched off for the organisation', () => {
  it('Grace reads the week as it read before: no deals, the things said with proof, and each target at the count read from what was said', async () => {
    const before = await tilesFor(GRACE, 'sales team', DEALS, false);
    /* The week's deals are still kept, because writers only add; they are not served. */
    expect(before.stored().eachPerson.sales).toBeDefined();
    expect(before.tiles.join('\n')).not.toMatch(/sales closed|moved stage|stall rule|proof of payment/);
    expect(before.tiles.join('\n')).toMatch(/with a photo or document behind them/);
    expect(before.tiles[0]).toBe('100% of check-ins made this week');
  });

  it('Mercy, a rep, reads no deals either', async () => {
    const before = await tilesFor(MERCY, 'sales team', DEALS, false);
    expect(before.tiles.join('\n')).not.toMatch(/sales closed|moved stage|stall rule|proof of payment/);
  });
});

describe('theSalesWeekFigures', () => {
  it('a week with no deal says so in each of the kit\'s tiles', () => {
    const w = theSalesWeek([], ['Contacted', 'Won'], [], new Date('2026-10-12T00:00:00Z'), AT);
    const f = theSalesWeekFigures(w);
    expect(f.map((x) => `${x.figure} ${x.of}`)).toEqual(['0 deals moved stage', '0 sales closed', '0 deals hit the stall rule']);
    expect(f[1].says).toBe('No sale was closed this week.');
  });
});

/*
 * A SIGNED ORDER IS PROOF OF THE ORDER, NOT OF PAYMENT (Hafsah's point 12, 17 October). On the test bed Greenfield's signed order
 * was counted under "with proof of payment" while Won is met only with a payment record. "N sold, M with proof of payment" counts M
 * from the payment record alone: Kilele's M-Pesa message, never Greenfield's signed order.
 */
describe('a signed order is not proof of payment', () => {
  async function withTheSignedOrder(reader: any) {
    const c = aSalesCheckIn('sales team');
    const lines = LINES.map((l) => (l.id === 'l-green'
      ? { ...l, text: 'Greenfield Supermarket signed the order for 25 units. Here is the photo of it.', anchoredDocumentId: 'doc-order', anchoredOrigin: 'photo', recallBased: false }
      : l));
    c.prisma.recordEntry.findMany = jest.fn(async () => lines);
    c.prisma.groundDocument = { findMany: jest.fn(async () => [
      { id: 'doc-1', participantId: 'p-kevin', fileName: 'mpesa-kilele.txt', uploaderNote: 'The M-Pesa message for Kilele Hotel', content: 'Confirmed. Ksh200,000.00 received from KILELE HOTEL LTD.' },
      { id: 'doc-order', participantId: 'p-mercy', fileName: 'greenfield-signed-order.txt', uploaderNote: 'The signed order from Greenfield Supermarket', content: 'PURCHASE ORDER PO-4471. Total KES 125,000. Payment on delivery.' },
    ]) };
    await c.svc.build('g1', AT);
    const r = await c.svc.read('g1', reader, AT);
    return { tiles: (r.inNumbers ?? []).map((f) => `${f.figure} ${f.of}`), says: (r.inNumbers ?? []).map((f) => f.says), changed: r.whatChanged! };
  }

  it('Grace reads one sale with proof of payment, Kilele\'s, and Greenfield\'s signed order as a document that does not show a payment', async () => {
    const { tiles, says } = await withTheSignedOrder(GRACE);
    expect(tiles).toContain('2 sales closed, 1 with proof of payment');
    expect(says).toContain('2 sales were closed this week. Proof of payment shows 1. A document backs 1 more, but it does not show a payment.');
  });

  /* Changed for point 23: her own units are no longer a tile; what changed in her own deals says the signed order is not a payment. */
  it('Mercy reads her own sale as backed by a document that does not show a payment', async () => {
    const c = await withTheSignedOrder(MERCY);
    expect(c.changed.moved).toContain('Greenfield Supermarket bought. A document backs it, but it does not show a payment.');
    expect(c.changed.result).toEqual(['1 sale so far this week, with no proof of payment yet.']);
  });
});

/*
 * WHAT THIS WEEK SHOWS, WHAT CHANGED AND WHAT TO DO NEXT WEEK, READ FROM THE DEALS (Hafsah's points 24 and 25, 18 October; the kit's
 * B4-reports-every-check-in/sales-weekly-report.txt). Read as each person is served them.
 */
async function theWeekAs(reader: any, releaseOne = true) {
  const c = aSalesCheckIn('sales team', DEALS, releaseOne);
  await c.svc.build('g1', AT);
  return c.svc.read('g1', reader, AT);
}

describe('what this week shows, as Grace who runs it reads it', () => {
  it('says the team in one sentence, then what each person\'s own deals did', async () => {
    const r = await theWeekAs(GRACE);
    expect(r.whatThisWeekShows).toEqual([
      'Sales moved forward this week, but much more for some people than for others.',
      /* Changed for the quality pass of 18 October (W-3): what each person sold, with what proves it, then what the record shows next. */
      'Kevin Omondi sold 40 units, paid, to Kilele Hotel. Who decides is not on record yet for Kevin\'s open deal. '
        + 'Mercy Wairimu counts 25 units sold to Greenfield Supermarket, and nothing written shows it yet. Who decides is not on record yet for Mercy\'s open deal. '
        + 'Joseph Kariuki has sold none of the 40 units yet. Mama Pima Stores has not answered Joseph since 12 October.',
    ]);
  });

  it('never counts the words somebody named, and has no "came up" line', async () => {
    const r = await theWeekAs(GRACE);
    const all = [...(r.whatThisWeekShows ?? []), ...r.eachPerson.map((p) => p.says), ...(r.acrossTheTeam ?? [])].join('\n');
    expect(all).not.toMatch(/\bnamed\b|came up|and \d+ more/);
    expect(r.acrossTheTeam).toEqual([]);
  });

  it('reads what changed from the deals, sales first, as the kit says it', async () => {
    const r = await theWeekAs(GRACE);
    expect(r.whatChanged).toEqual({
      moved: [
        'Kilele Hotel bought. There is a payment record.',
        'Greenfield Supermarket bought. Nothing written shows it yet, only what Mercy Wairimu said.',
        'Savannah Cafe moved forward, from Contacted to Quoted.',
      ],
      dropped: ['No deal was lost this week.'],
      result: ['2 sales so far this week, 1 with proof of payment.'],
    });
  });

  it('has the stalled deal to ask about next week, from the plan\'s stall rule', async () => {
    const r = await theWeekAs(GRACE);
    expect(r.forNextWeek).toContainEqual({
      do: 'Ask Joseph Kariuki about Mama Pima Stores.',
      why: 'Mama Pima Stores has not answered since 12 October. Your stall rule says to drop a deal when the customer has not answered for 3 working days.',
      comesFrom: 'This comes from the plan.',
    });
  });
});

describe('what this week shows, as Mercy, a rep, reads it', () => {
  it('reads only what her own deals did, as "you", with no sentence comparing her with anybody', async () => {
    const r = await theWeekAs(MERCY);
    /* Changed for the quality pass of 18 October (W-3). */
    expect(r.whatThisWeekShows).toEqual(['You count 25 units sold to Greenfield Supermarket, and nothing written shows it yet. Who decides is not on record yet for your open deal.']);
    expect(r.eachPerson).toEqual([{ who: 'You', isYou: true, says: 'You count 25 units sold to Greenfield Supermarket, and nothing written shows it yet. Who decides is not on record yet for your open deal.' }]);
  });

  it('reads what changed in her own deals only, and nothing of the lead\'s to do', async () => {
    const r = await theWeekAs(MERCY);
    expect(r.whatChanged!.moved).toEqual(['Greenfield Supermarket bought. Nothing written shows it yet, only what you said.']);
    expect(r.whatChanged!.result).toEqual(['1 sale so far this week, with no proof of payment yet.']);
    const all = JSON.stringify(r);
    expect(all).not.toMatch(/Kevin|Joseph|Kilele|Savannah|Mama Pima|much more for some|stall rule says/);
  });
});

describe('Release 1\'s switch off: the week reads as it did', () => {
  it('Grace reads each person\'s sentence as before and no paragraphs from the deals', async () => {
    const r = await theWeekAs(GRACE, false);
    expect(r.whatThisWeekShows).toBeUndefined();
    /* Each person's sentence quotes what they said now (the one reader, 1 November 2026). */
    expect(r.eachPerson.map((p) => p.says).join('\n')).toMatch(/This week Kevin Omondi said “Kilele Hotel is all done, 40 units sold/);
    expect(r.whatChanged!.moved).toEqual(['Nothing was marked as done this week yet.']);
    expect(r.forNextWeek ?? []).not.toContainEqual(expect.objectContaining({ comesFrom: 'This comes from the plan.' }));
  });
});

describe('for you to do next week, with the report\'s differences', () => {
  const DIFFERENCES = [
    { topic: 'How sales are counted.', positions: [
      { view: 'Defines a completed sale as one confirmed by a signed order or proof of payment.', participantLabel: 'the initiator' },
      { view: 'Reported a sale of 3 units.', participantLabel: 'Participant A' },
    ], settledBy: "Agree on one consistent way to define and count a 'sale' for reporting purposes." },
    { topic: 'The individual sales target for each team member.', positions: [
      { view: 'Stated that each of the three participants is responsible for selling 40 units.', participantLabel: 'the initiator' },
      { view: "Stated that Participant A's own target is 120 units.", participantLabel: 'Participant A' },
    ], settledBy: 'Confirm the individual sales target for each person.' },
  ];
  async function nextWeekFor(releaseOne: boolean) {
    const c = aSalesCheckIn('sales team', DEALS, releaseOne);
    c.prisma.report = { findUnique: jest.fn(async () => ({ divergences: DIFFERENCES })) };
    /* Changed 18 October (Hafsah's standing decision 4): the stall rule is the lead's own, so this run has the one she set, in how we work. */
    c.prisma.groundContextItem = { findMany: jest.fn(async (a: any) => (a?.where?.kind === 'WAY_OF_WORKING' ? [{ kind: 'WAY_OF_WORKING', text: 'A deal is dropped after 3 working days with no answer from the customer.', closedAt: null }] : [])) };
    await c.svc.build('g1', AT);
    return ((await c.svc.read('g1', GRACE, AT)).forNextWeek ?? []).map((t) => `${t.do} | ${t.comesFrom}`);
  }

  it('Grace reads the disagreement, the stalled deal, and never the 120 against 40 said again (point 9)', async () => {
    const next = await nextWeekFor(true);
    expect(next).toContain("Agree on one consistent way to define and count a 'sale' for reporting purposes. | This comes from a disagreement in the team.");
    expect(next).toContain('Ask Joseph Kariuki about Mama Pima Stores. | This comes from the plan.');
    expect(next.join('\n')).not.toMatch(/individual sales target/);
  });

  it('with the switch off, the same kept week reads both differences, as before', async () => {
    const next = await nextWeekFor(false);
    expect(next.join('\n')).toMatch(/Confirm the individual sales target for each person/);
  });
});
