import { readFileSync } from 'fs';
import { join } from 'path';
import { objectiveState, mayBeReadAgainst, describeObjective } from './an-objective-belongs-to-a-person';

/**
 * THE MODULE THAT ENFORCED A RULE WITH NO DATA TO ENFORCE IT ON.
 *
 * `an-objective-belongs-to-a-person.ts` is 169 lines with its own spec file, and nothing ever created a
 * `PersonObjective` row. Its central rule:
 *
 *   "May this objective be used as the thing somebody is read against? Not while it is a proposal.
 *    Reading a person against a target they have never seen is the definition of an unfair review, and
 *    the fact that the product would be doing it silently makes it worse rather than better."
 *
 * A rule needs three states to be real - proposed, accepted, their own - and therefore three writes. It
 * had none. Meanwhile the setup chat asked "what is each person actually trying to achieve?" and counted
 * `GroundObjective`: one objective for the whole ground, no author, no seen-state. The wrong table
 * answering the right question.
 */
const SERVICE = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');
const CODE = SERVICE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const shape = (over: Partial<{ text: string | null; authoredBy: 'lead' | 'self' | null; seenBySubject: boolean }> = {}) => ({
  participantId: 'p1', text: 'Own a client account end to end', authoredBy: 'lead' as const, seenBySubject: false, ...over,
});

describe('the rule the module was written for', () => {
  it('a proposal nobody has seen may not be read against', () => {
    const o = shape();
    expect(objectiveState(o)).toBe('proposed');
    expect(mayBeReadAgainst(o)).toBe(false);
  });

  it('accepted may', () => {
    expect(mayBeReadAgainst(shape({ seenBySubject: true }))).toBe(true);
  });

  it('their own words may, and is the strongest version', () => {
    const o = shape({ authoredBy: 'self', seenBySubject: true });
    expect(objectiveState(o)).toBe('their own');
    expect(mayBeReadAgainst(o)).toBe(true);
  });

  it('and an absence may not, which matters as much', () => {
    // "Where nobody has said what success looks like, the honest output is no read at all."
    expect(mayBeReadAgainst(shape({ text: null }))).toBe(false);
    expect(describeObjective(shape({ text: null }))).toMatch(/Nobody has said what success looks like/);
  });
});

/**
 * THE WRITES MOVED; THE RULES DID NOT.
 *
 * There used to be three: a lead PROPOSES a target, the person ACCEPTS it, or the person writes their
 * OWN. All three are gone - service methods and routes both - because the product no longer works that
 * way. An expectation is stated in the lead's own check-in, extracted from what they actually said,
 * published to Context where everyone reads it, and changed only through the chat.
 *
 * Her decision: "Participants should not be able to rewrite their targets or accept it. One person is
 * doing this, we dont want chaos. But they can see it."
 *
 * TWO OF THE THREE OLD RULES SURVIVE INTACT and are the reason this block still exists. They are now
 * enforced in `extractExpectations`, so that is where they are pinned. The third - a party authoring
 * their own - is not a rule that moved, it is a capability that was removed, and there is a guard
 * below asserting nothing writes one.
 */
