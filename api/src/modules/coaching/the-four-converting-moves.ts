/**
 * THE FOUR MOVES, AND WHAT KEEPS THEM FROM BECOMING A SCOREBOARD.
 *
 * The coaching engine next door has three rules earned the hard way: one step at a time and never a
 * list, a step that goes unmanaged twice changes rather than repeating, and nothing ever accumulates
 * into a judgement. These four moves are arithmetic over commitments and handoffs, which makes them
 * exactly the kind of thing that turns into a score if nobody stops it - "62% of your load is
 * self-resolvable" is a number about a person, and a number about a person ends up in a review.
 *
 * So every one of them returns a SENTENCE and, where a count is genuinely the information, the count
 * that sentence is built from. None returns a rating, a rank, a trend, or a comparison to anybody
 * else. `coaching-can-never-justify-a-firing.spec.ts` is the rule; this file is inside it.
 */
import { CommitmentState, DependencyStatus } from '@prisma/client';

export type Load = {
  id: string;
  text: string;
  state: CommitmentState;
  statedAt: Date;
  dueAt: Date | null;
  /** Last time they said anything that referred to it. Null if never since stating it. */
  lastMentionedAt: Date | null;
};

export type Waiting = {
  what: string;
  status: DependencyStatus;
  /** Null when they are waiting on something outside the organisation. */
  onPersonKey: string | null;
  waitingDays: number;
};

/**
 * NEXT-ACTION REDUCER - shrink a stuck set to the one move.
 *
 * Somebody with eleven open commitments does not need to be told they have eleven. They know. What
 * they cannot see from inside it is which one is load-bearing, and the honest answer is not "the
 * most important" - nothing here can rank importance - but "the one you can actually move today".
 *
 * So the choice is mechanical and explainable: among the things NOT blocked on somebody else, the
 * oldest. Age rather than urgency, because a due date is a promise about the future and how long
 * something has sat is a fact about the past, and only one of those is evidence.
 */
export function theOneMove(load: Load[], waiting: Waiting[]): Load | null {
  const blockedWords = new Set(
    waiting.flatMap((w) => w.what.toLowerCase().split(/\s+/).filter((t) => t.length >= 4)),
  );
  const mine = load
    .filter((l) => l.state === CommitmentState.OPEN || l.state === CommitmentState.SLIPPED)
    .filter((l) => {
      /* Anything whose wording overlaps a live handoff is somebody else's to clear first, and
         telling them to go and do it is the one piece of advice guaranteed to be useless. */
      const words = l.text.toLowerCase().split(/\s+/).filter((t) => t.length >= 4);
      return !words.some((w) => blockedWords.has(w));
    });
  if (!mine.length) return null;
  return [...mine].sort((a, b) => a.statedAt.getTime() - b.statedAt.getTime())[0];
}

/**
 * AVOIDANCE MIRROR - how much of what you are carrying can actually resolve.
 *
 * The move it is named for is uncomfortable and it has to stay pointed the right way. Somebody
 * carrying nine things of which seven are blocked on other people is not avoiding anything; they are
 * stuck, and telling them otherwise is both wrong and the fastest way to lose them. Somebody
 * carrying nine of which nine are theirs is the case the mirror is for.
 *
 * It reports the split and stops. Which of those two situations this is, is theirs to say.
 */
export type Mirror = { carrying: number; yours: number; waitingOnOthers: number };

export function theMirror(load: Load[], waiting: Waiting[]): Mirror | null {
  const open = load.filter((l) => l.state === CommitmentState.OPEN || l.state === CommitmentState.SLIPPED);
  if (!open.length) return null;
  const blocked = waiting.filter((w) => w.status !== DependencyStatus.CLEARED).length;
  return {
    carrying: open.length,
    /* Never below zero, and never a percentage: a proportion invites a comparison between people,
       which is the thing this must not become. */
    yours: Math.max(0, open.length - blocked),
    waitingOnOthers: Math.min(blocked, open.length),
  };
}

/** How long something can go unmentioned before it has stopped being live rather than being slow. */
export const COLD_AFTER_DAYS = 21;

