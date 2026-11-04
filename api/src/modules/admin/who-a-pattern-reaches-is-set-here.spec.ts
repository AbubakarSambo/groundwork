import { AdminService } from './admin.service';
import * as patterns from '../patterns/who-reads-a-pattern';

/**
 * WHO A PATTERN REACHES IS NO LONGER A SETTING (decision 86, which reverses decision 74, item 2).
 *
 * This file used to check the platform admin's setting for who a pattern reaches, whose default held
 * the lead back until patterns were steady at 8 in 10. That restriction is gone. This file now pins
 * that there is nothing left to set, and that a `patterns.reach` row still sitting in a database,
 * holding the old person-only word, cannot hold the lead back.
 */
describe('there is no admin setting for who a pattern reaches (decision 86)', () => {
  it('the admin service has nothing that reads or sets it', () => {
    const svc = new AdminService({} as any, {} as any, {} as any) as any;
    expect(svc.getPatternReach).toBeUndefined();
    expect(svc.setPatternReach).toBeUndefined();
  });

  it('the pattern rules export no reach, no default and no stored key', () => {
    const mod = patterns as any;
    for (const gone of ['DEFAULT_PATTERN_REACH', 'PATTERN_REACH_KEY', 'setPatternReachInForce', 'readPatternReach']) {
      expect(mod[gone]).toBeUndefined();
    }
  });

  /* Nothing reads the row any more, so the reach is the same whatever a database holds. */
  it('with no setting in force at all, only the person reads their pattern; the lead reads none of it, even after the person answered', () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const row = {
      id: 'pd1', participantId: 'p-ngozi', code: 'B11', observationText: null, seenInSessions: [1, 2, 3], periodsObserved: 3,
      readyAt: new Date('2026-09-20'), shownToPersonAt: new Date('2026-09-20'),
      personAnswer: 'The committee only meets once a month.', personAnsweredAt: new Date('2026-09-21'),
    };
    const asTheLead = patterns.servedPatterns([row], { participantId: 'p-lead', runsIt: true }, { on: true, now: new Date('2026-09-28'), firstNameOf: () => 'Ngozi' });
    expect(asTheLead).toEqual([]);
    const asNgozi = patterns.servedPatterns([row], { participantId: 'p-ngozi', runsIt: false }, { on: true, now: new Date('2026-09-28'), leadName: 'Tunde' });
    expect(asNgozi.map((p) => p.theirWords)).toEqual(['The committee only meets once a month.']);
  });
});