describe('the rules the three writes used to carry', () => {
  /**
   * SLICED TO THE END OF THE FUNCTION, not to a fixed number of characters.
   *
   * This took the first 6,000 characters after the signature, and adding the objective primitive to
   * the same function pushed `textChanged` past that window - so a guard protecting a real fairness
   * rule failed because of a magic number, on code that was correct. An anchor that moves with the
   * file cannot do that.
   */
  const EXTRACT = (() => {
    const all = readFileSync(join(__dirname, '../conversation/conversation.service.ts'), 'utf8');
    const from = all.indexOf('async extractExpectations(');
    expect(from).toBeGreaterThan(-1);
    const to = all.indexOf('\n  async ', from + 10);
    expect(to).toBeGreaterThan(from);
    return all.slice(from, to);
  })();

  it('a lead states one, and it starts unseen', () => {
    expect(EXTRACT).toMatch(/authoredBy: 'lead'/);
    expect(EXTRACT).toMatch(/seenBySubject: false/);
  });

  it('and restating it in different words makes it unseen AGAIN', () => {
    /**
     * THE ONE THAT WOULD HAVE BEEN A REAL UNFAIRNESS, and I shipped it wrong once. If a lead rewrites
     * an expectation, the person has not read the new words. Carrying `seenBySubject: true` forward
     * would let changed words be read against somebody who never saw the change - which is exactly
     * what the flag exists to refuse, and the gap probe would have pressed them on it next session.
     *
     * Only a CHANGE resets it: a lead repeating the same expectation is not new words.
     */
    expect(EXTRACT).toMatch(/const textChanged = !!prior && prior\.text\.trim\(\) !== text/);
    expect(EXTRACT).toMatch(/\.\.\.\(textChanged \? \{ seenBySubject: false \} : \{\}\)/);
  });

  it('stating one is the lead\'s, and only from their own check-in', () => {
    expect(EXTRACT).toMatch(/me\?\.partyType !== PartyType\.INITIATOR\) return/);
  });

  /**
   * A name that cannot be resolved against THIS check-in's roster is dropped, never guessed - the
   * equivalent of the old "a participant id from another ground must not be writable".
   */
  it('and only for somebody actually in this check-in', () => {
    expect(EXTRACT).toMatch(/const target = resolve\(e\.personName\)/);
    expect(EXTRACT).toMatch(/if \(!target\) continue/);
  });

  /**
   * THE HALF OF "ACCEPTING" THAT SURVIVED, and it is the important half. "They were shown it" and
   * "they accepted it" were different claims; only the first exists now, and it must still never be
   * set by a page merely loading. The ground read does not write it - a dedicated call does, from the
   * view that actually renders the words.
   */
  it('and no read path marks an expectation seen', () => {
    const get = CODE.slice(CODE.indexOf('const objectiveRows'), CODE.indexOf('const participantsWithCheckIns'));
    expect(get.length).toBeGreaterThan(50);
    expect(get).not.toMatch(/personObjective\.(update|upsert|create)/);
    expect(get).toMatch(/personObjective\.findMany/);
  });

  /**
   * SEEN BY WHOM. Found by mutation: changing the update to `where: { groundId }` - which would mark
   * every person's expectation seen the moment any one of them opened the page - compiled clean and
   * no test noticed. That is the worst kind of hole in a fairness flag, because the damage is silent:
   * three people become readable against words two of them never saw.
   *
   * The row is found from the CALLER'S OWN user link on this check-in, and no participant id is taken
   * from the client.
   */
  it('marks only the caller\'s own expectation, not everybody\'s', () => {
    const mark = CODE.slice(CODE.indexOf('async markMyExpectationShown('));
    expect(mark.slice(0, 900)).toMatch(/where: \{ groundId, userId: requestingUserId \}/);
    expect(mark.slice(0, 900)).toMatch(/participantId: me\.id/);
  });

  /** And the capability that was removed stays removed. */
  it('nothing writes an expectation authored by the person it is about', () => {
    expect(CODE).not.toMatch(/authoredBy: 'self'/);
    expect(CODE).not.toMatch(/async (proposeObjective|stateMyObjective|acceptMyObjective)\(/);
  });
});

describe('and the state travels with the text', () => {
  it('the ground returns the description and the gate, not just the words', () => {
    expect(CODE).toMatch(/state: objectiveState\(shaped\)/);
    expect(CODE).toMatch(/described: describeObjective\(shaped\)/);
    expect(CODE).toMatch(/mayBeReadAgainst: mayBeReadAgainst\(shaped\)/);
  });

  it('the setup chat counts the right table now', () => {
    /**
     * It counted `ground.objectives` - `GroundObjective`, one per ground - for a question about each
     * PERSON. And it counts only what may be read against, because a proposal nobody has seen does not
     * answer "what is this person trying to achieve", it means somebody typed something.
     */
    expect(CODE).not.toMatch(/perPersonObjectiveCount: ground\.objectives\.length/);
    expect(CODE).toMatch(/perPersonObjectiveCount: perPersonObjectives/);
    expect(CODE).toMatch(/\)\.filter\(o => mayBeReadAgainst\(\{/);
  });

  /**
   * THE RULE OUTLIVED THE PANEL THAT STATED IT.
   *
   * This read `ObjectivePanel.tsx`, which is gone. That panel was the old model - the lead PROPOSES a
   * target, the person ACCEPTS it or writes their own - and it contradicted the one the product runs
   * on now: one person states an expectation, it is published where everyone reads it, and nobody
   * agrees to anything by form.
   *
   * The rule itself did not change and matters more than ever: nothing is read against somebody who
   * has not seen the thing. What changed is where it is enforced. It is no longer a sentence a panel
   * prints - it is a branch in the interview's own instructions, keyed on `seenBySubject`, deciding
   * whether the session presses on the gap at all.
   */
  it('and an unseen expectation is not pressed on in the session', () => {
    const PROMPT = readFileSync(
      join(__dirname, '../conversation/prompt-library.ts'),
      'utf8',
    );
    expect(PROMPT).toMatch(/seenBySubject/);
    expect(PROMPT).toMatch(/THEY HAVE NOT SEEN IT/);
    expect(PROMPT).toMatch(/read nothing against it this session/);
  });

  /** And the person can actually see it, which is what makes the flag mean anything. */
  it('and the expectation is on screen for the person it is about', () => {
    const PANEL = readFileSync(
      join(__dirname, '../../../../client/src/components/gw/ExpectationsPanel.tsx'),
      'utf8',
    );
    expect(PANEL).toMatch(/markMyExpectationShown/);
  });
});
