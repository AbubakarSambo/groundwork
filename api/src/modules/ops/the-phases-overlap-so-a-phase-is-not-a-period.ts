/**
 * THE WORKPLAN EVERYBODY IS GETTING BEHIND, AS SOMETHING THE SYSTEM CAN READ.
 *
 * Five phases: prove it, build the team, sell it, scale it, raise on it.
 *
 * THE THING THAT MAKES THIS ITS OWN TABLE is that they overlap. Proving runs
 * through October while the team phase runs to November and selling starts in
 * October. A period does not do that — it has one set of dates, contains the
 * objectives, and only one is current. Treating a phase as a period would have
 * forced the plan into five boxes it does not fit, and the first casualty would
 * have been the overlap, which is the part that says the company does not stop
 * proving in order to start selling.
 *
 * WHAT A PHASE IS FOR, HERE. Not a label on a chart. Two things:
 *   1. An exit condition read from the metric registry, so "are we done with
 *      this" has the same kind of answer as every other number in the system.
 *   2. A window in which certain work is legitimate. See `MAKES_THE_COMPANY_OPERABLE`.
 */

export interface APhase {
  key: string;
  ordinal: number;
  name: string;
  intent: string;
  startsOn: Date;
  endsOn: Date;
  exitCondition: string;
  exitMetric: string | null;
  exitTarget: number | null;
  permitsOperability: boolean;
}

/** Every phase running on a given day. Usually more than one, which is the point. */
export function whatIsRunningOn(phases: APhase[], day: Date): APhase[] {
  const at = startOfDay(day);
  return phases
    .filter((p) => startOfDay(p.startsOn) <= at && at <= startOfDay(p.endsOn))
    .sort((a, b) => a.ordinal - b.ordinal);
}

/**
 * What the plan looks like on a given day, said rather than scored.
 *
 * No percentage complete. A phase is not a progress bar: it ends when its exit
 * condition is true, and being three weeks from the end date says nothing about
 * whether it will be.
 */
export function whereTheCompanyIs(
  phases: APhase[],
  day: Date,
): { running: string[]; next: string | null; says: string } {
  const running = whatIsRunningOn(phases, day);
  const at = startOfDay(day);

  const next =
    phases
      .filter((p) => startOfDay(p.startsOn) > at)
      .sort((a, b) => a.startsOn.getTime() - b.startsOn.getTime())[0] ?? null;

  if (running.length === 0) {
    return {
      running: [],
      next: next?.name ?? null,
      says: next
        ? `No phase is running. The next one, ${next.name}, starts on ${asADate(next.startsOn)}.`
        : 'No phase is running, and none is planned. The workplan has run out.',
    };
  }

  return {
    running: running.map((p) => p.name),
    next: next?.name ?? null,
    says:
      running.length === 1
        ? `${running[0].name} is running.`
        : `${running.map((p) => p.name).join(' and ')} are running at the same time. That is the plan, not a mistake - a phase is a stretch of work, not a period.`,
  };
}

/**
 * Whether an exit condition can be checked at all.
 *
 * A phase whose exit is a sentence and not a number is reported as exactly
 * that. Inventing a metric for it would be worse than the gap: the number would
 * be checked, believed, and about something else.
 */
export function canWeTellWhenThisIsDone(phase: APhase): { checkable: boolean; says: string } {
  if (phase.exitMetric === null) {
    return {
      checkable: false,
      says: `"${phase.exitCondition}" is not a number this system reads. Somebody decides when this phase is done, which is fine as long as everybody knows that is what is happening.`,
    };
  }

  return {
    checkable: true,
    says: `Done when ${phase.exitCondition.toLowerCase().replace(/\.$/, '')}, read from ${phase.exitMetric}.`,
  };
}

/**
 * WHY A PIECE OF WORK MAY NOT CALL ITSELF OPERABILITY WORK.
 *
 * Null when it may. The fifth category exists because a company of six has real
 * work — hiring, onboarding, the operating manual — that unblocks no customer
 * and adds no moat, and counting it as nothing teaches people to stop doing it.
 *
 * It is bounded by the phase that makes it legitimate, because a category with
 * no boundary is the drawer every measure eventually grows. Outside the window
 * the work is still fine to do; it just cannot be claimed as a contribution
 * under a heading the company agreed for a particular stretch of time.
 */
export function whyThisIsNotOperabilityWork(input: {
  runningPhases: APhase[];
  on: Date;
}): string | null {
  const permitted = input.runningPhases.filter((p) => p.permitsOperability);
  if (permitted.length > 0) return null;

  return (
    'This does not count as a contribution on its own, because no phase running today allows it. Work that makes the company operable counts during the phase the company agreed for it. Outside that phase, say what it unblocks, what it adds to the moat, or what it keeps running.'
  );
}

function startOfDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function asADate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
