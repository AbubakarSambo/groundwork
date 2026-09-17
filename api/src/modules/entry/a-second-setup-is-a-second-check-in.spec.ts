import { isAReplayRatherThanASecondSetup, A_REPLAY_ARRIVES_WITHIN_MS } from './a-second-setup-is-a-second-check-in';

/*
 * 5.5: "Commit may return your OLD ground if you have set one up before."
 */
describe('a second setup is a second check-in', () => {
  const now = new Date('2026-09-16T12:00:00Z');
  const secondsAgo = new Date(now.getTime() - 4000);
  const aWeekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  it('a double-click on the same setup is still a replay', () => {
    expect(isAReplayRatherThanASecondSetup({
      consumedAt: secondsAgo, theGroundItMade: 'Tea sales in Abuja', nowAskingFor: 'Tea sales in Abuja', now,
    })).toBe(true);
  });

  it('but a different check-in set up a week later is not', () => {
    expect(isAReplayRatherThanASecondSetup({
      consumedAt: aWeekAgo, theGroundItMade: 'Tea sales in Abuja', nowAskingFor: 'Onboarding Kunle', now,
    })).toBe(false);
  });

  it('and neither is the same name a week later, because nothing replays an hour later', () => {
    expect(isAReplayRatherThanASecondSetup({
      consumedAt: aWeekAgo, theGroundItMade: 'Tea sales in Abuja', nowAskingFor: 'Tea sales in Abuja', now,
    })).toBe(false);
  });

  it('and a different name seconds later is a second setup, not a retry', () => {
    expect(isAReplayRatherThanASecondSetup({
      consumedAt: secondsAgo, theGroundItMade: 'Tea sales in Abuja', nowAskingFor: 'Onboarding Kunle', now,
    })).toBe(false);
  });

  it('a draft nobody has consumed is not a replay of anything', () => {
    expect(isAReplayRatherThanASecondSetup({ consumedAt: null, theGroundItMade: 'x', nowAskingFor: 'x', now })).toBe(false);
  });

  it('and where the ground cannot be read, it keeps the old behaviour', () => {
    expect(isAReplayRatherThanASecondSetup({ consumedAt: secondsAgo, theGroundItMade: null, nowAskingFor: 'anything', now })).toBe(true);
    expect(isAReplayRatherThanASecondSetup({ consumedAt: aWeekAgo, theGroundItMade: null, nowAskingFor: 'anything', now })).toBe(false);
  });

  it('the window is ten minutes, which is far longer than any retry needs', () => {
    expect(A_REPLAY_ARRIVES_WITHIN_MS).toBe(600000);
  });
});
