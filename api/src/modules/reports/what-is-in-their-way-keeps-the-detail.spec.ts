import { factsAbout } from './the-facts-about-a-person';

/*
 * "SOME APPROVALS ARE STALLED" WAS THE FINDING; THE REASON WAS ON THE RECORD.
 *
 * run-7, the pulse scenario. Fatima's record held these three, all from one session, in this
 * order. The finding took the first and lost Ahmed's manager and the 28th.
 */
describe('what is in their way keeps the worry with the detail in it', () => {
  const said = (type: string, text: string, session = 1) => ({ type, text, session });
  const FATIMA = [
    said('WORRY', 'some approvals are stalled.'),
    said('WORRY', "Four purchase approvals have been sitting since the 9th, waiting for Ahmed's manager."),
    said('TENSION', "Ahmed's manager is on leave until the 28th."),
  ];

  it('prefers the worry in the latest session that carries a specific', () => {
    const f = factsAbout({ participantId: 'p1', label: 'Fatima Bello', isLead: false, said: FATIMA, targets: [] }, 1)!;
    expect(f.whatTheySayIsInTheWay).toBe("Four purchase approvals have been sitting since the 9th, waiting for Ahmed's manager");
  });

  it('and falls back to the latest worry where none carries one', () => {
    const f = factsAbout({
      participantId: 'p1', label: 'Fatima Bello', isLead: false,
      said: [said('WORRY', 'some approvals are stalled.'), said('WORRY', 'things feel slow.')],
      targets: [],
    }, 1)!;
    expect(f.whatTheySayIsInTheWay).toBe('some approvals are stalled');
  });

  it('never reaches back to an earlier session for the detail', () => {
    const f = factsAbout({
      participantId: 'p1', label: 'Fatima Bello', isLead: false,
      said: [said('WORRY', "Ahmed's manager is on leave until the 28th.", 1), said('WORRY', 'some approvals are stalled.', 2)],
      targets: [],
    }, 2)!;
    expect(f.whatTheySayIsInTheWay).toBe('some approvals are stalled');
  });
});
