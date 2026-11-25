import { theSessionReport } from './the-session-report';
import { theDifferencesReadAgreesWithTheQuestion } from '../board/the-quick-read-agrees-with-the-report';

/** B-165: the Differences read said "Nobody sees anything differently" while the report asked "Does a shop count when it signs, or when it orders again?" */
const base: any = {
  sessionNumber: 1, closed: true, agreements: ['Both want more shops'], divergences: [], entries: [], previousEntries: [], baselineSuccess: null,
  startingPoint: null, previousSharedPicture: null, evidence: [], specificityLevel: null, movedOnTargets: null, blocked: 0,
  peopleInAll: 2, answeredThisSession: [{ who: 'Esther Adeyemi', isYou: false }, { who: 'Kwesi Boateng', isYou: false }],
};
const diff = (out: any) => out.atAGlance.find((t: any) => t.label === 'Differences');

describe('B-165: the Differences read and the question the report asks', () => {
  it('counts the either-or question as one difference', () => {
    const t = diff(theSessionReport({ ...base, centralQuestion: 'Does a shop count when it signs, or when it orders again?' }));
    expect(t.value).toBe('1');
    expect(t.sub).toBe('The report asks, "Does a shop count when it signs, or when it orders again?"');
  });
  it('leaves the read alone where the question is not between two ways', () => {
    expect(diff(theSessionReport({ ...base, centralQuestion: 'What should the team do next?' })).value).toBe('None');
  });
  /* Changed 24 November (page audit, row 6): the difference is named once, where things stand, so its tile counts it and does not
     name it again. */
  it('leaves a listed difference as it was, counted and not named again', () => {
    const t = diff(theSessionReport({ ...base, divergences: [{ topic: 'The price list' }], centralQuestion: 'Does a shop count when it signs, or when it orders again?' }));
    expect(t.value).toBe('1');
    expect(t.sub).not.toMatch(/price list/);
  });
  it('the function leaves other tiles alone', () => {
    const tiles = [{ label: 'Blockers', value: 'None', sub: 'x' }];
    expect(theDifferencesReadAgreesWithTheQuestion(tiles, 'Does a, or b?')).toEqual(tiles);
  });
});
