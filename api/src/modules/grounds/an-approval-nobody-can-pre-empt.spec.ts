/**
 * READS COMMENTS ON PURPOSE - DO NOT ADD COMMENT-STRIPPING TO THIS FILE.
 *
 * Most source-assertion specs in this repo must strip comments before matching, because this
 * codebase quotes code verbatim inside long explanatory comments and a guard that matches one is
 * satisfied by prose while the code it protects is gone. Sixty-seven specs were changed for exactly
 * that reason.
 *
 * This file is one of seven that are the OPPOSITE case: its job is to hold a comment to account -
 * to fail when the prose starts describing behaviour the code no longer has. Stripping comments here
 * removes the very thing under test.
 */
import { BadRequestException } from '@nestjs/common';
import { GroundStatus } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { GroundsService } from './grounds.service';

/**
 * AN ORG ADMIN ACCEPTS A GROUND BEFORE ANYBODY IS INVITED TO IT. W9-7.
 *
 * Her requirement. The status is the easy half; the invite is the half that decides
 * whether the approval means anything. An invite that has already been sent cannot be
 * recalled by declining afterwards - the person has read it, and has been told their
 * manager wants their account of something.
 *
 * So this pins two things: a member's ground waits, and while it waits nobody can be
 * added to it. An admin's own ground does not wait, because making the approver
 * approve their own work is a step that teaches people to click through steps.
 */
