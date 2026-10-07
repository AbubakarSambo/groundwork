import { PartyType } from '@prisma/client';
import { person, answered, commitment, handoff, boardAs, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN, type Setup } from './the-switchboards-sections-harness';
import { whatIsWrongForThisReader } from './the-anchor-readers';
import { onThisComputer } from '../../common/on-this-computer';

/**
 * ANCHOR PIECE 35: THE ANCHOR CHECK-IN, READ BY ALL FOUR OF ITS READERS AT ONCE.
 *
 * The lead (Amina), a person in it (Rukia, who closed a promise, and Baraka, who has not), an admin who set it up,
 * and an admin who only reads (Juma). Each board is checked with the same rules the journey runner uses against a
 * running API (journey/anchor/), so the two cannot drift apart.
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


const ON = () => anchor(true, 'anchor');
const SETUP = () => ({ ...anchor(true, 'anchor'), createdByUserId: 'u-setup' }) as any;

describe('every reader of one anchor check-in, against the same rules as the journey', () => {
  it('the lead is served her parts, and nothing that is somebody else\'s', async () => {
    expect(whatIsWrongForThisReader('the lead', await boardAs(ON(), ...AMINA))).toEqual([]);
  });
  it('Rukia is served her own sentence only', async () => {
    const b = await boardAs(ON(), ...RUKIA);
    expect(whatIsWrongForThisReader('a person in it', b, { othersNames: ['Amina', 'Baraka', 'Zawadi', 'Ibrahim'] })).toEqual([]);
    expect(b.yourPartInMovingThings).toMatch(/^You committed to /);
  });
  it('Baraka is served nothing of anybody else\'s', async () => {
    const b = await boardAs(ON(), ...BARAKA);
    expect(whatIsWrongForThisReader('a person in it', b, { othersNames: ['Amina', 'Rukia'] })).toEqual([]);
  });
  it('an admin who set it up is served the active line only', async () => {
    const b = await boardAs(SETUP(), ...SETUP_ADMIN);
    expect(whatIsWrongForThisReader('an admin with access', b)).toEqual([]);
  });
  it('an admin who only reads is served none of the lead\'s parts and no person\'s sentence', async () => {
    expect(whatIsWrongForThisReader('an admin who only reads', await boardAs(ON(), ...JUMA))).toEqual([]);
  });
  it('the rules do catch a wrong board', () => {
    expect(whatIsWrongForThisReader('a person in it', { theMonthBoard: {} })).not.toEqual([]);
    expect(whatIsWrongForThisReader('a person in it', { yourPartInMovingThings: 'Rukia committed to send the deck, and it is done.' })).not.toEqual([]);
    expect(whatIsWrongForThisReader('the lead', { activeLine: {}, theMonthBoard: { lenses: [{ reading: 'Rukia is at risk.' }] } })).not.toEqual([]);
    expect(whatIsWrongForThisReader('an admin who only reads', { yourPartInMovingThings: 'You did it.' })).not.toEqual([]);
  });
  it('with the switch off, nobody is served an anchor part', async () => {
    for (const r of [AMINA, RUKIA, JUMA]) {
      const b = await boardAs(anchor(false, 'anchor'), r[0], r[1]);
      for (const k of ['activeLine', 'theMonthBoard', 'theEndOfMonthRead', 'yourPartInMovingThings']) expect(k in b).toBe(false);
    }
  });
});

describe('the journey runner only talks to this computer', () => {
  it.each(['http://localhost:3000', 'http://127.0.0.1:3000'])('%s is this computer', (u) => expect(onThisComputer(u)).toBe(true));
  it.each(['https://api.myground.work', 'http://10.0.0.5:3000', 'not a url'])('%s is not', (u) => expect(onThisComputer(u)).toBe(false));
});

describe('an ended check-in, as the lead reads it (6 October)', () => {
  it('has no active line and a month board that says it has ended', () => {
    expect(whatIsWrongForThisReader('the lead', { theMonthBoard: { weekSaid: 'This check-in has ended.' } }, { ended: true })).toEqual([]);
    expect(whatIsWrongForThisReader('the lead', { activeLine: { line: '4/5 active' }, theMonthBoard: { weekSaid: 'Week 4 of the month' } }, { ended: true })).toEqual([
      'The lead is served the active line of a check-in that has ended.',
      'The lead\'s month board does not say the check-in has ended.',
    ]);
  });
});

/*
 * THE LEAD'S AIM IS HERS ALONE ON THE BOARD TOO (decision 96, item 8; known issue P13, reviewer's audit 7 October).
 * Read with the anchor switched off, as a person in the check-in, the lead, and an admin who runs it: the person reads no objective, the
 * others read the aim; a check-in not started from the anchor reads as before.
 */
const THE_AIM = 'Amina is aiming for the sales and production teams to coordinate on timelines';
const withAnAim = (s: Setup): Setup => ({ ...s, objectives: [{ id: 'o-aim', groundId: 'g1', name: THE_AIM, target: null, ownerParticipantId: null, sortOrder: 0, assumes: null, isADecisionAboutAPerson: false, createdAt: new Date('2026-09-08') }] });

describe('the board of an anchor check-in, and the lead\'s aim', () => {
  const aims = (b: any) => JSON.stringify(b.objectives ?? []);

  it('a person in it reads none of it', async () => {
    for (const b of [await boardAs(withAnAim(anchor(false, 'anchor')), ...RUKIA), await boardAs(withAnAim(anchor(false, 'anchor')), ...BARAKA)]) {
      expect(b.objectives ?? []).toEqual([]);
      expect(JSON.stringify(b)).not.toContain('coordinate on timelines');
    }
  });

  it('the lead reads it, and so does an admin who runs it', async () => {
    expect(aims(await boardAs(withAnAim(anchor(false, 'anchor')), ...AMINA))).toContain('aiming for the sales and production teams to coordinate on timelines');
    expect(aims(await boardAs({ ...withAnAim(anchor(false, 'anchor')), createdByUserId: 'u-setup' } as any, ...SETUP_ADMIN))).toContain('coordinate on timelines');
  });

  it('a check-in not started from the anchor is read as it was by its people', async () => {
    const b = await boardAs(withAnAim(anchor(false, null)), ...RUKIA);
    expect(aims(b)).toContain('coordinate on timelines');
  });
});
