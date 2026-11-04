import { thePromisesCarriedOver } from './a-promise-carried-over';

/**
 * A LEAD'S WAIT ON SOMEBODY IS NOT THEIR PROMISE CARRIED OVER (engine test, Drop Access, week of 12 October).
 *
 * Grace waited on Kevin, Mercy, Joseph and Peter for "proof of what is real on his deals". In each of Kevin's check-ins he was asked
 * about his deals and answered with plans for other things ("I'll keep trying them.", "I'll follow up with Jane on Monday morning."),
 * and the weekly report put him first under "Decide what to do about proof of what is real on his deals. Kevin Omondi promised it
 * three check-ins running, and you are still waiting." He never promised it. Joseph, who did promise Mercy the samples himself, is
 * still counted.
 */
const at = (s: string) => new Date(s);
const checkIn = (id: string, participantId: string, day: string) => ({ id, participantId, status: 'COMPLETED', isSetup: false, completedAt: at(day) });
const turn = (checkInId: string, role: string, content: string) => ({ checkInId, role, content });

describe("Grace's wait on Kevin for proof of what is real on his deals", () => {
  const WAIT = { id: 'd-kevin-proof', fromParticipantId: 'p-grace', onParticipantId: 'p-kevin', what: 'proof of what is real on his deals', status: 'WAITING', clearedAt: null };
  const CHECK_INS = [checkIn('k2', 'p-kevin', '2026-10-13T11:03:00Z'), checkIn('k3', 'p-kevin', '2026-10-14T11:04:00Z'), checkIn('k4', 'p-kevin', '2026-10-15T11:03:00Z')];
  const TURNS = [
    turn('k2', 'AI', 'What is getting in the way of progress on your current deals?'), turn('k2', 'PERSON', "With Jane, I think she's just busy, but she seemed keen. Paul from Upper Hill, I'm not sure, maybe he's just tied up. I'll keep trying them."),
    turn('k3', 'AI', "What's the closest deal you have to closing right now, and how real are your deals this week?"), turn('k3', 'PERSON', "I'll follow up with Jane on Monday morning."),
    turn('k4', 'AI', 'What proof is there for your deals this week?'), turn('k4', 'PERSON', "I'll follow up with Faith on Monday. She said she'll decide then."),
  ];
  it('is not said to be his promise, three check-ins running', () => {
    expect(thePromisesCarriedOver([WAIT], CHECK_INS, [], TURNS, ['Kilele Hotel', 'Savannah Cafe'])).toEqual([]);
  });
});

describe("Mercy's wait on Joseph for the samples, which he promised himself", () => {
  const WAIT = { id: 'd-samples', fromParticipantId: 'p-mercy', onParticipantId: 'p-joseph', what: 'the samples for Tuskys Westgate', status: 'WAITING', clearedAt: null };
  const CHECK_INS = [checkIn('j1', 'p-joseph', '2026-10-12T11:08:00Z'), checkIn('j2', 'p-joseph', '2026-10-13T11:08:00Z'), checkIn('j3', 'p-joseph', '2026-10-14T11:08:00Z')];
  const LINES = [
    { participantId: 'p-joseph', checkInId: 'j1', text: "I forgot samples for Mercy. I'll bring them on Thursday." },
    { participantId: 'p-joseph', checkInId: 'j2', text: "I forgot the samples I promised Mercy. I'll take them on Thursday." },
  ];
  const TURNS = [turn('j3', 'AI', 'Did you take the samples to Mercy?'), turn('j3', 'PERSON', "Not yet, I'm taking them tomorrow.")];
  it('is still counted', () => {
    expect(thePromisesCarriedOver([WAIT], CHECK_INS, LINES, TURNS, ['Tuskys Westgate']).map((x) => x.says)).toEqual(['The samples for Tuskys Westgate, promised three check-ins running, still not done.']);
  });
});
