import { theCollectionsWorld, thePrismaFor, WANJIRU, BRIAN, NJERI, HALIMA, MUSA } from './the-collections-record-for-specs';
import { theCollectionsBoardFor } from '../the-collections-board.service';
import { withTheCollectionsReadings } from '../../reports/the-collections-readings-for-a-report';
import { MUCHEMI_NOW, MUCHEMI_FEE_NOTES } from '../../grounds/__fixtures__/muchemi-and-co';
import { LENDER_LOANS } from '../../grounds/__fixtures__/a-small-lender';

/**
 * WHAT THE SERVER SERVES THE SCREENS FOR THE TWO TEST ORGANISATIONS (Release 2, pull request 2 of 3), each reader's own copy. Written
 * to client/src/pages/board/pictured/__fixtures__/collections-served.json so the screens' tests draw exactly what the server serves;
 * the-collections-served-to-the-screen.spec.ts fails if the two ever differ.
 */
export async function theCollectionsServedToTheScreen() {
  const p = () => thePrismaFor(theCollectionsWorld());
  const report = async (g: string, n: number, u: string) => withTheCollectionsReadings(p(), g, n, u, {}, MUCHEMI_NOW) as Promise<any>;
  return {
    boards: {
      wanjiru: await theCollectionsBoardFor(p(), MUCHEMI_FEE_NOTES.id, WANJIRU, MUCHEMI_NOW),
      brian: await theCollectionsBoardFor(p(), MUCHEMI_FEE_NOTES.id, BRIAN, MUCHEMI_NOW),
      njeri: await theCollectionsBoardFor(p(), MUCHEMI_FEE_NOTES.id, NJERI, MUCHEMI_NOW),
      halima: await theCollectionsBoardFor(p(), LENDER_LOANS.id, HALIMA, MUCHEMI_NOW),
      musa: await theCollectionsBoardFor(p(), LENDER_LOANS.id, MUSA, MUCHEMI_NOW),
    },
    reports: {
      wanjiru: (await report(MUCHEMI_FEE_NOTES.id, 3, 'u-wanjiru')).collectionsReport,
      brian: (await report(MUCHEMI_FEE_NOTES.id, 3, 'u-brian')).collectionsOwnReport,
      musa: (await report(LENDER_LOANS.id, 5, 'u-musa')).collectionsOwnReport,
    },
  };
}
