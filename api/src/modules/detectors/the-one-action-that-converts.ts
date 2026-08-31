/**
 * THE ACTION THE ROLE EXISTS FOR, AND WHETHER IT IS ACTUALLY HAPPENING.
 *
 * Every role has one hardest, highest-value action that it is tempting to substitute easier work
 * for: talking about the work instead of showing it, reviewing instead of testing, filing the
 * handover instead of presenting the value, being too busy to develop the team. The spec calls this
 * the sharpest coaching mechanism in it, and it is the last detector that was never built - because
 * it needs a role to be a record with an action and a clock on it, and roles were only ever a name
 * on an assignment.
 *
 * WHY THE MIDPOINT RULE IS THE WHOLE DESIGN. A weekly action not done by Monday afternoon is not
 * neglected, it is Monday. Firing then produces a detector that is right eventually and wrong all
 * week, and a person who learns to ignore it in the first fortnight never reads it again. Nothing
 * is said until the period is half gone, which is the first moment at which "not yet" and "not
 * going to" start to differ.
 *
 * AND IT ONLY SPEAKS ABOUT SOMEBODY WHO IS THERE. Silence from a person who has done nothing at all
 * is a different finding with a different answer - they may have left, or be on leave, or be
 * blocked on something nobody wrote down. Reading that silence as "skipping the action that
 * converts" would put a coaching nudge in front of somebody whose actual problem is that nobody has
 * spoken to them. `no_checkin` and the handoff detectors own that case.
 */

export type Cadence = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY';

export const CADENCE_DAYS: Record<Cadence, number> = {
  WEEKLY: 7,
  FORTNIGHTLY: 14,
  MONTHLY: 30,
  QUARTERLY: 91,
};

export interface RoleRow {
  key: string;
  name: string;
  primaryActionKey: string | null;
  primaryActionName: string | null;
  primaryActionCadence: Cadence | null;
}

export interface AssignmentRow {
  personExternalId: string;
  /** What the assignment calls the role. Matched to a role's key or its name - see `roleFor`. */
  roleName: string;
  startedAt: Date;
}

export interface ActionEvent {
  personExternalId: string;
  actionKey: string;
  occurredAt: Date;
}

export interface Neglected {
  personExternalId: string;
  roleName: string;
  actionKey: string;
  actionName: string;
  cadence: Cadence;
  /** When the current period began. In the evidence, so the finding can be checked. */
  periodStartedAt: Date;
  /** The last time they did it at all, or null if there is no record of them ever doing it. */
  lastDoneAt: Date | null;
  daysIntoPeriod: number;
  periodDays: number;
}

/**
 * A grace period at the start of an assignment, in periods rather than days.
 *
 * Somebody three days into a role has not neglected their quarterly action. One full period is the
 * shortest honest wait: it is the first period they were there for the whole of, and anything less
 * flags a person for the part of the clock that ran before they arrived.
 */
export const GRACE_PERIODS = 1;

/**
 * WHICH PERIOD WE ARE IN, COUNTED FROM WHEN THEY TOOK THE ROLE.
 *
 * Not from the calendar, deliberately. A calendar month means somebody who started on the 28th is
 * judged on three days of it, and a "quarter" means four fixed dates a year that have nothing to do
 * with when this person picked up this work. Counting from the assignment makes every period a full
 * one for the person being asked about.
 */
export function currentPeriod(startedAt: Date, cadence: Cadence, now: Date): { start: Date; end: Date; index: number } {
  const days = CADENCE_DAYS[cadence];
  const ms = days * 86_400_000;
  const elapsed = now.getTime() - startedAt.getTime();
  const index = Math.max(0, Math.floor(elapsed / ms));
  const start = new Date(startedAt.getTime() + index * ms);
  return { start, end: new Date(start.getTime() + ms), index };
}

