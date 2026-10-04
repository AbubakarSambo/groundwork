import { theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { STARTED_FROM_THE_ANCHOR } from '../conversation/the-anchor-weekly-check-in';
import { theActiveLineFor } from './the-anchor-active-line';
import type { TheActiveLine } from '../entry/the-anchor-served-shapes';

/**
 * THE ANCHOR SCENARIO'S PARTS OF THE BOARD (request 149). One door, so `board.service.ts` carries a single call.
 *
 * Served only for a check-in with `started_from` "anchor", only while `release.anchorScenario` is on, and only
 * to whoever runs the check-in (the lead, the admin who set it up, an admin with access). For anybody else, and
 * for every other check-in, this returns nothing, so the board is exactly what it was.
 */
export type TheAnchorParts = { activeLine?: TheActiveLine };

export async function theAnchorBoardParts(args: {
  prisma: any;
  ground: { id: string; startedFrom?: string | null };
  readerRunsIt: boolean;
  openRound: number;
  roundOpenedAt: Date | null;
}): Promise<TheAnchorParts> {
  const { prisma, ground } = args;
  if (!args.readerRunsIt || ground.startedFrom !== STARTED_FROM_THE_ANCHOR) return {};
  if (!(await theAnchorScenarioIsOn(prisma))) return {};
  return { activeLine: await theActiveLineFor(prisma, ground.id, args.openRound, args.roundOpenedAt) };
}
