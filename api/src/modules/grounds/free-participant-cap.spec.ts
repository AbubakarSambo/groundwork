import { BadRequestException } from '@nestjs/common';
import { GroundsService } from './grounds.service';

/**
 * #5a: freeParticipantCap was written on ground creation (4 normal, 100
 * broadcast) but never read anywhere - addParticipant() only checked
 * duplicate emails. This locks that a free ground at its cap is blocked,
 * a free ground under its cap is allowed, and a subscribed (non-free)
 * ground is never capped here at all (its own plan-level member cap is a
 * separate, already-enforced dimension via canInviteMember).
 */

/**
 * `org` IS NOW PART OF THIS CAP'S LOGIC, so the mock states it rather than having it tolerated.
 *
 * The check used to ask "was this ground free when created", which is a fact about the past. It now
 * asks "is this org paying", because that is what entitlement means and it changes the moment somebody
 * subscribes. Defaults to unsubscribed, which is the state every existing test in this file assumed.
 */
function makeService(ground: any, existingParticipantCount: number, org: any = { subscriptionPlan: null, subscriptionStatus: null }) {
  const tx: any = {
    groundParticipant: { create: jest.fn(async (args: any) => ({ id: 'new-p', ...args.data })) },
    checkIn: { create: jest.fn(async () => ({})) },
    ground: { update: jest.fn(async () => ({})) },
  };
  const prisma: any = {
    ground: {
      /**
       * The mock has to answer the QUESTION it was asked, not return the same row to
       * everything. `addParticipant` now begins by asking "is this ground waiting for
       * an admin to accept it" - a findFirst with `status: AWAITING_APPROVAL` in its
       * where - and a mock that ignores the where answered yes, so every add was
       * blocked and two cap tests failed on a gate they are not about.
       */
      findFirst: jest.fn(async (args: any) =>
        args?.where?.status === 'AWAITING_APPROVAL' ? null : ground,
      ),
    },
    /**
     * GW-EXP-8 added a second gate before the cap check: nobody is invited into a check-in where
     * nothing has been said about what it is for. These tests are not about that gate, so it is
     * satisfied here by saying the lead has finished their own conversation - which is the ordinary
     * state by the time anybody is being added.
     */
    groundDocument: { count: jest.fn(async () => 0) },
    leadContextNote: { count: jest.fn(async () => 0) },
    /* Adding somebody now asks whether the account has a seat for them - over the cap they are
       added and simply not written to, rather than the lead being refused. See
       added-but-waiting-for-a-seat.ts. These fixtures have room. */
    user: { findUnique: jest.fn(async () => ({ id: 'admin', firstName: 'Admin' })), count: jest.fn(async () => 0) },
    organization: { findUnique: jest.fn(async () => org) },
    groundParticipant: {
      findFirst: jest.fn(async () => null), // no existing participant with this email
      count: jest.fn(async () => existingParticipantCount),
      update: jest.fn(async () => ({})),
      delete: jest.fn(async () => ({})),
    },
    checkIn: { findFirst: jest.fn(async () => null), count: jest.fn(async () => 1) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const email: any = { sendParticipantInvite: jest.fn(async () => ({})) };
  const usage: any = { emit: () => Promise.resolve() };
  return new GroundsService(prisma, email, { /* the seat read: these fixtures have room - see added-but-waiting-for-a-seat.ts */ seatsIncludedFor: async () => null } as any, { emit: () => Promise.resolve() } as any, usage, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );
}

const FREE_GROUND = { id: 'g1', initiatorId: 'admin', label: 'Test', isFreeGround: true, freeParticipantCap: 4, cadence: 'FORTNIGHTLY' };
const PAID_GROUND = { ...FREE_GROUND, isFreeGround: false };

describe('#5a free-tier participant cap is enforced', () => {
  it('blocks adding a participant to a free ground already at its cap', async () => {
    const service = makeService(FREE_GROUND, 4);
    await expect(
      service.addParticipant('g1', 'org1', 'admin', { email: 'new@test.com' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows adding a participant to a free ground under its cap', async () => {
    const service = makeService(FREE_GROUND, 2);
    await expect(
      service.addParticipant('g1', 'org1', 'admin', { email: 'new@test.com' } as any),
    ).resolves.toBeDefined();
  });

  it('does not cap a paid (non-free) ground at all', async () => {
    const service = makeService(PAID_GROUND, 999);
    await expect(
      service.addParticipant('g1', 'org1', 'admin', { email: 'new@test.com' } as any),
    ).resolves.toBeDefined();
  });

  describe('and once the organisation pays', () => {
    const PAYING = { subscriptionPlan: 'GROWTH', subscriptionStatus: 'active' };

    it('a ground opened while free is no longer capped', async () => {
      /**
       * THE BUG THIS FIXES. `isFreeGround` is stamped at creation and never revisited, so it answers
       * "was this ground free when it was made" - a fact about the past. Entitlement is not: it changes
       * the moment somebody pays.
       *
       * The comment at the top of this file already stated the intended rule - "a subscribed org's
       * grounds are unlimited here" - and the code asked the other question. So an org that subscribed
       * after opening a ground kept the free cap on it forever, and the refusal told them to subscribe.
       */
      const service = makeService(FREE_GROUND, 99, PAYING);
      await expect(
        service.addParticipant('g1', 'org1', 'admin', { email: 'new@test.com' } as any),
      ).resolves.toBeDefined();
    });

    it('but a lapsed subscription is capped again, and is not treated as paying', async () => {
      // `isSubscribed` requires a plan AND an active status. Cancelled orgs keep their status history.
      const service = makeService(FREE_GROUND, 99, { subscriptionPlan: null, subscriptionStatus: 'cancelled' });
      await expect(
        service.addParticipant('g1', 'org1', 'admin', { email: 'new@test.com' } as any),
      ).rejects.toThrow(/free plan covers/);
    });

    it('and a wrong-case status does not accidentally buy uncapped grounds', async () => {
      /**
       * The same strictness the billing predicate enforces, checked from here because this is a second
       * entry point into "is this org paying" and the two must not diverge.
       */
      const service = makeService(FREE_GROUND, 99, { subscriptionPlan: 'GROWTH', subscriptionStatus: 'ACTIVE' });
      await expect(
        service.addParticipant('g1', 'org1', 'admin', { email: 'new@test.com' } as any),
      ).rejects.toThrow(/free plan covers/);
    });
  });

  it('and the cap it quotes is the five the pricing page sells', () => {
    /**
     * The column defaulted to 4 while the free plan covered 5, so a free user's first check-in refused
     * the fifth person they had just been promised. Asserted against the schema because the default is
     * what every path that does not pass a cap explicitly will produce.
     */
    // Comments stripped first, per a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts: the
    // schema's own doc comment names both numbers, so an unstripped match would pass on the note that
    // describes the bug rather than on the default that fixes it.
    const schema = require('fs')
      .readFileSync(require('path').join(__dirname, '../../../prisma/schema.prisma'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/\/?.*$/gm, '');
    expect(schema).toMatch(/freeParticipantCap\s+Int\s+@default\(5\)/);
  });
});
