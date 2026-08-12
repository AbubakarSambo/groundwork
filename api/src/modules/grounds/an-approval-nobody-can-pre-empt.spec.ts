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
    await service.create('org1', 'u1', dto, 'MEMBER');
    expect(created[0].status).toBe(GroundStatus.AWAITING_APPROVAL);
  });

  it("and an admin's own ground does not wait", async () => {
    const { service, created } = makeService();
    await service.create('org1', 'u1', dto, 'ADMIN');
    expect(created[0].status).toBe(GroundStatus.OPEN);
  });

  it('a missing role is treated as needing approval, not as an admin', async () => {
    // Fail closed. A caller that forgets to pass the role must not accidentally
    // bypass the gate - that is how a guard quietly stops guarding.
    const { service, created } = makeService();
    await service.create('org1', 'u1', dto, undefined);
    expect(created[0].status).toBe(GroundStatus.AWAITING_APPROVAL);
  });
});

describe('while a ground is waiting to be accepted', () => {
  function serviceWithPending(pending: any) {
    const prisma: any = {
      ground: {
        findFirst: jest.fn(async (args: any) =>
          args?.where?.status === GroundStatus.AWAITING_APPROVAL ? pending : { id: 'g1', isFreeGround: false },
        ),
      },
      groundParticipant: { findFirst: jest.fn(async () => null), count: jest.fn(async () => 0) },
    };
    const email: any = { sendParticipantInvite: jest.fn(async () => ({})) };
    const service = new GroundsService(
      prisma, email, { canCreateGround: jest.fn() } as any,
      { emit: () => undefined } as any, { emit: async () => undefined } as any, { get: () => '' } as any,
    
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );
    return { service, email };
  }

  it('nobody can be added to it', async () => {
    const { service } = serviceWithPending({ id: 'g1' });
    await expect(
      service.addParticipant('g1', 'org1', 'u1', { email: 'her@x.test' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('and no invite is sent - which is the whole point', async () => {
    // The status alone would be cosmetic. An invite cannot be unsent, so declining
    // after one has gone out is not a decision, it is an apology.
    const { service, email } = serviceWithPending({ id: 'g1' });
    await service.addParticipant('g1', 'org1', 'u1', { email: 'her@x.test' } as any).catch(() => undefined);
    expect(email.sendParticipantInvite).not.toHaveBeenCalled();
  });

  it('the refusal says who has to act, and that nobody has been contacted', async () => {
    const { service } = serviceWithPending({ id: 'g1' });
    await expect(
      service.addParticipant('g1', 'org1', 'u1', { email: 'her@x.test' } as any),
    ).rejects.toThrow(/admin in your organisation to accept it/i);
  });
});

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

  it('passes a role to grounds.create, so it is not held by the pending gate', () => {
    const call = SRC.slice(SRC.indexOf('this.grounds.create(organizationId, initiatorId, {'));
    const end = call.indexOf(');');
    expect(call.slice(0, end)).toMatch(/\}, 'ADMIN'/);
  });

  it('and says why, because the next person will wonder', () => {
    expect(SRC).toMatch(/nobody else to approve it/i);
  });
});
