import { readFileSync } from 'fs';
import { join } from 'path';
import {
  findUnrecognisedContributors, findNominalOnly, sayUnrecognised, sayNominal,
  CARRYING_REFERENCED_BY, CARRYING_STATED_TIMES, NOMINAL_MINIMUM_SUBJECTS, ContributionRow,
} from './who-is-actually-carrying-it';
import { unblockingCredits } from './somebody-else-says-you-unblocked-them';

/**
 * REFERENCED IS ONE PERSON'S WORDS ABOUT ANOTHER, AND THAT IS THE WHOLE CARE OF THIS.
 *
 * Attributed testimony is one of the four things §12.8 forbids leaving the API, and a contribution
 * of kind REFERENCED is built out of exactly that. So what is kept is HOW MANY DISTINCT OTHERS
 * described somebody doing the work - never which of them, and never what they said. A count
 * cannot be turned back into a quote; a list of names can.
 */
const SERVICE = readFileSync(join(__dirname, 'detectors.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const SCHEMA = readFileSync(join(__dirname, '../../../prisma/schema.prisma'), 'utf8')
  .replace(/^\s*\/\/\/.*$/gm, '')
  .replace(/^\s*\/\/.*$/gm, '');

const row = (o: Partial<ContributionRow>): ContributionRow =>
  ({ personExternalId: 'u-a', subjectExternalId: 'S1', kind: 'STATED', weight: 1, ...o });

describe('a count cannot become a quote', () => {
  it('the contribution table has nowhere to put who said it', () => {
    /* Not "we do not write it" - there is no column. A field that exists is a field a serialiser
       can leak. */
    const model = SCHEMA.slice(SCHEMA.indexOf('model Contribution {'), SCHEMA.indexOf('@@map("contributions")'));
    for (const leak of ['sourcePersonExternalId', 'referencedBy ', 'saidBy', 'speaker', 'quote', 'content']) {
      expect(model).not.toContain(leak);
    }
  });

  it('the speakers are collected in a Set and only its size is written', () => {
    expect(SERVICE).toMatch(/new Set\(\)\)\.add\(t\.personExternalId\)/);
    expect(SERVICE).toMatch(/weight: speakers\.size/);
  });

  it('and nothing writes the speakers themselves', () => {
    expect(SERVICE).not.toMatch(/\[\.\.\.speakers\]/);
    expect(SERVICE).not.toMatch(/speakers\.join/);
  });

  it('and UNBLOCKING keeps the same rule, which is why it took a file of its own', () => {
    /*
     * This test used to assert UNBLOCKING was NOT produced, because the service said there are no
     * blockers in this product. There were, and had been for a long time - the premise had gone
     * stale and this test was holding it in place.
     *
     * What survives is the rule underneath, which never depended on that: unblocking three people
     * stores a three. WHICH three is a list of who was stuck, attributed, and the same thing the
     * REFERENCED rule refuses.
     */
    expect(SCHEMA).toContain('UNBLOCKING');
    expect(SERVICE).toMatch(/kind: 'UNBLOCKING'/);
    expect(CREDITS).toMatch(/weight: whoTheyUnblocked\.size/);
    expect(CREDITS).not.toMatch(/\[\.\.\.whoTheyUnblocked\]|whoTheyUnblocked\.join/);
  });
});

const CREDITS = readFileSync(join(__dirname, 'somebody-else-says-you-unblocked-them.ts'), 'utf8');

describe('unblocking cannot be claimed for yourself', () => {
  it('so clearing your own outstanding decision earns nothing', () => {
    /*
     * The kind's whole value is that the person credited said nothing - the credit exists because
     * the person who was waiting stopped saying they were. Somebody recording their own outstanding
     * decision and then recording it done would otherwise be paid twice for finishing their own
     * work, and it is the easiest thing to trip accidentally.
     */
    const subject = { externalId: 's1', title: 'paying user pricing', ownerExternalId: null,
      contributorExternalIds: [], parentExternalId: null };
    const own = unblockingCredits(
      [{ what: 'the paying user pricing decision', onPersonKey: 'ada', fromPersonKey: 'ada' }],
      [subject],
    );
    expect(own).toEqual([]);

    const real = unblockingCredits(
      [
        { what: 'the paying user pricing decision', onPersonKey: 'ada', fromPersonKey: 'lin' },
        { what: 'paying user pricing again', onPersonKey: 'ada', fromPersonKey: 'tom' },
        /* The same colleague twice is one person unblocked, not two. */
        { what: 'paying user pricing once more', onPersonKey: 'ada', fromPersonKey: 'tom' },
      ],
      [subject],
    );
    expect(real).toEqual([{ personExternalId: 'ada', subjectExternalId: 's1', weight: 2 }]);
  });

  it('and a handoff that sat outside the organisation credits nobody', () => {
    expect(unblockingCredits(
      [{ what: 'the paying user pricing decision', onPersonKey: null, fromPersonKey: 'lin' }],
      [{ externalId: 's1', title: 'paying user pricing', ownerExternalId: null,
         contributorExternalIds: [], parentExternalId: null }],
    )).toEqual([]);
  });
});

describe('who is actually carrying it', () => {
  it('finds somebody two colleagues describe doing work they are not on', () => {
    const [u] = findUnrecognisedContributors([
      row({ kind: 'REFERENCED', weight: CARRYING_REFERENCED_BY }),
    ]);
    expect(u).toMatchObject({ personExternalId: 'u-a', subjectExternalId: 'S1', referencedBy: 2 });
  });

  it('and somebody who keeps describing it themselves', () => {
    expect(findUnrecognisedContributors([row({ kind: 'STATED', weight: CARRYING_STATED_TIMES })])).toHaveLength(1);
  });

  it('says nothing about somebody who is formally on it', () => {
    /* Being assigned makes this the arrangement working, and flagging it trains people to ignore
       the findings. */
    expect(findUnrecognisedContributors([
      row({ kind: 'REFERENCED', weight: 5 }),
      row({ kind: 'ASSIGNED' }),
    ])).toEqual([]);
  });

  it('one mention either way is a sentence, not a load', () => {
    expect(findUnrecognisedContributors([row({ kind: 'REFERENCED', weight: 1 })])).toEqual([]);
    expect(findUnrecognisedContributors([row({ kind: 'STATED', weight: 1 })])).toEqual([]);
  });

  it('puts corroboration above self-report', () => {
    /* Somebody two colleagues describe is a stronger signal than somebody who has said it three
       times themselves. */
    const found = findUnrecognisedContributors([
      row({ personExternalId: 'u-self', kind: 'STATED', weight: 9 }),
      row({ personExternalId: 'u-corr', kind: 'REFERENCED', weight: 2 }),
    ]);
    expect(found[0].personExternalId).toBe('u-corr');
  });
});

describe('formally on work nobody mentions them in', () => {
  const assignedTo = (n: number) => Array.from({ length: n }, (_, i) => row({ kind: 'ASSIGNED', subjectExternalId: `S${i}` }));

  it('needs to be most of what they are on, not one of them', () => {
    /*
     * A name on a list is often just governance. It becomes worth saying when it is ALL of what
     * they are on, because then the roster is describing somebody who is not there.
     */
    expect(findNominalOnly(assignedTo(NOMINAL_MINIMUM_SUBJECTS - 1))).toEqual([]);
    expect(findNominalOnly(assignedTo(NOMINAL_MINIMUM_SUBJECTS))).toHaveLength(1);
  });

  it('says nothing if they are active on any of them', () => {
    expect(findNominalOnly([...assignedTo(4), row({ kind: 'STATED', subjectExternalId: 'S1', weight: 2 })])).toEqual([]);
  });

  it('and being referenced counts as being there', () => {
    /* Somebody else describing them doing it is exactly the evidence that they are not nominal. */
    expect(findNominalOnly([...assignedTo(3), row({ kind: 'REFERENCED', subjectExternalId: 'S2', weight: 2 })])).toEqual([]);
  });
});

describe('the wording is about the record, not about the person', () => {
  it('an unrecognised contributor is a gap in the record, and they benefit from fixing it', () => {
    const line = sayUnrecognised(
      { personExternalId: 'u-a', subjectExternalId: 'S1', statedTimes: 0, referencedBy: 3 },
      'Naomi Osei', 'Reduce onboarding time',
    );
    expect(line).toContain('the record is missing them');
    for (const bad of ['doing somebody else’s job', 'should not', 'unauthorised', 'overstepping']) {
      expect(line.toLowerCase()).not.toContain(bad.toLowerCase());
    }
  });

  it('a nominal assignment blames the list, because it usually is the list', () => {
    const line = sayNominal({ personExternalId: 'u-a', subjectExternalIds: ['S1', 'S2', 'S3'] }, 'Tom Test', ['A', 'B', 'C']);
    expect(line).toMatch(/list is out of date/i);
    for (const bad of ['not contributing', 'doing nothing', 'freeloading', 'coasting', 'idle']) {
      expect(line.toLowerCase()).not.toContain(bad);
    }
  });

  it('and neither sentence ranks anybody', () => {
    const a = sayUnrecognised({ personExternalId: 'x', subjectExternalId: 'y', statedTimes: 4, referencedBy: 0 }, 'A', 'T');
    const b = sayNominal({ personExternalId: 'x', subjectExternalIds: ['1', '2', '3'] }, 'B', ['T1', 'T2', 'T3']);
    for (const line of [a, b]) {
      /*
       * Ranking PHRASES, not the word "most" - "matters most at the point somebody is looking back"
       * is an adverb and perfectly fine. The first version banned the bare word and failed on its
       * own sentence, which was the test being cruder than the rule it stood for.
       */
      for (const rank of ['the most', 'the least', 'top contributor', 'the worst', 'the best', 'ranked']) {
        expect(line.toLowerCase()).not.toContain(rank);
      }
    }
  });
});
