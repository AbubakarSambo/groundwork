import { withTheSalesReadings, theirOwnLinesReadRight } from './the-sales-readings-for-a-report';

/**
 * THE SALES READINGS ON A REPORT, AS EACH READER IS SERVED THEM (Hafsah's points 15 to 22, 18 October 2026). Grace, who runs
 * Drop Access (test)'s "Sales team, Q4", is served the team's day; Mercy and Kevin are each served one question about their
 * own deals, never a colleague's, and nothing of the team's day; with Release 1's switch off, nobody is served any of it.
 */
const G = 'g1';
const at = (s: string) => new Date(s);
const PARTICIPANTS = [
  { id: 'p-grace', userId: 'u-grace', partyType: 'INITIATOR', nameGiven: null, user: { firstName: 'Grace', lastName: 'Achieng' } },
  { id: 'p-kevin', userId: 'u-kevin', partyType: 'RESPONDENT', nameGiven: null, user: { firstName: 'Kevin', lastName: 'Omondi' } },
  { id: 'p-mercy', userId: 'u-mercy', partyType: 'RESPONDENT', nameGiven: null, user: { firstName: 'Mercy', lastName: 'Wairimu' } },
];
const LINES = [
  { id: 'l1', participantId: 'p-kevin', checkInId: 'c-kevin-5', type: 'PROGRESS', text: 'Savannah Cafe paid the KES 30,000 deposit this morning for 6 units.', createdAt: at('2026-10-17T12:58:00Z'), anchoredDocumentId: null, recallBased: true, confirmedAt: null, disputedAt: null },
  { id: 'l2', participantId: 'p-mercy', checkInId: 'c-mercy-5', type: 'PROGRESS', text: 'I sent Peter the quote for 30 units, KES 150,000, by email this morning.', createdAt: at('2026-10-17T12:59:00Z'), anchoredDocumentId: null, recallBased: true, confirmedAt: null, disputedAt: null },
  { id: 'l3', participantId: 'p-mercy', checkInId: 'c-mercy-5', type: 'COMMITMENT', text: 'Rose still says she will buy the two units on 30 October.', createdAt: at('2026-10-17T12:59:00Z'), anchoredDocumentId: null, recallBased: true, confirmedAt: null, disputedAt: null },
];
const item = (id: string, name: string, stage: string, owner: string, source: string, fields: Record<string, unknown>) => ({ id, groundId: G, kind: 'deal', name, stage, ownerParticipantId: owner, sourceEntryId: source, createdAt: at('2026-10-12T12:00:00Z'), fields });
const ITEMS = [
  item('d-savannah', 'Savannah Cafe', 'Won', 'p-kevin', 'l1', { Units: '6', Value: 'KES 30,000', _stages: [{ stage: 'Quoted', on: '2026-10-12T12:00:00Z', by: 'check-in', asOf: true }, { stage: 'Won', on: '2026-10-17T12:58:20Z', by: 'check-in' }] }),
  item('d-tuskys', 'Tuskys Westgate', 'Quoted', 'p-mercy', 'l2', { Contact: 'Peter', _stages: [{ stage: 'Contacted', on: '2026-10-15T12:00:00Z', by: 'check-in', asOf: true }, { stage: 'Quoted', on: '2026-10-17T12:59:20Z', by: 'check-in' }] }),
  item('d-mboga', 'Mama Mboga Mart', 'Need established', 'p-mercy', 'l3', { Need: 'two units', Contact: 'Rose', 'Buying date': '2026-10-30' }),
];
const CHECK_INS = [
  { id: 'c-kevin-5', participantId: 'p-kevin', completedAt: at('2026-10-17T13:00:00Z') },
  { id: 'c-mercy-5', participantId: 'p-mercy', completedAt: at('2026-10-17T13:01:00Z') },
];

