import { theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { STARTED_FROM_THE_ANCHOR } from '../conversation/the-anchor-weekly-check-in';
import { theActiveLineFor } from './the-anchor-active-line';
import { readTheMonthRecord } from './the-anchor-month-record';
import { theMonthBoard, aDifferenceInAWords, aContributionSaid } from './the-anchor-month-board';
import { theEndOfMonthRead, theMonthIsOver, herOwnWords } from './the-anchor-end-of-month';
import { hasEnded } from '../grounds/a-ground-that-has-ended';
import type { TheActiveLine, TheMonthBoard, TheEndOfMonthRead } from '../entry/the-anchor-served-shapes';

/**
 * THE ANCHOR SCENARIO'S PARTS OF THE BOARD (request 149). One door, so `board.service.ts` carries a single call.
 *
 * Served only for a check-in with `started_from` "anchor", only while `release.anchorScenario` is on, and only
 * to whoever runs the check-in (the lead, the admin who set it up, an admin with access). The month board and the
 * end-of-month read are the lead's own, as the screens' contract says ("Lead only"), so they go to the lead alone.
 * For anybody else, and for every other check-in, this returns nothing, so the board is exactly what it was.
 */
export type TheAnchorParts = { activeLine?: TheActiveLine; theMonthBoard?: TheMonthBoard; theEndOfMonthRead?: TheEndOfMonthRead; yourPartInMovingThings?: string | null };

export async function theAnchorBoardParts(args: {
  prisma: any;
  ground: { id: string; startedFrom?: string | null; initiatorId?: string | null; status?: string | null };
  readerRunsIt: boolean;
  openRound: number;
  roundOpenedAt: Date | null;
  readerIsTheLead: boolean;
  /** The record's own clock: when the board last changed. Never the moment it is read. */
  clock: Date | null;
  /** The board as this reader is served it, for the differences between accounts. */
  served: { divergence?: { items?: { topic?: string; whoSeesIt?: string }[] } };
  /** What keeps coming up, as questions the lead is already served. */
  patterns: string[];
  /** The reader's own row in the check-in, for their own recognition sentence. */
  readerParticipantId?: string | null;
}): Promise<TheAnchorParts> {
  const { prisma, ground } = args;
  if (ground.startedFrom !== STARTED_FROM_THE_ANCHOR) return {};
  /*
   * A PERSON IN THE CHECK-IN READS THE SAME SENTENCE THE LEAD READS ABOUT THEIR OWN CONTRIBUTION, AND NOBODY ELSE'S
   * (piece 22; decision 96 item 9). Their own only, said to them as "you". Nothing else of the anchor parts.
   */
  if (!args.readerRunsIt) {
    if (!args.readerParticipantId || !(await theAnchorScenarioIsOn(prisma))) return {};
    const record = await readTheMonthRecord(prisma, ground.id, args.openRound);
    const mine = (record.doneByPerson ?? []).find((d) => d.participantId === args.readerParticipantId);
    return { yourPartInMovingThings: mine ? aContributionSaid(null, mine.clauseToThem ?? mine.clause, mine.settledBy) : null };
  }
  if (!(await theAnchorScenarioIsOn(prisma))) return {};
  const parts: TheAnchorParts = { activeLine: await theActiveLineFor(prisma, ground.id, args.openRound, args.roundOpenedAt) };
  if (args.readerIsTheLead) {
    const record = await readTheMonthRecord(prisma, ground.id, args.openRound);
    const differences = (args.served.divergence?.items ?? []).map(aDifferenceInAWords).filter((x): x is string => !!x);
    parts.theMonthBoard = theMonthBoard({ record, clock: args.clock, differences, patterns: args.patterns });
    /* The month's end: twenty-eight days of the record's own clock, or the check-in has ended. Needs her own first words to begin with. */
    if (theMonthIsOver(record.startedOn, args.clock, hasEnded(ground.status ?? null))) {
      const herWords = await herOwnWords(prisma, ground.id, ground.initiatorId ?? null);
      if (herWords) parts.theEndOfMonthRead = theEndOfMonthRead({ herWords, record, differences, patterns: args.patterns });
    }
  }
  return parts;
}
