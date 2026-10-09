import { PartyType } from '@prisma/client';
import { person, answered, boardAs, AMINA, RUKIA, JUMA, type Setup } from './the-switchboards-sections-harness';
import { theActiveLine } from './the-anchor-active-line';
import { THE_SHAPES_KEYS } from '../entry/the-anchor-served-shapes';

/**
 * Request 149: the "active" line on the board (decision 98), said since B-089 as one plain sentence: "Three of the five have checked in this week, and Groundwork has reminded the two who have not." 
 * Served only for a check-in started from the anchor link, with the switch on, to whoever runs it.
 */
const lead = { ...person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR), managingOnly: false };
const PEOPLE = [
  lead,
  person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'),
  person('p-baraka', 'u-baraka', 'Baraka', 'Otieno'),
  person('p-zawadi', 'u-zawadi', 'Zawadi', 'Njeri'),
  person('p-ibrahim', 'u-ibrahim', 'Ibrahim', 'Said'),
];
const NUDGED = new Date('2026-09-10T08:00:00Z');
const OPENED = new Date('2026-09-08T08:00:00Z');

function anchor(on: boolean, startedFrom: string | null, nudged: string[] = ['p-zawadi', 'p-ibrahim']): Setup {
  const done = ['p-amina', 'p-rukia', 'p-baraka'];
  const checkIns = [
    ...done.map((id) => ({ ...answered(id, 1, '2026-09-09T10:00:00Z'), availableFrom: OPENED })),
    ...['p-zawadi', 'p-ibrahim'].map((id) => ({ id: `c1-${id}`, participantId: id, sessionNumber: 1, status: 'NOT_STARTED', isSetup: false, completedAt: null, availableFrom: OPENED })),
  ];
  return {
    people: PEOPLE, checkIns, groundRow: { startedFrom },
    prismaExtras: {
      platformSetting: { findUnique: jest.fn(async () => (on ? { value: { on: true } } : { value: { on: false } })) },
      groundParticipant: {
        findMany: jest.fn(async (a: any) => {
          if (a?.where?.id?.in) return PEOPLE.filter((p) => a.where.id.in.includes(p.id)).map((p) => ({ id: p.id, lastNudgedAt: nudged.includes(p.id) ? NUDGED : null }));
          return PEOPLE.map((p) => ({ id: p.id, userId: p.userId, checkIns: checkIns.filter((c) => c.participantId === p.id && ['COMPLETED', 'IN_PROGRESS', 'DECLINED'].includes(c.status)).map((c) => ({ status: c.status })) }));
        }),
        findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({})),
      },
    },
  };
}

describe('the active line on an anchor check-in\'s board', () => {
  it('is Hafsah\'s own line, for the lead', async () => {
    const b = await boardAs(anchor(true, 'anchor'), ...AMINA);
    expect(Object.keys(b.activeLine).sort()).toEqual([...THE_SHAPES_KEYS.activeLine].sort());
    expect(b.activeLine).toEqual({ active: 3, total: 5, nudged: 2, line: 'Three of the five have checked in this week, and Groundwork has reminded the two who have not.' });
  });

  it('is read the same by an admin who runs it, counts only and no names', async () => {
    const b = await boardAs(anchor(true, 'anchor'), ...JUMA);
    expect(b.activeLine.line).toBe('Three of the five have checked in this week, and Groundwork has reminded the two who have not.');
    expect(b.activeLine.line).not.toMatch(/Zawadi|Ibrahim/);
  });

  it('is not served to a participant', async () => {
    const b = await boardAs(anchor(true, 'anchor'), ...RUKIA);
    expect('activeLine' in b).toBe(false);
  });

  it('says honestly when only some were nudged, or none', async () => {
    expect((await boardAs(anchor(true, 'anchor', ['p-zawadi']), ...AMINA)).activeLine.line).toBe('Three of the five have checked in this week, and Groundwork has reminded one of the two who have not.');
    expect((await boardAs(anchor(true, 'anchor', []), ...AMINA)).activeLine.line).toBe('Three of the five have checked in this week, and Groundwork has not reminded the two yet.');
  });

  it('with the switch off, or a check-in not started from the anchor, nothing is served', async () => {
    expect('activeLine' in (await boardAs(anchor(false, 'anchor'), ...AMINA))).toBe(false);
    expect('activeLine' in (await boardAs(anchor(true, null), ...AMINA))).toBe(false);
    expect('activeLine' in (await boardAs(anchor(false, null), ...JUMA))).toBe(false);
  });
});

describe('the line itself', () => {
  it('never says more than 20 people', () => {
    expect(theActiveLine({ answered: 18, expected: 25, nudgedOfThoseWhoHaveNot: 2 }).line).toBe('18 of the 20 have checked in this week, and Groundwork has reminded the two who have not.');
  });
  it('is one sentence when everybody has checked in', () => {
    expect(theActiveLine({ answered: 4, expected: 4, nudgedOfThoseWhoHaveNot: 0 }).line).toBe('All four people have checked in this week.');
    expect(theActiveLine({ answered: 2, expected: 2, nudgedOfThoseWhoHaveNot: 0 }).line).toBe('Both people have checked in this week.');
  });
  it('is the plain sentence for nobody yet (B-089), with no fraction and no dot between pieces', () => {
    const none = theActiveLine({ answered: 0, expected: 3, nudgedOfThoseWhoHaveNot: 0 });
    expect(none.line).toBe('None of the three has checked in this week, and Groundwork has not reminded them yet.');
    expect(none.line).not.toMatch(/\d\/\d|·/);
    expect(theActiveLine({ answered: 0, expected: 3, nudgedOfThoseWhoHaveNot: 3 }).line).toBe('None of the three has checked in this week, and Groundwork has reminded them.');
    expect(theActiveLine({ answered: 1, expected: 1, nudgedOfThoseWhoHaveNot: 0 }).line).toBe('The one person has checked in this week.');
    expect(theActiveLine({ answered: 0, expected: 1, nudgedOfThoseWhoHaveNot: 0 }).line).toBe('The one person has not checked in this week, and Groundwork has not reminded them yet.');
    expect(theActiveLine({ answered: 0, expected: 2, nudgedOfThoseWhoHaveNot: 0 }).line).toBe('Neither of the two has checked in this week, and Groundwork has not reminded them yet.');
  });
});
