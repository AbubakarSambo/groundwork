import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { theChallengeWorthPutting, howManyTheyMeant, sayThisChallenge } from './what-a-claim-costs-to-prove';
import type { Claim } from './what-we-have-so-far';

const claim = (c: Partial<Claim> & { id: string; kind: Claim['kind']; said: string }): Claim =>
  ({ session: 1, ...c } as Claim);

/**
 * "IT IS A GENERIC CONVERSATION NOT BY AN EXPERT."
 *
 * The conversation already knew what was MISSING from her claim - the baseline - and asking "what
 * is the current figure?" is a form asking for a field. Her own claim, and what an expert says
 * about it:
 *
 *   thirty thousand women farmers, income up thirty per cent, measured from data taken from the
 *   women before and after the intervention
 *
 *   -> "That is 60,000 measurements - once before and once after, and the same people both times."
 *
 * Which is arithmetic. That is the point: everything here is true by the STRUCTURE of the claim, so
 * it can be put to somebody without knowing anything about Nigeria or horticulture.
 */
describe('her claim, challenged', () => {
  const hers = [
    claim({ id: 'c1', kind: 'PLAN', said: 'run interventions to impact 30k women farmers', number: '30k' }),
    claim({
      id: 'c2', kind: 'TARGET', said: 'increase their incomes by 30%', measure: 'income',
      number: '30,000', verification: 'data from the women before and after the intervention',
    }),
  ];

  it('is told what the measurement actually costs', () => {
    const put = theChallengeWorthPutting(hers)!;
    expect(put.say).toContain('60,000 measurements');
    expect(put.say).toContain('once before and once after, and the same people both times');
    /* And it hands the turn back, with the alternative in it. */
    expect(put.say).toMatch(/\?$/);
    expect(put.say).toContain('record already being kept');
  });

  /* Arithmetic, not an opinion about programmes. That is why it can be asserted. */
  it('and what it rests on is arithmetic', () => {
    expect(theChallengeWorthPutting(hers)!.restsOn).toContain('arithmetic');
  });

  /**
   * TWO CHALLENGES ABOUT ONE CLAIM, AND THE SECOND IS A DIFFERENT PROBLEM.
   *
   * My first version keyed the memory on the claim, so putting the measurement challenge silently
   * ruled out ever asking which half of the income she meant. Caught by running it twice.
   */
  it('and a second, different challenge is still available', () => {
    const first = theChallengeWorthPutting(hers)!;
    const second = theChallengeWorthPutting(hers, [first.key])!;
    expect(second.key).not.toBe(first.key);
    expect(second.say).toContain('Income is price times volume');
    expect(second.say).toMatch(/Which of the two/);
  });

  /* But never the same one twice: somebody asked again has not been challenged, they have been doubted. */
  it('and never the same one twice', () => {
    const first = theChallengeWorthPutting(hers)!;
    const second = theChallengeWorthPutting(hers, [first.key])!;
    expect(theChallengeWorthPutting(hers, [first.key, second.key])).toBeNull();
  });
});

describe('a figure as somebody wrote it', () => {
  it('is the same number however they wrote it', () => {
    expect(howManyTheyMeant('30k')).toBe(30000);
    expect(howManyTheyMeant('30,000')).toBe(30000);
    expect(howManyTheyMeant('30 thousand')).toBe(30000);
    expect(howManyTheyMeant('1.5m')).toBe(1500000);
    expect(howManyTheyMeant('15')).toBe(15);
  });

  it('and nothing where there is no figure', () => {
    expect(howManyTheyMeant('some')).toBeNull();
    expect(howManyTheyMeant(null)).toBeNull();
  });
});

describe('a record somebody else keeps', () => {
  it('is a record you have to be allowed to read', () => {
    const put = theChallengeWorthPutting([claim({
      id: 'm', kind: 'TARGET', said: 'fifteen meetings a month', measure: 'meetings', number: '15', verification: 'the CRM',
    })])!;
    expect(put.say).toContain('Whose records are those');
  });

  /* Already theirs: nothing to ask. */
  it('and not where they have said it is theirs', () => {
    expect(theChallengeWorthPutting([claim({
      id: 'm', kind: 'TARGET', said: 'fifteen meetings a month', measure: 'meetings', verification: 'our own CRM',
    })])).toBeNull();
  });
});

describe('and what is not challenged', () => {
  /* A small survey is a survey. Challenging "we asked our twelve agents" would be pedantry. */
  it('a measurement small enough to actually run', () => {
    expect(theChallengeWorthPutting([claim({
      id: 's', kind: 'TARGET', said: 'all forty agents trained', measure: 'agents', number: '40',
      verification: 'asking them',
    })])).toBeNull();
  });

  it('and a plain fact about their work', () => {
    expect(theChallengeWorthPutting([claim({ id: 'f', kind: 'FACT', said: 'we process cassava in Ogun' })])).toBeNull();
  });

  it('and nothing at all', () => {
    expect(theChallengeWorthPutting(null)).toBeNull();
    expect(theChallengeWorthPutting([])).toBeNull();
  });
});

describe('what the conversation is told to do with it', () => {
  const told = sayThisChallenge(theChallengeWorthPutting([claim({
    id: 'c', kind: 'TARGET', said: 'incomes up 30%', measure: 'income', number: '30000',
    verification: 'a survey before and after',
  })])!);

  it('to say it in their words and end on the question', () => {
    expect(told).toContain('in the words they have been using');
    expect(told).toContain('end on the question');
  });

  /* The failure mode is turning a challenge back into a field request. */
  it('and not to soften it into asking for a field', () => {
    expect(told).toContain('Do not soften it into a request for a field');
  });

  it('and one per turn', () => {
    expect(told).toMatch(/One of these per turn/);
  });
});

describe('and it is ranked behind what they asked for', () => {
  const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  /* One method owns the rank - see the-same-question-twice - so the guard reads its body. */
  const rank = SRC.slice(SRC.indexOf('private whichHoleToPush('), SRC.indexOf('async theSubjectsToCover('));

  /* What they asked for outranks what we would like to say: the steer returns before the challenge
     is even computed. */
  it('a steer still wins', () => {
    const steerAt = rank.indexOf('return { text: followTheirLead(');
    const challengeAt = rank.indexOf('theChallengeWorthPutting(');
    expect(steerAt).toBeGreaterThan(-1);
    expect(challengeAt).toBeGreaterThan(steerAt);
  });

  it('and a challenge beats asking a question', () => {
    expect(rank).toMatch(/if \(challenge\) return \{ text: sayThisChallenge\(challenge\)/);
    expect(rank.indexOf('sayThisChallenge(challenge)')).toBeLessThan(rank.indexOf('whatToAskAbout('));
  });

  /* Marked as put after the reply has gone, not while the prompt is being built - a prompt is
     assembled whether or not the turn ever reaches anybody. */
  it('and is remembered after the turn, not during it', () => {
    const notes = SRC.slice(SRC.indexOf('async noteWhatTheySaid('), SRC.indexOf('async writeTheRecordFromTheAssessment('));
    /* And not by a turn that said goodbye: that reply put nothing to anybody, and a challenge
       marked as said without being said is a challenge nobody ever gets. */
    expect(notes).toMatch(/const putLastTurn = row\.completedAt \? null : theChallengeWorthPutting\(before\.claims, before\.challenged/);
  });
});
