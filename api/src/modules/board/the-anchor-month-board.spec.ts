import { PartyType } from '@prisma/client';
import { person, answered, commitment, handoff, boardAs, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN, type Setup } from './the-switchboards-sections-harness';
import { theMonthBoard, aDifferenceInAWords, theWeekOfTheMonth, theLenses, howManyHeard } from './the-anchor-month-board';
import type { TheMonthRecord } from './the-anchor-month-record';
import { THE_SHAPES_KEYS } from '../entry/the-anchor-served-shapes';

/**
 * Request 149: the month board, "Are we moving together?", served on the board for the lead of a check-in started
 * from the anchor link, with the switch on. Plain sentences from the record, no scores, no model.
 */
const lead = { ...person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR), managingOnly: false };
const PEOPLE = [
  lead,
  person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'),
  person('p-baraka', 'u-baraka', 'Baraka', 'Otieno'),
  person('p-zawadi', 'u-zawadi', 'Zawadi', 'Njeri'),
  person('p-ibrahim', 'u-ibrahim', 'Ibrahim', 'Said'),
];
const OPENED = new Date('2026-09-08T08:00:00Z');

function anchor(on: boolean, startedFrom: string | null, completedOn = '2026-09-09T10:00:00Z'): Setup {
  const done = ['p-amina', 'p-rukia', 'p-baraka'];
  const checkIns = [
    ...done.map((id) => ({ ...answered(id, 1, completedOn), availableFrom: OPENED })),
    ...['p-zawadi', 'p-ibrahim'].map((id) => ({ id: `c1-${id}`, participantId: id, sessionNumber: 1, status: 'NOT_STARTED', isSetup: false, completedAt: null, availableFrom: OPENED })),
  ];
  const commitments = [
    commitment('k1', 'p-rukia', 'I will send the deck to the client.', { status: 'DONE', settledAt: new Date(completedOn) }),
    commitment('k2', 'p-baraka', 'I will call the supplier.'),
  ];
  const dependencies = [
    handoff('d1', 'p-baraka', 'the sales deck', { onParticipantId: 'p-rukia', status: 'WAITING' }),
    handoff('d2', 'p-zawadi', 'the price list', { onParticipantId: 'p-rukia', status: 'CLEARED' }),
  ];
  return {
    people: PEOPLE, checkIns, commitments, dependencies, groundRow: { startedFrom, startsAt: OPENED },
    prismaExtras: {
      platformSetting: { findUnique: jest.fn(async () => (on ? { value: { on: true } } : { value: { on: false } })) },
      groundDependency: { findMany: jest.fn(async () => dependencies) },
      recommendation: { findMany: jest.fn(async () => []) },
      groundParticipant: {
        findMany: jest.fn(async (a: any) => {
          if (a?.where?.id?.in) return PEOPLE.filter((p) => a.where.id.in.includes(p.id)).map((p) => ({ id: p.id, lastNudgedAt: null }));
          return PEOPLE.map((p) => ({ ...p, checkIns: checkIns.filter((c) => c.participantId === p.id && c.status === 'COMPLETED').map((c) => ({ status: c.status })) }));
        }),
        findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({})),
      },
    },
  };
}

