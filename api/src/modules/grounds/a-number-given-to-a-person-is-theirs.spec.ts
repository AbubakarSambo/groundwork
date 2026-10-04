import { aSetupConversation } from './request-92-harness';
import { whatWeTookFromThat } from './a-dump-is-many-things';

/**
 * DUMPS AND DOCUMENTS (4 October 2026), faults 2 and 3, from the quarterly plan and the sales update.
 *
 * Q4 priorities, each with an owner and a number. The model gave each number twice, once for the whole
 * team and once for its owner, so the board counted every priority twice. Hannah Cole owns "6 hires"
 * and is not on the check-in: her number was kept for the whole team and for nobody else. And in the
 * sales update a credit ceiling of 35 was said back and never written, because "Q4 sales" and "credit
 * as a share of sales" both end in "sales" and were taken for one measure.
 */
const PEOPLE = [
  { id: 'pA', email: 'amina@x.test', nameGiven: 'Amina Yusuf', roleAsDescribed: null, managingOnly: false, userId: 'uA', user: { firstName: 'Amina', lastName: 'Yusuf' } },
  { id: 'pF', email: 'funmi@x.test', nameGiven: 'Funmi Ojo', roleAsDescribed: null, managingOnly: false, userId: 'uF', user: { firstName: 'Funmi', lastName: 'Ojo' } },
];
const PLAN = 'Priority 1 owner Amina Yusuf, booked revenue N520m. Priority 4 owner Funmi Ojo, credit under 35%. Priority 5 owner Hannah Cole, 6 hires by end of November. '.repeat(4);

const READ = {
  teamTargets: [
    { name: 'Booked revenue', target: 520_000_000 },
    { name: 'Credit as a share of sales', target: 35, notToExceed: true },
    { name: 'Hires', target: 6 },
    { name: 'Total budget', target: 15_000_000, notToExceed: true },
  ],
  forPeople: [
    { personName: 'Amina Yusuf', expectation: 'Grow revenue.', targets: [{ name: 'Booked revenue', number: 520_000_000 }] },
    { personName: 'Funmi Ojo', expectation: 'Keep credit low.', targets: [{ name: 'Credit as a share of sales', number: 35 }] },
    { personName: 'Hannah Cole', expectation: 'Hire six people.', targets: [{ name: 'Hires', number: 6 }] },
  ],
  commitments: [
    { personName: 'Musa Bello', action: 'Pay N900k owed for Samuel\'s Cold Rooms', when: 'by the 15th', theySaidIt: false },
    { personName: null, action: 'Book two trucks', when: null, theySaidIt: false },
  ],
};

async function read(extra: any = {}) {
  const { service } = aSetupConversation({
    ground: { participants: PEOPLE },
    seed: { ground: { findUnique: async () => ({ id: 'g1', participants: PEOPLE }) } },
    extract: () => ({ ...READ, ...extra }),
  });
  return (service as any).whatAPasteGives('g1', PLAN) as Promise<any>;
}

describe('a number the paste gave to a person is theirs and not also the team\'s', () => {
  it('keeps the team numbers nobody owns, and drops the ones a person on the check-in owns', async () => {
    const got = await read();
    expect(got.teamTargets.map((t: any) => t.name)).toEqual(['Total budget']);
    expect(got.forPeople.map((p: any) => `${p.who} ${p.targets.map((t: any) => t.number).join(',')}`)).toEqual(['Amina Yusuf 520000000', 'Funmi Ojo 35']);
  });

  it('keeps an owner\'s number off the team when the owner is not on the check-in, and says whose it is', async () => {
    const got = await read();
    expect(got.teamTargets.map((t: any) => t.name)).not.toContain('Hires');
    expect(got.unmatched).toContain('Hannah Cole');
    const said = whatWeTookFromThat(got, { asking: true })!;
    expect(said).toContain('2 names are not on this check-in, so nothing is saved for them yet. If you add them and send this again, I will put their part on too.');
    expect(said).toContain('- Hannah Cole (Hires: 6)');
  });

  it('a job that belongs to somebody not on the check-in is said under their name, not kept as nobody\'s job', async () => {
    const got = await read();
    expect(got.commitments.map((c: any) => c.action)).toEqual(['Book two trucks']);
    const said = whatWeTookFromThat(got, { asking: true })!;
    expect(said).toContain("- Musa Bello (Pay N900k owed for Samuel's Cold Rooms (by the 15th))");
  });

  it('a team ceiling is kept when one person has the same figure for a narrower measure of their own', async () => {
    const got = await read({
      teamTargets: [{ name: 'Credit as a share of sales', target: 35, notToExceed: true }],
      forPeople: [{ personName: 'Amina Yusuf', expectation: 'Keep credit low.', targets: [{ name: 'Credit as a share of his own book', number: 35 }] }],
    });
    expect(got.teamTargets.map((t: any) => t.name)).toEqual(['Credit as a share of sales']);
  });

  it('two numbers that are not the same figure are never one measure because their names end alike', async () => {
    const got = await read({
      teamTargets: [{ name: 'Q4 sales', target: 180_000_000 }, { name: 'Credit as a share of sales', target: 35, notToExceed: true }],
      forPeople: [],
    });
    expect(got.teamTargets.map((t: any) => `${t.name} ${t.target}`)).toEqual(['Q4 sales 180000000', 'Credit as a share of sales 35']);
  });
});