describe('a ground created by somebody who is not an admin', () => {
  function makeService(over: any = {}) {
    const created: any[] = [];
    const tx: any = {
      user: { findUnique: jest.fn(async () => ({ id: 'u1', firstName: 'Mem', organizationId: 'org1' })) },
      ground: {
        create: jest.fn(async (args: any) => { created.push(args.data); return { id: 'g1', ...args.data }; }),
        update: jest.fn(async () => ({})),
      },
      groundParticipant: { create: jest.fn(async () => ({ id: 'p1' })) },
      checkIn: { create: jest.fn(async () => ({ id: 'c1' })) },
    };
    const prisma: any = {
      $transaction: jest.fn(async (fn: any) => fn(tx)),
      ground: {
        findFirst: jest.fn(async (args: any) =>
          args?.where?.status === GroundStatus.AWAITING_APPROVAL ? (over.pending ?? null) : { id: 'g1' },
        ),
        findMany: jest.fn(async () => []),
        update: jest.fn(async (args: any) => ({ id: 'g1', ...args.data })),
      },
      user: { findUnique: jest.fn(async () => ({ email: 'mem@x.test', firstName: 'Mem' })) },
      organization: {
        findUnique: jest.fn(async () => ({
          whoMayOpenCheckIns: over.whoMayOpen ?? 'NAMED_LEADS',
          checkInsNeedApproval: over.needsApproval ?? true,
        })),
      },
      groundParticipant: { findFirst: jest.fn(async () => null), count: jest.fn(async () => 0) },
    };
    const billing: any = { canCreateGround: jest.fn(async () => ({ allowed: true })) };
    const email: any = {
      sendParticipantInvite: jest.fn(async () => ({})),
      sendGroundApproved: jest.fn(async () => ({})),
      sendGroundDeclined: jest.fn(async () => ({})),
    };
    const config: any = { get: () => 'http://localhost:5173' };
    // Order is (prisma, email, billing, events, usage, config). Getting it wrong put
    // the billing stub where email goes and the failure read as a missing method.
    const service = new GroundsService(
      prisma, email, billing, { emit: () => undefined } as any, { emit: async () => undefined } as any, config,
    
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );
    return { service, prisma, email, created };
  }

  const dto: any = { label: 'A ground', scenario: 'NEW_PROJECT', moment: 'Starting' };

  it('waits for an admin to accept it', async () => {
    const { service, created } = makeService();
    await service.create('org1', 'u1', dto, 'LEAD');
    expect(created[0].status).toBe(GroundStatus.AWAITING_APPROVAL);
  });

  /*
   * AND THE TWO THINGS AN ORGANISATION CAN NOW DECIDE FOR ITSELF.
   *
   * "Named leads can open a check-in and get approval. Other people that are not named can't, they
   * can just be part of a check-in. But you can disable these two settings."
   *
   * The gate below is untouched by either: it is the status that changes, and `addParticipant`
   * still refuses while AWAITING_APPROVAL holds.
   */
  it('does not wait when the organisation has turned approval off', async () => {
    const { service, created } = makeService({ needsApproval: false });
    await service.create('org1', 'u1', dto, 'LEAD');
    expect(created[0].status).toBe(GroundStatus.OPEN);
  });

  it('refuses somebody who has not been named, rather than queueing them', async () => {
    /* They are not waiting for approval. They cannot open one at all, and are told they can still
       take part in anybody else's. */
    const { service, created } = makeService();
    await expect(service.create('org1', 'u1', dto, 'MEMBER')).rejects.toThrow(/named/i);
    expect(created).toHaveLength(0);
  });

  it('and lets them through once the organisation opens it to everyone', async () => {
    const { service, created } = makeService({ whoMayOpen: 'EVERYONE' });
    await service.create('org1', 'u1', dto, 'MEMBER');
    expect(created[0].status).toBe(GroundStatus.AWAITING_APPROVAL);
  });

  it('refuses before anything is spent, so a no costs nothing', async () => {
    /* Outside the transaction and before the write: no seat consumed, no free ground spent. */
    const { service, prisma } = makeService();
    await expect(service.create('org1', 'u1', dto, 'MEMBER')).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("and an admin's own ground does not wait", async () => {
    const { service, created } = makeService();
    await service.create('org1', 'u1', dto, 'ADMIN');
    expect(created[0].status).toBe(GroundStatus.OPEN);
  });

  it('a missing role is treated as the weakest one, not as an admin', async () => {
    /*
     * Fail closed. A caller that forgets to pass the role must not accidentally bypass the gate -
     * that is how a guard quietly stops guarding.
     *
     * It used to mean "waits for approval", because waiting was the strictest outcome available.
     * There is a stricter one now, and falling back to MEMBER reaches it: refused outright while
     * the organisation limits opening to its leads.
     */
    const { service, created } = makeService();
    await expect(service.create('org1', 'u1', dto, undefined)).rejects.toThrow(/named/i);
    expect(created).toHaveLength(0);
  });

  it('and still waits, rather than opening, where anybody may open one', async () => {
    /* The original point of the test: a missing role must never read as ADMIN. */
    const { service, created } = makeService({ whoMayOpen: 'EVERYONE' });
    await service.create('org1', 'u1', dto, undefined);
    expect(created[0].status).toBe(GroundStatus.AWAITING_APPROVAL);
  });
});

/*
 * WHILE A GROUND WAITS TO BE ACCEPTED (changed 6 October 2026, known issue B5).
 *
 * Three cases stood here: "nobody can be added to it", "and no invite is sent - which is the whole point", and "the refusal says who
 * has to act". The second is the point of the gate and is kept, in an-invitation-waits-for-the-approval.spec.ts, which also holds the
 * rest. The first and third no longer hold: adding somebody while the check-in waits used to be refused, so a lead who is not an admin
 * lost everybody she had named when she saved. The person is now named and held, with no invitation sent, and invited when an admin
 * accepts. What a lead reads is said there too.
 */

/**
 * THE ENTRY FLOW MUST NOT BE HELD BY ITS OWN GATE.
 *
 * The approval fails closed - no role means AWAITING_APPROVAL - which is right, and it
 * broke the entry chat: `entry.service` calls `grounds.create` and passed no role, so
 * every ground created from the anonymous flow was held pending, `addParticipant`
 * refused, and both contributors were dropped.
 *
 * The person coming out of the entry chat IS the admin of the organisation created for
 * them moments earlier. There is nobody else to approve it, and holding it leaves them
 * looking at a ground that never starts.
 *
 * WHAT THIS IS REALLY GUARDING. The persona suite did catch it - five minutes later,
 * and it reported "expected both the confirmed contributor and the one left in the note
 * box", which reads as the vanish bug and says nothing about an approval. This says it
 * in one second, in the right words.
 */
describe('the entry flow creates a ground that is ready to run', () => {
  const SRC = readFileSync(join(__dirname, '../entry/entry.service.ts'), 'utf8');

  /*
   * AND THE ROLE IS NOW READ RATHER THAN ASSUMED.
   *
   * This used to pin the literal `'ADMIN'`, which was right for the case it was written about and
   * wrong for one nobody had considered: `POST /entry/commit` is authenticated, so anybody already
   * signed in can walk the entry chat. Hardcoding ADMIN meant a member refused at the create page
   * could open a check-in here, with no approval, having skipped both settings.
   *
   * The protection this test exists for is untouched. Somebody coming out of the entry chat as a
   * brand new sign-up IS the admin of the organisation made for them moments earlier, so reading
   * their role returns ADMIN and their ground is not held for an approver who does not exist.
   */
  it('passes the creator\'s real role to grounds.create, not an assumption', () => {
    const call = SRC.slice(SRC.indexOf('this.grounds.create(organizationId, initiatorId, {'));
    const end = call.indexOf(');');
    expect(call.slice(0, end)).toMatch(/\}, role/);
    expect(call.slice(0, end)).not.toMatch(/\}, 'ADMIN'/);
  });

  it('reads it from the row, and treats a missing user as the weakest', () => {
    /* Never the most powerful thing on the account, which is the direction that fails safe. */
    expect(SRC).toMatch(/private async roleOf/);
    expect(SRC).toMatch(/return u\?\.role \?\? 'MEMBER'/);
  });

  it('and asks whether they may open one at all, before either way out', () => {
    /* Two ways out of commit - their own check-in, or a hand-off to a lead - and both create one. */
    expect(SRC).toMatch(/if \(!answer\.may\) throw new ForbiddenException/);
  });
});
