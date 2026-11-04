import { theOneThingToDoBetter } from './what-this-session-is-missing';

/*
 * "I want the chat and the first session to give me an insight into something i need to do better
 * in the conversation like setting the targets per person and telling them etc."
 *
 * The coach could not: it only speaks where a step is already outstanding from an earlier session,
 * so session 1 - where somebody is most reachable - said nothing.
 */
describe('the one thing to do better, from what this check-in is missing', () => {
  /* answersSoFar past the close floor, and nothing said yet: the two WHEN conditions, held
     constant here so each test is about WHAT the note says. They have their own describe below. */
  const base = { peopleInIt: 3, theyRunIt: true, anythingDocumented: false, answersSoFar: 5, alreadySaidThisSession: [] as string[] };
  const whole = { name: '10,000 units of tea', target: 10000, ownerParticipantId: null, dueDate: new Date() };
  const mine = (n: number, who: string) => ({ name: `Carry ${n}`, target: n, ownerParticipantId: who, dueDate: new Date() });

  it('names her own case: an objective and nobody carrying a share of it', () => {
    const out = theOneThingToDoBetter({ ...base, objectives: [whole] })!;
    expect(out).toContain('10,000');
    expect(out).toMatch(/nobody in it has a number of their own/);
    expect(out).toMatch(/Deciding who carries how much, and telling them/);
  });

  it('and the half-finished version of it', () => {
    const out = theOneThingToDoBetter({ ...base, objectives: [whole, mine(150, 'a')] })!;
    expect(out).toMatch(/1 of 3 people have a number of their own/);
  });

  it('or numbers with no date on any of them', () => {
    const out = theOneThingToDoBetter({
      ...base, peopleInIt: 1,
      objectives: [{ name: '500 contracts', target: 500, ownerParticipantId: 'me', dueDate: null }],
    })!;
    expect(out).toMatch(/no date on any of them/);
  });

  it('or nothing anybody else could open', () => {
    const out = theOneThingToDoBetter({
      ...base, peopleInIt: 1, anythingDocumented: false,
      objectives: [{ name: '500 contracts', target: 500, ownerParticipantId: 'me', dueDate: new Date() }],
    })!;
    expect(out).toMatch(/came from memory/);
  });

  it('says nothing at all when the check-in is in good shape', () => {
    expect(theOneThingToDoBetter({
      ...base, peopleInIt: 2, anythingDocumented: true,
      objectives: [whole, mine(5000, 'a'), mine(5000, 'b')],
    })).toBeNull();
  });

  it('and never lectures somebody who does not run the check-in', () => {
    expect(theOneThingToDoBetter({ ...base, theyRunIt: false, objectives: [whole] })).toBeNull();
  });

  it('is one sentence about the check-in, never about the person', () => {
    const out = theOneThingToDoBetter({ ...base, objectives: [whole] })!;
    expect(out).toMatch(/It is about the check-in, not about them/);
    expect(out).toMatch(/no praise, no criticism/);
  });
});


/*
 * WHEN, WHICH IS THE HALF THAT SHIPPED BROKEN.
 *
 * Joined into every turn of session 1, the model said it on turn 5 and again on turn 6, both
 * mid-interview: "You haven't given Sahar or Amina a specific number yet for their parts in the
 * 10,000 units", then "You haven't told Sahar or Amina what you expect them to sell."
 */
describe('the note is due once, near the close, and not again', () => {
  const objectives = [{ name: '10,000 units', target: 10000, ownerParticipantId: null, dueDate: new Date() }];
  const has = (o: Partial<any> = {}) => ({
    objectives, peopleInIt: 3, theyRunIt: true, anythingDocumented: false,
    answersSoFar: 5, alreadySaidThisSession: [] as string[], ...o,
  });

  /* Changed 3 November 2026 (Hafsah: no question limits and no forced close): there is no count before a check-in may close, so the note
     waits only for them to have said something; when before the close it is said is the model's to judge. */
  it('says nothing before they have said anything, and waits on no count after that', () => {
    expect(theOneThingToDoBetter(has({ answersSoFar: 0 }))).toBeNull();
    expect(theOneThingToDoBetter(has({ answersSoFar: 1 }))).not.toBeNull();
    expect(theOneThingToDoBetter(has({ answersSoFar: 5 }))).not.toBeNull();
  });

  it('and nothing at all once a turn is already carrying it', () => {
    for (const saidIt of [
      "You haven't given Sahar or Amina a specific number yet for their parts in the 10,000 units.",
      "You haven't told Sahar or Amina what you expect them to sell.",
      'Nobody on this check-in has a number of their own yet.',
      'Deciding who carries how much is worth doing before the next one.',
    ]) {
      expect(theOneThingToDoBetter(has({ alreadySaidThisSession: ['What are you aiming at?', saidIt] }))).toBeNull();
    }
  });

  it('but an ordinary interview turn is not mistaken for it', () => {
    const ordinary = [
      'The check-in is aiming at 10,000 units. You mentioned 150 bags a month - is that your part of it?',
      'What would exist that does not exist today if that is genuinely delivered?',
      'Who else would know those invoices exist?',
    ];
    expect(theOneThingToDoBetter(has({ alreadySaidThisSession: ordinary }))).not.toBeNull();
  });
});
