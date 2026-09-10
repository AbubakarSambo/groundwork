import { theSessionReport } from './the-session-report';
import { WHERE_IT_WAS_READ_FROM } from '../conversation/how-checkable-a-session-was';

/**
 * THE CLARITY SENTENCE CHANGES WITH THE SCORE.
 *
 * howClear switched on `high`/`low`, which the scorer never emits, so every shared report with a
 * level printed "specific in places and general in others" whatever the score. Four levels, four
 * sentences, one not-read-yet - and where the read came from, said beside it.
 */
const report = (specificityLevel: string | null) => theSessionReport({
  sessionNumber: 1, closed: false, agreements: [], divergences: [], entries: [], previousEntries: [],
  baselineSuccess: null, startingPoint: null, previousSharedPicture: null, evidence: [],
  specificityLevel, recallConfidence: null, centralQuestion: null, movedOnTargets: null, blocked: 0, answeredThisSession: [],
} as any);

describe('the sentence at the foot of the report', () => {
  it('is different for each of the four levels', () => {
    const said = ['managed', 'vague', 'directional', 'specific'].map((l) => report(l).howClearThisWas.saying);
    expect(new Set(said).size).toBe(4);
  });

  it('says where the read came from whenever there is one', () => {
    for (const l of ['managed', 'vague', 'directional', 'specific']) {
      expect(report(l).howClearThisWas.saying).toContain(WHERE_IT_WAS_READ_FROM);
    }
  });

  it('and says it has not been read yet when it has not, with no provenance to claim', () => {
    const s = report(null).howClearThisWas.saying;
    expect(s).toMatch(/has not been read yet/);
    expect(s).not.toContain(WHERE_IT_WAS_READ_FROM);
  });

  it('never claims recall, which was never measured', () => {
    for (const l of ['managed', 'specific']) {
      expect(report(l).howClearThisWas.saying).not.toMatch(/recalled|anchored to something written down/);
    }
  });
});