/**
 * GOING COLD - warm threads losing heat.
 *
 * Not the same as overdue, and the difference is the point. An overdue commitment is one somebody is
 * still working on and has told you about; a cold one is one that has quietly left the conversation.
 * The second is the one nobody raises, because raising it means admitting it was dropped.
 *
 * Dated from the last time they MENTIONED it, not from when it was due - something can be six weeks
 * early and already abandoned.
 */
export function goingCold(load: Load[], now: Date, coldAfterDays = COLD_AFTER_DAYS): Load[] {
  return load
    .filter((l) => l.state === CommitmentState.OPEN || l.state === CommitmentState.SLIPPED)
    .filter((l) => {
      const last = l.lastMentionedAt ?? l.statedAt;
      return (now.getTime() - last.getTime()) / 86_400_000 >= coldAfterDays;
    })
    .sort((a, b) => (a.lastMentionedAt ?? a.statedAt).getTime() - (b.lastMentionedAt ?? b.statedAt).getTime());
}

/**
 * WIN LOGGER - banks wins and reflects them back.
 *
 * Nothing new is stored, which is deliberate. A kept commitment is already a kept commitment and an
 * UNBLOCKING contribution is already banked; a separate wins table would be a second place for the
 * same facts to live and disagree with the first.
 *
 * WHAT IT COUNTS AND WHAT IT WILL NOT. Things they finished, and times somebody else stopped being
 * stuck because of them - the second being the one people never claim for themselves, since it
 * exists only because the person who was waiting said so. It does not compute a streak, a rate, or
 * a best week. A win reflected back is encouragement; a streak is a thing to break.
 */
export type Wins = { kept: number; unblocked: number; since: Date };

export function bankedWins(load: Load[], unblockedCount: number, since: Date): Wins | null {
  const kept = load.filter((l) => l.state === CommitmentState.KEPT && l.statedAt >= since).length;
  if (!kept && !unblockedCount) return null;
  return { kept, unblocked: unblockedCount, since };
}

/**
 * The moves as one paragraph, in the order somebody can act on them.
 *
 * ONE MOVE IS OFFERED, never four - the same rule as the coach next door, for the same reason:
 * somebody handed four things does none of them. The rest is context for that one.
 */
export function sayTheMoves(args: {
  move: Load | null;
  mirror: Mirror | null;
  cold: Load[];
  wins: Wins | null;
}): string {
  const parts: string[] = [];

  if (args.wins && (args.wins.kept || args.wins.unblocked)) {
    const bits: string[] = [];
    /* "finished 1" is missing its noun and reads as a fragment. Somebody reading this about their
       own month should not have to work out what the number counts. */
    if (args.wins.kept) bits.push(`finished ${args.wins.kept} ${args.wins.kept === 1 ? 'thing' : 'things'}`);
    if (args.wins.unblocked) {
      bits.push(`unblocked ${args.wins.unblocked} ${args.wins.unblocked === 1 ? 'person' : 'people'}`);
    }
    /* First, because it is true and because the rest of this is a list of what is not done. */
    parts.push(`Since then you have ${bits.join(' and ')}.`);
  }

  if (args.move) {
    parts.push(`The oldest thing you can move without waiting on anybody: ${args.move.text}`);
  } else if (args.mirror?.waitingOnOthers) {
    parts.push('Everything open is waiting on somebody else, so there is nothing here for you to pick up.');
  }

  if (args.mirror && args.mirror.carrying > 1) {
    /*
     * ONLY WORTH SAYING WHEN THE SPLIT IS THE INFORMATION. "You are carrying 3, 0 waiting on other
     * people and 3 yours to move" spends three numbers restating the first one, and every number in
     * this draft is one the composer has to carry through intact - so a sentence that says nothing
     * costs the whole paragraph its wording. When nothing is blocked, the count alone is the fact.
     */
    parts.push(
      args.mirror.waitingOnOthers === 0
        ? `You are carrying ${args.mirror.carrying}, and none of them are waiting on anybody else.`
        : `You are carrying ${args.mirror.carrying}. ${args.mirror.waitingOnOthers} of those are waiting on other people`
          + ` and ${args.mirror.yours} are yours to move.`,
    );
  }

  if (args.cold.length) {
    const n = args.cold.length;
    parts.push(
      `${n === 1 ? 'One thing has' : `${n} things have`} not come up in a while. `
      + 'That usually means it is finished, or it is not happening - either is fine to say out loud.',
    );
  }

  return parts.join('\n\n');
}
