import { theOneThingToDoBetter } from './what-this-session-is-missing';

/*
 * "I want the chat and the first session to give me an insight into something i need to do better
 * in the conversation like setting the targets per person and telling them etc."
 *
 * The coach could not: it only speaks where a step is already outstanding from an earlier session,
 * so session 1 - where somebody is most reachable - said nothing.
 */
describe('the one thing to do better, from what this check-in is missing', () => {
  const base = { peopleInIt: 3, theyRunIt: true, anythingDocumented: false };
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
