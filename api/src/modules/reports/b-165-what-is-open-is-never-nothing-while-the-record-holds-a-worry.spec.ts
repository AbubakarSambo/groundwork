import { theSessionReport } from './the-session-report';

/**
 * B-165: Esther said "Three shops are waiting on a credit decision and I cannot move them until that comes back." The page, handed something settled and
 * nothing open, said "Nothing is open. Everything anybody raised has been settled." The list now says what the record holds, in the sentence the
 * Blockers read uses, and the differences are still served alone for anything that means a difference between people.
 */
const base: any = {
  sessionNumber: 1, closed: false, agreements: ['Both count a shop once it has ordered'], divergences: [], entries: [], previousEntries: [], baselineSuccess: null,
  startingPoint: null, previousSharedPicture: null, evidence: [], specificityLevel: null, centralQuestion: null, movedOnTargets: null, blocked: 0,
  peopleInAll: 2, answeredThisSession: [{ who: 'Esther Adeyemi', isYou: true }, { who: 'Kwesi Boateng', isYou: false }],
};

describe('B-165: what is still open, when the record holds something', () => {
  it('a worry that cannot be quoted is listed as open, with no claim that nobody waits', () => {
    const out = theSessionReport({ ...base, worries: 1, theFirstWorry: null, whyNoWorryIsShown: 'not kept' });
    expect(out.whereThingsStand.open).toEqual(['1 worry is on record. It was not kept in the words it was said, so it is not quoted here. No wait has been recorded against a named person.']);
    expect(out.whereThingsStand.differences).toEqual([]);
    expect(out.whereThingsStand.stillOpen).toBe(0);
  });
  it('a blocker on record is listed as open', () => {
    const out = theSessionReport({ ...base, blocked: 1, theFirstBlocker: 'the credit decision' });
    expect(out.whereThingsStand.open.length).toBe(1);
    expect(out.whereThingsStand.open[0]).toMatch(/credit decision/);
  });
  it('an earlier wait still open is listed as open', () => {
    const out = theSessionReport({ ...base, waitsFromEarlier: 2 });
    expect(out.whereThingsStand.open[0]).toMatch(/2 waits from earlier sessions are still open/);
  });
  it('with nothing on record, nothing is listed, so "Nothing is open" is then true', () => {
    const out = theSessionReport({ ...base });
    expect(out.whereThingsStand.open).toEqual([]);
  });
  it('a difference the report lists is listed as it was, and no worry line is added beside it', () => {
    const out = theSessionReport({ ...base, divergences: [{ topic: 'Whether a shop counts when it signs' }], worries: 1, theFirstWorry: null });
    expect(out.whereThingsStand.open).toEqual(['Whether a shop counts when it signs']);
  });
});
