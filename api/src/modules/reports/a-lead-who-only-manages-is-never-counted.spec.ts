import { whoHasAnswered, whoIsInTheRound, howManyInTheRoundAnswered } from './how-many-have-answered';

/**
 * A LEAD WHO ONLY MANAGES IS NEVER COUNTED AS SOMEONE THE REPORT WAITS ON.
 *
 * The client's reveal-row spec used to pin one line of this rule's source text, which the engine
 * rewrote (decision 133: the lead counts only in a session she answered; the anchor's lead who only
 * asks is never counted). The promise is checked here as behaviour instead, over rows.
 */
const answered = (n: number) => ({ status: 'COMPLETED', sessionNumber: n });
const person = (id: string, extra: Record<string, unknown> = {}) => ({
  id, userId: `u-${id}`, partyType: 'PARTICIPANT', managingOnly: false, checkIns: [] as { status: string; sessionNumber?: number }[], ...extra,
});

describe('a lead who only manages', () => {
  const lead = person('lead', { partyType: 'INITIATOR', managingOnly: true });
  const team = [person('amani', { checkIns: [answered(2)] }), person('juma')];

  it('is not waited on, and not in the count, for a session she did not answer', () => {
    const people = [lead, ...team];
    /* The one count (1 November 2026): who a session counts and who it is still waiting on are read from the same function. */
    expect(whoHasAnswered(people, 2, 'OKR_ALIGNMENT')).toMatchObject({ onTheCheckIn: ['amani', 'juma'], answered: ['amani'], notYet: ['juma'] });
    expect(whoIsInTheRound(people, 2, 'OKR_ALIGNMENT').map((p) => p.id)).toEqual(['amani', 'juma']);
    expect(howManyInTheRoundAnswered(people, 2, 'OKR_ALIGNMENT')).toEqual({ answered: 1, ofPeople: 2 });
  });

  it('counts only in a session she answered', () => {
    const people = [{ ...lead, checkIns: [answered(2)] }, ...team];
    expect(howManyInTheRoundAnswered(people, 2, 'OKR_ALIGNMENT')).toEqual({ answered: 2, ofPeople: 3 });
  });

  it('where the lead only asks, is never counted, even after answering', () => {
    const people = [{ ...lead, checkIns: [answered(2)] }, ...team];
    expect(whoIsInTheRound(people, 2, 'TEAM_UPDATES').map((p) => p.id)).toEqual(['amani', 'juma']);
    expect(whoHasAnswered(people, 2, 'TEAM_UPDATES').onTheCheckIn).toEqual(['amani', 'juma']);
  });
});
