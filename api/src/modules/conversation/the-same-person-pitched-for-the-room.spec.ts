import { registerFor, buildIntakeBlock } from './prompt-library';
import { GroundScenario, PartyType } from '@prisma/client';

/**
 * WHO YOU SOUND LIKE gives the chat one character. This is how far up or down it is pitched.
 *
 * The reason it is not one setting: the same product asks somebody about a routine pulse check and
 * asks somebody else about the account they just lost eighteen per cent of revenue with. Hafsah
 * asked for a voice that is slightly cheeky and good to talk to, and that is right for the first
 * conversation and repellent in the second. Dry on the light ones is charm. Dry on the heavy ones is
 * the product being glib at the worst moment somebody will ever use it.
 */
const ctx = (scenario: GroundScenario) => ({
  scenario,
  partyType: PartyType.INITIATOR,
  sessionNumber: 1,
  otherPartyCheckedIn: false,
  groundLabel: 'A check-in',
  trustLevel: 'building' as const,
});

describe('the same person, pitched for the room', () => {
  it('drops the lightness entirely where somebody is exposed', () => {
    for (const s of [GroundScenario.ACUTE_SHOCK, GroundScenario.PIP]) {
      const r = registerFor(s);
      expect(r).toContain('heavy');
      expect(r).toMatch(/no lightness/i);
    }
  });

  it('and asks for dryness where nothing is on the line', () => {
    for (const s of [GroundScenario.SNAPSHOT, GroundScenario.PULSE_CHECK, GroundScenario.OPEN_READ]) {
      expect(registerFor(s)).toContain('light');
    }
  });

  it('sits in the middle for everything else, which is most check-ins', () => {
    expect(registerFor(GroundScenario.NEW_HIRE)).toContain('level');
    expect(registerFor(GroundScenario.DRIFT)).toContain('level');
  });

  it('never lets the register touch what the conversation asks for', () => {
    /* The whole risk of a voice change: a warmer chat that accepts vaguer answers. */
    for (const s of [GroundScenario.ACUTE_SHOCK, GroundScenario.SNAPSHOT, GroundScenario.NEW_HIRE]) {
      expect(registerFor(s)).not.toMatch(/less specific|fewer questions|do not push|accept/i);
    }
  });

  it('reaches the prompt a person is actually answered by', () => {
    /* A register nothing reads is a comment. */
    const block = buildIntakeBlock(ctx(GroundScenario.ACUTE_SHOCK) as any);
    expect(block).toMatch(/REGISTER: heavy/);
    expect(block).toMatch(/RHYTHM:/);
    expect(buildIntakeBlock(ctx(GroundScenario.SNAPSHOT) as any)).toMatch(/REGISTER: light/);
  });

  it('tells it that two questions in a turn is never right, and four in a row is an interview', () => {
    const block = buildIntakeBlock(ctx(GroundScenario.NEW_HIRE) as any);
    expect(block).toMatch(/Never ask two questions in one turn/i);
    expect(block).toMatch(/four is an interview/i);
  });
});
