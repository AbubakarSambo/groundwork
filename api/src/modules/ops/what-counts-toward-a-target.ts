import { OpsQualifyingStatus } from '@prisma/client';

/**
 * Which introductions count.
 *
 * The three statuses are ordered — an introduction that is QUALIFIED has also
 * been READY — so "counts toward the target" is a threshold rather than a match.
 * Writing it as a match is how a contributor whose company went live stops
 * counting the moment its status moves past the one being looked for.
 */
export const QUALIFYING_ORDER: OpsQualifyingStatus[] = ['INTRODUCED', 'READY', 'QUALIFIED'];

export function countsTowardTarget(
  status: OpsQualifyingStatus,
  line: OpsQualifyingStatus,
): boolean {
  return QUALIFYING_ORDER.indexOf(status) >= QUALIFYING_ORDER.indexOf(line);
}

export function isAQualifyingStatus(value: string): value is OpsQualifyingStatus {
  return (QUALIFYING_ORDER as string[]).includes(value);
}
