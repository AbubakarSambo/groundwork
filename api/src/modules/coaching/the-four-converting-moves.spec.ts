import { readFileSync } from 'fs';
import { join } from 'path';
import { CommitmentState, DependencyStatus } from '@prisma/client';
import {
  theOneMove, theMirror, goingCold, bankedWins, sayTheMoves,
  COLD_AFTER_DAYS, Load, Waiting,
} from './the-four-converting-moves';

const NOW = new Date('2026-03-01T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const load = (o: Partial<Load> = {}): Load => ({
  id: 'c1', text: 'write the pricing page', state: CommitmentState.OPEN,
  statedAt: daysAgo(5), dueAt: null, lastMentionedAt: daysAgo(1), ...o,
});
const waiting = (o: Partial<Waiting> = {}): Waiting => ({
  what: 'the onboarding rewrite', status: DependencyStatus.WAITING,
  onPersonKey: 'kofi', waitingDays: 4, ...o,
});

describe('next-action reducer', () => {
  it('picks the oldest thing that is not waiting on somebody else', () => {
    /*
     * Age rather than urgency. A due date is a promise about the future; how long something has sat
     * is a fact about the past, and only one of those is evidence.
     */
    const out = theOneMove(
      [
        load({ id: 'new', text: 'draft the deck', statedAt: daysAgo(2) }),
        load({ id: 'old', text: 'write the pricing page', statedAt: daysAgo(30) }),
      ],
      [],
    );
    expect(out?.id).toBe('old');
  });

  it('and never picks one that is blocked on somebody else', () => {
    /* Telling somebody to go and do the thing another person is holding is the one piece of advice
       guaranteed to be useless. */
    const out = theOneMove(
      [load({ id: 'blocked', text: 'finish the onboarding rewrite', statedAt: daysAgo(40) }),
       load({ id: 'free', text: 'draft the deck', statedAt: daysAgo(2) })],
      [waiting({ what: 'the onboarding rewrite' })],
    );
    expect(out?.id).toBe('free');
  });

  it('and offers nothing rather than something useless when everything is blocked', () => {
    expect(theOneMove(
      [load({ text: 'finish the onboarding rewrite' })],
      [waiting({ what: 'the onboarding rewrite' })],
    )).toBeNull();
  });

  it('and ignores what is already finished', () => {
    expect(theOneMove([load({ state: CommitmentState.KEPT })], [])).toBeNull();
    expect(theOneMove([load({ state: CommitmentState.DROPPED })], [])).toBeNull();
  });
});

describe('avoidance mirror', () => {
  it('reports the split and never a proportion', () => {
    /*
     * A percentage is a number about a person, and a number about a person ends up in a review.
     * The two counts say the same thing and cannot be ranked between people.
     */
    const m = theMirror([load(), load({ id: 'c2' }), load({ id: 'c3' })], [waiting()]);
    expect(m).toEqual({ carrying: 3, yours: 2, waitingOnOthers: 1 });
  });

  it('does not point at somebody who is genuinely stuck', () => {
    /* Nine things of which seven are blocked is not avoidance, it is being stuck - and saying
       otherwise is both wrong and the fastest way to lose them. */
    const m = theMirror(
      Array.from({ length: 3 }, (_, i) => load({ id: `c${i}` })),
      [waiting({ what: 'a' }), waiting({ what: 'b' }), waiting({ what: 'c' })],
    );
    expect(m).toEqual({ carrying: 3, yours: 0, waitingOnOthers: 3 });
  });

  it('and never reports a negative or an over-count when there are more handoffs than commitments', () => {
    const m = theMirror([load()], [waiting({ what: 'a' }), waiting({ what: 'b' })]);
    expect(m!.yours).toBe(0);
    expect(m!.waitingOnOthers).toBe(1);
  });
});

