import { attentionFor, ATTENTION_MEANS, NEVER_RETURNED, Finding } from './where-a-finding-came-from';

const f = (o: Partial<Finding> = {}): Finding => ({
  kind: 'blocker', provenance: 'participant_proposed', says: 'something is waiting',
  permalink: 'https://app/x', ...o,
});

describe('four sources, kept apart', () => {
  it('an inference never asks a chief executive to decide on its own', () => {
    /*
     * Asking somebody to decide on the strength of a pattern Groundwork noticed, with nobody having
     * confirmed it, is how a feed becomes the thing people stop opening.
     */
    expect(attentionFor(f({ kind: 'decision_required', provenance: 'groundwork_inferred' })))
      .toBe('needs_clarification');
    expect(attentionFor(f({ kind: 'decision_required', provenance: 'participants_agreed' })))
      .toBe('decision_required');
  });

  it('and a proposed objective change reaches a decision when a person proposed it', () => {
    expect(attentionFor(f({ kind: 'objective_change_proposed', provenance: 'participant_proposed' })))
      .toBe('decision_required');
  });

  it('a divergence is a conversation, not a decision', () => {
    expect(attentionFor(f({ kind: 'divergence' }))).toBe('needs_clarification');
    expect(attentionFor(f({ kind: 'responsibility_unclear' }))).toBe('needs_clarification');
  });

  it('a blocker is worth knowing, not worth interrupting for', () => {
    expect(attentionFor(f({ kind: 'blocker' }))).toBe('watch');
  });

  it('and the rest need nobody', () => {
    expect(attentionFor(f({ kind: 'commitment' }))).toBe('none');
  });
});

describe('buckets, never a score', () => {
  it('every bucket is a situation, not a person', () => {
    /* The codebase refuses scores, streaks and rankings everywhere else. A management feed is the
       easiest place to reintroduce them with a friendlier name. */
    for (const words of Object.values(ATTENTION_MEANS)) {
      /* Word boundaries: the first version matched "he" inside "here" and failed on
         "Nothing here needs you", which is a false positive about a sentence that is fine. */
      expect(words).not.toMatch(/\b(they|he|she|performance|score)\b|behind on/i);
    }
    expect(ATTENTION_MEANS.decision_required).toMatch(/authority to decide/);
  });
});

describe('what may never come back', () => {
  it('the same list the webhooks are held to', () => {
    for (const word of ['transcript', 'quote', 'testimony', 'verdict', 'score']) {
      expect(NEVER_RETURNED).toContain(word as any);
    }
  });

  it('and the shape has nowhere to put a name', () => {
    /* peopleInvolved is a count. Which people is attributed testimony, and this lands in the
       customer's own panel where their whole company can read it. */
    const keys = Object.keys(f({ peopleInvolved: 3 }));
    expect(keys).toContain('peopleInvolved');
    for (const k of keys) expect(k).not.toMatch(/name|who|said|by$/i);
  });
});
