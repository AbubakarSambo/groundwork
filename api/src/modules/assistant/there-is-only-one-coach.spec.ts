import { readFileSync } from 'fs';
import { join } from 'path';
import { route } from './the-router-is-deterministic';

/**
 * THE COACH ALREADY EXISTED. THIS LANE ASKS IT FROM SOMEWHERE ELSE.
 *
 * `CoachingState` has been written on every completed check-in for a long time, by a state machine
 * with rules earned the hard way: one step at a time and never a list; a step that goes unmanaged
 * twice changes rather than repeating; nothing ever accumulates into a judgement.
 *
 * Building a second coach for the panel would have given somebody two answers about themselves from
 * one product, and the second one would have been the worse of the two - written quickly, against
 * the same person, with none of that history behind it.
 */
const SRC = readFileSync(join(__dirname, 'assistant.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
/*
 * The lane itself, stopping where the converting-moves helper begins. That helper legitimately maps
 * over commitments to work out which single one to offer, and a source-level "no .map(" check
 * cannot tell that apart from handing somebody a list. What it actually produces is asserted
 * behaviourally in the-four-converting-moves.spec.ts, which is the right place for it.
 */
const LANE = SRC.slice(SRC.indexOf('private async howAmIDoing('), SRC.indexOf('private async theConvertingMoves('));
const MOVES = SRC.slice(SRC.indexOf('private async theConvertingMoves('), SRC.indexOf('private async whatDidISay('));

describe('there is only one coach', () => {
  it('reads the existing state and computes no step of its own', () => {
    expect(LANE).toMatch(/coachingState\.findFirst/);
    /* No staircase logic, no outcome handling, no history walking. That machine is next door. */
    expect(LANE).not.toMatch(/afterOutcome|staircasePosition|nextStep\(/);
  });

  it('takes the most recent, because a person is in more than one check-in', () => {
    /* An older ground's step is not wrong, it is finished. */
    expect(LANE).toMatch(/orderBy: \{ updatedAt: 'desc' \}/);
  });

  it('is scoped to the organisation as well as the person', () => {
    expect(LANE).toMatch(/ground: \{ organizationId \}/);
  });
});

describe('a question about how somebody is doing gets a step, not an assessment', () => {
  it('says there is no step rather than saying they are doing fine', () => {
    /*
     * Inventing an assessment out of an absence is exactly what this must not do. "You are doing
     * well" from a machine that has nothing to go on is a verdict with no evidence, which is worse
     * than silence and much worse than saying so.
     */
    expect(LANE).toMatch(/not a verdict either way/i);
  });

  it('offers ONE step and never a list', () => {
    /* Somebody handed five things does none of them. */
    expect(LANE).toMatch(/One thing, from your last check-in/);
    expect(LANE).not.toMatch(/\.map\(|join\('\\n'\)/);
  });

  it('carries no score, streak or rating anywhere - nor does what it appends', () => {
    for (const word of ['score', 'streak', 'rating', 'percent', 'rank', 'grade']) {
      expect(LANE.toLowerCase()).not.toContain(word);
      expect(MOVES.toLowerCase()).not.toContain(word);
    }
  });

  it('and the converting moves sit under the step rather than replacing it', () => {
    /* The check-in coach decides the step. These add the context a step cannot carry on its own -
       what they finished, how much of the load is theirs, what has stopped coming up. */
    expect(LANE).toMatch(/\+ moves,/);
    expect(MOVES).toMatch(/sayTheMoves\(/);
  });

  it('and tells them how to change a step that does not fit', () => {
    /* A step somebody cannot do is information about the step. Without saying that, the only way
       out is to fail it twice. */
    expect(LANE).toMatch(/saying so in your next check-in changes it/);
  });
});

describe('the question routes before the recall lane', () => {
  it('because "how am I doing" is not a question about what they said', () => {
    expect(route('how am I doing?').lane).toBe('how_am_i_doing');
    expect(route("I'm stuck").lane).toBe('how_am_i_doing');
    expect(route('how do I get better').lane).toBe('how_am_i_doing');
    /* And the recall lane still owns its own shape. */
    expect(route('what did I say about the vendor').lane).toBe('what_did_i_say');
  });
});

describe('the waiting lane sits above the two lanes that would swallow it', () => {
  /*
   * FOUND BY DRIVING THE ROUTER, NOT BY TESTING IT.
   *
   * Every lane's own patterns were correct here. Only the ORDER between them was wrong, which is a
   * property of the assembled router and of nothing smaller - so no test of a single rule could have
   * seen it. "Who is waiting on me" begins with "who is", and the directory lane, sitting higher,
   * answered a question about a stuck handoff by looking a person up.
   */
  it('so "who is waiting on me" is a handoff question, not a directory lookup', () => {
    expect(route('who is waiting on me').lane).toBe('what_is_stuck');
    expect(route('who is waiting on me?').lane).toBe('what_is_stuck');
  });

  it('while the directory lane keeps every question that is actually about a person', () => {
    expect(route('who is Ada').lane).toBe('who_is');
    expect(route('who is on the renewal push').lane).toBe('who_is');
  });

  it('and being stuck still reaches the coach', () => {
    expect(route("I'm stuck").lane).toBe('how_am_i_doing');
  });

  it('and "what am I waiting on" does not reach the coach', () => {
    expect(route('what am I waiting on').lane).toBe('what_is_stuck');
  });
});

describe('the onboarding lane answers what the role is, not only what is left', () => {
  /* Changed 22 November 2026: whatIsStuck, the method this slice ended at, became theWaitsSaid (release test of 22 November, Ask #44), so
     the slice ends there; it still covers the onboarding lane and nothing past what it covered before. */
  const UP_TO = SRC.slice(SRC.indexOf('private async whereAmIUpTo('), SRC.indexOf('private async theWaitsSaid('));

  it('names the role as its own sentence rather than only in a list header', () => {
    /*
     * Driving it: asked "what is my role", the draft's header "Still to do for Engineer:" came back
     * from the composer as "Your next steps:" - correct English that deleted the answer to the
     * question. `safeToUse` refuses a proper noun the model ADDS; it says nothing about one it
     * drops, and a header is the easiest place to lose one.
     */
    expect(UP_TO).toMatch(/You are down as \$\{status\.roleName\}/);
  });

  it('and says what is LEFT rather than how far through they are', () => {
    /* There is no version of "you are 40% onboarded" that helps somebody who wants to know which
       thing to do next, and a progress bar about a person is a score with a friendlier shape. */
    for (const word of ['percent', 'progress', 'complete', '/ total', 'score']) {
      expect(UP_TO.toLowerCase()).not.toContain(word);
    }
  });

  it('and routes a question about the role away from the coach and the handoffs', () => {
    expect(route('what is left').lane).toBe('where_am_i_up_to');
    expect(route('where am I up to').lane).toBe('where_am_i_up_to');
    expect(route('what is my role').lane).toBe('where_am_i_up_to');
    /* And the neighbours keep theirs. */
    expect(route('what am I waiting on').lane).toBe('what_is_stuck');
    expect(route("I'm stuck").lane).toBe('how_am_i_doing');
  });
});