describe('going cold', () => {
  it('dates it from the last mention, not from when it was due', () => {
    /* Something can be six weeks early and already abandoned. */
    const abandoned = load({ id: 'cold', dueAt: daysAgo(-40), lastMentionedAt: daysAgo(COLD_AFTER_DAYS + 1) });
    const live = load({ id: 'warm', dueAt: daysAgo(10), lastMentionedAt: daysAgo(2) });
    expect(goingCold([abandoned, live], NOW).map((l) => l.id)).toEqual(['cold']);
  });

  it('falls back to when it was stated if it has never come up since', () => {
    expect(goingCold([load({ lastMentionedAt: null, statedAt: daysAgo(60) })], NOW)).toHaveLength(1);
    expect(goingCold([load({ lastMentionedAt: null, statedAt: daysAgo(2) })], NOW)).toHaveLength(0);
  });
});

describe('win logger', () => {
  it('counts what they finished and who stopped being stuck because of them', () => {
    const w = bankedWins([load({ state: CommitmentState.KEPT }), load({ id: 'c2' })], 2, daysAgo(30));
    expect(w).toEqual({ kept: 1, unblocked: 2, since: daysAgo(30) });
  });

  it('and computes no streak, rate or best week', () => {
    /* A win reflected back is encouragement. A streak is a thing to break. */
    /*
     * Comments stripped properly rather than line-by-line: the first version filtered lines
     * starting with `*` and `//`, which left every single-line `/* ... *\/` block behind - so it
     * failed on the word "percentage" inside a comment explaining why there are no percentages.
     * A guard that reads its own prose is a guard that reports the opposite of the truth.
     */
    const CODE = readFileSync(join(__dirname, 'the-four-converting-moves.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .toLowerCase();
    for (const word of ['streak', 'average', 'rank', 'percent', 'score']) {
      expect(CODE).not.toContain(word);
    }
  });

  it('and says nothing at all rather than reporting a zero', () => {
    expect(bankedWins([load()], 0, daysAgo(30))).toBeNull();
  });
});

describe('what is said back', () => {
  it('offers one move, never four', () => {
    /* The same rule as the coach next door: somebody handed four things does none of them. */
    const said = sayTheMoves({
      move: load({ text: 'write the pricing page' }),
      mirror: { carrying: 4, yours: 3, waitingOnOthers: 1 },
      cold: [load({ id: 'x' }), load({ id: 'y' })],
      wins: { kept: 2, unblocked: 1, since: daysAgo(30) },
    });
    expect(said.match(/write the pricing page/g)).toHaveLength(1);
    expect(said).not.toMatch(/draft the deck/);
  });

  it('does not spend three numbers restating one', () => {
    /*
     * "You are carrying 3. 0 of those are waiting on other people and 3 are yours to move" says the
     * same thing three times - and every number in the draft is one the model has to carry through
     * intact, so a sentence that adds nothing costs the whole paragraph its wording.
     */
    const said = sayTheMoves({
      move: load(), mirror: { carrying: 3, yours: 3, waitingOnOthers: 0 }, cold: [], wins: null,
    });
    expect(said).toMatch(/carrying 3, and none of them are waiting on anybody else/);
    expect(said).not.toMatch(/\b0 of those\b/);
  });

  it('names what the finished count counts', () => {
    const said = sayTheMoves({ move: null, mirror: null, cold: [],
      wins: { kept: 1, unblocked: 0, since: daysAgo(30) } });
    expect(said).toMatch(/finished 1 thing/);
  });

  it('leads with what they did, because the rest is a list of what is not done', () => {
    const said = sayTheMoves({
      move: load(), mirror: null, cold: [], wins: { kept: 2, unblocked: 1, since: daysAgo(30) },
    });
    expect(said.indexOf('Since then')).toBe(0);
  });

  it('says a cold thing may simply be finished, rather than treating it as a failure', () => {
    const said = sayTheMoves({ move: null, mirror: null, cold: [load()], wins: null });
    expect(said).toMatch(/finished, or it is not happening - either is fine to say/);
  });

  it('and when everything is blocked, says so instead of inventing a move', () => {
    const said = sayTheMoves({
      move: null, mirror: { carrying: 2, yours: 0, waitingOnOthers: 2 }, cold: [], wins: null,
    });
    expect(said).toMatch(/nothing here for you to pick up/);
  });
});
