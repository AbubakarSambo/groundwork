import { theSessionReport } from './the-session-report';
import { howMuchThereIsToGoOn } from './how-much-there-is-to-go-on';

/** "4 still open" sat above a list of two: the count was the raw array length, the list was filtered. */
describe('the list under a count has that many things in it', () => {
  it('counts the filtered list, not the raw array', () => {
    const r = theSessionReport({
      sessionNumber: 1, closed: false,
      agreements: [{ title: 'Ship dates' }, null, { title: '' }, 'Owners'],
      divergences: [null, { topic: 'Scope' }, undefined, {}],
      entries: [], previousEntries: [], baselineSuccess: null, startingPoint: null, previousSharedPicture: null,
      evidence: [], specificityLevel: null, centralQuestion: null,
      movedOnTargets: null, blocked: 0, waiting: 0, answeredThisSession: [], peopleInAll: 0,
    } as any);
    const agreedTile = r.atAGlance.find((t) => /agree|settled|differences/i.test(t.label + t.sub))!;
    expect(r.atAGlance.some((t) => t.value === '1')).toBe(true);
    expect(agreedTile).toBeTruthy();
    expect(JSON.stringify(r)).not.toMatch(/"value":"4"/);
  });

  it('a ratio never has a numerator larger than its denominator', () => {
    const c = howMuchThereIsToGoOn({ answered: 5, ofPeople: 4, documented: 7, saidInAll: 3, specificityLevel: null } as any);
    expect(JSON.stringify(c)).not.toMatch(/5 of 4|7 of 3/);
  });
});
