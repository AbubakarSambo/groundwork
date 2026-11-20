import * as fs from 'fs';
import * as path from 'path';
import { whyNothingIsCrossReferenced } from './why-nothing-is-cross-referenced';

/**
 * TWO SENTENCES ABOUT THE SAME EMPTY SECTION, ONE OF THEM FALSE.
 *
 * The tile said "everybody answered, and the written report names no agreement and no gap yet"; the
 * section under it said "This fills in once more than one person has checked in". Read live on a
 * board where everybody had answered, and on a one-person board where nobody else was coming.
 */
/* A source assertion matches CODE, never a sentence quoting it - see a-guard-that-a-comment-satisfies. */
const withoutComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('why nothing is cross-referenced', () => {
  it('says who it is waiting on while it is waiting', () => {
    expect(whyNothingIsCrossReferenced({ stillToAnswer: 3, peopleExpected: 8 })).toBe('Nothing cross-referenced yet. 3 people have still to answer.');
    expect(whyNothingIsCrossReferenced({ stillToAnswer: 1, peopleExpected: 4 })).toBe('Nothing cross-referenced yet. One person has still to answer.');
  });

  it('does not say it is waiting on anybody once everybody has answered', () => {
    const t = whyNothingIsCrossReferenced({ stillToAnswer: 0, peopleExpected: 5 });
    expect(t).toBe('Everybody answered, and nothing in the written report reads as a difference or an agreement yet.');
    expect(t).not.toMatch(/fills in|more than one person/i);
  });

  it('and on a one-person check-in it says only that there is nothing to compare, with no explanation of the board', () => {
    expect(whyNothingIsCrossReferenced({ stillToAnswer: 0, peopleExpected: 1 })).toBe('There is nothing to compare yet.');
  });

  it('with no counts at all it claims nothing about the roster', () => {
    expect(whyNothingIsCrossReferenced({ stillToAnswer: null, peopleExpected: 0 })).toBe('Nothing is cross-referenced yet.');
  });

  it('the board sends it and the page prints it', () => {
    const board = withoutComments(fs.readFileSync(path.join(__dirname, 'board.service.ts'), 'utf8'));
    expect(board).toMatch(/whyNothingYet: whyNothingIsCrossReferenced\(\{/);
    const page = withoutComments(fs.readFileSync(path.join(__dirname, '../../../../client/src/pages/board/BoardPage.tsx'), 'utf8'));
    expect(page).toContain('b.divergence.whyNothingYet');
    /* The old constant cannot be the only thing on the row any more. */
    expect(page).not.toMatch(/>Nothing cross-referenced yet\. This fills in once more than one person has checked in\.</);
  });
});
