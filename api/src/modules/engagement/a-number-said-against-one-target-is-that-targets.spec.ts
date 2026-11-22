import { theTargetLines } from './the-direct-morning';

/**
 * RELEASE TEST, 22 NOVEMBER 2026, BUG 22. Wairimu's weekly letter read "The team target is 40. Olu said 3, and none of it is counted as
 * sold yet". Olu's "Far 3 shops agreed to take a trial" was kept against his own aim, "my aim is to get Msingi into 10 new shops in
 * Westlands with our crates by end of december", and the letter read every target's numbers beside the team's 40 shops ordering every
 * week. Three trial shops are not three of the team's 40. A number said against one target is read beside that target only.
 */
const board = (teamSaid: any[] = []) => ({
  objectives: [
    { name: 'The team is aiming for 40 shops to order every week.', target: 40, count: 0, ownerParticipantId: null, saidBy: teamSaid },
    { name: 'Wairimu is aiming for 40 shops', target: 40, count: 0, ownerParticipantId: 'p-wairimu', owner: 'Wairimu Njoroge' },
    {
      name: 'my aim is to get Msingi into 10 new shops in Westlands with our crates by end of december', target: 10, count: 0, ownerParticipantId: 'p-olu', owner: 'Olu Adeyemi',
      saidBy: [{ participantId: 'p-olu', name: 'Olu Adeyemi', count: 3, said: 'Far 3 shops agreed to take a trial', atSession: 1 }],
    },
  ],
  workRecords: [],
});
const now = new Date('2026-11-27T14:30:00Z');

describe('the team target line reads only what was said against the team target', () => {
  it('Wairimu reads the team target with nothing counted, and never Olu\'s three trial shops beside it', () => {
    const text = theTargetLines(board(), now, 'Africa/Nairobi').lines[0].text;
    expect(text).toBe('The team’s goal is “The team is aiming for 40 shops to order every week”, and nothing is counted against it yet.');
    expect(text).not.toContain('Olu');
  });
  it('a number said against the team target is still said beside it', () => {
    const text = theTargetLines(board([{ participantId: 'p-chidi', name: 'Chidi Okeke', count: 2, said: 'I got 2 shops ordering this week.', atSession: 3 }]), now, 'Africa/Nairobi').lines[0].text;
    expect(text).toBe('The team’s goal is “The team is aiming for 40 shops to order every week”. Chidi said 2, and none of it is on a deal yet, so none of it is proven.');
  });
});
