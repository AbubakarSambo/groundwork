import { ConversationService } from './conversation.service';

/**
 * A ROLE GUESSED WITH LOW CONFIDENCE IS CONFIRMED BEFORE IT IS USED (decision 57, item 5).
 *
 * `roleConfirmationBlockFor` is the piece that reaches the model's own prompt: below the
 * confirmation threshold (the same MIN_COACHING_CONFIDENCE already used to withhold a role-tuned
 * probe) and not yet confirmed, it tells the model to ask the plain-words question once, this turn -
 * unless it was already asked recently and got no clear answer (the cooldown, tightened 30 September
 * 2026 so it is not asked again in every remaining check-in).
 */
const svc = (over: { confirmedAt?: Date | null; recentlyAskedAtSession?: number | null } = {}) => {
  const s = Object.create(ConversationService.prototype) as any;
  s.prisma = {
    groundParticipant: {
      findUnique: async () => ({ detectedFunctionConfirmedAt: over.confirmedAt ?? null }),
    },
    conversationTurn: {
      findFirst: async () =>
        over.recentlyAskedAtSession == null ? null : { checkIn: { sessionNumber: over.recentlyAskedAtSession } },
    },
  };
  return s as ConversationService;
};

describe('roleConfirmationBlockFor', () => {
  it('asks, in decision 57\'s own plain words, when the read is below the threshold and unconfirmed', async () => {
    const s = svc();
    const block = await (s as any).roleConfirmationBlockFor('p1', 'SALES', 0.4, 3);
    expect(block).toContain('It sounds like most of your work is sales. Is that right, or would you describe it differently?');
  });

  it('adds nothing when there is no guessed function at all', async () => {
    const s = svc();
    expect(await (s as any).roleConfirmationBlockFor('p1', null, 0, 3)).toBe('');
  });

  it('adds nothing once it has already been confirmed', async () => {
    const s = svc({ confirmedAt: new Date() });
    expect(await (s as any).roleConfirmationBlockFor('p1', 'SALES', 0.4, 3)).toBe('');
  });

  it('adds nothing when the read already clears the coaching threshold', async () => {
    const s = svc();
    expect(await (s as any).roleConfirmationBlockFor('p1', 'SALES', 0.6, 3)).toBe('');
  });

  it('asked once, not every check-in: says nothing again within the cooldown after an unclear answer', async () => {
    const s = svc({ recentlyAskedAtSession: 2 });
    // Session 3, cooldown is 2 periods, so session 3 (one period after session 2) is still cooling down.
    expect(await (s as any).roleConfirmationBlockFor('p1', 'SALES', 0.4, 3)).toBe('');
  });

  it('asks again once the cooldown has passed', async () => {
    const s = svc({ recentlyAskedAtSession: 1 });
    const block = await (s as any).roleConfirmationBlockFor('p1', 'SALES', 0.4, 3);
    expect(block).toContain('Is that right, or would you describe it differently?');
  });
});
