import { shouldThisCodeBeAboutThem, waitingOnSomebodyHere, NOT_ABOUT_THE_ONE_WAITING } from './a-chaser-is-not-the-blocker';

const on = (onParticipantId: string | null, status = 'WAITING', what = 'a stakeholder map') => ({ onParticipantId, status, what, groundId: 'g1' });
/* The colleague's own promise in the same check-in: the only thing that confirms a wait (decision 137). */
const promised = (participantId: string, text: string) => ({ groundId: 'g1', participantId, text });
const marcusPromisedTheMap = [promised('marcus', 'I will send the stakeholder map by Friday.')];

describe('a chaser is not the blocker', () => {
  it('does not write B5 about somebody waiting on another person here who has said it is theirs to give', () => {
    const verdict = shouldThisCodeBeAboutThem('B5', [on('marcus')], marcusPromisedTheMap);
    expect(verdict.keep).toBe(false);
    expect(verdict.because).toContain('a stakeholder map');
  });

  it('nor B11, which read as blame when she named the person she hired and he had promised it', () => {
    expect(shouldThisCodeBeAboutThem('B11', [on('marcus')], marcusPromisedTheMap).keep).toBe(false);
  });

  it('writes them about somebody with nothing in the way from anybody here', () => {
    expect(shouldThisCodeBeAboutThem('B5', []).keep).toBe(true);
    expect(shouldThisCodeBeAboutThem('B5', [on(null, 'WAITING', 'the ministry')]).keep).toBe(true);
  });

  it('writes them again once the dependency cleared', () => {
    expect(shouldThisCodeBeAboutThem('B5', [on('marcus', 'CLEARED')], marcusPromisedTheMap).keep).toBe(true);
  });

  it('leaves every other code alone', () => {
    for (const code of ['E2', 'K1', 'K5', 'B6', 'D1', 'B2', 'A2']) {
      expect(NOT_ABOUT_THE_ONE_WAITING.has(code)).toBe(false);
      expect(shouldThisCodeBeAboutThem(code, [on('marcus')], marcusPromisedTheMap).keep).toBe(true);
    }
  });

  it('counts BLOCKING as still in the way', () => {
    expect(waitingOnSomebodyHere([on('x', 'BLOCKING')], [promised('x', 'the stakeholder map is mine to finish')])).toHaveLength(1);
  });

  /*
   * PROFILE 5 (decision 137; decision 139, must-fix 4). Kevin said he was waiting on Fatuma for the
   * final prices; Fatuma had said she sent them, and never promised them. His claim alone held B11
   * (blame shifting) back from him every week. A claim the colleague has not confirmed is his account,
   * not a reason to look away from him.
   */
  describe('a wait only the speaker claims', () => {
    const kevinsWaits = [
      on('fatuma', 'WAITING', 'the final prices'),
      on('imani', 'WAITING', 'the product photos'),
      on('juma', 'BLOCKING', 'the Westlands shop list'),
    ];
    const whatTheColleaguesPromised = [
      promised('fatuma', 'I will check the invoices for Wairimu.'),
      promised('imani', 'I will finish the stock codes this week.'),
    ];

    it('writes B5, B11 and K3 about the person who blames, when nobody they blame has said it is theirs', () => {
      for (const code of ['B5', 'B11', 'K3']) {
        expect(shouldThisCodeBeAboutThem(code, kevinsWaits, whatTheColleaguesPromised).keep).toBe(true);
      }
      expect(waitingOnSomebodyHere(kevinsWaits, whatTheColleaguesPromised)).toHaveLength(0);
    });

    it('with no promises read at all, a claimed wait holds nothing back', () => {
      expect(shouldThisCodeBeAboutThem('B11', kevinsWaits).keep).toBe(true);
    });

    it('a promise by somebody else, or in another check-in, does not confirm it', () => {
      expect(shouldThisCodeBeAboutThem('B11', [on('fatuma', 'WAITING', 'the final prices')], [promised('imani', 'I will send the final prices.')]).keep).toBe(true);
      expect(shouldThisCodeBeAboutThem('B11', [on('fatuma', 'WAITING', 'the final prices')], [{ groundId: 'g2', participantId: 'fatuma', text: 'I will send the final prices.' }]).keep).toBe(true);
    });

    it('holds them back once the colleague says, in their own promise, that it is theirs', () => {
      expect(shouldThisCodeBeAboutThem('B11', [on('fatuma', 'WAITING', 'the final prices')], [promised('fatuma', 'I will send the price list once the supplier confirms.')]).keep).toBe(false);
    });
  });
});
