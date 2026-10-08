import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { CheckInStatus, GroundStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';

/**
 * PAUSING A GROUND DID NOT STOP ANYONE ALREADY TYPING IN IT.
 *
 * `open()` has always refused to START a check-in on a ground that is paused, closed or stalled.
 * `sendMessage()` never asked - its entire 86-line body contained no reference to the ground's status
 * at all - so CONTINUING an open session was permitted. Every further turn persisted, was extracted
 * into the record, and reached synthesis and the shared report. Then the guard was added to
 * `sendMessage()`, and the client had already moved to `sendMessageStream()`, which had no guard, so
 * for a while the protected route was the one nobody called.
 *
 * That matters most for PAUSED, whose schema comment states its purpose: "temporarily paused (e.g.
 * active legal proceedings detected)". A hold that keeps accepting answers is not a hold, and a hold
 * that holds on one route and not the other is not one either.
 *
 * So now there is one door, `openTheDoor`, and this spec pins two things: that every route goes
 * through it as its first act (source order, because the defect was the ABSENCE of a call, and
 * absence is what a behavioural test of the happy path cannot see), and then behaviourally that a
 * paused ground refuses on both message routes before anything is written. Comments are stripped
 * first - this repository quotes code verbatim inside its comments.
 */
const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const bodyOf = (name: string, span = 400) => {
  /** Generators are declared `async *name(`; the star is optional so the stream route is covered too. */
  const m = new RegExp(`(private )?async \\*?${name}\\(`).exec(CODE);
  if (!m) throw new Error(`no method named ${name}`);
  return CODE.slice(m.index, m.index + span);
};

/** The first statement of a method body: what runs before anything else can. */
const firstStatementOf = (name: string) => {
  const b = bodyOf(name, 1200);
  /** The body opens at the first brace that ends a line; a return type's `{ type: ... }` does not. */
  const open = b.indexOf('{\n');
  return b.slice(open + 1).trim().split('\n')[0];
};

describe('every door into a session goes through the same door first', () => {
  /* Changed with the guard against two opens at once: `open` is now a wrapper that hands a second open the
     first one's answer, and the work, with the door as its first act, is in `openOnce`. The wrapper is
     keyed by who is asking, so waiting is never a way past the door. */
  it.each(['openOnce', 'complete'])('%s opens the door before anything else', (method) => {
    expect(firstStatementOf(method)).toMatch(/const checkIn = await this\.openTheDoor\(checkInId, (requestingUserId|who)\);/);
  });

  it('open does its work only through openOnce, and is keyed by who is asking', () => {
    const b = bodyOf('open', 900);
    expect(b).toContain('this.openOnce(checkInId, requestingUserId, alreadyWritten)');
    expect(b).toContain('requestingUserId');
    expect(b).toMatch(/const key = `\$\{checkInId\}:/);
  });

  it.each(['sendMessage', 'sendMessageStream'])('%s requires a session already underway before anything else', (method) => {
    /** A message on a NOT_STARTED check-in was a whole session with no meter, because only open() meters. */
    expect(firstStatementOf(method)).toMatch(/const checkIn = await this\.aSessionUnderway\(checkInId, (requestingUserId|who)\);/);
  });

  it('the door checks ownership, then the session, then the ground - in that order', () => {
    /** A stranger is refused for not owning the check-in, not told the ground's state. */
    const door = bodyOf('openTheDoor');
    expect(door.indexOf('loadOwnedOpenCheckIn')).toBeGreaterThan(0);
    expect(door.indexOf('loadOwnedOpenCheckIn')).toBeLessThan(door.indexOf('assertGroundAcceptsInput'));
  });

  it('a session underway is the door plus one question', () => {
    const b = bodyOf('aSessionUnderway');
    expect(b).toMatch(/await this\.openTheDoor\(checkInId, (requestingUserId|who)\)/);
    expect(b).toMatch(/CheckInStatus\.NOT_STARTED/);
  });

  it('nothing but open() flips a check-in to IN_PROGRESS', () => {
    /** The two message routes used to do this themselves, which is what made the free session possible. */
    const flips = CODE.match(/status: CheckInStatus\.IN_PROGRESS, startedAt: new Date\(\)/g) ?? [];
    expect(flips).toHaveLength(1);
  });

  it('the door does not meter - metering stays in open(), after its idempotency guard', () => {
    expect(bodyOf('openTheDoor', 600)).not.toMatch(/canStartSession|sessionsBalance/);
    expect(bodyOf('aSessionUnderway', 600)).not.toMatch(/canStartSession|sessionsBalance/);
    expect(bodyOf('open', 12000)).toMatch(/canStartSession/);
  });
});

describe('the guard refuses what it should and says which state it is in', () => {
  const g = CODE.slice(CODE.indexOf('private async assertGroundAcceptsInput'));
  const guard = g.slice(0, g.indexOf('private async openTheDoor('));

  it('a paused ground gets a message about a hold, not a generic refusal', () => {
    /** "No longer accepting check-ins" tells a person nothing about whether to wait or give up. */
    expect(guard).toMatch(/GroundStatus\.PAUSED/);
    expect(guard).toMatch(/on hold/);
  });

  it('anything else non-open is refused as closed', () => {
    expect(guard).toMatch(/is closed\. Nothing further can be added/);
  });

  it('the four open states are permitted', () => {
    for (const st of ['OPEN', 'AWAITING_PARTIES', 'ACTIVE', 'REPORT_READY']) {
      expect(guard).toContain(`GroundStatus.${st}`);
    }
  });

  it('it selects status itself, so no caller can drop it', () => {
    expect(guard).toMatch(/select: \{ status: true \}/);
  });

  it('an unreadable status does not masquerade as closed, and is now logged when the row exists', () => {
    expect(guard).toMatch(/if \(!ground\?\.status\) return;/);
    expect(guard).toMatch(/logger\.error\(`Ground \$\{groundId\} exists but has no readable status/);
  });
});

describe('behaviourally: a paused ground refuses on the route people actually use', () => {
  const service = (groundStatus: GroundStatus, checkInStatus: CheckInStatus) => {
    const prisma: any = {
      checkIn: {
        findUnique: jest.fn(async () => ({
          id: 'ci', groundId: 'g', participantId: 'p', status: checkInStatus, sessionNumber: 1,
          participant: { id: 'p', userId: 'me', email: 'me@x.y', user: { awaitingOrgApproval: false, firstName: 'Me' } },
        })),
        update: jest.fn(),
      },
      ground: { findUnique: jest.fn(async () => ({ status: groundStatus })) },
      conversationTurn: { findMany: jest.fn(async () => []), create: jest.fn(), findFirst: jest.fn(async () => null) },
    };
    const svc = new ConversationService(prisma, {} as any, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any, {} as any, { get: () => undefined } as any);
    return { svc, prisma };
  };

  const drain = async (gen: AsyncGenerator<any>) => { for await (const _ of gen) { /* refused before the first yield */ } };

  it('sendMessageStream on a PAUSED ground says it is on hold and writes nothing', async () => {
    const { svc, prisma } = service(GroundStatus.PAUSED, CheckInStatus.IN_PROGRESS);
    await expect(drain(svc.sendMessageStream('ci', 'me', 'hello'))).rejects.toThrow(/on hold/);
    expect(prisma.conversationTurn.create).not.toHaveBeenCalled();
  });

  it('sendMessage on a PAUSED ground says the same', async () => {
    const { svc, prisma } = service(GroundStatus.PAUSED, CheckInStatus.IN_PROGRESS);
    await expect(svc.sendMessage('ci', 'me', 'hello')).rejects.toThrow(/on hold/);
    expect(prisma.conversationTurn.create).not.toHaveBeenCalled();
  });

  it.each(['sendMessage', 'sendMessageStream'] as const)('%s on a NOT_STARTED check-in is refused rather than run for free', async (route) => {
    const { svc, prisma } = service(GroundStatus.ACTIVE, CheckInStatus.NOT_STARTED);
    const call = route === 'sendMessage' ? svc.sendMessage('ci', 'me', 'hello') : drain(svc.sendMessageStream('ci', 'me', 'hello'));
    await expect(call).rejects.toThrow(BadRequestException);
    await expect(route === 'sendMessage' ? svc.sendMessage('ci', 'me', 'hello') : drain(svc.sendMessageStream('ci', 'me', 'hello'))).rejects.toThrow(/not been opened/);
    expect(prisma.conversationTurn.create).not.toHaveBeenCalled();
    expect(prisma.checkIn.update).not.toHaveBeenCalled();
  });

  it('a stranger is refused for not owning the check-in, before the ground is even read', async () => {
    const { svc, prisma } = service(GroundStatus.PAUSED, CheckInStatus.IN_PROGRESS);
    await expect(svc.sendMessage('ci', 'somebody-else', 'hello')).rejects.toThrow(/does not belong to you/);
    expect(prisma.ground.findUnique).not.toHaveBeenCalled();
  });
});
