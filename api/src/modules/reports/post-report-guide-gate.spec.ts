import { ReportsService } from './reports.service';

/**
 * Post-report guide spend gate (permanent tripwire).
 *
 * generatePostReportGuides makes ONE Gemini call per participant per report release.
 * The feature is built and proven accurate, but no UI renders its output yet, so it is
 * gated OFF (app.postReportGuideEnabled / POST_REPORT_GUIDE_ENABLED) to avoid paying for
 * output nothing shows.
 *
 * This is a spend guard, NOT a deletion:
 *  - OFF  -> the generator must make ZERO model calls and write nothing.
 *  - ON   -> it must still fire (the feature is intact and reversible with one env var).
 *
 * If the OFF test goes red, the per-release spend has silently come back. Do not "fix"
 * the test - restore the gate, or wire the UI and flip the flag deliberately.
 */

function makeService(flagEnabled: boolean) {
  const anthropic: any = { extract: jest.fn(async () => ({ openingLine: 'a', questionToCarry: 'b', toAcknowledge: 'c' })) };
  const prisma: any = {
    recordEntry: { findMany: jest.fn(async () => [{ type: 'INTENT', text: 'something on the record' }]) },
    report: { update: jest.fn(async () => ({})) },
  };
  const config: any = { get: jest.fn((key: string) => (key === 'app.postReportGuideEnabled' ? flagEnabled : undefined)) };
  const service: any = new ReportsService(prisma, {} as any, anthropic, {} as any, config, {} as any, {} as any);
  return { service, anthropic, prisma, config };
}

const REPORT = { groundId: 'g1', sharedPicture: 'x', agreements: [], divergences: [], centralQuestion: 'q', engagement: {} };

describe('GW-PRG-GATE: post-report guide generation is gated off until a UI consumes it', () => {
  it('OFF: makes zero model calls and writes nothing (no per-release spend)', async () => {
    const { service, anthropic, prisma } = makeService(false);
    await service.generatePostReportGuides(REPORT, ['p1', 'p2']);
    expect(anthropic.extract).not.toHaveBeenCalled();
    expect(prisma.recordEntry.findMany).not.toHaveBeenCalled();
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it('ON: still fires per participant (feature intact, reversible with one env var)', async () => {
    const { service, anthropic, prisma } = makeService(true);
    await service.generatePostReportGuides(REPORT, ['p1', 'p2']);
    expect(anthropic.extract).toHaveBeenCalledTimes(2);
    expect(prisma.report.update).toHaveBeenCalledTimes(1);
  });
});
