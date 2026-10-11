import { ConversationService } from './conversation.service';
import { isTheWordFinish, NOT_ENOUGH_YET_TO_FINISH_HERE } from './close-readiness';

/** User journeys F-10: "finish" typed in the app after two answers was read as an answer and met with a question about the word. */
describe('the word finish, typed on its own', () => {
  it('is the command in every plain way of writing it, and nothing else is', () => {
    for (const said of ['finish', 'Finish', 'finish.', ' "finish" ', 'finished']) expect(isTheWordFinish(said)).toBe(true);
    for (const said of ['I will finish the proposal on Friday', 'finish the roof', 'We cannot finish before the 23rd.']) expect(isTheWordFinish(said)).toBe(false);
  });

  const service = (answers: number) => {
    const s = Object.create(ConversationService.prototype) as any;
    s.logger = { log: () => {}, warn: () => {}, error: () => {} };
    s.aSessionUnderway = async () => ({ id: 'c1', groundId: 'g1', participantId: 'p1', isSelfCorrection: false });
    s.theSameAnswerAgain = async () => ({ kind: 'new' });
    const create = jest.fn(async () => ({ id: 't1' }));
    s.prisma = {
      conversationTurn: { count: jest.fn(async () => answers), create },
      ground: { findUnique: async () => ({ scenario: 'OKR_ALIGNMENT' }) },
    };
    return { s, create };
  };

  it('after two answers, is told in one plain sentence, is not kept as an answer, and no model is asked', async () => {
    const { s, create } = service(2);
    s.composeSystemPrompt = jest.fn(async () => { throw new Error('the model must not be reached'); });
    const out = await s.sendMessage('c1', 'u1', 'finish');
    expect(out).toEqual({ reply: 'I need a little more from you before this check-in can close. Please answer one or two more questions, then write "finish" again.', sessionComplete: false });
    expect(out.reply).toBe(NOT_ENOUGH_YET_TO_FINISH_HERE);
    expect(create).not.toHaveBeenCalled();
  });

  it('once there are enough answers, it goes on to the conversation as before', async () => {
    const { s } = service(6);
    s.composeSystemPrompt = jest.fn(async () => { throw new Error('reached the conversation'); });
    await expect(s.sendMessage('c1', 'u1', 'finish')).rejects.toThrow('reached the conversation');
  });
});
