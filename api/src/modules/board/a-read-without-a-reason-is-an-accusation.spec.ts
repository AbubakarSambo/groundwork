import { signalRead, ROLE_MAPS, RoleFunction } from './role-maps';

/**
 * A READ IS NEVER SHOWN WITHOUT WHY.
 *
 * "Avoids the hard conversation" on its own is a character judgement, and it
 * lands as one. The same observation with its reason attached is a description
 * of a record, which a person can look at and disagree with:
 *
 *   noticed:     Defers the hard conversation, the feedback, the performance call
 *   reason:      It has come up in three check-ins and none has happened yet,
 *                and nothing in your account says you were blocked
 *   looking like: Has the hard conversation on time, kindly and clearly
 *
 * The reason is also what protects the person who is BLOCKED rather than
 * avoiding, which is the single most common way this kind of read is unfair. So
 * a read that cannot state its reason has not earned the right to be shown, and
 * this refuses rather than guessing.
 *
 * The pairing matters too. Every noticed behaviour carries what it looks like
 * going right, so the coach always knows what it is coaching TOWARD rather than
 * only what it spotted. A map with failures and no successes would be a stick.
 */

describe('a signal read', () => {
  it('carries what was noticed, where it is going, and why', () => {
    const read = signalRead(
      RoleFunction.MANAGEMENT,
      4,
      'It has come up in three check-ins and none has happened yet, and nothing says you were blocked',
    );
    expect(read).not.toBeNull();
    expect(read!.noticed).toMatch(/hard conversation/i);
    expect(read!.lookingLike).toMatch(/hard conversation on time/i);
    expect(read!.reason).toMatch(/three check-ins/);
  });

  it('refuses to produce a read with no reason', () => {
    // THE REGRESSION THIS PREVENTS. Without the reason this is just a label
    // pointed at a person.
    expect(signalRead(RoleFunction.MANAGEMENT, 4, '')).toBeNull();
    expect(signalRead(RoleFunction.MANAGEMENT, 4, '   ')).toBeNull();
  });

  it('says nothing for a function whose signals are not written yet', () => {
    // Eight maps still have no signal lists. Silence is correct; inventing a
    // behaviour to fill the slot would be worse than saying nothing.
    expect(signalRead(RoleFunction.SALES, 0, 'a real reason')).toBeNull();
  });

  it('says nothing for a role it does not know', () => {
    expect(signalRead(null, 0, 'a real reason')).toBeNull();
    expect(signalRead('SOMETHING_ELSE', 0, 'a real reason')).toBeNull();
  });

  it('does not run off the end of the list', () => {
    expect(signalRead(RoleFunction.MANAGEMENT, 99, 'a real reason')).toBeNull();
    expect(signalRead(RoleFunction.MANAGEMENT, -1, 'a real reason')).toBeNull();
  });
});

describe('the management map, which is filled', () => {
  const map = ROLE_MAPS[RoleFunction.MANAGEMENT];

  it('pairs every failure with what it looks like going right', () => {
    // Same length, paired by index. A failure with no paired success would leave
    // the coach able to name a problem and unable to name the destination.
    expect(map.failureSignals).toHaveLength(14);
    expect(map.successSignals).toHaveLength(14);
  });

  it('describes behaviours, never people', () => {
    // The line this product does not cross. "Avoids the hard conversation" is a
    // thing somebody did this week. "Is avoidant" is a verdict on who they are.
    const labels = /\b(is|are|seems|appears) (avoidant|controlling|weak|lazy|difficult|toxic|passive)\b/i;
    for (const signal of [...map.failureSignals!, ...map.successSignals!]) {
      expect({ signal, isLabel: labels.test(signal) }).toMatchObject({ isLabel: false });
    }
  });

  it('holds both poles of the root failure, not just one', () => {
    // Management fails in two opposite directions and a map that only knew one
    // would misread the other entirely. Control: doing it themselves.
    // Abdication: letting it slip.
    const all = map.failureSignals!.join(' ').toLowerCase();
    expect(all).toMatch(/themselves|redoes|hoards/);      // control
    expect(all).toMatch(/slip|defers|never develops/);    // abdication
  });
});
