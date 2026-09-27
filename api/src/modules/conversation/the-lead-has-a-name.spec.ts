import { theLeadByName } from './the-lead-has-a-name';
import { alreadyEstablished } from './setup-already-asked-this';
import { GroundScenario } from '@prisma/client';

/**
 * "Mei, the person who set this up wants to understand what it's actually like to work here" was the
 * first line Mei read, openread, run 10. The setup block now names the lead, and the turn is
 * checked before it is saved.
 */
describe('the lead has a name, and a conversation uses it', () => {
  it('turns the label into the lead\'s first name', () => {
    const out = theLeadByName("Mei, the person who set this up wants to understand what it's actually like to work here.", 'Daniel');
    expect(out).toEqual({ text: "Mei, Daniel wants to understand what it's actually like to work here.", changed: true });
  });

  it('says "your lead" where there is no name, with a capital at the start of a sentence', () => {
    expect(theLeadByName('The person who set this up wants to know. So does the person who set this up.', null).text)
      .toBe('Your lead wants to know. So does your lead.');
  });

  it('never changes somebody\'s own words inside quotation marks', () => {
    const text = 'You wrote "the person who set this up never told me", and the person who set this up agrees.';
    expect(theLeadByName(text, 'Daniel').text).toBe('You wrote "the person who set this up never told me", and Daniel agrees.');
  });

  it('leaves a line without the label alone', () => {
    const text = 'What do you see as your current work?';
    expect(theLeadByName(text, 'Daniel')).toEqual({ text, changed: false });
  });

  it('the setup block names the lead to everybody else, and never says the label', () => {
    const block = alreadyEstablished({ scenario: GroundScenario.PULSE_CHECK, adminBrief: 'I want to understand what it is like to work here.', roleAsDescribed: 'Analyst', setUpBy: 'Daniel' });
    expect(block).toContain('Daniel wrote this about the situation: I want to understand what it is like to work here.');
    expect(block).toContain("Daniel described this person's part in it as: Analyst.");
    expect(block).toContain('When you mention them, say "Daniel".');
    expect(block).not.toMatch(/The person who set this up (wrote|described)/);
  });

  it('and says "their lead" in the block when nobody gave a name', () => {
    const block = alreadyEstablished({ scenario: GroundScenario.PULSE_CHECK, adminBrief: 'A brief.' });
    expect(block).toContain('Their lead wrote this about the situation: A brief.');
    expect(block).toContain('say "your lead"');
  });

  it('the lead\'s own block still says "you"', () => {
    const block = alreadyEstablished({ scenario: GroundScenario.PULSE_CHECK, adminBrief: 'A brief.', readerSetItUp: true, setUpBy: 'Daniel' });
    expect(block).toContain('You wrote this about the situation: A brief.');
    expect(block).not.toContain('WHO SET IT UP HAS A NAME');
  });
});
