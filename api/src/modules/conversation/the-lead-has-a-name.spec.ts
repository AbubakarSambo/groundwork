import { readFileSync } from 'fs';
import { join } from 'path';
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

/*
 * Task 2.1, read off every turn written to somebody other than the lead in runs 8, 9, 10 and 12. The
 * label was the setup block's until 2ebe9127; "your lead" and "the lead" were the model's own, and
 * twenty-four turns said one of them about somebody who has a name.
 */
describe('and every other label for the lead that reached a participant', () => {
  it('"your lead", on the loans check-in, where the lead is Amaka (run 9)', () => {
    expect(theLeadByName('This record runs to the end of the period, and what you name here is what your lead will read.', 'Amaka').text)
      .toBe('This record runs to the end of the period, and what you name here is what Amaka will read.');
    expect(theLeadByName('This check-in runs to 26 November. This record goes to your lead.', 'Amaka').text)
      .toBe('This check-in runs to 26 November. This record goes to Amaka.');
    expect(theLeadByName('This is the first check-in, and this record is for your lead to understand what is happening here in Ibadan.', 'Amaka').text)
      .toBe('This is the first check-in, and this record is for Amaka to understand what is happening here in Ibadan.');
  });

  it('"the lead" as the subject, and "the lead\'s", on the senior hire check-in (run 9)', () => {
    expect(theLeadByName('The lead expects you to fully manage five client relationships independently. Which of the five are you managing independently now?', 'Amina').text)
      .toBe('Amina expects you to fully manage five client relationships independently. Which of the five are you managing independently now?');
    expect(theLeadByName("The lead's expectation for this role is for you to fully manage the five largest client relationships independently.", 'Amina').text)
      .toBe("Amina's expectation for this role is for you to fully manage the five largest client relationships independently.");
    expect(theLeadByName('The lead is back from four weeks away and needs a straight picture of where everything stands as of today.', 'Ravi').text)
      .toBe('Ravi is back from four weeks away and needs a straight picture of where everything stands as of today.');
  });

  it('"the person who opened this check-in for you, Michael Achebe," (handover, run 12)', () => {
    expect(theLeadByName("The person who opened this check-in for you, Michael Achebe, wants to make sure everything that's in Sarah's head gets written down.", 'Michael').text)
      .toBe("Michael wants to make sure everything that's in Sarah's head gets written down.");
    expect(theLeadByName('The person who opened this check-in said Sarah, the current finance manager, leaves in three weeks.', 'Michael').text)
      .toBe('Michael said Sarah, the current finance manager, leaves in three weeks.');
    expect(theLeadByName('The person who set up this check-in also mentioned needing to know by day ninety.', 'Amina').text)
      .toBe('Amina also mentioned needing to know by day ninety.');
  });

  it('leaves "take the lead", a sales lead, and somebody\'s own manager alone', () => {
    const idiom = 'What would need to be true for you to confidently take the lead on a client meeting?';
    expect(theLeadByName(idiom, 'Amina')).toEqual({ text: idiom, changed: false });
    const sales = 'The lead is warm and the lead came from the conference. Your lead time is two weeks.';
    expect(theLeadByName(sales, 'Bisi')).toEqual({ text: sales, changed: false });
    const manager = "Your understanding is that the team's priority came directly from your manager in July.";
    expect(theLeadByName(manager, 'Omar')).toEqual({ text: manager, changed: false });
  });

  it('never inside their own quoted words, and "your lead" stays where the lead has no name', () => {
    expect(theLeadByName('You wrote "your lead will read this", and your lead will read it.', 'Amaka').text)
      .toBe('You wrote "your lead will read this", and Amaka will read it.');
    const unnamed = 'What you name here is what your lead will read.';
    expect(theLeadByName(unnamed, null)).toEqual({ text: unnamed, changed: false });
  });

  it("and only in a turn to somebody other than the lead: the lead's own turns say \"you\"", () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/if \(!text \|\| !mentionsTheLeadByALabel\(text\)\) return text;\s*if \(checkIn\?\.participant\?\.partyType === PartyType\.INITIATOR/);
    expect(src).toMatch(/const named = theLeadByName\(text, lead\)/);
  });
});
