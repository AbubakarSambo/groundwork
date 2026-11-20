import { GroundMoment, GroundScenario, PartyType } from '@prisma/client';
import { buildIntakeBlock } from './prompt-library';
import { whatTheModelSaid } from '../assistant/ask-understands-with-the-model';
import { whatICanDoWith } from '../assistant/the-router-is-deterministic';
import { onWhatsApp } from '../assistant/a-check-in-kept-in-the-app-is-not-read-on-whatsapp';

/** Run 9: "Thank you!" got "I cannot answer that one yet" and a menu after finishing, was taken as an answer mid-round, and opened the check-in with no acknowledgement. */
describe('a thank you', () => {
  it('is said to the model as context in every round, first message and mid-round', () => {
    const block = buildIntakeBlock({ scenario: GroundScenario.NEW_HIRE, partyType: PartyType.INITIATOR, sessionNumber: 1, otherPartyCheckedIn: false, groundLabel: 'Lanterns', moment: GroundMoment.STARTING } as any);
    expect(block).toMatch(/COURTESY: If their latest message is only thanks/);
    expect(block).toMatch(/You're welcome/);
    expect(block).toMatch(/not their answer to the question that is open/);
    expect(block).toMatch(/Never offer a menu/);
  });
  it('is a kind the model can read it as, apart from hello', () => {
    expect(whatTheModelSaid({ kind: 'thanks' })?.kind).toBe('thanks');
    expect(whatTheModelSaid({ kind: 'greeting' })?.kind).toBe('greeting');
  });
  it('is never met with a menu or "I cannot answer that one yet" where somebody only says hello on WhatsApp with nothing open', async () => {
    const said = await onWhatsApp(async () => whatICanDoWith('Hello').line);
    expect(said).toBe('Hello. You have no check-in open right now, and I will message you here when the next one opens. You can ask me something in the meantime.');
    expect(whatICanDoWith('Hello').line).toBe('Hello. Ask me something, or pick one of these.');
  });
});
