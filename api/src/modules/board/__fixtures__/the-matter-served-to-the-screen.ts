import { theWorldWithTheLitigationDaily, thePrismaFor, LIT_WANJIRU, LIT_BRIAN, LIT_AISHA, LIT_DAVID, WANJIRU, BRIAN } from './the-collections-record-for-specs';
import { theMatterBoardFor } from '../the-matter-board.service';
import { theCollectionsBoardFor } from '../the-collections-board.service';
import { fileTheFeeNotesDueOnAnEvent } from '../a-fee-note-due-on-an-event';
import { MUCHEMI_NOW, MUCHEMI_LITIGATION, MUCHEMI_FEE_NOTES } from '../../grounds/__fixtures__/muchemi-and-co';

/**
 * WHAT THE SERVER SERVES THE SCREENS FOR THE MATTER BOARD AND THE FEE NOTES DUE ON AN EVENT (Release 2, pull request 3 of 3), each
 * reader's own copy, for Muchemi & Co (test) after the litigation daily's week is read: the matter board for Wanjiru, Brian, Aisha
 * and David; the fee notes board for Wanjiru after Tuesday (the near miss for her to confirm) and after Wednesday. Written to
 * client/src/pages/board/pictured/__fixtures__/matter-served.json; the-matter-served-to-the-screen.spec.ts fails if they differ.
 */
async function theWeekReadTo(upTo: number) {
  const world = theWorldWithTheLitigationDaily();
  const prisma = thePrismaFor(world);
  const done = world.checkIns.filter((c: any) => c.groundId === MUCHEMI_LITIGATION.id && c.sessionNumber <= upTo).sort((a: any, b: any) => a.sessionNumber - b.sessionNumber);
  for (const c of done) await fileTheFeeNotesDueOnAnEvent({ prisma }, { groundId: MUCHEMI_LITIGATION.id, checkInId: c.id });
  return prisma;
}

export async function theMatterServedToTheScreen() {
  const week = await theWeekReadTo(3);
  const tuesday = await theWeekReadTo(2);
  return {
    matter: {
      wanjiru: await theMatterBoardFor(week, MUCHEMI_LITIGATION.id, LIT_WANJIRU, MUCHEMI_NOW),
      brian: await theMatterBoardFor(week, MUCHEMI_LITIGATION.id, LIT_BRIAN, MUCHEMI_NOW),
      aisha: await theMatterBoardFor(week, MUCHEMI_LITIGATION.id, LIT_AISHA, MUCHEMI_NOW),
      david: await theMatterBoardFor(week, MUCHEMI_LITIGATION.id, LIT_DAVID, MUCHEMI_NOW),
    },
    feeNotes: {
      wanjiruOnTuesday: await theCollectionsBoardFor(tuesday, MUCHEMI_FEE_NOTES.id, WANJIRU, MUCHEMI_NOW),
      wanjiru: await theCollectionsBoardFor(week, MUCHEMI_FEE_NOTES.id, WANJIRU, MUCHEMI_NOW),
      brian: await theCollectionsBoardFor(week, MUCHEMI_FEE_NOTES.id, BRIAN, MUCHEMI_NOW),
    },
  };
}
