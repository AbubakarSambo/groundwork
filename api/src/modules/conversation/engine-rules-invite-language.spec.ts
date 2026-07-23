import { ENGINE_RULES } from './prompt-library';

/**
 * Invite over-claim guard. The chat used to be instructed to say
 * "I'm opening check-ins with all of them now" - claiming invites were
 * sent/opened mid-chat, when in reality contributors are only NOTED and
 * invites go out after the initiator confirms their email. The instruction
 * now tells the model the opposite: noted now, invited on confirmation,
 * never "opening/inviting now". If any over-claim phrasing creeps back into
 * ENGINE_RULES, this bites.
 */
describe('ENGINE_RULES: invite language does not over-claim', () => {
  it('no longer PRESCRIBES the over-claim ("describe the invitation as simultaneous ... opening now")', () => {
    // the old instruction told the model to SAY it; that prescription is gone
    expect(ENGINE_RULES).not.toMatch(/Describe the invitation as simultaneous/i);
    expect(ENGINE_RULES).not.toMatch(/something like "I'?m opening check-ins with all of them now/i);
    // and it now explicitly BANS claiming invites are opened/sent now
    expect(ENGINE_RULES).toMatch(/Never claim an invite has already been sent or opened/i);
  });

  it('sets the correct expectation: noted now, invited on email confirmation', () => {
    expect(ENGINE_RULES).toMatch(/invites go out (only after|the moment)/i);
    expect(ENGINE_RULES).toMatch(/confirm[s]? (their|your) email/i);
    expect(ENGINE_RULES).toMatch(/NOT sending or opening anyone'?s check-in yet/i);
  });

  it('still forbids sequential framing (parallel guarantee preserved)', () => {
    expect(ENGINE_RULES).toMatch(/I'?ll start with/i);
    expect(ENGINE_RULES).toMatch(/there is no queue or turn order/i);
  });
});