describe('the month board, as the lead reads it', () => {
  it('serves the pinned shape in the scenario\'s words', async () => {
    const b = (await boardAs(anchor(true, 'anchor'), ...AMINA)).theMonthBoard;
    expect(Object.keys(b).sort()).toEqual([...THE_SHAPES_KEYS.monthBoard].sort());
    expect(b.question).toBe('Are we moving together?');
    expect(b.weekOfTheMonth).toBe(1);
    expect(b.lenses.map((l: any) => [l.key, l.heading, l.question])).toEqual([
      ['understanding', 'Understanding', 'Do people see the bigger picture?'],
      ['ownership', 'Ownership', 'Are they carrying outcomes rather than only assigned tasks?'],
      ['contribution', 'Contribution', 'Are they bringing ideas, insights and help?'],
      ['action', 'Action', 'Is understanding translating into actual movement?'],
    ]);
    expect(b.lenses.map((l: any) => l.reading)).toEqual([
      'Groundwork has heard from three of five people.',
      'Two of five people have said what they will do themselves.',
      'No idea from your team has been captured yet.',
      'One of the things people said they would do is done and one is still open. One handoff is still waiting on someone.',
    ]);
    expect(b.whatIsMoving).toEqual([
      'One of the things people said they would do is done.',
      'One handoff that was waiting on someone has been cleared.',
      'Two people have said what they will do themselves.',
    ]);
    expect(b.whatTheTeamIsContributing).toEqual(['No idea from your team has been captured yet.']);
    /* Changed with piece 22 (hidden contributors): Rukia's own promise, closed, is her line here. */
    expect(b.peopleHelpingThingsMove).toEqual([{ name: 'Rukia', sentence: 'Rukia committed to send the deck to the client, and Rukia says it is done.' }]);
    expect(b.wherePerspectivesDiffer).toEqual(['No two people have described the same thing differently so far.']);
    expect(b.whatIsStillGettingInTheWay).toEqual(['Baraka is waiting on Rukia for the sales deck.']);
    expect(b.whatGroundworkIsWorkingOnNext).toEqual([
      'Groundwork is checking in with the two people who have not yet answered this round.',
      'Groundwork will ask about the one thing people said they would do that is still open.',
      'Groundwork will ask about the one handoff still waiting on someone.',
    ]);
  });

  it('holds no score, no label and no colon, dot or arrow joining pieces', async () => {
    const text = JSON.stringify((await boardAs(anchor(true, 'anchor'), ...AMINA)).theMonthBoard);
    expect(text).not.toMatch(/score|rating|at risk|\/10|\u2192|\u00b7/i);
    expect(text).not.toMatch(/"[^"]*\w:\s\w[^"]*"/);
  });

  it('is the lead\'s: a participant and an admin are served no month board (an admin still reads the active line)', async () => {
    const asRukia = await boardAs(anchor(true, 'anchor'), ...RUKIA);
    expect('theMonthBoard' in asRukia).toBe(false);
    const asJuma = await boardAs(anchor(true, 'anchor'), ...JUMA);
    expect('theMonthBoard' in asJuma).toBe(false);
    expect(asJuma.activeLine).toBeDefined();
  });

  it('is read at the record\'s own clock: the same bytes on two reads, and week three when the record is sixteen days on', async () => {
    const a = (await boardAs(anchor(true, 'anchor'), ...AMINA)).theMonthBoard;
    const b = (await boardAs(anchor(true, 'anchor'), ...AMINA)).theMonthBoard;
    expect(b).toEqual(a);
    expect((await boardAs(anchor(true, 'anchor', '2026-09-24T10:00:00Z'), ...AMINA)).theMonthBoard.weekOfTheMonth).toBe(3);
  });

  it('serves nothing with the switch off, or for a check-in not started from the anchor', async () => {
    expect('theMonthBoard' in (await boardAs(anchor(false, 'anchor'), ...AMINA))).toBe(false);
    expect('theMonthBoard' in (await boardAs(anchor(true, null), ...AMINA))).toBe(false);
  });
});

describe('the weeks and the patterns', () => {
  const record: TheMonthRecord = { ofHowMany: 4, checkedIn: 4, notYetThisRound: 0, saidWhatTheyWillDo: 0, commitmentsDone: 0, commitmentsOpen: 0, waiting: [], handoffsCleared: 0, offers: { pair: 0, project: 0, aim: 0 }, startedOn: new Date('2026-09-01T00:00:00Z') };
  const PATTERN = 'People keep finding opportunities, and nobody is sure who should carry them forward.';
  const at = (days: number) => new Date(Date.parse('2026-09-01T00:00:00Z') + days * 86_400_000);

  it('leaves patterns out in weeks one and two, and says so in the way section', () => {
    for (const days of [0, 6, 7, 13]) {
      const b = theMonthBoard({ record, clock: at(days), differences: [], patterns: [PATTERN] });
      expect(b.weekOfTheMonth).toBe(days < 7 ? 1 : 2);
      expect(b.whatIsStillGettingInTheWay).toEqual(['Nobody has said that anything is in their way.']);
    }
  });
  it('shows them from week three', () => {
    const b = theMonthBoard({ record, clock: at(14), differences: [], patterns: [PATTERN] });
    expect(b.weekOfTheMonth).toBe(3);
    expect(b.whatIsStillGettingInTheWay).toEqual([PATTERN]);
    expect(theWeekOfTheMonth(record.startedOn, at(90))).toBe(4);
  });
  it('says a difference with its topic in quotation marks, never joined by a colon', () => {
    expect(aDifferenceInAWords({ topic: 'The renewals target.', whoSeesIt: 'You and Rukia Mwangi see this differently.' })).toBe('You and Rukia Mwangi see "The renewals target" differently.');
  });
});

