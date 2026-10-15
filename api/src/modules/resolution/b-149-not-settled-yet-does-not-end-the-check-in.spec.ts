import { ResolutionService, NOT_SETTLED_KEEPS_IT_RUNNING } from './resolution.service';

/** B-149. Choosing "It is not settled yet, and more sessions are needed." at the ending keeps the check-in running and closes nothing. */
describe('B-149: "not settled yet" at the ending', () => {
  function service() {
    const prisma: any = {
      resolution: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn(async () => null) },
      resolutionConfirmation: { upsert: jest.fn(), findMany: jest.fn(async () => []) },
      ground: { update: jest.fn() },
      $transaction: jest.fn(),
    };
    const svc: any = new (ResolutionService as any)(prisma, {}, {}, {}, {});
    svc.assertParty = jest.fn(async () => ({ ground: { id: 'g1', scenario: 'OKR_ALIGNMENT', status: 'ACTIVE' }, participant: { id: 'p1', partyType: 'INITIATOR' } }));
    svc.buildState = jest.fn(async () => ({ groundId: 'g1' }));
    svc.finalize = jest.fn();
    return { svc: svc as ResolutionService, prisma, finalize: svc.finalize as jest.Mock };
  }
  it('closes nothing, writes no ending, and tells the lead it keeps running', async () => {
    const { svc, prisma, finalize } = service();
    const out: any = await svc.propose('g1', 'u1', 'NOT_YET', 'We have not heard from the depot.');
    expect(finalize).not.toHaveBeenCalled();
    expect(prisma.resolution.upsert).not.toHaveBeenCalled();
    expect(prisma.resolutionConfirmation.upsert).not.toHaveBeenCalled();
    expect(out.keptRunning).toBe(true);
    expect(out.saying).toBe(NOT_SETTLED_KEEPS_IT_RUNNING);
    expect(out.saying).toBe('Nothing has ended. This check-in keeps running. If it needs more time, choose "Give it more time".');
  });
});
