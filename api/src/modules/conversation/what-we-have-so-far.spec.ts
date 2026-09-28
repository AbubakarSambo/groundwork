import { nothingYet, withThisTurn, whatIsMissing, theGapWorthRaising, whatToAskAbout, type Claim, type WhatWeHave } from './what-we-have-so-far';

const claim = (c: Partial<Claim> & { id: string; kind: Claim['kind']; said: string }): Claim =>
  ({ session: 1, ...c } as Claim);

/**
 * HER OWN CHECK-IN, REPLAYED.
 *
 * Nine answers, 23 September 2026:
 *
 *   I plan to run interventions to impact 30k women farmers
 *   i said farmers                                              (a remark)
 *   no specific states but they have to be woemn
 *   horticulture
 *   no volumes, just increase their incomes by 30%
 *   getting data from the women before and after the intervention
 *   sales records
 *   and yield too
 *   we dont really care about capacity, just their yield increase
 *   ...then four turns about the product itself
 *
 * What the conversation asked her next was "what capacity and networks do you already have". What
 * it should have asked is in the gaps below, and this is the test that says so.
 */
describe('what we have, replayed from her transcript', () => {
  /* The state as the extractor would have built it - one target, sharpened over four turns. */
  const afterHerAnswers = [
    claim({ id: 'c1', kind: 'PLAN', said: 'run interventions to impact 30k women farmers', number: '30,000', place: null, owner: null, date: null }),
    claim({ id: 'c2', kind: 'TARGET', said: 'increase their incomes by 30%', measure: 'income', number: '30%', verification: 'sales records and yield' }),
  ];

  const state = (() => {
    let s = nothingYet();
    s = withThisTurn(s, [afterHerAnswers[0]], false);
    s = withThisTurn(s, [], true);                       // "i said farmers"
    s = withThisTurn(s, [claim({ id: 'c2', kind: 'TARGET', said: 'increase their incomes by 30%', measure: 'income', number: '30%' })], false);
    s = withThisTurn(s, [claim({ id: 'c2', kind: 'TARGET', said: 'increase their incomes by 30%', verification: 'sales records and yield' })], false);
    return s;
  })();

  it('holds the target, the measure and the verification as one claim, not four', () => {
    const target = state.claims.find((c) => c.id === 'c2')!;
    expect(target.measure).toBe('income');
    expect(target.number).toBe('30%');
    expect(target.verification).toBe('sales records and yield');
    expect(state.claims).toHaveLength(2);
  });

  it('and counts the remarks without keeping them', () => {
    expect(state.remarks).toBe(1);
    expect(state.answers).toBe(3);
    expect(JSON.stringify(state)).not.toContain('i said farmers');
  });

  /**
   * THE WHOLE POINT. The next question she was asked was about capacity. The three things actually
   * missing are the baseline, who owns the plan, and when - and the baseline is the one that
   * decides whether any of it can be claimed at the end.
   */
  it('and names what is missing, worst first', () => {
    const gaps = whatIsMissing(state);
    expect(gaps.map((g) => g.kind)).toEqual([
      'number-has-no-baseline',
      'nobody-said-who-they-are',
      'plan-has-no-owner',
      'plan-has-no-date',
    ]);
  });

  it('and the one worth raising is the baseline', () => {
    const next = theGapWorthRaising(state)!;
    expect(next.kind).toBe('number-has-no-baseline');
    expect(next.because).toContain('30% is a change');
    /* It quotes her, so whatever raises it can use her words rather than a paraphrase. */
    expect(next.about).toContain('increase their incomes by 30%');
  });
});

describe('what a claim needs, by its type', () => {
  it('a target with no measure cannot be told whether it happened', () => {
    const s = withThisTurn(nothingYet(), [claim({ id: 't', kind: 'TARGET', said: 'grow the business' })], false);
    expect(whatIsMissing(s)[0].kind).toBe('target-has-no-measure');
  });

  /* And once a measure exists, the question moves on rather than being asked again. */
  it('and a measure with no source cannot be checked', () => {
    const s = withThisTurn(nothingYet(), [claim({ id: 't', kind: 'TARGET', said: 'fifteen meetings a month', measure: 'meetings' })], false);
    expect(whatIsMissing(s)[0].kind).toBe('measure-cannot-be-verified');
    expect(whatIsMissing(s)[0].because).toContain('meetings figure');
  });

  it('and nothing is missing once a target carries all three', () => {
    const s = withThisTurn(nothingYet(), [claim({
      id: 't', kind: 'TARGET', said: 'fifteen meetings a month', measure: 'meetings',
      verification: 'the CRM', number: '15', baseline: 'nine now',
    })], false);
    expect(whatIsMissing(s)).toEqual([]);
  });

  it('a plan needs somebody doing it and a date', () => {
    const s = withThisTurn(nothingYet(), [claim({ id: 'p', kind: 'PLAN', said: 'open in Kano' })], false);
    expect(whatIsMissing(s).map((g) => g.kind)).toEqual(['plan-has-no-owner', 'plan-has-no-date']);
  });

  /* An opinion is not a claim with holes in it. Asking somebody to verify what they think is how a
     conversation turns into a cross-examination - see the-same-burden-on-both-sides. */
  it('and an opinion is asked for nothing', () => {
    const s = withThisTurn(nothingYet(), [claim({ id: 'o', kind: 'OPINION', said: 'the roads decide the business' })], false);
    expect(whatIsMissing(s)).toEqual([]);
  });
});

