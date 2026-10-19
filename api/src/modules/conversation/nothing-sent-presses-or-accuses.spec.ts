import { withoutPressingOrAccusing, withOnePossessive } from './nothing-sent-presses-or-accuses';

/**
 * Brian Otieno's WhatsApp check-in, Muchemi & Co. (test), Tuesday 13 October, the turns as they were sent (messages test, fourth run).
 * What the check-in sends never presses him or calls his account doubtful, and never says "Wanjiru's's".
 */
describe("Brian's Tuesday check-in, as it is sent", () => {
  it('"Wanjiru\'s\'s feedback" is sent as "Wanjiru\'s feedback"', () => {
    const t = "That it was filed today moves it forward from being drafted. What part of Wanjiru's's feedback did you incorporate?";
    expect(withoutPressingOrAccusing(t).text).toBe("That it was filed today moves it forward from being drafted. What part of Wanjiru's feedback did you incorporate?");
    expect(withOnePossessive('Wanjiru’s’s review')).toBe('Wanjiru’s review');
  });

  it('"That is unusual." is not sent; the question after it is', () => {
    const r = withoutPressingOrAccusing('That is unusual. What in the situation makes it difficult to get that information?');
    expect(r.text).toBe('What in the situation makes it difficult to get that information?');
  });

  it('"what you cannot explain" and "For the record, what is preventing you from finding out" are not sent, and a plain question goes in their place', () => {
    const r = withoutPressingOrAccusing("Understood. The critical thing the record needs now is what happened that you cannot explain. For the record, what is preventing you from finding out how the reply was filed without Wanjiru's feedback being incorporated?", ['That is unusual. What in the situation makes it difficult to get that information?']);
    expect(r.text).toBe('Understood. What else should I know?');
    expect(r.text).not.toMatch(/cannot explain|preventing you|For the record/);
  });

  it('"That did not happen." is not sent; what follows is', () => {
    expect(withoutPressingOrAccusing('That did not happen. Before we finish, what will you do about this, and by when?').text).toBe('Before we finish, what will you do about this, and by when?');
  });

  it('"For the record," is left off a question that is otherwise plain', () => {
    expect(withoutPressingOrAccusing('For the record, when was the reply filed?').text).toBe('When was the reply filed?');
  });

  it('what is plain stands word for word, and their own quoted words are never read', () => {
    const plain = 'Last time you said the reply for Kasarani Foods v Tumaini Traders was drafted. What has happened with it since then?';
    expect(withoutPressingOrAccusing(plain).text).toBe(plain);
    const quoted = 'You said "That did not happen." about the call. What happened instead?';
    expect(withoutPressingOrAccusing(quoted).text).toBe(quoted);
  });
});

describe('through the one step every reply is saved by', () => {
  it("Brian's Tuesday turns go out without the pressing, and with one 's", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ConversationService } = require('./conversation.service');
    const service: any = Object.create(ConversationService.prototype);
    service.logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
    const his = ['Hi team. The reply in Kasarani Foods v. Tumaini Traders was filed today.', "I'm sorry, I don't know what part of Wanjiru's feedback was incorporated. The reply was filed today.", "I don't have that information right now."];
    service.prisma = { conversationTurn: { findMany: jest.fn(async ({ where }: any) => (where.role === 'PERSON' ? his.map((content) => ({ content })) : [])) } };
    const save = (t: string) => service.theTurnAsItIsSaved({ id: 'brian-litigation-session-2', participantId: 'gp-brian', participant: { partyType: 'PARTICIPANT' } }, t);
    expect(await save("That it was filed today moves it forward from being drafted. What part of Wanjiru's's feedback did you incorporate?")).not.toContain("Wanjiru's's");
    const pressed = await save("Understood. The critical thing the record needs now is what happened that you cannot explain. For the record, what is preventing you from finding out how the reply was filed without Wanjiru's feedback being incorporated?");
    expect(pressed).not.toMatch(/cannot explain|preventing you|For the record/);
    expect(pressed).toMatch(/\?$/);
    expect(await save('That is unusual. What in the situation makes it difficult to get that information?')).not.toContain('unusual');
  });
});
