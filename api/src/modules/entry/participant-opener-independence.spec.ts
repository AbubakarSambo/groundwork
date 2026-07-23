import { PartyType } from '@prisma/client';
import { buildEntrySystemPrompt } from './entry.service';

/**
 * BUG 1 guard. The participant check-in reused the initiator's prompt because
 * buildEntrySystemPrompt hardcoded PartyType.INITIATOR, so an invitee got the
 * initiator opener ("what are you starting / who owns it") and was led inside
 * the initiator's frame - their solo report then echoed the initiator's goals
 * instead of their own account. Threading partyType fixes it: a PARTICIPANT
 * gets the participant opener (their read of the existing situation).
 *
 * Also asserts the guardrail: the initiator's opening brief never appears in
 * the participant's prompt (brief feeds cross-reference synthesis only).
 */
describe('BUG1: participant entry prompt is party-appropriate and independent', () => {
  const initiator = buildEntrySystemPrompt('NEW_PROJECT' as any, 'Groundwork project');
  const participant = buildEntrySystemPrompt('NEW_PROJECT' as any, 'Groundwork project', PartyType.PARTICIPANT);

  it('participant gets the participant opener (their own read), not the initiator opener', () => {
    // participant question asks for THEIR understanding of the existing situation
    expect(participant).toMatch(/What did you understand the brief to be/i);
    // and NOT the initiator's "what are you starting / who owns it" framing
    expect(participant).not.toMatch(/Who owns it\? What needs to exist at the end/i);
  });

  it('the initiator prompt is unchanged (still gets the initiator opener)', () => {
    expect(initiator).toMatch(/Who owns it\? What needs to exist at the end/i);
    expect(initiator).not.toMatch(/What did you understand the brief to be/i);
  });

  it('guardrail: the initiator opening brief never appears in the participant prompt', () => {
    expect(participant).not.toMatch(/INITIATOR'?S OPENING BRIEF/i);
  });
});
