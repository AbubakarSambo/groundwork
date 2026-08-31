import { ResolutionService } from './resolution.service';
import { GroundScenario, GroundStatus, PartyType } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { endStatesFor } from './end-states';

/**
 * THE LEAD-DECIDES RULE HELD ON ONE PATH AND NOT THE OTHER.
 *
 * Her correction, which sent me looking at this: "There's no propose and accept anything, the lead
 * sees the report and resolution options and decide for themselves."
 *
 * That is true of the six scenarios in `LEAD_DECIDES` and deliberately not of the rest - the reasoning
 * is written out in `end-states.ts`, and it is careful: a new hire shown "Let them go" and asked to
 * pick it is handed a cruel choice AND a veto that was never his, while two cofounders genuinely must
 * both agree because a partnership one person can close alone is a worse product.
 *
 * WHAT WAS WRONG. `propose` has enforced it since the rule was introduced. `counterPropose` never did,
 * and what it does is replace the leading end state, DELETE every existing confirmation, and record
 * the caller's own. So one request from any party undid the whole rule: on a PIP or a new-hire ground
 * the employee could overwrite their manager's decision and clear the manager's confirmation - exactly
 * the veto the interface was changed to remove.
 *
 * Nothing in the client has ever called it, which is why nobody walked into it. That is luck.
 */
function makeService(scenario: GroundScenario, partyType: PartyType) {
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', scenario, status: GroundStatus.ACTIVE })) },
    groundParticipant: {
      findFirst: jest.fn(async () => ({ id: 'p1', partyType, email: 'x@y.test', roleAsDescribed: 'the hire', user: null })),
      findMany: jest.fn(async () => []),
    },
    resolution: { upsert: jest.fn(async () => ({ id: 'r1' })) },
    resolutionConfirmation: { deleteMany: jest.fn(async () => ({ count: 0 })), upsert: jest.fn(async () => ({})) },
  };
  const svc = new ResolutionService(prisma, {} as any, {} as any, {} as any, {} as any);
  return { svc, prisma };
}

describe('GW-RES-01: a party cannot counter-propose their way around the lead', () => {
  it.each([
    GroundScenario.NEW_HIRE,
    GroundScenario.PIP,
    GroundScenario.CONTRACT_RENEWAL,
    GroundScenario.RECOGNITION,
  ])('%s refuses a counter-proposal from a non-lead', async (scenario) => {
    const { svc, prisma } = makeService(scenario, PartyType.PARTICIPANT);
    const valid = endStatesFor(scenario)[0].value;
    await expect(svc.counterPropose('g1', 'u1', valid)).rejects.toBeInstanceOf(ForbiddenException);
    /** The tripwire that matters: nobody's confirmations were wiped on the way to the refusal. */
    expect(prisma.resolutionConfirmation.deleteMany).not.toHaveBeenCalled();
    expect(prisma.resolution.upsert).not.toHaveBeenCalled();
  });

  it('but the lead on those grounds may still counter their own proposal', async () => {
    const { svc, prisma } = makeService(GroundScenario.PIP, PartyType.INITIATOR);
    await svc.counterPropose('g1', 'u1', endStatesFor(GroundScenario.PIP)[0].value).catch(() => undefined);
    expect(prisma.resolution.upsert).toHaveBeenCalled();
  });

  it('and peers are untouched, because there both must agree', async () => {
    /**
     * The half that must NOT be tightened. NEW_PROJECT is not in LEAD_DECIDES, so a non-lead
     * counter-proposing is the correct behaviour and this rule must not reach it.
     */
    const { svc, prisma } = makeService(GroundScenario.NEW_PROJECT, PartyType.PARTICIPANT);
    await svc.counterPropose('g1', 'u1', endStatesFor(GroundScenario.NEW_PROJECT)[0].value).catch(() => undefined);
    expect(prisma.resolution.upsert).toHaveBeenCalled();
  });
});
