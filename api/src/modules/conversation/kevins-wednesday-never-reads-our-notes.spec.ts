import { withoutTalkAboutTheConversation } from './our-instructions-never-reach-them';
import { ConversationService } from './conversation.service';

/** The one step every reply is saved through, as it ran for Kevin's check-in, with his own words before the reply. */
async function asSaved(reply: string, hisWords: string[]): Promise<string> {
  const service: any = Object.create(ConversationService.prototype);
  service.logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
  service.prisma = { conversationTurn: { findMany: jest.fn(async ({ where }: any) => (where.role === 'PERSON' ? hisWords.map((content) => ({ content })) : [])) } };
  return service.theTurnAsItIsSaved({ id: 'kevin-session-3', participantId: 'a04ea223-8e38-4d0d-9072-a7bd6bf73059', participant: { partyType: 'PARTICIPANT' } }, reply);
}

/**
 * GROUNDWORK'S OWN NOTES REACHED KEVIN ON WHATSAPP (messages test, 19 October, finding 6).
 *
 * Drop Access (test), Kevin Omondi's check-in on Wednesday 14 October. Two replies he read:
 *
 *   14:01 "You've asked about proof for Savannah Cafe for three turns now and you're getting a commitment to a future action, not an
 *          existing one. Let's shift focus. You mentioned visiting Ngong Road Minimart and Kamau Electricals. What happened with Ngong
 *          Road Minimart since your visit?"
 *   14:02 "You named a problem without being asked: that Doing well means hitting your sales targets and making our customers happy has
 *          gone quiet in your reports since you first said it. What is making it harder to report against?"
 *
 * The first is the loop guard's note (ASKED_IT_TWICE_ALREADY) told back in the model's own words, which shares no six-word run with the
 * note, so the copy check let it by. The second says Kevin named a problem when he had just said "She confirmed yesterday, she's taking
 * the 6 units! She'll pay a KES 15,000 deposit on Friday." Every reply is saved through one step; it now also cuts any sentence that talks
 * about the conversation itself (its turns, shifting focus, what kind of answer is being given), and "You named a problem without being
 * asked" where their last words named none.
 */
const FIRST = "You've asked about proof for Savannah Cafe for three turns now and you're getting a commitment to a future action, not an existing one. Let's shift focus. You mentioned visiting Ngong Road Minimart and Kamau Electricals. What happened with Ngong Road Minimart since your visit?";
const SECOND = 'You named a problem without being asked: that Doing well means hitting your sales targets and making our customers happy has gone quiet in your reports since you first said it. What is making it harder to report against?';
const KEVIN_BEFORE_SECOND = "She confirmed yesterday, she's taking the 6 units! She'll pay a KES 15,000 deposit on Friday.";

describe('Kevin never reads our notes on Wednesday 14 October', () => {
  it('the loop guard\'s note, told back in other words, is cut, and the question about Ngong Road Minimart stays', () => {
    const out = withoutTalkAboutTheConversation(FIRST, "She just said yes yesterday. No payment yet, she's sending a deposit on Friday.");
    expect(out.text).toBe('You mentioned visiting Ngong Road Minimart and Kamau Electricals. What happened with Ngong Road Minimart since your visit?');
  });

  it('"You named a problem without being asked" is cut when Kevin had named none', () => {
    const out = withoutTalkAboutTheConversation(SECOND, KEVIN_BEFORE_SECOND);
    expect(out.text).toBe('What is making it harder to report against?');
    expect(out.text).not.toContain('named a problem');
  });

  it('and is kept when the person did name one without being asked', () => {
    const named = 'You named a problem without being asked. That is the kind of honesty that makes this whole thing worth doing. What did you do next?';
    expect(withoutTalkAboutTheConversation(named, "Honestly the samples are late and that's on me, I forgot them.").text).toBe(named);
  });

  it('both, as they are saved and sent to him through the one step every reply goes through', async () => {
    expect(await asSaved(FIRST, ["She just said yes yesterday. No payment yet, she's sending a deposit on Friday."]))
      .toBe('You mentioned visiting Ngong Road Minimart and Kamau Electricals. What happened with Ngong Road Minimart since your visit?');
    expect(await asSaved(SECOND, ["He just said 'next week', didn't specify a day.", KEVIN_BEFORE_SECOND])).toBe('What is making it harder to report against?');
  });

  it('a reply with nothing of ours in it is left exactly as it is', () => {
    const plain = 'Which day next week is Ali expecting to decide?';
    expect(withoutTalkAboutTheConversation(plain, 'He said next week.').text).toBe(plain);
  });
});
