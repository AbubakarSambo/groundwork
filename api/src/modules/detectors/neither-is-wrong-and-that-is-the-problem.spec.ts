import { findGoalDivergence, overlap, sayIt, DIVERGENCE_BELOW, NEEDS_ACCOUNTS } from './describing-the-same-goal-differently';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * TWO PEOPLE ON ONE OBJECTIVE, DESCRIBING IT AS DIFFERENT WORK.
 *
 * Their OKR tool holds one sentence written by whoever set the objective. It has no idea the owner
 * thinks this is about cutting the onboarding queue while a contributor thinks it is about
 * rewriting the docs. Both are working hard, neither is lying, and the objective is going to miss.
 *
 * THE DANGEROUS THING TO ACCIDENTALLY BUILD is a writing score. "These two descriptions are
 * dissimilar" is one short step from "this person describes things badly", which is the first of
 * the four things §12.8 forbids leaving the API - so the comparison is symmetric, names nobody as
 * the correct one, and has no baseline to deviate from.
 */
const SRC = readFileSync(join(__dirname, 'describing-the-same-goal-differently.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const OWNER = 'cut the onboarding queue down to under two days for new customers';
const CONTRIB = 'rewrite the developer documentation and publish the new guides';
const AGREES = 'get the onboarding queue under two days for customers who are new';

describe('describing the same goal differently', () => {
  it('finds two accounts that share almost nothing', () => {
    const [d] = findGoalDivergence('OKR-A', [
      { personExternalId: 'u-a', text: OWNER },
      { personExternalId: 'u-b', text: CONTRIB },
    ]);
    expect(d).toBeTruthy();
    expect(d.between.sort()).toEqual(['u-a', 'u-b']);
    expect(d.overlap).toBeLessThan(DIVERGENCE_BELOW);
  });

  it('says nothing when two people describe the same work in different words', () => {
    /* Different sentences are not a divergence. The finding is about the WORK being different, and
       a detector that fires on paraphrase is one that gets switched off. */
    expect(findGoalDivergence('OKR-A', [
      { personExternalId: 'u-a', text: OWNER },
      { personExternalId: 'u-b', text: AGREES },
    ])).toEqual([]);
  });

  it('needs at least two people, because one account cannot diverge', () => {
    expect(findGoalDivergence('OKR-A', [{ personExternalId: 'u-a', text: OWNER }])).toEqual([]);
    expect(NEEDS_ACCOUNTS).toBe(2);
  });

  it('takes one account per person, their latest', () => {
    /* Two of somebody's own sentences disagreeing is a person changing their mind, not a team out
       of step. */
    const found = findGoalDivergence('OKR-A', [
      { personExternalId: 'u-a', text: CONTRIB },
      { personExternalId: 'u-a', text: OWNER },
      { personExternalId: 'u-b', text: AGREES },
    ]);
    expect(found).toEqual([]);
  });

  it('is symmetric, and names neither as the right one', () => {
    /*
     * There is no baseline description here and no deviation from it. A finding that said "the
     * contributor has drifted from the owner's version" would be the product taking a side about
     * which of two colleagues understood the objective.
     */
    const ab = overlap(OWNER, CONTRIB);
    const ba = overlap(CONTRIB, OWNER);
    expect(ab).toBe(ba);
    expect(SRC).not.toMatch(/baseline|canonical|correct|authoritative/i);
  });

  it('never scores how well anybody writes', () => {
    /* The first of §12.8's four exclusions, and the easiest to build here by accident. */
    for (const word of ['clarity', 'quality', 'articulacy', 'specificity', 'wellWritten', 'score']) {
      expect(SRC).not.toContain(word);
    }
  });

  it('treats an empty account as nothing to compare rather than as total disagreement', () => {
    expect(overlap('', OWNER)).toBe(1);
    expect(overlap(OWNER, '   ')).toBe(1);
  });

  it('ignores the words nobody chose', () => {
    /* "the queue" and "a queue" differ only in words nobody picked. */
    expect(overlap('the onboarding queue', 'onboarding queue')).toBe(1);
  });

  it('quotes both and blames neither', () => {
    const [d] = findGoalDivergence('OKR-A', [
      { personExternalId: 'u-a', text: OWNER },
      { personExternalId: 'u-b', text: CONTRIB },
    ]);
    const line = sayIt(d, 'Reduce onboarding time');
    expect(line).toContain(OWNER);
    expect(line).toContain(CONTRIB);
    expect(line).toMatch(/Neither is wrong/i);
    for (const blame of ['should have', 'failed to', 'misunderstood', 'wrong about']) {
      expect(line.toLowerCase()).not.toContain(blame);
    }
  });

  it('puts the widest gap first', () => {
    const found = findGoalDivergence('OKR-A', [
      { personExternalId: 'u-a', text: 'onboarding queue under two days' },
      { personExternalId: 'u-b', text: 'rewrite documentation publish guides' },
      { personExternalId: 'u-c', text: 'onboarding documentation rewrite' },
    ]);
    for (let i = 1; i < found.length; i++) {
      expect(found[i - 1].overlap).toBeLessThanOrEqual(found[i].overlap);
    }
  });
});

describe('only where somebody actually said which objective it was', () => {
  const SERVICE = readFileSync(join(__dirname, 'detectors.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('runs only for grounds linked to a subject', () => {
    /*
     * A ground opened inside Groundwork has no subject and never will. Inferring one from a title
     * would mean deciding what somebody meant and then reporting a divergence between two named
     * people based on the guess.
     */
    expect(SERVICE).toMatch(/subjectExternalId: \{ not: null \}/);
  });

  it('leaves out anybody the customer’s own systems do not know', () => {
    /* A finding about people has to name people they can look up. */
    expect(SERVICE).toMatch(/if \(person\) accounts\.push/);
  });
});

describe('the link is only made to something that exists', () => {
  const CTRL = readFileSync(join(__dirname, 'checkins.controller.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('refuses an objective nobody has pushed', () => {
    /*
     * A check-in linked to a subject we do not hold would produce findings about a title we cannot
     * show, and the customer would have no way to tell what it was talking about. Strictness here
     * is cheap; strictness at read time is not.
     */
    expect(CTRL).toMatch(/if \(!subject\) throw new BadRequestException/);
  });

  it('and both sides are scoped to the caller’s organisation', () => {
    /* A guessed ground id from another tenant has to resolve to nothing rather than to their
       check-in - and the subject lookup is scoped for the same reason. */
    const ground = CTRL.slice(CTRL.indexOf('ground.findFirst'), CTRL.indexOf('ground.findFirst') + 220);
    const subject = CTRL.slice(CTRL.indexOf('subject.findFirst'), CTRL.indexOf('subject.findFirst') + 220);
    expect(ground).toContain('organizationId');
    expect(subject).toContain('organizationId');
  });

  it('the link carries an invitation and nothing else', () => {
    /* A link forwarded to the wrong person should reveal no name, no objective and no context
       before they sign in. */
    const ret = CTRL.slice(CTRL.indexOf('return {'));
    for (const leak of ['title', 'displayName', 'personExternalId', 'body']) {
      expect(ret).not.toContain(leak);
    }
  });
});