function aBed(switchOn = true) {
  return {
    organization: { findUnique: jest.fn(async ({ select }: any) => (select?.release1SalesBoardOn ? { release1SalesBoardOn: switchOn } : { timeZone: 'Africa/Nairobi' })) },
    ground: { findUnique: jest.fn(async () => ({ id: G, organizationId: 'o1', initiatorId: 'u-grace', createdByUserId: 'u-grace', kindOfWork: 'sales team', workStages: null, participants: PARTICIPANTS })) },
    groundParticipant: { findUnique: jest.fn(async ({ where }: any) => ({ groundId: G, id: where.id })) },
    checkIn: { findMany: jest.fn(async () => CHECK_INS) },
    workItem: { findMany: jest.fn(async () => ITEMS) },
    recordEntry: { findMany: jest.fn(async () => LINES) },
    groundDocument: { findMany: jest.fn(async () => []) },
    groundContextItem: { findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    person: { findMany: jest.fn(async () => []) },
  };
}
const REPORT = () => ({
  sessionNumber: 5,
  whatEachPersonSaid: [
    { who: 'Kevin Omondi', isYou: false, lines: ['Savannah Cafe paid the KES 30,000 deposit this morning for 6 units.'] },
    { who: 'Mercy Wairimu', isYou: false, lines: ['I sent Peter the quote for 30 units, KES 150,000, by email this morning.', 'Rose still says she will buy the two units on 30 October.'] },
  ],
});

describe('the team’s report, as Grace is served it', () => {
  it('names the day, says what moved and how much has proof, and gives each person a short line', async () => {
    const r: any = await withTheSalesReadings(aBed(), G, 5, 'u-grace', REPORT());
    expect(r.releaseOneSalesReport).toBe(true);
    expect(r.theTeamsDay.title).toBe('The team’s report, Saturday 17 October');
    expect(r.theTeamsDay.lastUpdated).toBe('Last updated on Saturday 17 October at 4:01pm, when Mercy checked in. It only changes when something new comes in, such as a check-in, a document or a number from another system.');
    expect(r.theTeamsDay.inShort).toEqual(['Two sales moved forward on 17 October, but neither of them has proof yet.']);
    expect(r.theTeamsDay.moved.map((m: any) => `${m.name}, ${m.owner}, ${m.from} to ${m.to}`)).toEqual(['Savannah Cafe, Kevin, Quoted to Won', 'Tuskys Westgate, Mercy, Contacted to Quoted']);
    expect(r.theTeamsDay.whyTheNumbersDontMatch).toBeNull();
    expect(r.whatEachPersonSaid.map((p: any) => p.inShort)).toEqual([
      'Savannah Cafe paid the KES 30,000 deposit this morning for 6 units.',
      'I sent Peter the quote for 30 units, KES 150,000, by email this morning.',
    ]);
    /* Their own words stay on the row, behind "Open a person". */
    expect(r.whatEachPersonSaid[1].lines).toHaveLength(2);
    expect(r.forYouToThinkAbout).toBeUndefined();
  });
});

describe('each person’s own question, as Mercy and Kevin are served it', () => {
  it('Mercy reads a question about her own deal, and nothing of the team’s day', async () => {
    const r: any = await withTheSalesReadings(aBed(), G, 5, 'u-mercy', REPORT());
    expect(r.forYouToThinkAbout).toBe('Tuskys Westgate has had your quote since 17 October, but they have not said yes yet. What would help you get an answer this week?');
    expect(r.theTeamsDay).toBeUndefined();
    expect(r.whatEachPersonSaid.every((p: any) => p.inShort === undefined)).toBe(true);
  });

  it('Kevin reads his own, never one of Mercy’s deals', async () => {
    const r: any = await withTheSalesReadings(aBed(), G, 5, 'u-kevin', REPORT());
    expect(r.forYouToThinkAbout).toBe('You said Savannah Cafe paid, but nothing written shows the payment yet. What would help you get the receipt or the payment message this week?');
    expect(r.forYouToThinkAbout).not.toMatch(/Tuskys|Mboga/);
  });

  it('with Release 1’s switch off, every reader is served the report as before', async () => {
    for (const u of ['u-grace', 'u-mercy', 'u-kevin']) expect(await withTheSalesReadings(aBed(false), G, 5, u, REPORT())).toEqual(REPORT());
  });
});

describe('Mercy’s own lines, read right', () => {
  it('Rose’s promise is said as Rose’s and kept on her deal, never as Mercy’s commitment', async () => {
    const rows = [{ id: 'l3', type: 'COMMITMENT', text: 'Rose still says she will buy the two units on 30 October.', how: 'You said you will do this. I will ask you how it went.', createdAt: '2026-10-17T12:59:00Z' }];
    const [row]: any[] = await theirOwnLinesReadRight(aBed(), 'p-mercy', rows);
    expect(row.type).toBe('PROGRESS');
    expect(row.how).toBe('This is Rose’s promise, not yours, so it is kept on the Mama Mboga Mart deal, with 30 October as the day they will buy. A message from Rose would prove it.');
    expect(row.text).toBe('Rose still says she will buy the two units on 30 October.');
  });

  it('with the switch off, her lines are as they were', async () => {
    const rows = [{ id: 'l3', type: 'COMMITMENT', text: 'Rose still says she will buy the two units on 30 October.', how: 'x', createdAt: '2026-10-17T12:59:00Z' }];
    expect(await theirOwnLinesReadRight(aBed(false), 'p-mercy', rows)).toEqual(rows);
  });
});

/*
 * MERCY'S OWN REPORT, 14 OCTOBER, AS THE TEST BED HOLDS IT (Drop Access short run, 18 October). She read "Delivery is set for
 * Friday, and they'll pay then. This is Delivery’s promise, not yours, so it is not on your list of things to do." Joseph read
 * "I'll ask Grace first about the price, then I'll call him back." with nobody to be "him". The lines, the deals and the
 * conversation are the bed's own.
 */
describe('the own report on 14 October, as Mercy and Joseph read it', () => {
  const MORE = [
    ...PARTICIPANTS,
    { id: 'p-joseph', userId: 'u-joseph', partyType: 'RESPONDENT', nameGiven: null, user: { firstName: 'Joseph', lastName: 'Kariuki' } },
  ];
  const DEALS = [
    item('d-greenfield', 'Greenfield Supermarket', 'Won', 'p-mercy', 'l-gf', { Units: '25', Value: 'KES 125,000', Contact: 'Mrs. Njeri', 'Next step': "Delivery is set for Friday, and they'll pay then." }),
    item('d-mboga', 'Mama Mboga Mart', 'Quoted', 'p-mercy', 'l-mb', { Contact: 'Rose', Need: '2 units' }),
    item('d-juja', 'Juja Hardware', 'Contacted', 'p-joseph', 'l-juja', { Contact: 'Mr Kariuki', Need: "five units if they're KES 4,500 each" }),
    item('d-ngong', 'Ngong Road Minimart', 'Quoted', 'p-kevin', 'l-ng', { Need: 'a quote for 4 units' }),
  ];
  const BED_LINES = [
    { id: 'l-gf', participantId: 'p-mercy', checkInId: 'c-mercy-3', type: 'PROGRESS', text: 'For Greenfield, we got the order signed yesterday for 25 units.', createdAt: at('2026-10-14T11:07:55Z'), disputedAt: null },
    { id: 'l-mb', participantId: 'p-mercy', checkInId: 'c-mercy-3', type: 'PROGRESS', text: 'Rose, the owner, decides.', createdAt: at('2026-10-14T11:07:55Z'), disputedAt: null },
    { id: 'l-juja', participantId: 'p-joseph', checkInId: 'c-joseph-3', type: 'SUCCESS_DEFINITION', text: "Mr Kariuki wants five units if they're KES 4,500 each.", createdAt: at('2026-10-14T11:09:48Z'), disputedAt: null },
    { id: 'l-ng', participantId: 'p-kevin', checkInId: 'c-kevin-3', type: 'PROGRESS', text: 'Ali said he will decide next week.', createdAt: at('2026-10-14T11:03:26Z'), disputedAt: null },
  ];
  const TURNS = [
    { checkInId: 'c-mercy-3', role: 'AI', content: 'Last time you said your priority right now was closing the Greenfield deal and following up on the Tuskys Westgate lead. What exists in the record against that now?' },
    { checkInId: 'c-mercy-3', role: 'PERSON', content: "Okay, so for Greenfield, we got the order signed yesterday for 25 units. I mistakenly said it was KES 120,000, but it's actually KES 125,000. Delivery is set for Friday, and they'll pay then. As for Tuskys Westgate, Peter is still waiting for Joseph to bring the samples." },
    { checkInId: 'c-joseph-3', role: 'AI', content: 'You have Juja Hardware, with Mr Kariuki wanting five units at KES 4,500 each, but no date yet. Before we finish, what will you do about getting that date from Mr Kariuki, and by when?' },
    { checkInId: 'c-joseph-3', role: 'PERSON', content: "I'll ask Grace first about the price, then I'll call him back." },
    { checkInId: 'c-kevin-3', role: 'AI', content: 'And what is the date you will have that answer by?' },
    { checkInId: 'c-kevin-3', role: 'PERSON', content: 'He said "next week" so I\'ll follow up with him on Monday.' },
  ];
  const bed = () => {
    const b: any = aBed();
    b.ground.findUnique = jest.fn(async () => ({ id: G, organizationId: 'o1', initiatorId: 'u-grace', createdByUserId: 'u-grace', kindOfWork: 'sales team', workStages: null, participants: MORE }));
    b.workItem.findMany = jest.fn(async () => DEALS);
    b.recordEntry.findMany = jest.fn(async () => BED_LINES);
    b.conversationTurn = { findMany: jest.fn(async ({ where }: any) => TURNS.filter((t) => where.checkInId.in.includes(t.checkInId) && where.checkIn.participantId === { 'c-mercy-3': 'p-mercy', 'c-joseph-3': 'p-joseph', 'c-kevin-3': 'p-kevin' }[t.checkInId])) };
    return b;
  };

  it('Mercy reads Greenfield Supermarket’s promise as theirs, never "Delivery’s", and never as hers to do', async () => {
    const rows = [{ id: 'l-pay', type: 'COMMITMENT', text: "Delivery is set for Friday, and they'll pay then.", how: 'You said you will do this. I will ask you how it went.', createdAt: '2026-10-14T11:07:55Z', checkInId: 'c-mercy-3' }];
    const [row]: any[] = await theirOwnLinesReadRight(bed(), 'p-mercy', rows);
    expect(row.type).toBe('PROGRESS');
    expect(`${row.readAs ?? row.text} ${row.how}`).toBe("Delivery is set for Friday, and they'll pay then. This is Greenfield Supermarket’s promise, not yours, so it is kept on the Greenfield Supermarket deal. A message from Greenfield Supermarket would prove it.");
    expect(row.how).not.toMatch(/Delivery’s/);
  });

  it('Joseph reads who "him" is, from the question he was answering; Kevin’s "him", named nowhere before it, stays his own words', async () => {
    const [joseph]: any[] = await theirOwnLinesReadRight(bed(), 'p-joseph', [
      { id: 'l-call', type: 'COMMITMENT', text: "I'll ask Grace first about the price, then I'll call him back.", how: 'You said you will do this. I will ask you how it went.', createdAt: '2026-10-14T11:09:48Z', checkInId: 'c-joseph-3' },
    ]);
    expect(joseph.readAs).toBe("I'll ask Grace first about the price, then I'll call Mr Kariuki back.");
    expect(joseph.text).toBe("I'll ask Grace first about the price, then I'll call him back.");
    const [kevin]: any[] = await theirOwnLinesReadRight(bed(), 'p-kevin', [
      { id: 'l-mon', type: 'COMMITMENT', text: "I'll follow up with him on Monday.", how: 'You said you will do this. I will ask you how it went.', createdAt: '2026-10-14T11:03:26Z', checkInId: 'c-kevin-3' },
    ]);
    expect(kevin.readAs).toBeUndefined();
    expect(kevin.text).toBe("I'll follow up with him on Monday.");
  });
});

/*
 * WHAT MOVED SAYS WHAT MOVED (Drop Access short run, gw_sweep_drop3, 18 October). Grace's team report for session 3 read
 * "Mama Mboga Mart / Mercy / Mama Mboga Mart didn't state a budget." The deal, its stages and Mercy's lines below are the
 * database's own: Mama Mboga Mart moved from Need established to Quoted on 14 October, in Mercy's session 3 check-in.
 */
describe('What moved, as Grace is served it', () => {
  const MBOGA_LINES = [
    { id: 'm1', participantId: 'p-mercy', checkInId: 'c-mercy-2', type: 'PROGRESS', text: 'I got a new lead today, Mama Mboga Mart in Kawangware. Rose, the owner, wants 2 units.', createdAt: at('2026-10-13T11:06:19Z'), anchoredDocumentId: null, recallBased: true, confirmedAt: null, disputedAt: null },
    { id: 'm2', participantId: 'p-mercy', checkInId: 'c-mercy-3', type: 'SUCCESS_DEFINITION', text: 'Exceeding my sales targets would mean securing more deals, especially larger ones like Greenfield, and getting those new leads like Mama Mboga Mart closed quickly.', createdAt: at('2026-10-14T11:07:55Z'), anchoredDocumentId: null, recallBased: true, confirmedAt: null, disputedAt: null },
    { id: 'm3', participantId: 'p-mercy', checkInId: 'c-mercy-3', type: 'PROGRESS', text: "I quoted her KES 10,000 for the two units [INFERRED: 'her' is Rose at Mama Mboga Mart, from context].", createdAt: at('2026-10-14T11:07:55Z'), anchoredDocumentId: null, recallBased: true, confirmedAt: null, disputedAt: null },
    { id: 'm4', participantId: 'p-mercy', checkInId: 'c-mercy-3', type: 'OPERATING_DIFFERENCE', text: "Mama Mboga Mart didn't state a budget.", createdAt: at('2026-10-14T11:08:10Z'), anchoredDocumentId: null, recallBased: true, confirmedAt: null, disputedAt: null },
  ];
  const MBOGA = item('d-mboga', 'Mama Mboga Mart', 'Quoted', 'p-mercy', 'm1', {
    Need: '2 units', Units: 'two', Value: 'KES 10,000', Contact: 'Rose', 'Decision maker': 'Rose, the owner',
    _stages: [
      { by: 'check-in', on: '2026-10-13T11:07:09.859Z', stage: 'Contacted' },
      { by: 'check-in', on: '2026-10-13T11:07:09.859Z', stage: 'Need established' },
      { by: 'check-in', on: '2026-10-14T11:08:58.717Z', stage: 'Quoted' },
    ],
  });
  const bed = () => ({
    ...aBed(),
    checkIn: { findMany: jest.fn(async () => [{ id: 'c-mercy-3', participantId: 'p-mercy', completedAt: at('2026-10-14T11:08:15Z') }]) },
    workItem: { findMany: jest.fn(async () => [MBOGA]) },
    recordEntry: { findMany: jest.fn(async () => MBOGA_LINES) },
  });
  const report = () => ({ sessionNumber: 3, whatEachPersonSaid: [] });

  it('Mama Mboga Mart says the stage it reached and Mercy’s line about it, never a budget nobody gave', async () => {
    const r: any = await withTheSalesReadings(bed(), G, 3, 'u-grace', report());
    expect(r.theTeamsDay.moved.map((m: any) => `${m.name}, ${m.owner}, ${m.from} to ${m.to}`)).toEqual(['Mama Mboga Mart, Mercy, Need established to Quoted']);
    expect(r.theTeamsDay.moved[0].says).toBe('Now quoted. Mercy said, "I quoted her KES 10,000 for the two units."');
    expect(JSON.stringify(r.theTeamsDay.moved)).not.toMatch(/budget/);
  });

  it('where her only lines about it that day say what is missing or what she hopes for, the stage alone is said', async () => {
    const b: any = bed();
    b.recordEntry.findMany = jest.fn(async () => [MBOGA_LINES[0], MBOGA_LINES[1], MBOGA_LINES[3]]);
    const r: any = await withTheSalesReadings(b, G, 3, 'u-grace', report());
    expect(r.theTeamsDay.moved[0].says).toBe('Now quoted.');
  });

  it('Mercy herself is served no team’s day', async () => {
    const r: any = await withTheSalesReadings(bed(), G, 3, 'u-mercy', report());
    expect(r.theTeamsDay).toBeUndefined();
  });
});
