import { GroundScenario, PartyType } from '@prisma/client';
import { person, answered, commitment, handoff, boardAs, AMINA, RUKIA, JUMA, type Setup } from './the-switchboards-sections-harness';
import { whatIsWrongForThisReader, ANCHOR_SECTIONS_FOR_THE_LEAD } from './the-anchor-readers';
import { sectionsFor } from './board-families';

/**
 * DECISION 114: THE MONTH BOARD'S WEEKS, "WHAT IS MOVING", "WHAT IS STILL IN THE WAY" AND THE END-OF-MONTH READ ARE ORDINARY BOARD SECTIONS,
 * named by the switchboard for the anchor's scenario and served to the lead alone. The old fields (theMonthBoard, theEndOfMonthRead) are still served and say the same.
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
const HER_WORDS = 'Everyone is delivering their own piece but nobody seems to understand what it takes to keep this company moving.';

function anchor(opts: { on?: boolean; startedFrom?: string | null; completedOn?: string; status?: string; words?: string | null } = {}): Setup {
  const { on = true, startedFrom = 'anchor', completedOn = '2026-10-07T10:00:00Z', status, words = HER_WORDS } = opts;
  const checkIns = [
    ...['p-amina', 'p-rukia', 'p-baraka'].map((id) => ({ ...answered(id, 1, completedOn), availableFrom: OPENED })),
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
    scenario: GroundScenario.HELP_TEAM_UNDERSTAND, people: PEOPLE, checkIns, commitments, dependencies, groundRow: { startedFrom, startsAt: OPENED, ...(status ? { status } : {}) },
    prismaExtras: {
      platformSetting: { findUnique: jest.fn(async () => (on ? { value: { on: true } } : { value: { on: false } })) },
      groundDependency: { findMany: jest.fn(async () => dependencies) },
      recommendation: { findMany: jest.fn(async () => []) },
      conversationTurn: { findMany: jest.fn(async (a: any) => (a?.where?.role === 'PERSON' && a?.where?.checkIn?.groundId && words ? [{ content: words }] : [])) },
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

const NEW = ['whereTheMonthIs', 'whatIsMoving', 'whatIsStillInTheWay', 'theEndOfTheMonth'];

describe('the switchboard names the month sections', () => {
  it('for the anchor only', () => {
    for (const k of NEW) expect(sectionsFor(GroundScenario.HELP_TEAM_UNDERSTAND)).toContain(k);
    for (const k of NEW) expect(sectionsFor(GroundScenario.NEW_PROJECT)).not.toContain(k);
    for (const k of NEW) expect(ANCHOR_SECTIONS_FOR_THE_LEAD).toContain(k);
  });
});

describe('the month sections, as each reader reads the ordinary board', () => {
  it('Amina reads where the month is, what is moving and what is in the way, each as its old field says it', async () => {
    const b: any = await boardAs(anchor({ completedOn: '2026-09-15T10:00:00Z' }), ...AMINA);
    expect(b.whereTheMonthIs).toEqual({ heading: 'Where the month is', weekOfTheMonth: b.theMonthBoard.weekOfTheMonth, text: b.theMonthBoard.weekSaid });
    expect(b.whereTheMonthIs.text).toMatch(/^Week \d of the month$/);
    expect(b.whatIsMoving).toEqual({ heading: "What's moving", items: b.theMonthBoard.whatIsMoving });
    expect(b.whatIsMoving.items.join(' ')).toMatch(/done/);
    expect(b.whatIsStillInTheWay).toEqual({ heading: "What's still getting in the way", items: b.theMonthBoard.whatIsStillGettingInTheWay });
    expect('theEndOfTheMonth' in b).toBe(false);
    expect(whatIsWrongForThisReader('the lead', b)).toEqual([]);
  });

  it('once the month has run, Amina reads the end of the month, from her own words down to the ways to carry on', async () => {
    const b: any = await boardAs(anchor(), ...AMINA);
    const e = b.theEndOfTheMonth;
    expect(e.heading).toBe('You wanted your team to understand...');
    expect(e.yourOwnWords).toBe(b.theEndOfMonthRead.yourOwnWords);
    expect(e.yourOwnWords).toContain(HER_WORDS);
    expect(e.parts.map((p: any) => p.heading)).toEqual(expect.arrayContaining(['What we found', 'What should happen next']));
    expect(e.parts.find((p: any) => p.heading === 'What we found').items).toEqual(b.theEndOfMonthRead.whatWeFound);
    expect(e.continueOptions).toEqual(b.theEndOfMonthRead.continueOptions);
    expect(e.reveal).toEqual(b.theEndOfMonthRead.reveal);
    expect(whatIsWrongForThisReader('the lead', b, { monthIsOver: true })).toEqual([]);
  });

  it('Rukia, a person in it, and an admin who only reads are served none of them', async () => {
    for (const who of [RUKIA, JUMA]) {
      const b: any = await boardAs(anchor(), who[0] as string, who[1] as string);
      for (const k of NEW) expect(k in b).toBe(false);
      expect(JSON.stringify(b)).not.toContain(HER_WORDS);
    }
    expect(whatIsWrongForThisReader('a person in it', { whatIsMoving: { items: [] } })).not.toEqual([]);
  });

  it('with the switch off, or in another scenario, nobody is served them', async () => {
    const off: any = await boardAs(anchor({ on: false }), ...AMINA);
    for (const k of NEW) expect(k in off).toBe(false);
    const other: any = await boardAs({ ...anchor(), scenario: GroundScenario.NEW_PROJECT, groundRow: { startedFrom: null, startsAt: OPENED } } as any, ...AMINA);
    for (const k of NEW) expect(k in other).toBe(false);
  });
});

/* The last three parts the month board held alone (decision 114): what the team is contributing, where perspectives differ, what Groundwork is working on next. */
const LAST = ['whatTheTeamIsContributing', 'wherePerspectivesDiffer', 'whatGroundworkIsWorkingOnNext'];

