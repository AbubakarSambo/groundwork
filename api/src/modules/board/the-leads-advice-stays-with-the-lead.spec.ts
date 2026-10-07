import { readFileSync } from 'fs';
import { join } from 'path';
import { buildContribution } from './reads';
import { classifyCoverageReason } from './coverage';
import {
  contributionWithoutTheLeadsAdvice,
  coverageWithoutTheLeadsAdvice,
} from './the-leads-advice-stays-with-the-lead';

/**
 * B-109. A participant's own board carried sentences written to the lead about her:
 * "Define what this role owns before you assess where work is landing", "An undefined role is often
 * the real problem, not the person". A participant never reads the lead's judgement or advice to the lead.
 */
const ADVICE = [
  /Define what (it|this role|each role)/i,
  /often the real problem/i,
  /before (assessing|reading anything into|you read anything into)/i,
  /Worth asking about, not concluding/i,
  /Treat it as a question/i,
  /Watch for overload/i,
];
const isAdvice = (s: string) => ADVICE.some((r) => r.test(s));

describe('advice written to the lead is not served to the person it is about', () => {
  const noRole = buildContribution(
    {
      participants: [{ id: 'p1', roleAsDescribed: null, managingOnly: false, detectedFunction: null, detectedFunctionConfidence: 0 }],
      checkIns: [], entries: [], dependencies: [], peopleWorkTogether: true, situationHasRoles: true,
    } as any,
    () => 'Amani Wekesa',
  );

  it('the engine does write it (so the strip is doing the work)', () => {
    expect(isAdvice(noRole[0].note ?? '')).toBe(true);
    expect(isAdvice(classifyCoverageReason({ kind: 'STABLE' as any, isBlocked: false, remitDefined: false, ownVoiceClaimsDelegation: false, risingPeriods: 0 }).reasonText)).toBe(true);
  });

  it('a participant\'s contribution row has no note', () => {
    const out = contributionWithoutTheLeadsAdvice(noRole);
    expect(JSON.stringify(out)).not.toMatch(/often the real problem|Define what it is responsible/);
    expect(out[0].note).toBeUndefined();
    /* What it says about the person's own row stays. */
    expect(out[0].remitDefined).toBe(false);
  });

  it.each([
    classifyCoverageReason({ kind: 'STABLE' as any, isBlocked: false, remitDefined: false, ownVoiceClaimsDelegation: false, risingPeriods: 0 }),
    classifyCoverageReason({ kind: 'ABSORBING' as any, isBlocked: false, remitDefined: true, ownVoiceClaimsDelegation: false, risingPeriods: 0 }),
    classifyCoverageReason({ kind: 'LEAKING' as any, isBlocked: true, remitDefined: true, ownVoiceClaimsDelegation: false, risingPeriods: 0 }),
    classifyCoverageReason({ kind: 'LEAKING' as any, isBlocked: false, remitDefined: true, ownVoiceClaimsDelegation: false, risingPeriods: 4 }),
    classifyCoverageReason({ kind: 'LEAKING' as any, isBlocked: false, remitDefined: true, ownVoiceClaimsDelegation: false, risingPeriods: 1 }),
  ])('a participant\'s coverage row has no reason sentence ($reason)', (r) => {
    const out = coverageWithoutTheLeadsAdvice({ scope: 'role', reads: [{ participantId: 'p1', what: 'Your work is staying with you.', reason: r.reason, reasonText: r.reasonText }] });
    expect(out.reads[0].reasonText).toBeUndefined();
    expect(out.reads[0].what).toBe('Your work is staying with you.');
    expect(out.scope).toBe('role');
  });

  it('the board applies it to everybody who does not run the check-in, and to nobody who does', () => {
    const src = readFileSync(join(__dirname, 'board.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const at = src.indexOf('if (!runsItForAPattern(ground as any, requestingUserId) && !adminHere) {');
    expect(at).toBeGreaterThan(0);
    const block = src.slice(at, src.indexOf('\n    }\n', at));
    expect(block).toContain('contributionWithoutTheLeadsAdvice(onlyMine(out.contribution))');
    expect(block).toContain('coverageWithoutTheLeadsAdvice(');
  });
});
