import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { whatTheyGaveUs, howItReads, whatItStillNeeds, WHAT_THE_LEVEL_MEANS } from './what-they-gave-us-to-work-with';

/**
 * THE ONE PERSON WHO COULD ACT ON IT WAS THE ONLY ONE NEVER TOLD.
 *
 * Hafsah, 23 September 2026: "specificity should be communicated to each user after their checkin."
 * It has been measured on every message for months - a level and five dimensions on every check-in -
 * and used only to pick the assistant's tone. The prompt carrying it says, in its own words, "behind
 * the curtain - never name these system terms to the person".
 */
const notes = (claims: any[]) => ({ claims, contradictions: [], remarks: 0, answers: claims.length }) as any;

describe('what they gave us, said back to them', () => {
  const real = notes([
    { id: 'a', kind: 'FACT', said: 'About two thousand tonnes a quarter', measure: 'tonnes', number: '2,000', date: 'a quarter', session: 1 },
    { id: 'b', kind: 'PLAN', said: 'Next year I want to move into Niger and Kogi', date: 'next year', place: 'Niger and Kogi', session: 1 },
    { id: 'c', kind: 'TARGET', said: 'raise their income by 30%', measure: 'income', number: '30%', session: 1 },
    { id: 'd', kind: 'PLAN', said: 'expand the business', session: 1 },
  ]);

  /*
   * CHECKABLE MEANS NOTHING IS STILL MISSING FROM IT, which is a higher bar than carrying one of
   * the four fields - and it has to be, because the two halves of this note are cut from one line.
   * The first version counted "increase their incomes by 30%" as checkable and then, underneath,
   * asked what that 30% was a change from: the product contradicting itself about somebody's own
   * words. Only the tonnage survives here, and that is the honest read of this record.
   */
  it('counts only what a reader could act on with nothing further', () => {
    const out = whatTheyGaveUs(real);
    expect(out.checkable).toBe(1);
    expect(out.general).toBe(3);
    /* Their own words, never a paraphrase. */
    expect(out.theStrongest).toEqual(['About two thousand tonnes a quarter']);
    expect(out.saying).toContain('1 of 4');
  });

  /* And nothing appears in both halves, whatever the record looks like. */
  it('and never says a thing is checkable and then asks for more of it', () => {
    const out = whatTheyGaveUs(real);
    for (const w of out.worthAdding) expect(out.theStrongest).not.toContain(w.said);
  });

  it('and names the one detail that would make the rest usable', () => {
    const out = whatTheyGaveUs(real);
    expect(out.worthAdding.length).toBeGreaterThan(0);
    expect(out.worthAdding.map((w) => w.needs).join(' ')).toMatch(/number|by when|change from|where/);
    expect(whatItStillNeeds({ id: 'x', kind: 'TARGET', said: '30%', number: '30%', measure: 'income' } as any)).toBe('what it is a change from');
    expect(whatItStillNeeds({ id: 'x', kind: 'PLAN', said: 'open in Kano', place: 'Kano', number: '1', baseline: '0' } as any)).toBe('by when');
    /*
     * AND A PLAN IS NOT ASKED FOR A BASELINE. Read live off a real check-in: "I plan to run
     * interventions to impact 30k women farmers - needs what it is a change from". It does not. A
     * baseline is a target's question; a plan's are when, where and who.
     */
    expect(whatItStillNeeds({ id: 'x', kind: 'PLAN', said: 'impact 30k women farmers', number: '30k' } as any)).toBe('by when');
  });

  /* An opinion is never given fields and must never be asked to carry one. */
  it('and never asks an opinion for a number', () => {
    expect(whatItStillNeeds({ id: 'o', kind: 'OPINION', said: 'the roads decide the business' } as any)).toBeNull();
  });

  /*
   * NO SCORE, NO PERCENTAGE, NO GRADE. Two customers spent the morning saying what an ungrounded
   * number is worth to them, and a person handed "specificity: 0.34" learns nothing.
   */
  it('and shows no score of any kind', () => {
    const said = whatTheyGaveUs(real, 'directional').saying;
    expect(said).not.toMatch(/\b0\.\d+/);
    expect(said).not.toMatch(/%\s*(specific|score)/i);
    expect(said).not.toMatch(/\bspecificity\b|\bdirectional\b|\bmanaged\b|\bvague\b/i);
  });

  /* The engine's four words are never said to anybody; what they mean is. */
  it('and says what the level means rather than naming it', () => {
    expect(WHAT_THE_LEVEL_MEANS.managed).toBe('There is nothing here yet that anybody else could check.');
    expect(whatTheyGaveUs(real, 'specific').saying).toContain('Somebody who was not here could act on this.');
    expect(Object.values(WHAT_THE_LEVEL_MEANS).join(' ')).not.toMatch(/you (are|were) (vague|managed)/i);
  });

  it('and says nothing at all where there is nothing honest to say', () => {
    expect(whatTheyGaveUs(notes([])).saying).toBe('');
    expect(whatTheyGaveUs(null).saying).toBe('');
    expect(howItReads(0, 0)).toBe('');
  });

  /* Somebody who gave everything checkable is told that, not told what is missing. */
  it('and does not invent a fault where there is none', () => {
    const strong = notes([
      { id: 'a', kind: 'FACT', said: '400 tonnes last season in Benue', number: '400', place: 'Benue', date: 'last season', verification: 'the weighbridge', session: 1 },
    ]);
    expect(whatTheyGaveUs(strong).saying).toContain('Everything you said can be checked');
  });
});

describe('and it reaches them', () => {
  const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');

  it('on the completion the person asked for', () => {
    expect(SRC).toMatch(/whatYouGave\?: WhatTheyGave/);
    expect(SRC).toMatch(/const whatYouGave = whatTheyGaveUs\(/);
    /* And only where there is something true to say: an empty block after finishing is worse than
       no block, and a session with nothing in its notes has nothing to tell anybody. */
    expect(SRC).toMatch(/\.\.\.\(whatYouGave\.saying \? \{ whatYouGave \} : \{\}\)/);
  });

  /* Read from what the conversation already holds: no model call, nothing a person waits for. */
  it('without a model call or a second request', () => {
    const at = SRC.indexOf('const whatYouGave = whatTheyGaveUs(');
    expect(SRC.slice(at, at + 300)).toContain('whatWeHave');
    expect(SRC.slice(at, at + 300)).not.toContain('await this.anthropic');
  });
});
