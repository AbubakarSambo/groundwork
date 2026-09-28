import { ReportsService } from './reports.service';

/**
 * A REPORT THAT FELL BEHIND THE ANSWERS, AND THE SWEEP THAT CATCHES IT UP.
 *
 * Synthesis runs on every completion, so a report is normally as current as the answers. It is not
 * always: a synthesis that throws leaves the PREVIOUS report standing, and nothing retried. Watched
 * on a live run - ten people had answered and the report had been built from four, and it stayed
 * that way. The report opened and looked finished, which is the failure shape this product refuses:
 * confident and wrong, arriving through an unhandled error rather than a bad inference.
 *
 * `catchUpReportsLeftBehind` is hourly and idempotent by construction - a ground stops matching the
 * moment its report has read as many answers as the ground holds.
 *
 * THE NULL CASE IS THE ONE WORTH PINNING. `builtFromAnswers` is null on every report written before
 * the column existed. Treating null as zero would re-synthesise every old report in the database on
 * the first run after a deploy - a model call per ground, all at once, for reports that were never
 * behind. So null is left alone, and that is a decision rather than an oversight.
 *
 * THE COUNT IS PEOPLE, NOT CHECK-INS. A ground running six sessions has six completed check-ins for
 * one person, and comparing that against a report built from one answer would mark a perfectly
 * current report as behind and re-synthesise it every hour for ever.
 */

function makeService(reports: any[], checkInsByGround: Record<string, any[]>) {
  const synthesised: string[] = [];
  const prisma: any = {
    report: { findMany: jest.fn(async () => reports) },
    checkIn: { findMany: jest.fn(async ({ where }: any) => checkInsByGround[where.groundId] ?? []) },
  };
  const service = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { tell: async () => [] } as any);
  jest.spyOn(service, 'synthesize').mockImplementation(async (id: string) => {
    synthesised.push(id);
    return undefined as any;
  });
  return { service, synthesised, prisma };
}

/** One completed check-in per participant id given. */
const answeredBy = (...participantIds: string[]) => participantIds.map((participantId) => ({ participantId }));

describe('the sweep that catches a report up', () => {
  it('writes the report again when more people have answered than it read', async () => {
    const { service, synthesised } = makeService(
      [{ groundId: 'g1', builtFromAnswers: 4 }],
      { g1: answeredBy('p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10') },
    );
    await service.catchUpReportsLeftBehind();
    expect(synthesised).toEqual(['g1']);
  });

  it('leaves a report alone once it has read every answer', async () => {
    const { service, synthesised } = makeService(
      [{ groundId: 'g1', builtFromAnswers: 3 }],
      { g1: answeredBy('p1', 'p2', 'p3') },
    );
    await service.catchUpReportsLeftBehind();
    expect(synthesised).toEqual([]);
  });

  it('leaves a report alone when it has read more than are on record', async () => {
    /* Somebody's check-in was reopened after the report was written. Behind is behind; ahead is not
       a reason to spend a model call. */
    const { service, synthesised } = makeService(
      [{ groundId: 'g1', builtFromAnswers: 5 }],
      { g1: answeredBy('p1', 'p2') },
    );
    await service.catchUpReportsLeftBehind();
    expect(synthesised).toEqual([]);
  });

  it('never touches a report written before the column existed', async () => {
    const { service, synthesised } = makeService(
      [{ groundId: 'g1', builtFromAnswers: null }, { groundId: 'g2', builtFromAnswers: undefined }],
      { g1: answeredBy('p1', 'p2'), g2: answeredBy('p1', 'p2') },
    );
    await service.catchUpReportsLeftBehind();
    expect(synthesised).toEqual([]);
  });

  it('counts people rather than check-ins, so a long ground is not rewritten for ever', async () => {
    /* Six sessions, one person. The report read one answer and it is not behind. */
    const { service, synthesised } = makeService(
      [{ groundId: 'g1', builtFromAnswers: 1 }],
      { g1: answeredBy('p1', 'p1', 'p1', 'p1', 'p1', 'p1') },
    );
    await service.catchUpReportsLeftBehind();
    expect(synthesised).toEqual([]);
  });

  it('carries on down the list when one ground fails', async () => {
    const { service, synthesised } = makeService(
      [{ groundId: 'g1', builtFromAnswers: 1 }, { groundId: 'g2', builtFromAnswers: 1 }],
      { g1: answeredBy('p1', 'p2'), g2: answeredBy('p1', 'p2') },
    );
    (service.synthesize as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('the model returned prose');
    });
    await expect(service.catchUpReportsLeftBehind()).resolves.toBeUndefined();
    expect(synthesised).toEqual(['g2']);
  });

  it('says nothing and throws nothing when the read itself fails', async () => {
    const { service } = makeService([], {});
    (service as any).prisma.report.findMany = jest.fn(async () => {
      throw new Error('the database is not there');
    });
    await expect(service.catchUpReportsLeftBehind()).resolves.toBeUndefined();
  });

  it('only looks at grounds that are still running', async () => {
    const { service, prisma } = makeService([], {});
    await service.catchUpReportsLeftBehind();
    const where = (prisma.report.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.ground.status.notIn).toEqual(expect.arrayContaining(['CLOSED', 'RESOLVED']));
  });
});
