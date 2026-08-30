import { ConversationService } from '../conversation/conversation.service';

/**
 * THE COACH CAN SEE WHAT THE PRODUCT HAS ALREADY NOTICED.
 *
 * The behavioural engine has held these all along - a code, a plain-language observation, and a
 * count of consecutive periods before anything surfaces - and the coach could not see any of it. So
 * it met somebody fresh every session while the product had been watching a pattern build for
 * three.
 *
 * The line it must not cross: a pattern says where to look, never what the answer is.
 */
const captured: string[] = [];

const svc = (patterns: any[]) => {
  captured.length = 0;
  const s = Object.create(ConversationService.prototype) as any;
  s.logger = { warn: () => {}, log: () => {} };
  s.anthropic = {
    extract: async (_p: string, msgs: any[]) => { captured.push(msgs[0].content); return { index: null, reason: null, hadSubstance: true }; },
  };
  s.prisma = {
    /* Present and not on leave - `mayCoach` gates on these before anything is asked. */
    groundParticipant: {
      findUnique: async () => ({
        id: 'p1', roleAsDescribed: 'Salesperson', detectedFunction: 'SALES',
        detectedFunctionConfidence: 0.9, joinedAt: new Date('2026-01-01'), leftAt: null, leavePeriods: [],
      }),
    },
    conversationTurn: { findMany: async () => [{ role: 'PERSON', content: 'x'.repeat(200) }] },
    leadContextNote: { findMany: async () => [] },
    patternDetection: { findMany: async () => patterns },
    coachingState: { findUnique: async () => null, upsert: async () => ({}) },
  };
  return s;
};

const surfaced = (over: any = {}) => ({
  observationText: 'Follow-up commitments have repeatedly been deferred.',
  periodsObserved: 3,
  ...over,
});

describe('what reaches the coach', () => {
  it('what has been seen across sessions, in the words the engine wrote', async () => {
    const s = svc([surfaced()]);
    await s.observeForCoaching('ci1', 'p1', 4);
    const asked = captured.join('\n');
    expect(asked).toContain('repeatedly been deferred');
    expect(asked).toContain('across 3 periods');
  });

  it('and nothing at all when nothing has surfaced, which is most people', async () => {
    const s = svc([]);
    await s.observeForCoaching('ci1', 'p1', 4);
    expect(captured.join('\n')).not.toContain('ALREADY BEEN SEEN');
  });

  it('never a pattern with no words on it', async () => {
    const s = svc([surfaced({ observationText: '   ' })]);
    await s.observeForCoaching('ci1', 'p1', 4);
    expect(captured.join('\n')).not.toContain('ALREADY BEEN SEEN');
  });
});

describe('the line it must not cross', () => {
  it('says a pattern is where to look, and never the answer', async () => {
    const s = svc([surfaced()]);
    await s.observeForCoaching('ci1', 'p1', 4);
    const asked = captured.join('\n');
    expect(asked).toContain('ONLY to decide which behaviour');
    expect(asked).toContain('it is never the reason');
    expect(asked).toContain('the answer is still none');
  });

  it('and forbids reading it back as a description of somebody', async () => {
    const s = svc([surfaced()]);
    await s.observeForCoaching('ci1', 'p1', 4);
    expect(captured.join('\n')).toContain('Never repeat it back to');
  });

  it('reads surfaced patterns only, never candidates', async () => {
    /*
     * A candidate is one or two periods of something that may be nothing. Coaching on it would be
     * reading a fortnight as a trait, and the engine's own three-period bar is not lowered here.
     */
    let asked: any = null;
    const s = svc([surfaced()]);
    s.prisma.patternDetection.findMany = async (a: any) => { asked = a; return [surfaced()]; };
    await s.observeForCoaching('ci1', 'p1', 4);
    expect(asked.where.status).toBe('SURFACED');
  });
});