/*
 * PIECE 22, HIDDEN CONTRIBUTORS (section 19; decision 96 item 9). One specific thing each person did, from their own
 * promise, said as a fact. The lead reads everyone's; a person reads the same sentence about themselves and nobody
 * else's; an admin who only reads reads none. Never a colleague's mention, never a count or an order per person.
 */
describe('piece 22: people helping the team move, as each reader reads it', () => {
  it('Amina, the lead, reads Rukia\'s line', async () => {
    const b = (await boardAs(anchor(true, 'anchor'), ...AMINA)).theMonthBoard;
    expect(b.peopleHelpingThingsMove).toEqual([{ name: 'Rukia', sentence: 'Rukia committed to send the deck to the client, and Rukia says it is done.' }]);
  });
  it('Rukia reads the same sentence about herself, as "you", and no month board', async () => {
    const b = await boardAs(anchor(true, 'anchor'), ...RUKIA);
    expect(b.yourPartInMovingThings).toBe('You committed to send the deck to the client, and you say it is done.');
    expect('theMonthBoard' in b).toBe(false);
  });
  it('Baraka, whose promise is still open, reads nothing, and never Rukia\'s', async () => {
    const b = await boardAs(anchor(true, 'anchor'), ...BARAKA);
    expect(b.yourPartInMovingThings).toBeNull();
    expect(JSON.stringify(b)).not.toMatch(/says it is done|say it is done/);
  });
  it('an admin who only reads reads no one\'s line', async () => {
    const b = await boardAs(anchor(true, 'anchor'), ...JUMA);
    expect('theMonthBoard' in b).toBe(false);
    expect(b.yourPartInMovingThings).toBeUndefined();
    expect(JSON.stringify(b)).not.toMatch(/says it is done|say it is done/);
  });
  it('an admin who set it up is not the lead, and reads no list either', async () => {
    const b = await boardAs({ ...anchor(true, 'anchor'), createdByUserId: 'u-setup' } as any, ...SETUP_ADMIN);
    expect('theMonthBoard' in b).toBe(false);
  });
  it('with the switch off, or not an anchor check-in, nobody reads it', async () => {
    expect('yourPartInMovingThings' in (await boardAs(anchor(false, 'anchor'), ...RUKIA))).toBe(false);
    expect('yourPartInMovingThings' in (await boardAs(anchor(true, null), ...RUKIA))).toBe(false);
  });
  it('a promise a lead wrote, or one not in the person\'s own name, is not a contribution', async () => {
    const s = anchor(true, 'anchor');
    const commitments = (s.commitments as any[]).map((c) => ({ ...c, source: 'LEAD' }));
    const b = (await boardAs({ ...s, commitments } as any, ...AMINA)).theMonthBoard;
    expect(b.peopleHelpingThingsMove).toEqual([]);
  });
});

