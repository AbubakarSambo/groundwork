import { splitMentions, isOutsideTheOrganisation, type Mentioned } from './a-client-is-not-a-colleague';

/**
 * ONE CLICK FROM INVITING A CLIENT. (W3)
 *
 * From Hafsah's own walkthrough. Her ground is about two of her reports not
 * delivering client setups, and her private report offered four people to add,
 * each with a "+ Add them" button:
 *
 *   Daisy                two direct reports
 *   Duke
 *   Microchip Solutions  two clients
 *   Mass General
 *
 * Adding a client there sends that client an invitation to give their own account
 * of her team's performance. One click, by somebody skimming.
 *
 * THE FIX IS TO SPLIT THE LIST, NOT TO FILTER IT. Both clients are genuinely part
 * of the story and dropping them loses real material. One list was doing two
 * jobs - "who came up" and "who you could invite" - and only the first is safe to
 * answer generously.
 */

const hers: Mentioned[] = [
  { name: 'Daisy', context: 'Mentioned as a direct report who is not delivering on client setup.' },
  { name: 'Duke', context: 'Mentioned as a direct report who is not delivering on client setup.' },
  { name: 'Microchip Solutions', context: 'A client whose business was secured after you personally intervened to provide a demo.' },
  { name: 'Mass General', context: 'A client whose business was secured after you personally intervened to provide a demo.' },
];

describe('her four, sorted', () => {
  it('offers the two reports and not the two clients', () => {
    const { couldBeAdded, alsoCameUp } = splitMentions(hers);
    expect(couldBeAdded.map((m) => m.name)).toEqual(['Daisy', 'Duke']);
    expect(alsoCameUp.map((m) => m.name)).toEqual(['Microchip Solutions', 'Mass General']);
  });

  it('loses nothing', () => {
    // THE PART THAT MAKES THIS A FIX AND NOT A DELETION. Everything the
    // extractor found is still on the page and still described. Only the button
    // moved.
    const { couldBeAdded, alsoCameUp } = splitMentions(hers);
    expect([...couldBeAdded, ...alsoCameUp]).toHaveLength(hers.length);
    expect(alsoCameUp[0].context).toBe(hers[2].context);
  });

  it('says why the second list has no button', () => {
    const { note } = splitMentions(hers);
    expect(note).toMatch(/outside your organisation/);
    // The sentence that makes the rule make sense rather than feel arbitrary.
    expect(note).toMatch(/an invitation asks somebody to give their own account/);
  });

  it('and says nothing where there is nothing to say', () => {
    expect(splitMentions(hers.slice(0, 2)).note).toBeNull();
  });
});

describe('the signal is the context, never the name', () => {
  it('does not judge by how a name looks', () => {
    // "Mass General" reads exactly like a person and "Daisy" reads exactly like
    // a flower. Guessing from the name is guessing.
    expect(isOutsideTheOrganisation({ name: 'Mass General', context: 'A colleague on the delivery team.' })).toBeNull();
    expect(isOutsideTheOrganisation({ name: 'Daisy', context: 'A client account she manages.' })).not.toBeNull();
  });

  it('catches the ways an outsider gets described', () => {
    for (const context of [
      'A client whose business was secured.',
      'The customer who complained about the setup.',
      'A vendor supplying the hardware.',
      'The agency running the campaign.',
      'A prospect in the pipeline.',
      'The company they signed up.',
    ]) {
      expect({ context, hit: isOutsideTheOrganisation({ name: 'X', context }) }).not.toMatchObject({ hit: null });
    }
  });

  it('leaves colleagues alone, including the word "lead" as a job', () => {
    // "lead" is a sales lead and also half the job titles in a company, and
    // catching the second would hide the person most worth adding.
    for (const context of [
      'Mentioned as a direct report who is not delivering.',
      'The team lead she escalated to.',
      'A colleague in support who picked it up.',
      'Her manager, who has not been told.',
    ]) {
      expect({ context, hit: isOutsideTheOrganisation({ name: 'X', context }) }).toMatchObject({ hit: null });
    }
  });

  it('copes with a mention the extractor described thinly', () => {
    // No context is not evidence of being an outsider, so they stay invitable -
    // the direction that costs a lead one glance rather than costing a client an
    // invitation.
    expect(splitMentions([{ name: 'Sam', context: '' }]).couldBeAdded).toHaveLength(1);
  });
});
