import { ForbiddenException } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { HELD_FOR_A_SEAT } from '../participants/held-for-a-seat';

/**
 * REQUEST 197, the refusal: a person over the plan (the one rule in common/over-the-plan.ts, the same people People marks) is refused
 * a new answer in the sentence a person held for a seat already reads; somebody under it is not. Their earlier answers are read
 * through the readers, which this does not touch (decision 110, B3).
 */
function serviceWith(held: string[]) {
  const s: any = Object.create(ConversationService.prototype);
  s.prisma = { ground: { findUnique: async () => ({ organizationId: 'org1' }) } };
  s.billing = { whoIsOverThePlan: async () => ({ over: held.length, held: new Set(held), saying: null }) };
  s.loadOwnedCheckIn = async () => ({ id: 'c1', groundId: 'g1', status: 'IN_PROGRESS', participant: { userId: 'kito', awaitingSeat: false } });
  return s;
}
const asKito = (s: any) => s.loadOwnedOpenCheckIn('c1', 'kito');

describe('somebody over the plan', () => {
  it('is refused a new answer, in the invitation sentence', async () => {
    const err: any = await asKito(serviceWith(['kito'])).then(() => null, (e: any) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect(err.message).toBe(HELD_FOR_A_SEAT);
  });
  it('is not refused when somebody else is the one over the plan', async () => {
    expect(await asKito(serviceWith(['lerato']))).toMatchObject({ id: 'c1' });
  });
  it('is not refused when the plan fact cannot be read', async () => {
    const s = serviceWith(['kito']);
    s.billing = { whoIsOverThePlan: async () => { throw new Error('down'); } };
    expect(await asKito(s)).toMatchObject({ id: 'c1' });
  });
});