describe('the writer keeps a measure that only shares a word with one already held', () => {
  it('writes the credit ceiling even though a measure ending in "sales" is already on the check-in', async () => {
    const created: any[] = [];
    const { service } = aSetupConversation({
      ground: { participants: PEOPLE },
      seed: {
        groundObjective: {
          findMany: async () => [{ name: 'Q4 sales', ownerParticipantId: null, target: 180_000_000 }],
          createMany: async ({ data }: any) => { created.push(...data); return { count: data.length }; },
        },
      },
    });
    const wrote = await (service as any).writeWhatThePasteGave('g1', {
      teamTargets: [{ name: 'Q4 sales', target: 180_000_000, notToExceed: false }, { name: 'Credit as a share of sales', target: 35, notToExceed: true }],
      forPeople: [], commitments: [], questionsForPeople: [], betweenPeople: [], aboutPeople: [],
      waysOfWorking: [], strategy: [], notes: [], openDecisions: [], notSettled: [], dates: [], unmatched: [],
    });
    expect(wrote).toBe(true);
    expect(created.map((c) => `${c.name} ${c.target}`)).toEqual(['Credit as a share of sales 35']);
  });
});

describe('a percentage the model wrote as a fraction is not rounded to nothing', () => {
  const { theNumberAsWritten } = require('./a-dump-is-many-things');
  it('reads 0.05 as 5 only where the paste says 5%, and keeps no number where it cannot tell', () => {
    expect(theNumberAsWritten(0.05, 'Late deliveries under 5% (now 12%).')).toBe(5);
    expect(theNumberAsWritten(0.09, 'delivery cost from 11% to under 9%')).toBe(9);
    expect(theNumberAsWritten(0.05, 'late deliveries under five')).toBeNull();
    expect(theNumberAsWritten(0.004, 'a very small share')).toBeNull();
  });
  it('leaves whole numbers as they were, and drops zero and nonsense', () => {
    expect(theNumberAsWritten(520_000_000.4, 'x')).toBe(520_000_000);
    expect(theNumberAsWritten(1, 'x')).toBe(1);
    expect(theNumberAsWritten(0, 'x')).toBeNull();
    expect(theNumberAsWritten(null, 'x')).toBeNull();
    expect(theNumberAsWritten(NaN, 'x')).toBeNull();
  });
  it('a plan whose owner has 0.09 for delivery cost keeps 9, on the owner', async () => {
    const { service } = aSetupConversation({
      ground: { participants: PEOPLE },
      seed: { ground: { findUnique: async () => ({ id: 'g1', participants: PEOPLE }) } },
      extract: () => ({ forPeople: [{ personName: 'Funmi Ojo', expectation: 'Cut waste.', targets: [{ name: 'Late deliveries', number: 0.05 }] }] }),
    });
    const got: any = await (service as any).whatAPasteGives('g1', 'Funmi Ojo must keep late deliveries under 5% (now 12%). '.repeat(8));
    expect(got.forPeople[0].targets).toEqual([{ name: 'Late deliveries', number: 5 }]);
  });
});

describe('an action read from a paste carries no full stop of its own', () => {
  it('so the line reads "Call every butchery in Ikeja (by Friday 10 October)" and not with a dot before the bracket', async () => {
    const { service } = aSetupConversation({
      ground: { participants: PEOPLE },
      seed: { ground: { findUnique: async () => ({ id: 'g1', participants: PEOPLE }) } },
      extract: () => ({ commitments: [{ personName: 'Amina Yusuf', action: 'Call every butchery in Ikeja.', when: 'by Friday 10 October', theySaidIt: true }] }),
    });
    const got: any = await (service as any).whatAPasteGives('g1', PLAN);
    expect(got.commitments[0].action).toBe('Call every butchery in Ikeja');
    expect(whatWeTookFromThat(got, { asking: true })).toContain('- Amina Yusuf: Call every butchery in Ikeja (by Friday 10 October)');
  });
});
