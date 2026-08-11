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

  it('now reads for every function, because all nine maps are filled', () => {
    /**
     * THIS TEST USED TO ASSERT THE GAP. It said "eight maps still have no signal
     * lists" and checked SALES came back null, which was true and was the
     * honest state at the time - management was filled first because it is the
     * highest-value coaching in the system.
     *
     * The gap is closed, so the assertion inverts. The RULE it was protecting -
     * silence rather than an invented behaviour - is still covered, by the
     * out-of-range and unknown-role cases below, which is where it actually
     * belongs: a map either has its signals or it does not, and that is a fact
     * about the data rather than a behaviour of this function.
     */
    for (const fn of Object.values(RoleFunction)) {
      const read = signalRead(fn, 0, 'a real reason');
      expect({ fn, read: !!read }).toMatchObject({ read: true });
      expect(read!.noticed).toBeTruthy();
      expect(read!.lookingLike).toBeTruthy();
    }
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

describe('every map, now that all nine are filled', () => {
  it('pairs every failure with a success, in every function', () => {
    // The pairing is the whole reason the lists exist: a failure with no paired
    // success leaves the coach able to name a problem and unable to name the
    // destination. One unpaired entry anywhere breaks that silently, because
    // signalRead would read past the end of the shorter list.
    for (const fn of Object.values(RoleFunction)) {
      const m = ROLE_MAPS[fn];
      expect({ fn, fail: m.failureSignals?.length, succ: m.successSignals?.length })
        .toMatchObject({ fail: m.successSignals?.length });
      expect(m.failureSignals?.length ?? 0).toBeGreaterThanOrEqual(8);
    }
  });

  it('never states a signal as something a person IS', () => {
    // THE LINE THE WHOLE FEATURE SITS ON. "Avoids the hard conversation" is a
    // thing somebody did last week and can do differently. "Avoidant" is a label
    // stapled to a person, and eight new maps written in one sitting is exactly
    // where one would slip in.
    //
    // A BARE "they are" BAN CATCHES CORRECT PROSE, and this is the third time in
    // one sitting: "weak basis for a decision", "They are not doing any work in
    // this picture" (the documents), and now "lives with how they are made" (the
    // decisions). A word blacklist cannot tell what a word is about, so each
    // pattern names the person-label it is actually banning.
    for (const fn of Object.values(RoleFunction)) {
      const m = ROLE_MAPS[fn];
      for (const line of [...(m.failureSignals ?? []), ...(m.successSignals ?? [])]) {
        for (const p of [
          /\b(?:is|was|seems|appears) (?:a |an )?(?:avoidant|lazy|weak|poor|disorganised|unreliable|passive)\b/i,
          /\bthey are (?:just |simply |too |not )*(?:avoidant|lazy|weak|slow|difficult|disorganised|unreliable|passive|junior)\b/i,
          /\bpersonality\b/i, /\battitude\b/i, /\bnot capable\b/i,
          /\blacks (?:the )?(?:ability|confidence|drive|skill)\b/i, /\bunable to\b/i,
        ]) {
          expect({ fn, line, p: String(p), hit: p.test(line) }).toMatchObject({ hit: false });
        }
      }
    }
  });

  it('and every line reads as a behaviour, starting with a verb', () => {
    // Cheap, and it catches the one that got written as a noun phrase.
    for (const fn of Object.values(RoleFunction)) {
      for (const line of [...(ROLE_MAPS[fn].failureSignals ?? []), ...(ROLE_MAPS[fn].successSignals ?? [])]) {
        expect({ fn, line, ok: /^[A-Z][a-z]+(s|es|ies)?\b/.test(line) }).toMatchObject({ ok: true });
      }
    }
  });
});

describe('the management map, which was filled first', () => {
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
