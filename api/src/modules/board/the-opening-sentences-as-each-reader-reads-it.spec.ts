import { theBoardForThisKind } from './each-kind-gets-its-own-board';

/**
 * THE OPENING SENTENCES, AS EACH READER READS THEM (board assessment, 15 November, fix 3). The sentences are written from the record the
 * board holds: counts of what is on record, figures a system sent, and what people said. Nothing is invented, and where the record is
 * blank the sentence says so. They use no names, so the lead, a person in the check-in and a read-only admin are served the same words.
 */
const people = (answeredN: number, asked: number) => [
  { id: 'lead', name: 'Hafsah', managingOnly: false, isLead: true, answered: true },
  ...Array.from({ length: asked }, (_, i) => ({ id: `p${i}`, name: i < answeredN ? `Name${i}` : 'A colleague', managingOnly: false, isLead: false, answered: i < answeredN })),
];
const build = (kind: any, over: Record<string, any>, readerRunsIt: boolean, p = people(2, 4)) =>
  theBoardForThisKind({ kind, board: { workRecords: [], objectives: [], blockers: [], ...over }, people: p, readerRunsIt, readerIsTheLead: readerRunsIt, metrics: [], documentSaysOf: new Map(), now: new Date('2026-11-15T10:00:00Z') });

describe('a government programme opens with where it stands', () => {
  const board = { objectives: [{ name: '30% more farmers get advice from an extension officer.', ownerParticipantId: null }], workRecords: [{ section: 'Deal grid', rows: [{ kind: 'county', id: 'c1', name: 'Kiambu' }, { kind: 'county', id: 'c2', name: 'Nakuru' }] }], blockers: [{ state: 'blocking' }] };
  it('says the aim, where it stands, what is at risk and how each is known, with no names', () => {
    const o = build('a government programme', board, true).theOpening;
    expect(o.says).toEqual([
      'The aim is “30% more farmers get advice from an extension officer”.',
      '2 counties are on record, and the visit log has sent no numbers yet, so visits cannot be set against the aim.',
      '1 thing is in the way and not cleared yet.',
    ]);
    expect(o.howKnown).toBe('2 people said this in their check-ins, and no figure comes from another system.');
    expect(JSON.stringify(o)).not.toMatch(/Hafsah|Name0|Name1/);
  });
  it('is the same words for a reader who does not run it', () => {
    expect(build('a government programme', board, false).theOpening).toEqual(build('a government programme', board, true).theOpening);
  });
  it('says plainly what nobody has said where the record is blank, and invents no figure', () => {
    const o = build('a government programme', {}, true, people(0, 0)).theOpening;
    expect(o.says).toEqual([
      'Nobody has said yet what this is aiming for.',
      'No county is on record, and the visit log has sent no numbers yet, so visits cannot be set against the aim.',
      'Nobody has said yet what is in the way.',
    ]);
    expect(o.howKnown).toBe('Nobody has checked in yet, so none of this is said by anybody, and no figure comes from another system.');
  });
});

describe('an asset loans cohort opens with how many are repaying', () => {
  it('counts the loans on record and says what is not known', () => {
    const loans = [{ kind: 'loan', stage: 'repaying' }, { kind: 'loan', stage: 'late' }, { kind: 'loan', stage: 'repaying' }];
    const o = build('asset loans', { workRecords: [{ section: 'Deal grid', rows: loans }] }, true).theOpening;
    expect(o.says[0]).toBe('2 loans are being repaid and 1 is behind, out of 3 on record.');
    expect(o.says[1]).toBe('4 people are in this cohort and 2 of them have checked in.');
    expect(o.says[2]).toBe('Nobody has said yet what is in the way.');
    expect(build('asset loans', {}, true).theOpening.says[0]).toBe('No loan is on record yet, so nobody can say who is repaying.');
  });
});

describe('a law firm matter keeps its own "where the matter stands" and says how it is known', () => {
  it('ends the section with where the lines come from', () => {
    const says = build('a law firm matter', {}, true).whereTheMatterStands.says;
    expect(says[says.length - 1]).toBe('This is from the matter’s record and from what 2 people said in their check-ins. A document counts only where it is attached to the matter.');
  });
});
