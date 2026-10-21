import { theSessionsHeld } from './the-sessions-held';
import { FC } from '../board/the-final-check-bed';

/** From the run: Grace answered sessions 1, 2 and 3 of the daily check-in, and the judgement said she had not held the daily check-ins. */
describe('the sessions held, as a fact for the judgement', () => {
  it('says three sessions were held and that the initiator answered all three', () => {
    const done = FC.drop.checkIns.filter((c: any) => c.status === 'COMPLETED' && !c.isSetup);
    const label = (first: string) => FC.drop.participants.find((p: any) => p.user?.firstName === first).id;
    const said = theSessionsHeld(done, [{ participantId: label('Grace'), who: 'the initiator' }, { participantId: label('Peter'), who: 'Participant D' }]);
    expect(said).toContain('3 sessions have been held.');
    expect(said).toContain('  Session 1 was held on Monday 12 October.');
    expect(said).toContain('  the initiator answered 3 of the 3 sessions.');
    expect(said).toContain('  Participant D answered 1 of the 3 sessions.');
  });
});
