import { theConfirmedWaits } from '../grounds/a-wait-is-the-speakers-account';
import { theirWeekInWords } from './the-participants-week';

/**
 * JOSEPH'S "YOUR WEEK", THURSDAY 15 OCTOBER (Drop Access, messages test, fourth run), from the run's own record. It said:
 *   "On Monday 12 October, in "Sales team, Q4", you said "Follow up on Mama Pima"."
 *   "Mercy Wairimu says the work is waiting for "the sample units he promised" from you in "Sales team, Q4". That is what Mercy Wairimu
 *    said, and you have not said it yourself."
 * On Wednesday he said "I wish I had remembered the samples for Mercy. I've had them ready since Monday.", and, asked about Mama Pima,
 * "Wanjiru said to call her next week. It's still pending."
 */

describe("Mercy's wait on Joseph for the samples", () => {
  const WAIT = { id: 'w-samples', groundId: 'g', fromParticipantId: 'gp-mercy', onParticipantId: 'gp-joseph', what: 'the sample units he promised', triedSaid: null };
  const prisma = (lines: any[]) => ({
    groundCommitment: { findMany: jest.fn(async () => []) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'gp-mercy', nameGiven: null, user: { firstName: 'Mercy' } }]) },
    recordEntry: { findMany: jest.fn(async () => lines) },
  });
  it('is confirmed by what Joseph said himself, so his week says Mercy is waiting for it from him', async () => {
    const confirmed = await theConfirmedWaits(prisma([{ participantId: 'gp-joseph', text: 'I wish I had remembered the samples for Mercy.' }]), [WAIT]);
    expect(confirmed.has('w-samples')).toBe(true);
    const w = theirWeekInWords('Joseph', { kept: null, open: [], waitingOn: [], waitingOnYou: [{ who: 'Mercy', what: WAIT.what, checkIn: 'Sales team, Q4' }], saidToWaitOnYou: [] })!;
    expect(w.lines).toContain('Mercy is waiting for "the sample units he promised" from you in "Sales team, Q4".');
    expect(w.lines.join(' ')).not.toContain('you have not said it yourself');
  });
  it('a line of his that names neither the samples nor Mercy confirms nothing', async () => {
    expect((await theConfirmedWaits(prisma([{ participantId: 'gp-joseph', text: 'I met Mr. Kariuki.' }]), [WAIT])).has('w-samples')).toBe(false);
  });
});

