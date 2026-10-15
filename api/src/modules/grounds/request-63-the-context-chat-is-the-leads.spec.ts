import { ForbiddenException } from '@nestjs/common';
import { aSetupConversation } from './request-92-harness';

/**
 * DECISIONS 63 AND 72 ON THE SETUP CONVERSATION (2 October 2026).
 *
 * `POST /grounds/:id/context-chat` let in any admin of the organisation while the lead was still there, so an
 * admin could steer a check-in its lead was running. The conversation, its yes (`/confirm`) and its no
 * (`/decline`) now go through the one rule every setup writer uses (mayConfirmSetupOn): the lead, or an admin
 * of the organisation only once the lead has left. Anybody else is refused with the same sentence, naming the
 * lead. Ask Groundwork's setup lane goes through `contextChat`, so it is held by the same door.
 */
const REFUSAL = 'Only Wanjiru Mwangi, who runs this check-in, can change how it is set up. An admin can only do that once Wanjiru has left the organisation. Nothing was changed.';

function asSomebody({ leadHasLeft = false } = {}) {
  const people: Record<string, any> = {
    userLead: { role: 'MEMBER', organizationId: 'org1', firstName: 'Wanjiru', lastName: 'Mwangi', isActive: !leadHasLeft },
    userAdmin: { role: 'ADMIN', organizationId: 'org1', firstName: 'Otieno', lastName: 'Kamau', isActive: true },
    userSetup: { role: 'ADMIN', organizationId: 'org1', firstName: 'Neema', lastName: 'Achieng', isActive: true },
    userAisha: { role: 'MEMBER', organizationId: 'org1', firstName: 'Aisha', lastName: 'Otieno', isActive: true },
  };
  return aSetupConversation({
    ground: { timelineStated: true, cadenceStated: true, createdByUserId: 'userSetup', participants: [{ id: 'pA', managingOnly: false, userId: 'userAisha' }] },
    seed: { user: { findUnique: async ({ where }: any) => people[where.id] ?? null } },
  });
}

const readers = [
  ['Otieno, an admin, while Wanjiru is still there', 'userAdmin'],
  ['Neema, the admin who set it up, while Wanjiru is still there', 'userSetup'],
  ['Aisha, who checks in', 'userAisha'],
] as const;

describe('the setup conversation is the lead\'s (decisions 63 and 72)', () => {
  it('Wanjiru, the lead, opens it and talks in it', async () => {
    const { service, anthropic } = asSomebody();
    const out: any = await service.contextChat('g1', 'userLead', []);
    expect(out.reply).toMatch(/^This check-in runs for 90 days/);
    await service.contextChat('g1', 'userLead', [{ role: 'assistant', content: out.reply }, { role: 'user', content: 'Every quote goes out within two days.' }]);
    expect(anthropic.respond).toHaveBeenCalledTimes(1);
  });

  it.each(readers)('%s is refused, in the same words as every setup change, and nothing is read or written', async (_who, userId) => {
    const { service, anthropic, writes } = asSomebody();
    await expect(service.contextChat('g1', userId, [])).rejects.toThrow(new ForbiddenException(REFUSAL));
    await expect(service.contextChat('g1', userId, [{ role: 'user', content: 'Make it run for twelve weeks.' }])).rejects.toThrow(REFUSAL);
    await expect(service.applyContextProposal('g1', userId, { said: 'Make it run for twelve weeks.' })).rejects.toThrow(REFUSAL);
    await expect(service.declineContextOffer('g1', userId, 'offer-1')).rejects.toThrow(REFUSAL);
    expect(anthropic.respond).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
  });

  it.each([
    ['Otieno, an admin', 'userAdmin'],
    ['Neema, the admin who set it up', 'userSetup'],
  ])('once Wanjiru has left, %s may open it and talk in it', async (_who, userId) => {
    const { service, anthropic } = asSomebody({ leadHasLeft: true });
    const out: any = await service.contextChat('g1', userId, []);
    expect(out.reply).toMatch(/^This check-in runs for 90 days/);
    await service.contextChat('g1', userId, [{ role: 'assistant', content: out.reply }, { role: 'user', content: 'Every quote goes out within two days.' }]);
    expect(anthropic.respond).toHaveBeenCalledTimes(1);
  });

  it('once Wanjiru has left, Aisha is still refused', async () => {
    const { service } = asSomebody({ leadHasLeft: true });
    await expect(service.contextChat('g1', 'userAisha', [])).rejects.toBeInstanceOf(ForbiddenException);
  });
});
