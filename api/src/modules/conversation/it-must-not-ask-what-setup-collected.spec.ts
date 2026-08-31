import { GroundScenario, PartyType } from '@prisma/client';
import { alreadyEstablished, situationInWords } from './setup-already-asked-this';
import { buildIntakeBlock } from './prompt-library';

/**
 * THE FIRST THING A LEAD SEES, AND THE FIRST THING THAT WENT WRONG.
 *
 * Observed on staging: a check-in whose own title on the screen read "A new hire starting" opened
 * with "So, what is starting here, and who is involved?". The facts were all in the prompt already
 * - the anti-repetition rule was scoped to "what the person has already told you IN THIS SESSION",
 * and setup is not the session.
 */
const ctx = (over: any = {}) => ({
  scenario: GroundScenario.NEW_HIRE,
  partyType: PartyType.INITIATOR,
  sessionNumber: 1,
  groundLabel: 'A new hire starting',
  otherParties: [{ label: 'Priya' }],
  roleAsDescribed: 'joining as the second engineer',
  adminBrief: 'Ada starts on the 6th and owns the billing rewrite.',
  ...over,
});

describe('it must not ask what setup already collected', () => {
  it('puts what setup settled in front of the model, with the instruction not to ask it', () => {
    const block = alreadyEstablished(ctx());
    expect(block).toContain('a new person starting');
    expect(block).toContain('Priya');
    expect(block).toContain('joining as the second engineer');
    expect(block).toContain('Ada starts on the 6th');
    expect(block).toContain('DO NOT ASK');
  });

  it('forbids reading any of it back as the person\'s own words', () => {
    /*
     * A card somebody clicked is not their account of their situation. Asserting it back would be
     * the product putting words in a person's mouth, which the report rules forbid everywhere else.
     */
    const block = alreadyEstablished(ctx());
    expect(block).toContain('DO NOT ATTRIBUTE');
    expect(block).toContain('never treat it as evidence');
    expect(block).toContain("Never say \"you told me\"");
  });

  it('says nothing at all when setup settled nothing', () => {
    /* A heading with nothing under it reads as a fault and invites the model to fill it. */
    expect(alreadyEstablished({ scenario: null, otherParties: [] })).toBe('');
  });

  it('does not repeat the check-in name back when it is just the card\'s own label', () => {
    const block = alreadyEstablished(ctx({ adminBrief: null, otherParties: [], roleAsDescribed: null }));
    expect(block).toContain('a new person starting');
    /* "A new hire starting" adds nothing over the situation line. */
    expect(block).not.toContain('It is called');

    const named = alreadyEstablished(ctx({ groundLabel: 'Billing rewrite handover' }));
    expect(named).toContain('It is called "Billing rewrite handover"');
  });

  it('reaches the assembled intake block, not just the helper', () => {
    /* The rule is worth nothing if it never reaches the prompt the model is actually sent. */
    const block = buildIntakeBlock(ctx() as any);
    expect(block).toContain('ALREADY ESTABLISHED BEFORE THIS CONVERSATION STARTED');
    expect(block).toContain('a new person starting');
    expect(block).toContain('DO NOT ASK');
  });

  it('has words for every situation a person can pick', () => {
    for (const s of Object.values(GroundScenario)) {
      const words = situationInWords(s);
      if (words === null) continue;
      expect(words).not.toMatch(/[A-Z_]{4,}/);
    }
    expect(situationInWords(GroundScenario.NEW_HIRE)).toBe('a new person starting');
    expect(situationInWords(null)).toBeNull();
  });
});
