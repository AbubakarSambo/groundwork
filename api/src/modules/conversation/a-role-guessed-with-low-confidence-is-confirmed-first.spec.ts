import { ConversationService } from './conversation.service';

/**
 * A ROLE GUESSED WITH LOW CONFIDENCE IS CONFIRMED BEFORE IT IS USED (decision 57, item 5).
 *
 * `roleConfirmationBlockFor` is the piece that reaches the model's own prompt: below the
 * confirmation threshold (the same MIN_COACHING_CONFIDENCE already used to withhold a role-tuned
 * probe) and not yet confirmed, it tells the model to ask the plain-words question once, this turn.
 */
const svc = (over: { confirmedAt?: Date | null } = {}) => {
  const s = Object.create(ConversationService.prototype) as any;
  s.prisma = {
    groundParticipant: {
      findUnique: async () => ({ detectedFunctionConfirmedAt: over.confirmedAt ?? null }),
    },
  };
  return s as ConversationService;
};

describe('roleConfirmationBlockFor', () => {
  it('asks, in decision 57\'s own plain words, when the read is below the threshold and unconfirmed', async () => {
    const s = svc();
    const block = await (s as any).roleConfirmationBlockFor('p1', 'SALES', 0.4);
    expect(block).toContain('It sounds like most of your work is sales. Is that right, or would you describe it differently?');
  });

  it('adds nothing when there is no guessed function at all', async () => {
    const s = svc();
    expect(await (s as any).roleConfirmationBlockFor('p1', null, 0)).toBe('');
  });

  it('adds nothing once it has already been confirmed', async () => {
    const s = svc({ confirmedAt: new Date() });
    expect(await (s as any).roleConfirmationBlockFor('p1', 'SALES', 0.4)).toBe('');
  });

  it('adds nothing when the read already clears the coaching threshold', async () => {
    const s = svc();
    expect(await (s as any).roleConfirmationBlockFor('p1', 'SALES', 0.6)).toBe('');
  });
});
