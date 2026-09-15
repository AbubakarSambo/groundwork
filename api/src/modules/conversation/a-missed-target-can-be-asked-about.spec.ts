/**
 * THE REASON REACHES THE ONE SESSION THAT NEEDS IT.
 *
 * A seeded objective carried its text, target and measure, so the session facing
 * a shortfall could only ask about the gap. Asking somebody about a gap invites
 * an account of themselves; asking whether the reason for the number still holds
 * is a question about the target, is answerable, and is what anybody reading the
 * record afterwards actually needs.
 */
import { buildIntakeBlock } from './prompt-library';

const base = {
  text: 'Ten companies onboarded',
  authoredBy: 'lovedida',
  seenBySubject: true,
  authoredByThem: false,
  fromTheirSystem: true,
  kind: 'TARGET' as const,
};

const blockFor = (personObjectives: unknown[]) =>
  JSON.stringify(
    buildIntakeBlock({
      scenario: 'DELIVERY_PUSH',
      sessionNumber: 2,
      personObjectives,
    } as never),
  );

describe('an objective that carries its reason', () => {
  it('puts the reason in front of the interview', () => {
    const block = blockFor([
      { ...base, whyThisNumber: 'Ten is what the pipeline can carry this quarter.' },
    ]);
    expect(block).toContain('Ten is what the pipeline can carry this quarter.');
  });

  it('tells it to ask whether the reason holds, not why the person is behind', () => {
    const block = blockFor([{ ...base, whyThisNumber: 'The pipeline can carry ten.' }]);
    expect(block).toContain('still holds');
    expect(block).toContain('rather than asking why they are behind');
  });

  it('and never presents the reason as something the person agreed to', () => {
    /* Stating a reason must not quietly turn an unseen target into an accepted
       one. The fairness rule is decided by seenBySubject and nothing else. */
    const block = blockFor([
      { ...base, seenBySubject: false, whyThisNumber: 'The pipeline can carry ten.' },
    ]);
    expect(block).toContain('Do not present the reason as something they agreed to');
    /* Capital R since the sentence moved: the branch before it no longer ends mid-clause, because
       "show it to them" became "it is on screen above this conversation". Same rule. */
    expect(block).toContain('Read nothing against it this session');
  });

  it('and says nothing at all when no reason was ever recorded', () => {
    /* Most objectives have none. A sentence about a missing reason would be
       noise in every prompt that does not need it. */
    const block = blockFor([{ ...base, whyThisNumber: null }]);
    expect(block).not.toContain('the reason given for the number');
  });
});
