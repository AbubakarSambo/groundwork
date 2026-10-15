/**
 * HANDOFFS ACROSS THE WHOLE ORGANISATION, NOT ONE GROUND AT A TIME.
 *
 * `GroundDependency` has been recorded for a long time, and the board reads it well - but only ever
 * within one ground. That is the wrong boundary for the question that matters. Somebody waiting two
 * weeks on the same person shows up as a mild note on three separate boards and as nothing anywhere,
 * and the person they are all waiting on never appears as the reason.
 *
 * WHAT THIS DOES NOT DO is invent a second set of rules. `blockerHasSubstance` and
 * `dedupeDependencies` decide what counts, exactly as they do on the board - including the bar that
 * excludes a throwaway mention, and the rule that nobody can be blocked on themselves. This file
 * only widens the scope and adds the one thing a single ground cannot know: how long.
 */
import { ReadDependency, blockerHasSubstance, dedupeDependencies } from './reads';
import type { WhoIsWaiting } from './the-person-waiting-by-name';
import { itWasTakenFurther } from '../reports/what-they-said-they-did-about-it';

/** A handoff with the two things a ground-scoped read cannot carry: whose it is, and where. */
/** Who is waiting travels with the wait, so each reader can be told a name or not (the-person-waiting-by-name.ts). */
export type OrgDependency = ReadDependency & Partial<Omit<WhoIsWaiting, 'groundLabel'>> & {
  groundId: string;
  groundLabel: string;
  /** The waiting person, resolved across grounds. Their participant row differs in each one. */
  fromPersonKey: string;
  onPersonKey: string | null;
  /** The name of the person it waits on, where they are somebody in the check-in. Never an address. */
  onName?: string | null;
  /** What they said they did about it, in their own words (what-they-said-they-did-about-it.ts). */
  triedSaid?: string | null;
};

export type WaitingOn = OrgDependency & { waitingDays: number };

/**
 * A handoff is old from when it was FIRST described, not when it was last repeated.
 *
 * This is the whole point of the measure and the easy thing to get backwards. Somebody who says
 * "still waiting on the pricing" in six consecutive check-ins has waited six weeks, not since
 * Tuesday - and dating it from the newest mention would make the most persistent case look like
 * the freshest one, which is precisely inverted.
 */
export function daysWaiting(first: Date | number | undefined, now: Date): number {
  if (first === undefined) return 0;
  const then = first instanceof Date ? first.getTime() : first;
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000));
}

/**
 * ONE HANDOFF PER PERSON PER THING, ACROSS EVERY GROUND THEY ARE IN.
 *
 * Deduping by participant would miss the case worth catching: the same person waiting on the same
 * thing in two grounds is one wait, described twice, and counting it twice makes a single stuck
 * handoff look like a spreading problem. So the person key stands in for the participant id through
 * the existing dedupe, which then does the same normalising of the wording it always did.
 */
export function whatThePlaceIsWaitingOn(deps: OrgDependency[], now: Date): WaitingOn[] {
  const byPerson = dedupeDependencies(
    /*
     * BOTH SIDES MOVE TO PERSON KEYS, NOT JUST THE WAITING ONE.
     *
     * `blockerHasSubstance` refuses a handoff whose two sides are the same, which is what stops
     * somebody's own outstanding decision from buying them the protection meant for people waiting
     * on others. Swapping only the from side would leave a person key facing a participant id -
     * never equal, so the rule would pass everything and silently stop existing. Across grounds the
     * person comparison is the right one anyway: the same person has a different participant row in
     * every ground, so ids could not catch it either.
     */
    deps.map((d) => ({
      ...d,
      fromParticipantId: d.fromPersonKey,
      onParticipantId: d.onPersonKey,
    })),
    /*
     * WHETHER IT WAS TAKEN FURTHER SURVIVES THE MERGE (3 October 2026). The oldest mention is the one
     * kept, and the product's overnight stamp (`escalatedAt`) or the person's own "I took it to the head
     * of finance" (`triedSaid`) can sit on a later one. Either is kept: the earliest stamp, and the words
     * that say it was taken further over words that do not.
     */
    (kept, said) => {
      const k = kept as OrgDependency;
      const s = said as OrgDependency;
      if (s.escalatedAt && (!k.escalatedAt || new Date(s.escalatedAt).getTime() < new Date(k.escalatedAt).getTime())) k.escalatedAt = s.escalatedAt;
      if (s.triedSaid?.trim() && (!k.triedSaid?.trim() || (itWasTakenFurther({ triedSaid: s.triedSaid }) && !itWasTakenFurther({ triedSaid: k.triedSaid })))) k.triedSaid = s.triedSaid;
    },
  ) as OrgDependency[];

  return byPerson
    .filter(blockerHasSubstance)
    .map((d) => ({ ...d, waitingDays: daysWaiting(d.createdAt, now) }))
    .sort((a, b) => b.waitingDays - a.waitingDays);
}

/**
 * WHO IS THE REASON, WITHOUT SAYING THEY ARE AT FAULT.
 *
 * Someone appearing here has not necessarily done anything wrong - they may not know they are being
 * waited on, which is the most common case and the one this exists to fix. So the shape carries the
 * count and the longest wait and stops there. It does not rank people, score them, or feed anything
 * that does.
 */
export type WaitedOn = { personKey: string; waiting: WaitingOn[]; longestDays: number };

export function whoIsBeingWaitedOn(waiting: WaitingOn[]): WaitedOn[] {
  const by = new Map<string, WaitingOn[]>();
  for (const w of waiting) {
    /* A wait on something outside the organisation has no person to name, and inventing one would
       point the finger at whoever happened to be nearby. It stays in the list unattributed. */
    if (!w.onPersonKey) continue;
    (by.get(w.onPersonKey) ?? by.set(w.onPersonKey, []).get(w.onPersonKey)!).push(w);
  }
  return [...by.entries()]
    .map(([personKey, ws]) => ({
      personKey,
      waiting: ws,
      longestDays: Math.max(...ws.map((w) => w.waitingDays)),
    }))
    .sort((a, b) => b.longestDays - a.longestDays);
}
