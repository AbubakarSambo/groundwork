import { shouldThisCodeBeAboutThem, waitingOnSomebodyHere, NOT_ABOUT_THE_ONE_WAITING } from './a-chaser-is-not-the-blocker';

const on = (onParticipantId: string | null, status = 'WAITING', what = 'a stakeholder map') => ({ onParticipantId, status, what });

describe('a chaser is not the blocker', () => {
  it('does not write B5 about somebody waiting on another person here', () => {
    const verdict = shouldThisCodeBeAboutThem('B5', [on('marcus')]);
    expect(verdict.keep).toBe(false);
    expect(verdict.because).toContain('a stakeholder map');
  });

  it('nor B11, which read as blame when she named the person she hired', () => {
    expect(shouldThisCodeBeAboutThem('B11', [on('marcus')]).keep).toBe(false);
  });

  it('writes them about somebody with nothing in the way from anybody here', () => {
    expect(shouldThisCodeBeAboutThem('B5', []).keep).toBe(true);
    expect(shouldThisCodeBeAboutThem('B5', [on(null, 'WAITING', 'the ministry')]).keep).toBe(true);
  });

  it('writes them again once the dependency cleared', () => {
    expect(shouldThisCodeBeAboutThem('B5', [on('marcus', 'CLEARED')]).keep).toBe(true);
  });

  it('leaves every other code alone', () => {
    for (const code of ['E2', 'K1', 'K5', 'B6', 'D1', 'B2', 'A2']) {
      expect(NOT_ABOUT_THE_ONE_WAITING.has(code)).toBe(false);
      expect(shouldThisCodeBeAboutThem(code, [on('marcus')]).keep).toBe(true);
    }
  });

  it('counts BLOCKING as still in the way', () => {
    expect(waitingOnSomebodyHere([on('x', 'BLOCKING')])).toHaveLength(1);
  });
});