/* Review of piece 22: the person's own sentence says "your", and every sentence says how it is known. */
describe('piece 22, as the review asked', () => {
  const withOne = (more: Record<string, any>) => {
    const s = anchor(true, 'anchor');
    const commitments = (s.commitments as any[]).map((c) => (c.participantId === 'p-rukia' ? { ...c, ...more } : c));
    return { ...s, commitments } as any;
  };
  it('Rukia reads "your manager" for her own "my manager"', async () => {
    const b = await boardAs(withOne({ text: 'I will send my manager the deck.' }), ...RUKIA);
    expect(b.yourPartInMovingThings).toBe('You committed to send your manager the deck, and you say it is done.');
  });
  it.each([
    ['PROVEN', 'Rukia committed to send the deck to the client, and a document Rukia added shows it is done.', 'You committed to send the deck to the client, and a document you added shows it is done.'],
    ['CONFIRMED', 'Rukia committed to send the deck to the client, and the colleague who was waiting on it confirmed it is done.', 'You committed to send the deck to the client, and the colleague who was waiting on it confirmed it is done.'],
    ['SAID', 'Rukia committed to send the deck to the client, and Rukia says it is done.', 'You committed to send the deck to the client, and you say it is done.'],
  ])('settled %s: the lead and Rukia read how it is known', async (settledBy, lead, rukia) => {
    expect((await boardAs(withOne({ settledBy }), ...AMINA)).theMonthBoard.peopleHelpingThingsMove[0].sentence).toBe(lead);
    expect((await boardAs(withOne({ settledBy }), ...RUKIA)).yourPartInMovingThings).toBe(rukia);
  });
});

describe('the action lens never says "no are still open" (request 163, item 1)', () => {
  const { theMovement } = require('./the-anchor-month-board');
  it('says each count in words, with its own sentence for none', () => {
    expect(theMovement({ commitmentsDone: 1, commitmentsOpen: 0, waiting: [] })).toBe('The one thing people said they would do is done. No handoff is waiting on anyone.');
    expect(theMovement({ commitmentsDone: 3, commitmentsOpen: 0, waiting: [{}] })).toBe('All three of the things people said they would do are done. One handoff is still waiting on someone.');
    expect(theMovement({ commitmentsDone: 0, commitmentsOpen: 2, waiting: [] })).toBe('Neither of the two things people said they would do is done yet. No handoff is waiting on anyone.');
    expect(theMovement({ commitmentsDone: 0, commitmentsOpen: 1, waiting: [] })).toBe('The one thing people said they would do is not done yet. No handoff is waiting on anyone.');
    expect(theMovement({ commitmentsDone: 0, commitmentsOpen: 0, waiting: [{}, {}] })).toBe('Two handoffs are still waiting on someone.');
    for (const r of [{ commitmentsDone: 1, commitmentsOpen: 0, waiting: [] }, { commitmentsDone: 0, commitmentsOpen: 1, waiting: [] }]) {
      expect(theMovement(r)).not.toMatch(/\bno (?:are|is)\b/i);
    }
  });
});

/* Found in the walk (8 October): "One of four people have said what they will do themselves." and "Groundwork has heard from four of four people." */
describe('the lenses count people in plain, correct sentences', () => {
  const record = (over: Partial<TheMonthRecord>) => ({ checkedIn: 4, ofHowMany: 4, saidWhatTheyWillDo: 1, commitmentsDone: 0, commitmentsOpen: 0, waiting: [], handoffsCleared: 0, ideas: [], ...over }) as unknown as TheMonthRecord;
  const reading = (r: TheMonthRecord, key: string) => theLenses(r, []).find((l) => l.key === key)!.reading;

  it('one person who has said what they will do is "has", not "have"', () => {
    expect(reading(record({}), 'ownership')).toBe('One of four people has said what they will do themselves.');
    expect(reading(record({ saidWhatTheyWillDo: 2 }), 'ownership')).toBe('Two of four people have said what they will do themselves.');
  });

  it('everybody is "all", and a team of one is "the one person"', () => {
    expect(reading(record({ saidWhatTheyWillDo: 4 }), 'ownership')).toBe('All four people have said what they will do themselves.');
    expect(reading(record({ checkedIn: 4, ofHowMany: 4 }), 'understanding')).toBe('Groundwork has heard from all four people.');
    expect(reading(record({ checkedIn: 1, ofHowMany: 1, saidWhatTheyWillDo: 1 }), 'ownership')).toBe('The one person has said what they will do themselves.');
    expect(howManyHeard(1, 1)).toBe('the one person');
    expect(howManyHeard(3, 5)).toBe('three of five people');
  });
});
