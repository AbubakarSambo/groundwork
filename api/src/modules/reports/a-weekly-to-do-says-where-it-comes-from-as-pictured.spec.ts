import { COMES_FROM, aBlockerFromBeforeTheWeek, forTheLeadToDo, yourOwnToDo } from './the-weekly-report';

/**
 * WHERE EACH THING TO DO NEXT WEEK COMES FROM, IN THE PICTURES' OWN WORDS (screen match, 16 October; weekly-report.jpg,
 * weekly-report-operations.jpg, programme-, founder-, support- and eng-weekly-report.jpg).
 */
describe('a thing to do next week says where it comes from as pictured', () => {
  const monday = new Date('2026-09-21T00:00:00Z');

  it('a wait raised this week comes from a blocker; one still open from before the week, from a blocker that keeps coming back', () => {
    expect(aBlockerFromBeforeTheWeek('a blocker', '2026-09-22T10:00:00Z', monday)).toBe('a blocker');
    expect(aBlockerFromBeforeTheWeek('a blocker', '2026-09-16T10:00:00Z', monday)).toBe('a blocker that keeps coming back');
    expect(aBlockerFromBeforeTheWeek('a blocker', null, monday)).toBe('a blocker');
    /* Only a wait can come back; anything else keeps its own place. */
    expect(aBlockerFromBeforeTheWeek('a disagreement', '2026-09-01T10:00:00Z', monday)).toBe('a disagreement');
  });

  it('each place reads as the pictures say it', () => {
    const said = (from: any) => forTheLeadToDo({ do: 'Sort out a rule for old leads.', why: 'Samuel is waiting on you for it.', from }).comesFrom;
    expect(said('a blocker')).toBe('This comes from a blocker.');
    expect(said('a blocker that keeps coming back')).toBe('This comes from a blocker that keeps coming back.');
    expect(said('a disagreement')).toBe('This comes from a disagreement in the team.');
    expect(said('the plan')).toBe('This comes from the plan.');
    expect(said('something that kept happening')).toBe('From a pattern');
    expect(said('your own notes')).toBe('Decision needed');
    expect(yourOwnToDo({ participantId: 'p1', clause: 'send the quote on Friday', status: 'OPEN' } as any)?.comesFrom).toBe('From your commitments');
    expect(Object.values(COMES_FROM).every((t) => t.trim().length > 0)).toBe(true);
  });
});
