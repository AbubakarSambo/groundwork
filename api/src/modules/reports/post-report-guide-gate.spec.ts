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

function makeService(flagEnabled: boolean, guide?: Record<string, string>) {
  const anthropic: any = {
    extract: jest.fn(async () => guide ?? {
      openingLine: 'The accounts differ on what success means.',
      questionToCarry: 'What would we need to see to call this done?',
      toAcknowledge: 'Another account weighted the strategic outcome more heavily.',
    }),
  };
  const prisma: any = {
    workMention: { findMany: jest.fn(async () => []) },
    recordEntry: { findMany: jest.fn(async () => [{ type: 'INTENT', text: 'something on the record' }]) },
    // The sanitiser's forbidden-name list is built from this. It is not optional
    // plumbing: without the real parties, nothing knows which names to strip.
    groundParticipant: {
      findMany: jest.fn(async () => [
        { email: 'eric.abbott@meridian.test', user: { firstName: 'Eric', lastName: 'Abbott' } },
      ]),
    },
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

  /**
   * The sanitiser is not optional, and it runs on the path that actually writes.
   *
   * The guide leaked a real first name on a real ground with the prompt forbidding
   * it, so the strip happens in code between extraction and storage. These two
   * assert that at the seam, because guide-sanitiser.spec.ts can only prove the
   * function works - not that this method calls it.
   */
  /**
   * Built from THIS ground, on THIS call. Not a fixed list, not cached between
   * releases - a ground's participants change (people are added, invites are
   * corrected), and a stale list protects the wrong people.
   */
  it('ON: reads the ground\'s own participants every time it generates', async () => {
    const { service, prisma } = makeService(true);
    await service.generatePostReportGuides(REPORT, ['p1', 'p2']);

    expect(prisma.groundParticipant.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.groundParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groundId: 'g1' } }),
    );

    // A second release re-reads rather than reusing the first list.
    await service.generatePostReportGuides(REPORT, ['p1']);
    expect(prisma.groundParticipant.findMany).toHaveBeenCalledTimes(2);
  });

  it('ON: a name only present on the ground is stripped, proving the list is live', async () => {
    // "Abubakar" is not in any hardcoded list anywhere - it is only knowable from
    // the participant row this mock returns.
    const { service, prisma } = makeService(true, {
      openingLine: 'Abubakar and I measure the quarter differently.',
      questionToCarry: 'What single outcome are we building towards?',
      toAcknowledge: 'Another account weights the strategic result more heavily.',
    });
    (prisma.groundParticipant.findMany as jest.Mock).mockResolvedValue([
      { email: 'a.sambo@x.test', user: { firstName: 'Abubakar', lastName: 'Sambo' } },
    ]);

    await service.generatePostReportGuides(REPORT, ['p1']);
    const written = (prisma.report.update as jest.Mock).mock.calls[0][0].data.engagement.postReportGuides.p1;
    expect(written.openingLine).toBeUndefined();
    expect(written.questionToCarry).toBeDefined();
    expect(JSON.stringify(written)).not.toMatch(/Abubakar/i);
  });

  it('ON: a guide that names a party is not stored', async () => {
    const { service, prisma } = makeService(true, {
      openingLine: "I want to acknowledge Eric's consistent focus on the outcome.",
      questionToCarry: "Eric raised the strategic goal - how do we get there?",
      toAcknowledge: "Eric has been consistent about this.",
    });
    await service.generatePostReportGuides(REPORT, ['p1']);
    // Every field named someone, so there is no guide left and nothing to write.
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it('ON: the clean fields of a partly-bad guide still reach storage', async () => {
    const { service, prisma } = makeService(true, {
      openingLine: 'The accounts do not agree on what success means this quarter.',
      questionToCarry: 'What would we need to see by the end of the quarter?',
      toAcknowledge: "Eric has been consistent about the strategic outcome.",
    });
    await service.generatePostReportGuides(REPORT, ['p1']);
    expect(prisma.report.update).toHaveBeenCalledTimes(1);

    const written = (prisma.report.update as jest.Mock).mock.calls[0][0].data.engagement.postReportGuides.p1;
    expect(written.openingLine).toBeDefined();
    expect(written.questionToCarry).toBeDefined();
    expect(written.toAcknowledge).toBeUndefined();
    expect(JSON.stringify(written)).not.toMatch(/Eric/i);
  });
});