describe('the month board\'s last three parts are sections too', () => {
  it('the switchboard names them for the anchor only, and they are the lead\'s', () => {
    for (const k of LAST) {
      expect(sectionsFor(GroundScenario.HELP_TEAM_UNDERSTAND)).toContain(k);
      expect(sectionsFor(GroundScenario.NEW_PROJECT)).not.toContain(k);
      expect(ANCHOR_SECTIONS_FOR_THE_LEAD).toContain(k);
    }
  });

  it('Amina reads each with a heading and plain sentences, the same as the old field says', async () => {
    const b: any = await boardAs(anchor({ completedOn: '2026-09-15T10:00:00Z' }), ...AMINA);
    expect(b.whatTheTeamIsContributing).toEqual({ heading: 'What the team is contributing', items: b.theMonthBoard.whatTheTeamIsContributing });
    expect(b.wherePerspectivesDiffer).toEqual({ heading: 'Where perspectives differ', items: b.theMonthBoard.wherePerspectivesDiffer });
    expect(b.whatGroundworkIsWorkingOnNext).toEqual({ heading: 'What Groundwork is working on next', items: b.theMonthBoard.whatGroundworkIsWorkingOnNext });
    for (const k of LAST) expect(b[k].items.every((x: string) => /[.]$/.test(x) && x.length > 20)).toBe(true);
    expect(whatIsWrongForThisReader('the lead', b)).toEqual([]);
  });

  it('Rukia and an admin who only reads are served none of them; nor with the switch off or in another scenario', async () => {
    for (const who of [RUKIA, JUMA]) {
      const b: any = await boardAs(anchor(), who[0] as string, who[1] as string);
      for (const k of LAST) expect(k in b).toBe(false);
    }
    const off: any = await boardAs(anchor({ on: false }), ...AMINA);
    for (const k of LAST) expect(k in off).toBe(false);
    expect(whatIsWrongForThisReader('a person in it', { whatGroundworkIsWorkingOnNext: { items: [] } })).not.toEqual([]);
  });

  it('once the check-in has ended, Groundwork says it is not asking anyone for more, and nothing about this week', async () => {
    const b: any = await boardAs(anchor({ status: 'CLOSED' }), ...AMINA);
    expect(b.whatGroundworkIsWorkingOnNext.items).toEqual(['Groundwork is not asking anyone for more.']);
  });
});
