import { readFileSync } from 'fs';
import { join } from 'path';
import { ParticipantsService, HELD_FOR_A_SEAT } from './participants.service';
import { aGuestHereIfTheyAreFromElsewhere } from './a-guest-is-a-guest-from-the-moment-they-are-added';

/**
 * A GUEST WITH AN ACCOUNT TAKES A SEAT (U.4 re-review, the prototype's rule: "They take a seat; you
 * have 73 free."). So a guest added when the plan has no seat is HELD: on the People page as "No seat
 * on your plan", on the no-seat card, holding no seat, and offered no check-in until a seat is freed
 * and their invitation goes. One with a free seat takes it and is offered the check-in as before.
 */
function memberships(start: any[] = []) {
  const rows = [...start];
  return {
    rows,
    db: {
      user: { findUnique: async () => ({ id: 'baraka', organizationId: 'ouma', isActive: true, deletedAt: null }) },
      organizationMembership: {
        findUnique: async ({ where }: any) => rows.find((r) => r.userId === where.userId_organizationId.userId && r.organizationId === where.userId_organizationId.organizationId) ?? null,
        create: async ({ data }: any) => { const r = { id: 'm1', heldForASeat: false, ...data }; rows.push(r); return r; },
        update: async ({ where, data }: any) => { Object.assign(rows.find((r) => r.id === where.id)!, data); return {}; },
      },
    },
  };
}

describe('the guest membership, with and without a seat', () => {
  it('with a free seat: a guest, holding it', async () => {
    const { db, rows } = memberships();
    await aGuestHereIfTheyAreFromElsewhere(db, 'baridi', 'baraka@ouma.co', false);
    expect(rows).toEqual([expect.objectContaining({ userId: 'baraka', organizationId: 'baridi', role: 'GUEST', heldForASeat: false })]);
  });

  it('with no seat: a guest, held, holding none', async () => {
    const { db, rows } = memberships();
    await aGuestHereIfTheyAreFromElsewhere(db, 'baridi', 'baraka@ouma.co', true);
    expect(rows[0]).toMatchObject({ role: 'GUEST', heldForASeat: true });
  });

  it('held on one check-in and added to another once there is room: they take their seat', async () => {
    const { db, rows } = memberships([{ id: 'm1', userId: 'baraka', organizationId: 'baridi', role: 'GUEST', heldForASeat: true }]);
    await aGuestHereIfTheyAreFromElsewhere(db, 'baridi', 'baraka@ouma.co', false);
    expect(rows[0].heldForASeat).toBe(false);
  });
});

describe('a held guest is offered no check-in', () => {
  function accepting(awaitingSeat: boolean) {
    const prisma: any = {
      groundParticipant: { findUnique: async () => ({ id: 'p1', groundId: 'sales', email: 'baraka@ouma.co', userId: null, awaitingSeat, inviteToken: 't', inviteTokenExpiresAt: new Date(Date.now() + 86_400_000) }) },
      ground: { findUnique: async () => ({ id: 'sales', organizationId: 'baridi', initiatorId: 'wairimu', status: 'OPEN' }) },
    };
    return new ParticipantsService(prisma, {} as any, {} as any, {} as any);
  }

  it('opening the invitation link, even one the lead copied, is refused in a sentence, and nothing is made', async () => {
    await expect(accepting(true).accept('t')).rejects.toThrow(HELD_FOR_A_SEAT);
    expect(HELD_FOR_A_SEAT).toBe('This check-in cannot start for you yet, because there is no seat for you on the plan. You will get your invitation as soon as there is one.');
  });

  it('one with a seat is not stopped by this', async () => {
    await expect(accepting(false).accept('t')).rejects.not.toThrow(HELD_FOR_A_SEAT);
  });

  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  it('no held row is ever linked to an account by address, so no list (Today, the check-ins) shows it', () => {
    const auth = strip(readFileSync(join(__dirname, '..', 'auth', 'auth.service.ts'), 'utf8'));
    const heals = auth.match(/groundParticipant\.updateMany\(\{\s*where: \{ email: [^}]*userId: null[^}]*\}/g) ?? [];
    expect(heals.length).toBeGreaterThanOrEqual(5);
    for (const h of heals) expect(h).toContain('awaitingSeat: false');
    /* And none on a check-in still waiting for an admin to accept it (known issue B5): that person is invited by the approval. */
    for (const h of heals) expect(h).toContain("ground: { status: { not: 'AWAITING_APPROVAL'");
    const grounds = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.service.ts'), 'utf8'));
    expect(grounds).toContain("where: { email: userEmail.toLowerCase(), userId: null, awaitingSeat: false, ground: { status: { not: GroundStatus.AWAITING_APPROVAL } } },");
  });

  it('and adding writes the guest held exactly when there is no seat, and releasing clears it', () => {
    const grounds = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.service.ts'), 'utf8'));
    /* One place now writes where somebody stands once added, a guest included (theirPlaceHereOnceAdded, 26 November 2026). */
    expect(grounds).toContain('await theirPlaceHereOnceAdded(this.prisma as any, ground.organizationId, dto.email, { name: colleagueName ?? dto.displayName ?? null, held: !waitingForASeat.room,');
    expect(grounds).toMatch(/where: \{ organizationId, heldForASeat: true, user: \{ email: w\.email\.toLowerCase\(\) \} \},\s*data: \{ heldForASeat: false \},/);
  });
});

describe('the invitation page of a held guest (U.4 third review)', () => {
  it('the lookup says they are held, and carries nothing else: no inviter, no part, no check-in', async () => {
    const prisma: any = {
      groundParticipant: { findUnique: async () => ({ id: 'p1', groundId: 'sales', email: 'baraka@ouma.co', userId: null, awaitingSeat: true, roleAsDescribed: 'Agent, Mombasa', inviteToken: 't', inviteTokenExpiresAt: new Date(Date.now() + 86_400_000) }) },
      ground: { findUnique: async () => { throw new Error('the check-in must not be read for a held guest'); } },
    };
    const answer = await new ParticipantsService(prisma, {} as any, {} as any, {} as any).preview('t');
    expect(answer).toEqual({ heldForASeat: true, saying: HELD_FOR_A_SEAT });
  });
});
