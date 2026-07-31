import { BoardService } from './board.service';
import { CoverageKind, CoverageReason, classifyCoverageReason } from './coverage';
import { DependencyStatus } from '@prisma/client';

/**
 * GW-COVERAGE tripwires.
 *
 * Coverage ("where work is landing") is computed from WorkMention rows, which
 * resolve a spoken name to a participant ID once, at extraction time. It is NOT
 * computed by matching names against other people's text - that false-positives
 * on common names, misses anyone referred to differently, and cannot tell
 * crediting someone from covering for them.
 *
 * What must hold:
 *  1. CREDIT is never counted as coverage. Confusing the two turns "people say
 *     you unblocked them" into "your work is slipping" - the exact inversion
 *     this read must never make.
 *  2. A single period of someone covering is not a pattern. The three-period
 *     discipline that governs every other negative read governs this one.
 *  3. STABLE explains nothing, because there is nothing to explain.
 *  4. An undefined remit yields no measurable coverage at all.
 */

const P = (id: string, role: string | null = 'A remit') => ({
  id, roleAsDescribed: role, managingOnly: false,
});

function makeService(mentions: any[], opts: { ownEntries?: number; blocked?: string[] } = {}) {
  const prisma: any = {
    groundDependency: {
      findMany: jest.fn(async () => (opts.blocked ?? []).map((id) => ({ fromParticipantId: id }))),
    },
    workMention: { findMany: jest.fn(async () => mentions) },
    recordEntry: { count: jest.fn(async () => opts.ownEntries ?? 4) },
  };
  return new BoardService(prisma) as any;
}

const nameOf = (id: string) => id;

describe('GW-COVERAGE-01: credit is never read as coverage', () => {
  it('being credited many times does NOT make someone look like they are leaking work (tripwire)', async () => {
    const svc = makeService([
      { aboutParticipantId: 'p1', sourceParticipantId: 'p2', kind: 'CREDIT', sessionNumber: 1 },
      { aboutParticipantId: 'p1', sourceParticipantId: 'p2', kind: 'CREDIT', sessionNumber: 2 },
      { aboutParticipantId: 'p1', sourceParticipantId: 'p3', kind: 'CREDIT', sessionNumber: 3 },
    ]);
    const { reads } = await svc.buildCoverageReads({ id: 'g1', participants: [P('p1')] }, nameOf);
    expect(reads[0].kind).toBe(CoverageKind.STABLE);
    expect(reads[0].pct).toBe(0);
    // The credit should be surfaced as the positive it is.
    expect(reads[0].what).toMatch(/credit/i);
  });

  it('credit is still surfaced for someone who is ALSO absorbing (tripwire)', async () => {
    // The quiet load-bearer is very often both: credited by others AND picking
    // up work outside their remit. Dropping their credit because they absorbed
    // something would lose exactly the contribution this read exists to catch.
    const svc = makeService([
      { aboutParticipantId: 'p1', sourceParticipantId: 'p2', kind: 'CREDIT', sessionNumber: 1 },
      { aboutParticipantId: 'p1', sourceParticipantId: 'p3', kind: 'CREDIT', sessionNumber: 2 },
      { aboutParticipantId: 'p2', sourceParticipantId: 'p1', kind: 'COVERAGE', sessionNumber: 1 },
      { aboutParticipantId: 'p3', sourceParticipantId: 'p1', kind: 'COVERAGE', sessionNumber: 2 },
    ]);
    const { reads } = await svc.buildCoverageReads({ id: 'g1', participants: [P('p1')] }, nameOf);
    expect(reads[0].kind).toBe(CoverageKind.ABSORBING);
    expect(reads[0].what).toMatch(/credit/i);
  });

  it('BLOCKED_BY is not counted as coverage either', async () => {
    const svc = makeService([
      { aboutParticipantId: 'p1', sourceParticipantId: 'p2', kind: 'BLOCKED_BY', sessionNumber: 1 },
      { aboutParticipantId: 'p1', sourceParticipantId: 'p2', kind: 'BLOCKED_BY', sessionNumber: 2 },
    ]);
    const { reads } = await svc.buildCoverageReads({ id: 'g1', participants: [P('p1')] }, nameOf);
    expect(reads[0].kind).toBe(CoverageKind.STABLE);
  });
});

