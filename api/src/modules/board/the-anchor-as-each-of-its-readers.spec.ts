import { PartyType } from '@prisma/client';
import { person, answered, commitment, handoff, boardAs, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN, type Setup } from './the-switchboards-sections-harness';
import { whatIsWrongForThisReader } from '../../../journey/anchor/what-each-reader-may-be-served';
import { onThisComputer } from '../../../journey/anchor/walk-the-anchor-as-each-reader';

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
      platformSetting: { findUnique: jest.fn(async () => (on ? { value: { on: true } } : null)) },
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
