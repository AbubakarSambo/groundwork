import { METRICS_BY_KEY, MetricWindow } from './a-number-you-can-open';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Where a key result's or a commitment's current value comes from.
 *
 * Two kinds, and the difference matters more than it looks. A SOURCED number is
 * computed from records every time it is read, so nobody types it and it cannot
 * be stale. A MANUAL one is somebody's word, and is labelled as such wherever it
 * appears — because a board that shows both without saying which is which is a
 * board where the typed numbers hide behind the computed ones.
 *
 * The third case is the dangerous one: a source that names a metric that does
 * not exist. Falling back to the stored value there would produce a key result
 * that LOOKS sourced, never moves, and nobody questions — so it is refused, out
 * loud, with the value it could not compute.
 */

export const MANUAL = 'MANUAL';

export interface ResolvedNumber {
  value: number;
  /** True when a person typed it. Rendered next to the number, always. */
  typedByHand: boolean;
  source: string;
  /** Present for a sourced number: the rows behind it. */
  rows?: Array<Record<string, unknown>>;
  says: string;
  /** Set when the source is broken. The number is not to be trusted. */
  problem?: string;
}

export async function resolveNumber(
  prisma: PrismaService,
  measurementSource: string,
  storedValue: number,
  window: MetricWindow,
): Promise<ResolvedNumber> {
  if (measurementSource === MANUAL) {
    return {
      value: storedValue,
      typedByHand: true,
      source: MANUAL,
      says: `${storedValue}, entered by hand`,
    };
  }

  const metric = METRICS_BY_KEY.get(measurementSource);
  if (!metric) {
    return {
      value: storedValue,
      typedByHand: true,
      source: measurementSource,
      says: `${storedValue}, but this number is not being measured`,
      problem: `${measurementSource} is not a metric this system has. Nothing has been updating this number, and the value shown is whatever was last stored.`,
    };
  }

  const result = await metric.compute(prisma, window);
  return {
    value: result.value,
    typedByHand: false,
    source: measurementSource,
    rows: result.rows,
    says: result.says,
  };
}

/**
 * How far along, as a share of the distance to be covered.
 *
 * Two kinds of target, and the second one is easy to miss. Most are a climb:
 * start at 0, reach 10. But "no technical item is blocking a client" is a
 * target of zero starting from zero — there is no distance to cover, and it is
 * met by nothing happening.
 *
 * Written as distance-only, that objective renders as a blank on the board
 * every single day, including the days it is being met. A hold target is
 * therefore answered directly: met while the number is at or under the line,
 * and not met once it is over.
 */
export function progressToward(current: number, target: number, start = 0): number | null {
  const distance = target - start;

  if (distance === 0) {
    // A hold: stay at the line. Partial credit would be a lie either way —
    // one blocker is not "50% of no blockers".
    return current <= target ? 100 : 0;
  }

  const share = Math.round(((current - start) / distance) * 100);
  // A climb that has gone backwards is at zero, not at a negative percentage.
  return Math.max(0, share);
}