describe('GW-COVERAGE-02: coverage needs real, repeated, attributed evidence', () => {
  it('reads LEAKING when others repeatedly describe doing this person\'s work', async () => {
    const svc = makeService([
      { aboutParticipantId: 'p1', sourceParticipantId: 'p2', kind: 'COVERAGE', sessionNumber: 1 },
      { aboutParticipantId: 'p1', sourceParticipantId: 'p2', kind: 'COVERAGE', sessionNumber: 2 },
      { aboutParticipantId: 'p1', sourceParticipantId: 'p3', kind: 'COVERAGE', sessionNumber: 3 },
    ], { ownEntries: 1 });
    const { reads } = await svc.buildCoverageReads({ id: 'g1', participants: [P('p1')] }, nameOf);
    expect(reads[0].kind).toBe(CoverageKind.LEAKING);
    expect(reads[0].trend).toBe('rising');
  });

  it('one instance is not a pattern', async () => {
    const svc = makeService([
      { aboutParticipantId: 'p1', sourceParticipantId: 'p2', kind: 'COVERAGE', sessionNumber: 1 },
    ], { ownEntries: 1 });
    const { reads } = await svc.buildCoverageReads({ id: 'g1', participants: [P('p1')] }, nameOf);
    expect(reads[0].kind).toBe(CoverageKind.STABLE);
  });

  it('reads ABSORBING for the person picking work up, not LEAKING', async () => {
    const svc = makeService([
      { aboutParticipantId: 'p2', sourceParticipantId: 'p1', kind: 'COVERAGE', sessionNumber: 1 },
      { aboutParticipantId: 'p3', sourceParticipantId: 'p1', kind: 'COVERAGE', sessionNumber: 2 },
    ]);
    const { reads } = await svc.buildCoverageReads({ id: 'g1', participants: [P('p1')] }, nameOf);
    expect(reads[0].kind).toBe(CoverageKind.ABSORBING);
  });
});

describe('GW-COVERAGE-03: the signal always carries the reason it cannot self-determine', () => {
  it('an undefined remit has nothing measurable', async () => {
    const svc = makeService([
      { aboutParticipantId: 'p1', sourceParticipantId: 'p2', kind: 'COVERAGE', sessionNumber: 1 },
      { aboutParticipantId: 'p1', sourceParticipantId: 'p2', kind: 'COVERAGE', sessionNumber: 2 },
      { aboutParticipantId: 'p1', sourceParticipantId: 'p2', kind: 'COVERAGE', sessionNumber: 3 },
    ], { ownEntries: 0 });
    const { reads } = await svc.buildCoverageReads({ id: 'g1', participants: [P('p1', null)] }, nameOf);
    expect(reads[0].remitDefined).toBe(false);
    expect(reads[0].reason).toBe(CoverageReason.CANNOT_DETERMINE);
    expect(reads[0].reasonText).toMatch(/never clearly defined/i);
  });

  it('a blocked person is read as the team covering, not as a drop', async () => {
    const svc = makeService([
      { aboutParticipantId: 'p1', sourceParticipantId: 'p2', kind: 'COVERAGE', sessionNumber: 1 },
      { aboutParticipantId: 'p1', sourceParticipantId: 'p2', kind: 'COVERAGE', sessionNumber: 2 },
      { aboutParticipantId: 'p1', sourceParticipantId: 'p2', kind: 'COVERAGE', sessionNumber: 3 },
    ], { ownEntries: 1, blocked: ['p1'] });
    const { reads } = await svc.buildCoverageReads({ id: 'g1', participants: [P('p1')] }, nameOf);
    expect(reads[0].reason).toBe(CoverageReason.BLOCKED_OR_OVERLOADED);
    expect(reads[0].coupledToBlocker).toBe(true);
  });

  it('STABLE explains nothing, because there is nothing to explain', () => {
    const { reason, reasonText } = classifyCoverageReason({
      kind: CoverageKind.STABLE, isBlocked: true, remitDefined: true,
      ownVoiceClaimsDelegation: false, risingPeriods: 0,
    });
    expect(reason).toBe(CoverageReason.SHARED_BY_DESIGN);
    expect(reasonText).toMatch(/nothing here to read into/i);
  });

  it('an ownership drop is only named after three periods, never from one snapshot', () => {
    const oneOff = classifyCoverageReason({
      kind: CoverageKind.LEAKING, isBlocked: false, remitDefined: true,
      ownVoiceClaimsDelegation: false, risingPeriods: 1,
    });
    expect(oneOff.reason).toBe(CoverageReason.CANNOT_DETERMINE);

    const sustained = classifyCoverageReason({
      kind: CoverageKind.LEAKING, isBlocked: false, remitDefined: true,
      ownVoiceClaimsDelegation: false, risingPeriods: 3,
    });
    expect(sustained.reason).toBe(CoverageReason.OWNERSHIP_DROP);
  });

  it('the person saying they handed it over settles it as delegation', () => {
    const { reason } = classifyCoverageReason({
      kind: CoverageKind.LEAKING, isBlocked: false, remitDefined: true,
      ownVoiceClaimsDelegation: true, risingPeriods: 5,
    });
    expect(reason).toBe(CoverageReason.SHARED_BY_DESIGN);
  });
});
