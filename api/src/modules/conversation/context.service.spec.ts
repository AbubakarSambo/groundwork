import { ConversationContextService } from './context.service';
import { ALIGNMENT_FEED_ONLY_CODES } from '../patterns/pattern-library';

/**
 * Feed-only codes must never reach a party's own conversation (GW-07). F5/E4
 * (cofounder / founder burden asymmetry) surface to the alignment feed only.
 */
describe('ConversationContextService - feed-only code filtering (GW-07)', () => {
  /*
   * 2 November 2026 (F2, Hafsah's decisions): no stored pattern shapes a person's own conversation any more, so the rule is now
   * kept by construction: the build reads no feed-only code, and none reaches the block, even when the table holds them. This
   * asserted the query's filter; it now asserts the stronger thing, that nothing of those rows reaches the conversation.
   */
  it('never puts a feed-only code, or any stored pattern, into the conversation', async () => {
    const asked: any[] = [];
    const prisma: any = {
      groundParticipant: { findUnique: jest.fn(async () => ({ specificityHistory: [] })) },
      patternDetection: {
        findMany: jest.fn(async (args: any) => {
          asked.push(args.where);
          return [...ALIGNMENT_FEED_ONLY_CODES].map((code) => ({ code, periodsObserved: 9, seenInSessions: [1, 2, 3] }));
        }),
        count: jest.fn(async () => 0),
      },
    };
    const service = new ConversationContextService(prisma);
    const { block } = await service.build({ groundId: 'g1', participantId: 'p1', sessionNumber: 1 });
    expect(asked.filter((w) => w?.code !== undefined)).toEqual([]);
    for (const code of ALIGNMENT_FEED_ONLY_CODES) expect(block).not.toContain(code);
    expect(block).not.toContain('Surface to alignment feed only');
    expect(block).not.toContain('PATTERN_PROBE');
  });
});

/**
 * GW-08: Disclosure detection must short-circuit the contribution-chat flow.
 * GW-37: Cross-reference must not fire on a single generic term.
 */
describe('ConversationContextService - disclosure detection (GW-08) & cross-reference quality (GW-37)', () => {
  function makeService() {
    const prisma: any = {
      groundParticipant: {
        findUnique: jest.fn(async () => ({ specificityHistory: [] })),
        update: jest.fn(async () => ({})),
        findMany: jest.fn(async () => []),
      },
      patternDetection: {
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
      },
      recordEntry: { findMany: jest.fn(async () => []) },
    };
    return new ConversationContextService(prisma);
  }

  it('GW-08: returns DISCLOSURE MODE block for harassment keyword - skips contribution-chat', async () => {
    const service = makeService();
    const { tone, block } = await service.build({
      groundId: 'g1', participantId: 'p1', sessionNumber: 2,
      latestMessage: 'I have been harassed and I do not feel safe.',
    });
    expect(tone).toBe('crisis');
    expect(block).toContain('DISCLOSURE MODE');
    expect(block).not.toContain('CONTRIBUTION CHAT MODE');
  });

  it('GW-08: returns CRISIS block for self-harm language', async () => {
    const service = makeService();
    const { tone, block } = await service.build({
      groundId: 'g1', participantId: 'p1', sessionNumber: 1,
      latestMessage: "I can't go on like this anymore.",
    });
    expect(tone).toBe('crisis');
    expect(block).toContain('CRISIS');
  });

  it('GW-08: legal proceedings message routes to the legal block', async () => {
    const service = makeService();
    const { block } = await service.build({
      groundId: 'g1', participantId: 'p1', sessionNumber: 2,
      latestMessage: 'My attorney has already filed a complaint.',
    });
    expect(block).toContain('LEGAL PROCEEDINGS');
  });

  it('GW-08: ordinary message passes through to contribution-chat mode', async () => {
    const service = makeService();
    const { block } = await service.build({
      groundId: 'g1', participantId: 'p1', sessionNumber: 1,
      latestMessage: 'I shipped the API integration last month.',
    });
    expect(block).toContain('CONTRIBUTION CHAT MODE');
    expect(block).not.toContain('DISCLOSURE MODE');
  });
});

/**
 * Degree-3 invisible-labour cross-reference (GW-DEGREE3-INVISIBLE-LABOUR).
 *
 * A correctly-attributed, already-live mechanism: it searches OTHER grounds in
 * this participant's own org for mentions of THEIR OWN name alongside
 * operational words, and surfaces a probe to THEM specifically when the count
 * is >= 2. Unlike the pattern-detection R3 code (which stores against the
 * credit-giver, not the recipient - see BUILD_TRUTH_5), this mechanism is
 * inherently recipient-correct because it always searches for the current
 * participant's own identity, never anyone else's.
 */
describe('ConversationContextService - Degree-3 invisible labour cross-reference', () => {
  function makePrisma(opts: { crossOrgMentionCount: number; firstName?: string; lastName?: string }) {
    return {
      groundParticipant: {
        findUnique: jest.fn(async (args: any) => {
          if (args.select?.user) {
            return {
              user: { firstName: opts.firstName ?? 'Amara', lastName: opts.lastName ?? 'Okoye' },
              ground: { organizationId: 'org-1' },
            };
          }
          return { specificityHistory: [] };
        }),
        update: jest.fn(async () => ({})),
        findMany: jest.fn(async () => []), // no other parties on this ground - degree-2 does not fire
      },
      recordEntry: {
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => opts.crossOrgMentionCount),
      },
      patternDetection: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    };
  }

  it('surfaces INVISIBLE_LABOUR to the credited person when their name appears >= 2 times elsewhere in the org', async () => {
    const prisma: any = makePrisma({ crossOrgMentionCount: 3 });
    const service = new ConversationContextService(prisma);
    const { block } = await service.build({
      groundId: 'g1', participantId: 'p1', sessionNumber: 2,
      latestMessage: 'We shipped the migration this week.',
    });
    expect(block).toContain('[INVISIBLE_LABOUR | TIER 1]');
    expect(block).toContain('There is work that appears connected to you in the broader record. What specifically did you contribute to that, and does the record here reflect it?');
    // The count itself, and any other party's verbatim words, must never appear.
    expect(block).not.toContain('3');
  });

  it('is absent when the mention count is below the threshold (1 mention)', async () => {
    const prisma: any = makePrisma({ crossOrgMentionCount: 1 });
    const service = new ConversationContextService(prisma);
    const { block } = await service.build({
      groundId: 'g1', participantId: 'p1', sessionNumber: 2,
      latestMessage: 'We shipped the migration this week.',
    });
    expect(block).not.toContain('INVISIBLE_LABOUR');
  });

  it('is absent when the mention count is zero', async () => {
    const prisma: any = makePrisma({ crossOrgMentionCount: 0 });
    const service = new ConversationContextService(prisma);
    const { block } = await service.build({
      groundId: 'g1', participantId: 'p1', sessionNumber: 2,
      latestMessage: 'We shipped the migration this week.',
    });
    expect(block).not.toContain('INVISIBLE_LABOUR');
  });

  it('never fires at session 1, even with a qualifying mention count (crossReference only runs session >= 2)', async () => {
    const prisma: any = makePrisma({ crossOrgMentionCount: 5 });
    const service = new ConversationContextService(prisma);
    const { block } = await service.build({
      groundId: 'g1', participantId: 'p1', sessionNumber: 1,
      latestMessage: 'We shipped the migration this week.',
    });
    expect(block).not.toContain('INVISIBLE_LABOUR');
  });
});
