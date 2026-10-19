import { withoutAConclusionNobodyDrew } from './a-conclusion-nobody-drew-is-never-sent';
import { ConversationService } from './conversation.service';

/** The one step every reply is saved through, as it ran for Brian's check-in, with his own words before the reply. */
async function asSaved(reply: string, hisWords: string[]): Promise<string> {
  const service: any = Object.create(ConversationService.prototype);
  service.logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
  service.prisma = { conversationTurn: { findMany: jest.fn(async ({ where }: any) => (where.role === 'PERSON' ? hisWords.map((content) => ({ content })) : [])) } };
  return service.theTurnAsItIsSaved({ id: 'brian-litigation-session-2', participantId: 'gp-brian', participant: { partyType: 'PARTICIPANT' } }, reply);
}

/**
 * "THAT IT WAS FILED TODAY TELLS ME IT WAS NOT REVIEWED BY WANJIRU" (Hafsah, 19 October, point 3; messages test after the fixes,
 * finding 12). Muchemi & Co. (test), Brian Otieno's WhatsApp check-in in "Litigation team daily", Tuesday 13 October. He said "The reply
 * in Kasarani Foods v. Tumaini Traders was filed today." and read:
 */
const SENT = "Understood. That it was filed today tells me it was not reviewed by Wanjiru. What made it impossible to get Wanjiru's review before filing?";
const HIS_WORDS = ['The reply in Kasarani Foods v. Tumaini Traders was filed today.'];

describe('Brian is never told what nobody said, and never accused', () => {
  it('the conclusion and the question that takes it as given are cut; a plain question is asked instead', () => {
    const out = withoutAConclusionNobodyDrew(SENT, HIS_WORDS, []);
    expect(out.text).toBe('Understood. What else should I know?');
    expect(out.cut).toEqual(['That it was filed today tells me it was not reviewed by Wanjiru.', "What made it impossible to get Wanjiru's review before filing?"]);
  });

  it('as it is saved and sent to him through the one step every reply goes through', async () => {
    const said = await asSaved(SENT, HIS_WORDS);
    expect(said).not.toContain('not reviewed by Wanjiru');
    expect(said).not.toContain('What made it impossible');
  });

  it('what he did say stands: had he said Wanjiru did not review it, the question goes out', () => {
    const his = ["The reply was filed today. Wanjiru didn't review it, there was no time."];
    expect(withoutAConclusionNobodyDrew(SENT, his, []).text).toBe(SENT);
  });

  it('a reply that concludes nothing is left exactly as it is', () => {
    const plain = 'The reply in Kasarani Foods v. Tumaini Traders is filed. Did Wanjiru see it before it went in?';
    expect(withoutAConclusionNobodyDrew(plain, HIS_WORDS, []).text).toBe(plain);
    const fair = 'That means the next fee note can be raised. Who will raise it?';
    expect(withoutAConclusionNobodyDrew(fair, HIS_WORDS, []).text).toBe(fair);
  });
});
