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

describe('the three writes that make those states possible', () => {
  it('a lead proposes, and it starts unseen', () => {
    const propose = CODE.slice(CODE.indexOf('async proposeObjective('), CODE.indexOf('async stateMyObjective('));
    expect(propose).toMatch(/authoredBy: 'lead', seenBySubject: false/);
  });

  it('and re-proposing makes it unseen AGAIN', () => {
    /**
     * THE ONE THAT WOULD HAVE BEEN A REAL UNFAIRNESS. If a lead rewrites the objective, the person has
     * not read the new words. Carrying `seenBySubject: true` forward would let a changed target be read
     * against somebody who never saw the change - exactly what `mayBeReadAgainst` exists to refuse.
     */
    const propose = CODE.slice(CODE.indexOf('async proposeObjective('), CODE.indexOf('async stateMyObjective('));
    expect(propose).toMatch(/update: \{ text: body, authoredBy: 'lead', seenBySubject: false \}/);
  });

  it('the person can write their own, which is seen by definition', () => {
    const own = CODE.slice(CODE.indexOf('async stateMyObjective('), CODE.indexOf('async acceptMyObjective('));
    expect(own).toMatch(/authoredBy: 'self', seenBySubject: true/);
    /** Theirs to state, so it is keyed on their own participant link and takes no id from the client. */
    expect(own).toMatch(/groundParticipant\.findFirst\(\{\s*where: \{ groundId, userId: requestingUserId \}/);
  });

  it('and accepting is its own act, not a side effect of the page loading', () => {
    /**
     * "They were shown it" and "they accepted it" are different claims, and only one of them is fair to
     * act on. So there is an endpoint for it and no read path sets the flag.
     */
    const accept = CODE.slice(CODE.indexOf('async acceptMyObjective('), CODE.indexOf('async acceptMyObjective(') + 1400);
    expect(accept).toMatch(/data: \{ seenBySubject: true \}/);
    expect(accept).toMatch(/There is nothing proposed for you yet/);
    /**
     * The read must never mark it seen. Asserted as "no write in the read path" rather than on the text
     * `seenBySubject: true`, which also appears in the Prisma `select` - my first version failed against
     * correct code for exactly that reason.
     */
    const get = CODE.slice(CODE.indexOf('const objectiveRows'), CODE.indexOf('const participantsWithCheckIns'));
    expect(get).not.toMatch(/personObjective\.(update|upsert|create)/);
    expect(get).toMatch(/personObjective\.findMany/);
  });

  it('proposing for somebody is the lead\'s, and checked against this ground', () => {
    const propose = CODE.slice(CODE.indexOf('async proposeObjective('), CODE.indexOf('async stateMyObjective('));
    expect(propose).toMatch(/ground\.initiatorId !== requestingUserId && !isOrgAdmin/);
    /** A participant id from another ground must not be writable. */
    expect(propose).toMatch(/findFirst\(\{ where: \{ id: participantId, groundId \} \}\)/);
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

  it('and the panel says out loud when nothing may be read against it', () => {
    const PANEL = readFileSync(
      join(__dirname, '../../../../client/src/components/gw/ObjectivePanel.tsx'),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(PANEL).toMatch(/Nothing is read against this until/);
    expect(PANEL).toMatch(/!objective\.mayBeReadAgainst &&/);
  });
});
