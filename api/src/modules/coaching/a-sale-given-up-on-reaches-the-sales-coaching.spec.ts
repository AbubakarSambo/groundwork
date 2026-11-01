import { theBehavioursAnybodyCanBeRead } from '../board/a-role-nobody-mapped-is-still-a-person';
import { aFunctionThatMayBeUsed, theStatedRole } from '../board/function-detection';
import { buildRoleProbeBlock, roleMapFor, RoleFunction } from '../board/role-maps';
import { ConversationService } from '../conversation/conversation.service';

/**
 * A SALE GIVEN UP ON REACHES THE SALES COACHING (production check-in, 15 October 2026).
 *
 * A sales executive on a daily "Pulse check", over WhatsApp: "No sales closed", "The client didn't want
 * the product", the approved discount never offered, "I am shutting it down", finish. The sales map has
 * the behaviours for exactly this - "Avoids the deal that has gone wrong rather than reopening it",
 * "Discounts early to keep a deal warm" and their pairs - and none of it was used, for three reasons
 * found by running the same check-in locally:
 *
 *   1. The read on every turn took the role from the lead's description only. Her role was in her own
 *      job title ("Sales executive"), so the turn-by-turn read had nothing: no sales questions, and no
 *      "It sounds like most of your work is sales. Is that right?" in her first check-in.
 *   2. The coach read the sales behaviours only at 0.5 and above. A title alone is 0.4, held there on
 *      purpose until the role is confirmed (decision 57, item 5) - and a confirmed role was then ignored,
 *      so confirming changed nothing.
 *   3. The coach ran beside the role read and the confirmation, so in the check-in where she confirmed,
 *      which behaviours it read depended on which finished first.
 *
 * Nothing about WHEN a step is offered changes: still one step, still only after the same thing is
 * seen in two distinct periods, still never the thing they asked for themselves.
 */

const SALES = roleMapFor(RoleFunction.SALES)!;
const REOPEN = 'Avoids the deal that has gone wrong rather than reopening it';

describe('the stated role is the same for every read', () => {
  it('uses the lead\'s words and the person\'s own title together', () => {
    expect(theStatedRole(null, 'Sales executive')).toBe('Sales executive');
    expect(theStatedRole('runs the Westlands accounts', 'Sales executive')).toBe('runs the Westlands accounts. Sales executive');
    expect(theStatedRole('  ', null)).toBeNull();
  });
});

describe('a confirmed role is used (decision 57, item 5)', () => {
  it('a guess below the line is not used until somebody confirms it', () => {
    expect(aFunctionThatMayBeUsed({ fn: RoleFunction.SALES, confidence: 0.4 }, null)).toBe(false);
    expect(aFunctionThatMayBeUsed({ fn: RoleFunction.SALES, confidence: 0.4 }, new Date())).toBe(true);
  });
  it('a confident read is used as before, and no function is never used', () => {
    expect(aFunctionThatMayBeUsed({ fn: RoleFunction.SALES, confidence: 0.6 }, null)).toBe(true);
    expect(aFunctionThatMayBeUsed({ fn: null, confidence: 0.9 }, new Date())).toBe(false);
  });
});

function aService(o: { jobTitle?: string | null; confirmedAt?: Date | null; confidence?: number } = {}) {
  const upserts: any[] = [];
  const prisma: any = {
    groundParticipant: {
      findUnique: jest.fn(async (a: any) => {
        if (a?.select?.user) return { user: { jobTitle: o.jobTitle ?? null } };
        return {
          detectedFunction: RoleFunction.SALES, detectedFunctionConfidence: o.confidence ?? 0.4,
          detectedFunctionConfirmedAt: o.confirmedAt ?? null, joinedAt: null, leftAt: null, leavePeriods: null,
        };
      }),
    },
    conversationTurn: {
      findMany: jest.fn(async () => [
        { role: 'AI', content: 'What are the one or two things you are working to right now?' },
        { role: 'PERSON', content: 'No sales closed' },
        { role: 'AI', content: 'Was this after a discount was approved, or before?' },
        { role: 'PERSON', content: 'Before' },
        { role: 'PERSON', content: 'That I am shutting it down' },
      ]),
    },
    coachingState: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async (a: any) => { upserts.push(a); return a.create; }),
    },
  };
  const anthropic: any = { extract: jest.fn(async () => ({ index: SALES.failureSignals!.indexOf(REOPEN), reason: 'They stopped on the first no, before the approved discount was offered.', lastStepOutcome: null })) };
  const service = new ConversationService(
    prisma, {} as any, anthropic, {} as any,
    { emit: () => Promise.resolve() } as any, {} as any, {} as any, {} as any, {} as any,
    { get: jest.fn(() => true) } as any,
  );
  return { service, prisma, anthropic, upserts };
}

