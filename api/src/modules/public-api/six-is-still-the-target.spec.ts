import { ProposedChangeState } from '@prisma/client';
import { describePending, textAfter, isOpen, PENDING_RULE } from './six-is-still-the-target';

const NOW = new Date('2026-11-20T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const pending = (o: any = {}) => ({
  proposedText: 'Bring in four paying clients during Q4',
  reason: 'the onboarding launch slipped', approverExternalId: 'lv-hafsah',
  proposedByExternalId: 'lv-sahar', createdAt: daysAgo(3), ...o,
});

describe('both numbers, and the current one first', () => {
  it('says what still holds before what has been asked for', () => {
    /*
     * Reversed, a reader skims it as though the change has happened - which is the failure the whole
     * model exists to prevent, reintroduced in the wording.
     */
    const said = describePending('Bring in six paying clients during Q4', pending(), NOW);
    expect(said.indexOf('STILL AGREED')).toBeLessThan(said.indexOf('PROPOSED, NOT YET AGREED'));
    expect(said).toMatch(/STILL AGREED: Bring in six/);
    expect(said).toMatch(/PROPOSED, NOT YET AGREED: Bring in four/);
  });

  it('carries the reason, which is the part an approver needs and the part most often lost', () => {
    expect(describePending('six', pending(), NOW)).toMatch(/Reason given: the onboarding launch slipped/);
  });

  it('and says who is waiting and how long', () => {
    expect(describePending('six', pending({ createdAt: daysAgo(3) }), NOW)).toMatch(/Waiting on lv-hafsah to decide, for 3 days/);
    expect(describePending('six', pending({ createdAt: NOW }), NOW)).toMatch(/decide, today/);
  });
});

describe('what the interview is told to do with it', () => {
  it('treat the agreed one as in force', () => {
    expect(PENDING_RULE).toMatch(/Treat what is STILL AGREED as the thing in force/);
    expect(PENDING_RULE).toMatch(/Never speak as though the proposed version has been accepted/);
  });

  it('and not make somebody re-argue a case they have already made', () => {
    /* The reason is recorded. Asking for it again is the product not reading its own notes. */
    expect(PENDING_RULE).toMatch(/never ask them to justify a change that has already been explained/);
  });

  it('and let them withdraw it', () => {
    expect(PENDING_RULE).toMatch(/given up on the change or no longer want it/);
  });
});

describe('what approval actually changes', () => {
  it('only approval moves the agreement', () => {
    expect(textAfter(ProposedChangeState.APPROVED, 'six', 'four')).toBe('four');
  });

  it('and rejection leaves it exactly as it was', () => {
    /* The agreement was never suspended, so there is nothing to restore. */
    for (const s of [ProposedChangeState.REJECTED, ProposedChangeState.SUPERSEDED,
      ProposedChangeState.CANCELLED, ProposedChangeState.AWAITING_APPROVAL]) {
      expect(textAfter(s, 'six', 'four')).toBe('six');
    }
  });

  it('and only one state holds the question open', () => {
    expect(isOpen(ProposedChangeState.AWAITING_APPROVAL)).toBe(true);
    for (const s of [ProposedChangeState.APPROVED, ProposedChangeState.REJECTED,
      ProposedChangeState.SUPERSEDED, ProposedChangeState.CANCELLED]) {
      expect(isOpen(s)).toBe(false);
    }
  });
});