/** Half the period, which is the earliest anything is said. */
export const pastMidpoint = (p: { start: Date; end: Date }, now: Date): boolean =>
  now.getTime() - p.start.getTime() >= (p.end.getTime() - p.start.getTime()) / 2;

/**
 * Match an assignment's role name to a role record.
 *
 * By key or by name, case-insensitively, because the two sides come from different places: a role
 * is pushed by whoever configures the org and an assignment is pushed by the HR system, and they
 * agree on a word rather than on an id. An assignment naming a role nobody has configured is not an
 * error - it is a role with no primary action yet, and this says nothing about it.
 */
export function roleFor(roleName: string, roles: RoleRow[]): RoleRow | null {
  const want = (roleName ?? '').trim().toLowerCase();
  if (!want) return null;
  return roles.find((r) => r.key.toLowerCase() === want || r.name.trim().toLowerCase() === want) ?? null;
}

export interface Inputs {
  roles: RoleRow[];
  assignments: AssignmentRow[];
  events: ActionEvent[];
  /** Who has done anything at all recently. Nobody outside this set is spoken about. */
  activePeople: Set<string>;
  now: Date;
}

export function findNeglectedPrimary({ roles, assignments, events, activePeople, now }: Inputs): Neglected[] {
  const out: Neglected[] = [];

  for (const a of assignments) {
    if (!activePeople.has(a.personExternalId)) continue;

    const role = roleFor(a.roleName, roles);
    if (!role?.primaryActionKey || !role.primaryActionCadence) continue;

    const period = currentPeriod(a.startedAt, role.primaryActionCadence, now);
    /* Not in their first period: that clock started before they held the role. */
    if (period.index < GRACE_PERIODS) continue;
    if (!pastMidpoint(period, now)) continue;

    const theirs = events
      .filter((e) => e.personExternalId === a.personExternalId && e.actionKey === role.primaryActionKey)
      .sort((x, y) => y.occurredAt.getTime() - x.occurredAt.getTime());

    /* Done in this period is done. Anything earlier is history, and history is the evidence. */
    if (theirs.some((e) => e.occurredAt >= period.start && e.occurredAt < period.end)) continue;

    out.push({
      personExternalId: a.personExternalId,
      roleName: role.name,
      actionKey: role.primaryActionKey,
      actionName: role.primaryActionName?.trim() || role.primaryActionKey,
      cadence: role.primaryActionCadence,
      periodStartedAt: period.start,
      lastDoneAt: theirs[0]?.occurredAt ?? null,
      daysIntoPeriod: Math.floor((now.getTime() - period.start.getTime()) / 86_400_000),
      periodDays: CADENCE_DAYS[role.primaryActionCadence],
    });
  }

  return out;
}

const EVERY: Record<Cadence, string> = {
  WEEKLY: 'once a week',
  FORTNIGHTLY: 'once a fortnight',
  MONTHLY: 'once a month',
  QUARTERLY: 'once a quarter',
};

/**
 * WHAT IT SAYS, AND WHAT IT REFUSES TO SAY.
 *
 * It says what has not happened and for how long. It does not say they are avoiding it, does not
 * guess why, and does not call it a pattern from one period - a detector that narrates motive turns
 * a missing record into a character judgement, which is the thing this product exists not to do.
 *
 * "Never" is stated as never, because softening it into "not recently" hides the case that most
 * needs a conversation: somebody who has held the role for months and has not done it once.
 */
export function sayNeglectedPrimary(n: Neglected): string {
  const when = n.lastDoneAt
    ? `The last record of it is ${Math.floor((n.periodStartedAt.getTime() - n.lastDoneAt.getTime()) / 86_400_000) + n.daysIntoPeriod} days ago.`
    : 'There is no record of it having happened at all while they have held the role.';
  return `${n.actionName} is the action this role turns on, and it is meant to happen ${EVERY[n.cadence]}. ${n.daysIntoPeriod} days into a ${n.periodDays} day period, nothing records it. ${when}`;
}