describe('the read on every turn knows a sales executive does sales', () => {
  it('reads the role from their own job title when the lead wrote nothing about them', async () => {
    const { service } = aService({ jobTitle: 'Sales executive' });
    const read = await (service as any).roleReadForThisTurn(
      { id: 'ci1', participantId: 'p1', participant: { id: 'p1', roleAsDescribed: null, detectedFunction: null, detectedFunctionConfidence: null } },
      'No sales closed',
    );
    expect(read.fn).toBe(RoleFunction.SALES);
    /* And so the turn carries the sales questions, among them the one for a deal that stopped. */
    const block = buildRoleProbeBlock(read.fn, read.confidence, read.modes);
    expect(block).toContain(SALES.label);
    expect(block).toContain('It went quiet, then what did you try?');
  });

  it('and on the first open, so the role confirmation can be asked in the first check-in', async () => {
    const { service, prisma } = aService({ jobTitle: 'Sales executive' });
    prisma.groundParticipant.update = jest.fn(async () => ({}));
    const p = { id: 'p1', roleAsDescribed: null, detectedFunction: null, detectedFunctionConfidence: null };
    await (service as any).provisionalFunctionFromTheStatedRole(p);
    expect(prisma.groundParticipant.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ detectedFunction: RoleFunction.SALES, detectedFunctionConfidence: 0.4 }),
    }));
  });
});

describe('the coach reads a confirmed sales role against the sales behaviours', () => {
  const handed = (anthropic: any) => (anthropic.extract as jest.Mock).mock.calls[0]?.[1]?.[0]?.content ?? '';

  it('confirmed: the sales behaviours, and what was noticed is kept for the next period', async () => {
    const { service, anthropic, upserts } = aService({ confirmedAt: new Date('2026-10-15T09:00:00Z') });
    await (service as any).observeForCoaching('ci1', 'p1', 1);
    expect(handed(anthropic)).toContain(REOPEN);
    expect(upserts[0].create.observations).toEqual([expect.objectContaining({ noticed: REOPEN })]);
    /* Seen once is not a pattern: no step yet, exactly as before. */
    expect(upserts[0].create.currentStep).toBeNull();
    expect(upserts[0].create.lastInput.why ?? null).toBeNull();
  });

  it('not confirmed: still the floor, never a guessed job', async () => {
    const { service, anthropic, upserts } = aService({ confirmedAt: null });
    await (service as any).observeForCoaching('ci1', 'p1', 1);
    expect(handed(anthropic)).not.toContain(REOPEN);
    for (const line of theBehavioursAnybodyCanBeRead()) expect(handed(anthropic)).toContain(line);
    expect(upserts[0].create.lastInput.why).toMatch(/below 0.5 and not confirmed/);
  });
});

describe('the coach runs after the role is read and any confirmation is stamped', () => {
  it('waits for both, so a role confirmed in this check-in is the one the coach reads', async () => {
    const checkIn = {
      id: 'ci1', groundId: 'g1', sessionNumber: 1, status: 'IN_PROGRESS',
      isSelfCorrection: true, participantId: 'p1',
      participant: { userId: 'user1', email: 'p@example.test' },
    };
    const prisma: any = {
      roundCompletion: { create: jest.fn(async (a: any) => a.data) },
      groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]) },
      checkIn: {
        count: jest.fn(async () => 1),
        findUnique: jest.fn(async () => checkIn),
        update: jest.fn(async () => ({ status: 'COMPLETED', groundId: 'g1' })),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      ground: {
        findUnique: jest.fn(async () => ({ status: 'ACTIVE', organizationId: 'org1', isFreeGround: false })),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      conversationTurn: {
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => [{ role: 'PERSON', content: 'Yes, my work is sales.' }]),
        create: jest.fn(async ({ data }: any) => ({ content: data.content })),
      },
    };
    const service = new ConversationService(
      prisma, {} as any, { respond: jest.fn(async () => 'x') } as any, {} as any,
      { emit: jest.fn() } as any, {} as any, { canStartSession: jest.fn() } as any, {} as any,
      { emit: jest.fn(() => Promise.resolve()) } as any, { get: jest.fn(() => true) } as any,
    );
    /* (1 November 2026: the coach now also waits for the conversation's assessment, stubbed here like the other readers.) */
    for (const m of ['theEndCardAtTheEnd', 'buildSoloArtifact', 'ensureNextSession', 'extractDependencies', 'extractWorkMentions']) {
      jest.spyOn(service as any, m).mockResolvedValue(undefined);
    }
    const order: string[] = [];
    const later = (name: string, ms: number) => () => new Promise<void>((r) => setTimeout(() => { order.push(name); r(); }, ms));
    jest.spyOn(service as any, 'reviseDetectedFunction').mockImplementation(later('role read', 20));
    /* The role is read from their lines, so it runs inside the assessment's readers once the record is written from it (one source,
       part 2; readTheLinesJustWritten). The assessment is stubbed to run it there, as it does. */
    jest.spyOn(service as any, 'assessAndThenRead').mockImplementation(async () => { await (service as any).reviseDetectedFunction('p1'); });
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'conversation', 'conversation.service.ts'), 'utf8');
    expect(src.slice(src.indexOf('private async readTheLinesJustWritten('), src.indexOf('ONE SESSION FINISHES ONCE.'))).toMatch(/this\.reviseDetectedFunction\(checkIn\.participantId\)/);
    jest.spyOn(service as any, 'extractRoleConfirmation').mockImplementation(later('confirmation stamped', 40));
    const coached = new Promise<void>((resolve) => {
      jest.spyOn(service as any, 'observeForCoaching').mockImplementation(async () => { order.push('coach'); resolve(); });
    });
    await service.complete('ci1', 'user1');
    await coached;
    expect(order).toEqual(['role read', 'confirmation stamped', 'coach']);
  });
});
