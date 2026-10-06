import { ConversationService } from './conversation.service';
import { TurnRole } from '@prisma/client';
import { ROLE_CONFIRM_ASKED } from '../board/function-detection';

/**
 * READING WHAT THEY SAID, AFTER THE CHECK-IN CLOSES (decision 57, item 5, tightened 30 September
 * 2026). `extractRoleConfirmation` is the post-close read: it only runs when the confirmation
 * question was actually put to them this check-in (found by its own literal text on an AI turn),
 * and it is code, not the model, that decides what happens with the verdict.
 */
const PARTICIPANT = { userId: 'u-femi', detectedFunction: 'SALES', detectedFunctionConfidence: 0.4, detectedFunctionConfirmedAt: null as Date | null };
const QUESTION = 'It sounds like most of your work is sales. Is that right, or would you describe it differently?';

function serviceWith(opts: {
  participant?: Partial<typeof PARTICIPANT> | null;
  turns: { role: TurnRole; content: string; askedFor?: string | null }[];
  extract?: (...args: any[]) => Promise<any>;
}) {
  const groundParticipantUpdate = jest.fn(async () => ({}));
  const userUpdate = jest.fn(async () => ({}));
  const turnUpdate = jest.fn(async () => ({}));
  const s: any = Object.create(ConversationService.prototype);
  s.logger = { warn: () => {}, log: () => {} };
  s.anthropic = { extract: opts.extract ?? (async () => ({ verdict: 'unclear' })) };
  s.prisma = {
    groundParticipant: {
      findUnique: async () => (opts.participant === null ? null : { ...PARTICIPANT, ...opts.participant }),
      update: groundParticipantUpdate,
    },
    user: { update: userUpdate },
    conversationTurn: {
      findMany: async () =>
        opts.turns.map((t, i) => ({ id: `t${i}`, role: t.role, content: t.content, askedFor: t.askedFor ?? null })),
      update: turnUpdate,
    },
  };
  return { s, groundParticipantUpdate, userUpdate, turnUpdate };
}

describe('extractRoleConfirmation: runs only when the question was actually asked this check-in', () => {
  it('does nothing when the confirmation question never appeared on an AI turn', async () => {
    const { s, groundParticipantUpdate, userUpdate, turnUpdate } = serviceWith({
      turns: [{ role: TurnRole.AI, content: 'How did the week go?' }, { role: TurnRole.PERSON, content: 'Fine.' }],
    });
    await s.extractRoleConfirmation({ id: 'ci1', participantId: 'p1' });
    expect(groundParticipantUpdate).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
    expect(turnUpdate).not.toHaveBeenCalled();
  });

  it('does nothing when the function is already confirmed', async () => {
    const { s, groundParticipantUpdate } = serviceWith({
      participant: { detectedFunctionConfirmedAt: new Date() },
      turns: [{ role: TurnRole.AI, content: QUESTION }, { role: TurnRole.PERSON, content: 'Yes, that\'s right.' }],
    });
    await s.extractRoleConfirmation({ id: 'ci1', participantId: 'p1' });
    expect(groundParticipantUpdate).not.toHaveBeenCalled();
  });
});

describe('extractRoleConfirmation: a clear "yes" stamps confirmed_at/by, nothing else', () => {
  it('stamps the confirmation, and never touches the person\'s job title', async () => {
    const { s, groundParticipantUpdate, userUpdate } = serviceWith({
      turns: [{ role: TurnRole.AI, content: QUESTION }, { role: TurnRole.PERSON, content: 'Yes, that\'s right.' }],
      extract: async () => ({ verdict: 'confirmed' }),
    });
    await s.extractRoleConfirmation({ id: 'ci1', participantId: 'p1' });
    expect(groundParticipantUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ detectedFunctionConfirmedBy: 'u-femi' }),
    }));
    expect(userUpdate).not.toHaveBeenCalled();
  });
});

describe('extractRoleConfirmation: a different description sets their OWN role, never roleAsDescribed', () => {
  it('writes to the person\'s own job title and stamps confirmation, from their own words', async () => {
    const { s, groundParticipantUpdate, userUpdate } = serviceWith({
      turns: [{ role: TurnRole.AI, content: QUESTION }, { role: TurnRole.PERSON, content: 'I\'d say I mostly do project management.' }],
      extract: async () => ({ verdict: 'corrected', correctedRole: 'Project management' }),
    });
    await s.extractRoleConfirmation({ id: 'ci1', participantId: 'p1' });
    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 'u-femi' }, data: { jobTitle: 'Project management' } });
    expect(groundParticipantUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ detectedFunctionConfirmedBy: 'u-femi' }),
    }));
    // Never the lead's private field.
    const gpCall: any = (groundParticipantUpdate.mock.calls as any[])[0]?.[0];
    expect(gpCall?.data?.roleAsDescribed).toBeUndefined();
  });
});

describe('extractRoleConfirmation: no clear answer stamps nothing about the person, only that it was asked', () => {
  it('stamps the turn with ROLE_CONFIRM_ASKED and touches nothing else', async () => {
    const { s, groundParticipantUpdate, userUpdate, turnUpdate } = serviceWith({
      turns: [{ role: TurnRole.AI, content: QUESTION }, { role: TurnRole.PERSON, content: 'How is everyone else doing?' }],
      extract: async () => ({ verdict: 'unclear' }),
    });
    await s.extractRoleConfirmation({ id: 'ci1', participantId: 'p1' });
    expect(groundParticipantUpdate).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
    expect(turnUpdate).toHaveBeenCalledWith({ where: { id: 't0' }, data: { askedFor: ROLE_CONFIRM_ASKED } });
  });

  it('also stamps it when the check-in ended right after asking, with no reply at all', async () => {
    const { s, turnUpdate } = serviceWith({
      turns: [{ role: TurnRole.AI, content: QUESTION }],
    });
    await s.extractRoleConfirmation({ id: 'ci1', participantId: 'p1' });
    expect(turnUpdate).toHaveBeenCalledWith({ where: { id: 't0' }, data: { askedFor: ROLE_CONFIRM_ASKED } });
  });

  it('never overwrites a stamp already on the turn for something else', async () => {
    const { s, turnUpdate } = serviceWith({
      turns: [{ role: TurnRole.AI, content: QUESTION, askedFor: 'reads differently:x1' }, { role: TurnRole.PERSON, content: 'not sure' }],
      extract: async () => ({ verdict: 'unclear' }),
    });
    await s.extractRoleConfirmation({ id: 'ci1', participantId: 'p1' });
    expect(turnUpdate).not.toHaveBeenCalled();
  });
});
