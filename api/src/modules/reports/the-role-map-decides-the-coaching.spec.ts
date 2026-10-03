import { whatToWorkOnNext, whichRoleMap, thePair } from './what-to-work-on-next';
import { ROLE_MAPS, RoleFunction, MIN_COACHING_CONFIDENCE } from '../board/role-maps';

/**
 * THE ROLE MAP DECIDES WHAT THIS SAYS, AND `detectedFunction` DECIDES WHICH MAP.
 *
 * 749 lines of role map were dead on this page for one reason: nothing here read the column that
 * selects one. The coaching note had a hand-written switch on scenario instead - seven lines
 * returning "the first months of a new role" beside a map that says, per function, what on track
 * means, what going wrong looks like, and what that function's people get unfairly read as.
 *
 * ENGINES PRODUCE THE CLAIMS. Every sentence about the role in this note is a field of the map,
 * verbatim. Nothing here composes a claim of its own about what somebody in a role should do.
 */
const base = {
  patterns: [] as { code: string; periodsObserved: number }[],
  role: 'ward coordinator',
  detectedFunction: null as string | null,
  functionConfidence: null as number | null,
  noticedBehaviour: null as string | null,
  sessionNumber: 2,
  totalSessions: 6,
  scenario: 'NEW_HIRE',
  waitingOn: [],
  holdingUp: [],
  saidSomethingSpecific: true,
  anythingDocumented: false,
};

describe('which map applies', () => {
  it('a confidently detected function selects its map', () => {
    const { map, why } = whichRoleMap('SALES', 0.72);
    expect(map?.fn).toBe(RoleFunction.SALES);
    expect(why).toBeNull();
  });

  it('a function detected below the coaching threshold selects none, and says which it looked like', () => {
    /* `priorFunctionFromRole` returns 0.4 for a title alone, deliberately: somebody titled product
       manager whose record is all coordination reads as project management, and coaching them out
       of the wrong map is worse than not coaching them. */
    const { map, why } = whichRoleMap('SALES', MIN_COACHING_CONFIDENCE - 0.1);
    expect(map).toBeNull();
    /* Reworded (request 123, item 11): "your record looks like ... coach against" was work jargon. */
    expect(why).toContain('it is not clear enough yet to coach you on that kind of work');
    expect(why).not.toMatch(/your record|coach against/i);
    expect(why).toContain(ROLE_MAPS[RoleFunction.SALES].label.toLowerCase());
  });

  it('and no detection at all degrades to stage, with the reason said', () => {
    const { map, why } = whichRoleMap(null, null);
    expect(map).toBeNull();
    expect(why).toContain('has not been read from the record yet');
  });
});

describe('what the note carries from the map', () => {
  const out = whatToWorkOnNext({ ...base, detectedFunction: 'SALES', functionConfidence: 0.72 });
  const map = ROLE_MAPS[RoleFunction.SALES];

  it('what on track means, in the map\'s own words, as a claim and not as a sentence in the note', () => {
    /* The claim travels on `role.onTrack`. The note's own sentence no longer quotes it: the service
       hands the map to the wording pass as CONTEXT, and the model writes from it. Read back before
       this: "seems to be quoting directly from the role map instead of using it as context". */
    expect(out.role?.onTrack).toBe(map.onTrackMeans);
    expect(out.whyItMatters).not.toContain(map.onTrackMeans);
  });

  it('what going wrong looks like, in the map\'s own words', () => {
    expect(out.role?.goingWrong).toBe(map.goingWrongLooksLike);
  });

  it('and what this function\'s people get unfairly read as, always', () => {
    /* The fairness half. A note carrying what somebody does wrong and not what they get blamed for
       wrongly is the stick without the map, and the map exists so this product is not that. */
    expect(out.role?.protectAgainst).toBe(map.protectAgainst);
  });

  it('nothing about the role is composed here', () => {
    const composed = [out.role?.onTrack, out.role?.goingWrong, out.role?.protectAgainst];
    for (const line of composed) {
      expect(Object.values(map).some((v) => v === line)).toBe(true);
    }
  });
});

describe('the paired signals', () => {
  const map = ROLE_MAPS[RoleFunction.SALES];
  const noticed = map.failureSignals![2];

  it('come as a pair when the coaching engine recorded what it noticed', () => {
    const pair = thePair(map, noticed);
    expect(pair?.noticed).toBe(noticed);
    expect(pair?.lookingLike).toBe(map.successSignals![2]);
  });

  it('and never the failure half alone', () => {
    const out = whatToWorkOnNext({ ...base, detectedFunction: 'SALES', functionConfidence: 0.72, noticedBehaviour: noticed });
    expect(out.role?.noticed).toBeTruthy();
    expect(out.role?.lookingLike).toBeTruthy();
  });

  it('and never on the report, because the only source for them is walled off', () => {
    /*
     * THE PAIR CANNOT REACH THIS PAGE, AND THAT IS THE RIGHT ANSWER.
     *
     * Knowing WHICH failure signal applies to a person means reading `coachingState.staircase` -
     * what they were asked to work on and what they did not manage, given on the understanding
     * that it was for them. `coaching-can-never-justify-a-firing.spec.ts` gives reports.service no
     * path to that table, checks the source rather than the behaviour so that adding the import
     * fails, and this read feeds the LEAD's probe list as well as the private note.
     *
     * So `thePair` stays exported and tested for the surfaces that may use it, and the report
     * always passes null.
     */
    const src = require('fs').readFileSync(__dirname + '/reports.service.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).toMatch(/noticedBehaviour: null/);
    const out = whatToWorkOnNext({ ...base, detectedFunction: 'SALES', functionConfidence: 0.72 });
    expect(out.role?.noticed).toBeNull();
    expect(out.role?.lookingLike).toBeNull();
  });

  it('and nothing when the stored behaviour is not in this map', () => {
    expect(thePair(map, 'something nobody wrote')).toBeNull();
  });
});

describe('the switch it replaced', () => {
  it('is gone', () => {
    const src = require('fs').readFileSync(__dirname + '/what-to-work-on-next.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).not.toContain('whatThisRoleIsFor');
    expect(src).not.toContain("case 'NEW_MANAGER'");
  });
});