describe('who we are talking to', () => {
  const anAnswer = (id: string) => claim({ id, kind: 'FACT', said: 'we process cassava' });

  /* Not on the first turn: somebody who has said one thing has not withheld anything yet. */
  it('is not raised before they have said anything much', () => {
    const s = withThisTurn(nothingYet(), [anAnswer('a')], false);
    expect(whatIsMissing(s).some((g) => g.kind === 'nobody-said-who-they-are')).toBe(false);
  });

  it('and is raised once they have', () => {
    let s = withThisTurn(nothingYet(), [anAnswer('a')], false);
    s = withThisTurn(s, [anAnswer('b')], false);
    expect(whatIsMissing(s).some((g) => g.kind === 'nobody-said-who-they-are')).toBe(true);
  });

  it('and never once they have said what they do', () => {
    let s: WhatWeHave = { ...withThisTurn(nothingYet(), [anAnswer('a')], false), who: { role: 'operations lead' } };
    s = withThisTurn(s, [anAnswer('b')], false);
    expect(whatIsMissing(s).some((g) => g.kind === 'nobody-said-who-they-are')).toBe(false);
  });
});

describe('merging a turn', () => {
  /* A turn that does not mention the date must not erase the date. */
  it('fills fields in and never empties one', () => {
    let s = withThisTurn(nothingYet(), [claim({ id: 'c', kind: 'PLAN', said: 'open in Kano', date: 'November' })], false);
    s = withThisTurn(s, [claim({ id: 'c', kind: 'PLAN', said: 'open in Kano', owner: 'Amina' })], false);
    const c = s.claims[0];
    expect(c.date).toBe('November');
    expect(c.owner).toBe('Amina');
  });

  /**
   * AND THE WORDS ARE SET ONCE.
   *
   * This test asserted the opposite - newest words win - and a live replay of her own five answers
   * proved it wrong within a minute. The extractor kept reusing one id, so the claim's words walked
   * from "run interventions to impact 30k women farmers" to "getting data from the women before and
   * after the intervention" while the measure and number from earlier turns stayed attached to it.
   * One claim, three subjects, and the 30% target nowhere.
   */
  it('and the first words they used for it are the claim', () => {
    let s = withThisTurn(nothingYet(), [claim({ id: 'c', kind: 'TARGET', said: 'increase their incomes by 30%' })], false);
    s = withThisTurn(s, [claim({ id: 'c', kind: 'TARGET', said: 'getting data from the women', verification: 'sales records' })], false);
    expect(s.claims[0].said).toBe('increase their incomes by 30%');
    expect(s.claims[0].verification).toBe('sales records');
  });
});

/**
 * AND WHAT THE CONVERSATION IS TOLD TO ASK.
 *
 * This is the half that replaces "ask the next item on the brief". On her own transcript the hole
 * is the baseline, and what the check-in actually asked her next was "what capacity and networks do
 * you already have".
 */
describe('what to ask about', () => {
  const claim = (c: any) => ({ session: 1, ...c });

  it('says the hole, why it bites, and quotes them', () => {
    const s = withThisTurn(nothingYet(), [claim({
      id: 'c', kind: 'TARGET', said: 'increase their incomes by 30%', measure: 'income', number: '30%', verification: 'sales records',
    })], false);
    const told = whatToAskAbout(s);
    expect(told).toContain('THE MOST USEFUL THING MISSING');
    expect(told).toContain('what it is now');
    expect(told).toContain('"increase their incomes by 30%"');
    /* And it will not be claimable at the end, which is the reason it matters. */
    expect(told).toContain('not be claimable');
  });

  /* A measure nobody collects is the hole that makes every other answer unusable, so it outranks
     the rest - and the turn is told to say so plainly rather than move on. */
  it('and puts an unverifiable measure first', () => {
    const s = withThisTurn(nothingYet(), [claim({ id: 'c', kind: 'TARGET', said: 'fifteen meetings a month', measure: 'meetings' })], false);
    expect(whatToAskAbout(s)).toContain('whose records, which system, who reads it');
  });

  /* It decides what to ASK, never what to ignore: the person in front of you comes first. */
  it('and never overrides what they just said', () => {
    const s = withThisTurn(nothingYet(), [claim({ id: 'c', kind: 'PLAN', said: 'open in Kano' })], false);
    expect(whatToAskAbout(s)).toContain('Answer whatever they just said first');
    expect(whatToAskAbout(s)).toContain('Ask it as one question');
  });

  /* Where nothing is missing the block is empty and the brief carries the turn, as before. */
  it('and says nothing where nothing is missing', () => {
    expect(whatToAskAbout(nothingYet())).toBe('');
    const whole = withThisTurn(nothingYet(), [claim({
      id: 'c', kind: 'TARGET', said: 'fifteen meetings a month', measure: 'meetings', verification: 'the CRM', number: '15', baseline: 'nine now',
    })], false);
    expect(whatToAskAbout(whole)).toBe('');
  });
});
