import { ConversationService } from './conversation.service';
import * as closeReadinessModule from './close-readiness';
import { isTheWordFinish, askedToFinish } from './close-readiness';

/**
 * User journeys F-10: "finish" typed in the app after two answers was read as an answer and met with a question about the word.
 * Until 3 November 2026 it was then refused below a floor of answers ("I need a little more from you before this check-in can close").
 * Since then there is no floor (Hafsah: no question limits and no forced close): "finish" is a person asking to finish, at any point.
 */
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

  it('is a person asking to finish', () => {
    for (const said of ['finish', 'Finish', 'finish.']) expect(askedToFinish([said])).toBe(true);
  });

  it('after two answers, it is not refused with a count: it goes on to the conversation, which closes it', async () => {
    const { s } = service(2);
    s.composeSystemPrompt = jest.fn(async () => { throw new Error('reached the conversation'); });
    await expect(s.sendMessage('c1', 'u1', 'finish')).rejects.toThrow('reached the conversation');
  });

  it('after one answer too', async () => {
    const { s } = service(1);
    s.composeSystemPrompt = jest.fn(async () => { throw new Error('reached the conversation'); });
    await expect(s.sendMessage('c1', 'u1', 'finish')).rejects.toThrow('reached the conversation');
  });

  it('no "answer one or two more questions" refusal is left', () => {
    expect(Object.keys(closeReadinessModule)).not.toContain('NOT_ENOUGH_YET_TO_FINISH_HERE');
    expect(Object.keys(closeReadinessModule)).not.toContain('tooFewAnswersToFinish');
  });
});
