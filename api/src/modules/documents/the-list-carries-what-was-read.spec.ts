import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * THE CARD CANNOT SHOW WHAT THE LIST DOES NOT FETCH.
 *
 * Every upload is read and assessed and the result stored on the row. The upload RESPONSE carried
 * it, so the person who had just attached a file saw what was read from it - and it vanished on the
 * next page load, because the list query never selected the column. `toDocShape` omits what was not
 * selected rather than guessing, so there was no error anywhere: the card silently became a
 * filename and a date, and a document could not be told apart from a file in a locker.
 *
 * Every read that feeds a document card asks for it now, and this is the guard, because the next
 * query somebody adds will copy one of these select lists.
 */
const SRC = readFileSync(join(__dirname, 'documents.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('every document read that feeds a card fetches its assessment', () => {
  const selects: string[] = SRC.match(/select: \{[^}]*fileName: true[^}]*\}/g) ?? [];

  it('found the selects, so an empty match cannot pass', () => {
    expect(selects.length).toBeGreaterThanOrEqual(3);
  });

  it('and each one asks for the assessment', () => {
    const without = selects.filter((sel) => !sel.includes('assessment: true'));
    expect(without).toEqual([]);
  });
});
