import { readFileSync } from 'fs';
import { join } from 'path';
import { ParticipantsService } from './participants.service';
import { aPersonWhoWasRemoved, REMOVED_FROM_THE_CHECK_IN_BY_LINK } from './held-for-a-seat';

/**
 * Run 4 (18 November): Mary was removed and asked the sign-in page for a link. Her address no longer had a sign-in, so it read as a
 * stranger's and she was mailed a sign-up link; opened, it said "That link didn't work". She is now sent nothing, and an old invitation
 * link tells her plainly that she was removed.
 */
const SAYS = 'You were removed from this check-in, so this link no longer opens it. If that is a mistake, ask the person who runs it.';

describe('somebody who was removed', () => {
  it('is known by the address the check-ins they left still hold', async () => {
    /* Asked by address or by number through one question (OR over the address and the sign-in), then for a seat that is still held. */
    const db: any = { groundParticipant: { findFirst: async ({ where }: any) => (where.OR?.some((o: any) => o.email?.in?.includes('mary@taasolar.test')) && where.leftAt?.not === null ? { id: 'p-mary' } : null) } };
    expect(await aPersonWhoWasRemoved(db, 'Mary@TaaSolar.test')).toBe(true);
    expect(await aPersonWhoWasRemoved(db, 'ruth@taasolar.test')).toBe(false);
  });

  it('reads the plain sentence on an old invitation link, and nothing else of the check-in', async () => {
    const prisma: any = {
      groundParticipant: { findUnique: async () => ({ id: 'p1', groundId: 'sales', email: 'mary@taasolar.test', userId: 'u', leftAt: new Date(), awaitingSeat: false, inviteToken: 't', inviteTokenExpiresAt: new Date(Date.now() + 86_400_000) }) },
      ground: { findUnique: async () => { throw new Error('the check-in must not be read for somebody who was removed'); } },
    };
    const svc = new ParticipantsService(prisma, {} as any, {} as any, {} as any);
    expect(await svc.preview('t')).toEqual({ removed: true, saying: SAYS });
    await expect(svc.accept('t')).rejects.toThrow(SAYS);
    expect(REMOVED_FROM_THE_CHECK_IN_BY_LINK).toBe(SAYS);
  });

  it('is sent no sign-in link by the sign-in page (the request asks before an address is taken for a stranger\'s)', () => {
    const auth = readFileSync(join(__dirname, '..', 'auth', 'auth.service.ts'), 'utf8');
    const i = auth.indexOf('async entrySave');
    const asked = auth.indexOf('aPersonWhoWasRemoved(this.prisma', i);
    const makesASignup = auth.indexOf('pendingSignup.upsert', i);
    expect(asked).toBeGreaterThan(i);
    expect(asked).toBeLessThan(makesASignup);
  });
});
