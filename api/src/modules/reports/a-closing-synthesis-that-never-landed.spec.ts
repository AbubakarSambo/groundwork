import { ReportsService } from './reports.service';

/**
 * A CLOSING SYNTHESIS THAT NEVER LANDED. (found on a live run)
 *
 * The worst failure shape in this product, and it took a twelve-session run to
 * show it:
 *
 *   both parties finished their final session
 *   the closing synthesis ran
 *   the model returned prose instead of calling emit_report
 *   the listener logged an error nobody reads
 *   the report kept its mid-ground state PERMANENTLY
 *
 * No closing tiers, no end states, no closingComplete - and nothing anywhere said
 * so. The report opens and looks finished. A lead reads a twelve-week ground whose
 * entire closing read is missing and has no way to know it: the "confident and
 * wrong" failure G35 exists to refuse, arriving through an unhandled error rather
 * than a bad inference.
 *
 * It also cost me two runs. The e2e assertion that caught it was the one I had
 * already "fixed" for reading a stale snapshot - the snapshot really was stale AND
 * there really was a product bug underneath, and I stopped at the first
 * explanation.
 */

function makeService(grounds: any[]) {
  const synthesised: string[] = [];
  const prisma: any = { ground: { findMany: jest.fn(async () => grounds) } };
  const service = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  jest.spyOn(service, 'synthesize').mockImplementation(async (id: string) => {
    synthesised.push(id);
    return undefined as any;
  });
  return { service, synthesised };
}

const finished = (over: any = {}) => ({
  id: 'g1',
  report: { finalSynthesis: null },
  participants: [
    { id: 'p1', userId: 'u1', checkIns: [{ id: 'ci1' }] },
    { id: 'p2', userId: 'u2', checkIns: [{ id: 'ci2' }] },
  ],
  ...over,
});

describe('the sweep that finishes them', () => {
  it('synthesises a ground that closed with no closing synthesis', async () => {
    const { service, synthesised } = makeService([finished()]);
    await service.finishClosingSynthesesThatFailed();
    expect(synthesised).toEqual(['g1']);
  });

  it('leaves a ground whose closing synthesis landed alone', async () => {
    // Idempotent by construction: once it lands, the ground stops matching. Without
    // this the sweep would re-synthesise every closed ground every hour, which is
    // both expensive and a way to quietly rewrite finished reports.
    const { service, synthesised } = makeService([
      finished({ report: { finalSynthesis: { closingComplete: true, tiers: { p1: 'MIXED' } } } }),
    ]);
    await service.finishClosingSynthesesThatFailed();
    expect(synthesised).toEqual([]);
  });

  it('waits for every accepted party, not just one', async () => {
    const { service, synthesised } = makeService([
      finished({
        participants: [
          { id: 'p1', userId: 'u1', checkIns: [{ id: 'ci1' }] },
          { id: 'p2', userId: 'u2', checkIns: [] },
        ],
      }),
    ]);
    await service.finishClosingSynthesesThatFailed();
    expect(synthesised).toEqual([]);
  });

  it('and is not held open by somebody who was invited and never joined', async () => {
    // THE CASE THAT WOULD MAKE THIS USELESS. An unaccepted invitation is the most
    // common state on a real ground, and treating it as a missing final session
    // would mean the repair never runs anywhere.
    const { service, synthesised } = makeService([
      finished({
        participants: [
          { id: 'p1', userId: 'u1', checkIns: [{ id: 'ci1' }] },
          { id: 'p2', userId: null, checkIns: [] },
        ],
      }),
    ]);
    await service.finishClosingSynthesesThatFailed();
    expect(synthesised).toEqual(['g1']);
  });

  it('does nothing for a ground with no accepted parties at all', async () => {
    const { service, synthesised } = makeService([
      finished({ participants: [{ id: 'p1', userId: null, checkIns: [] }] }),
    ]);
    await service.finishClosingSynthesesThatFailed();
    expect(synthesised).toEqual([]);
  });

  it('keeps going when one ground fails again', async () => {
    // A ground that cannot be synthesised must not stop the ones behind it. The
    // first version of a sweep like this always does.
    const { service, synthesised } = makeService([finished({ id: 'bad' }), finished({ id: 'good' })]);
    (service.synthesize as jest.Mock).mockImplementation(async (id: string) => {
      if (id === 'bad') throw new Error('the model was unreachable');
      synthesised.push(id);
    });
    await service.finishClosingSynthesesThatFailed();
    expect(synthesised).toEqual(['good']);
  });

  it('and a broken query never crashes the scheduler', async () => {
    const service = new ReportsService(
      { ground: { findMany: jest.fn(async () => { throw new Error('database went away'); }) } } as any,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    );
    await expect(service.finishClosingSynthesesThatFailed()).resolves.toBeUndefined();
  });
});
