import { theSessionReport } from './the-session-report';

/**
 * B-118: A CLOSING REPORT SAYS ONE TRUE THING ABOUT WHO HAS ANSWERED.
 *
 * After a half-done check-in closed, the report's first sentence said "Not everyone has answered yet, so there is nothing to agree or differ with."
 * and, two sentences on, the Differences read said "Everybody has answered, and the written report names no agreement and no gap yet." One came from
 * whether the round had closed, the other from the count of people. The count decides in both now.
 */
const base: any = {
  sessionNumber: 3, closed: true, agreements: [], divergences: [], entries: [], previousEntries: [], baselineSuccess: null, startingPoint: null,
  previousSharedPicture: null, evidence: [], specificityLevel: null, centralQuestion: null, movedOnTargets: null, blocked: 0,
};
const said = (n: number) => Array.from({ length: n }, (_x, i) => ({ who: `Person ${i}`, isYou: i === 0 }));
const theDifferencesRead = (out: any) => out.atAGlance.find((r: any) => r.label === 'Differences')?.sub as string;

describe('B-118: who has answered, said once', () => {
  it('a round that closed with one of two answered says that not everyone has, in both places', () => {
    const out = theSessionReport({ ...base, closed: true, peopleInAll: 2, answeredThisSession: said(1) });
    expect(out.whereThingsStand.saying).toBe('Not everyone has answered yet, so there is nothing to agree or differ with.');
    expect(theDifferencesRead(out)).toBe('1 person has still to answer.');
  });
  it('a round still open where everybody has answered says that everybody has, in both places', () => {
    const out = theSessionReport({ ...base, closed: false, peopleInAll: 2, answeredThisSession: said(2) });
    expect(out.whereThingsStand.saying).toBe('Everybody has answered and this has not yet named anything they agree or differ on.');
    expect(theDifferencesRead(out)).toBe('Everybody has answered, and the written report names no agreement and no gap yet.');
  });
  it('with no count of people, whether the round closed decides, as before', () => {
    expect(theSessionReport({ ...base, closed: true, answeredThisSession: said(1) }).whereThingsStand.saying).toContain('Everybody has answered');
    expect(theSessionReport({ ...base, closed: false, answeredThisSession: said(1) }).whereThingsStand.saying).toContain('Not everyone has answered yet');
  });
});
