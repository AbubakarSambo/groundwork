import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE BOARD NAMED THE DISAGREEMENT AND SENT YOU SOMEWHERE ELSE TO READ IT.
 *
 * "Where accounts differ" printed a topic and a pill saying "differs", then a line of italics:
 * "This is the summary. Your own report holds the detail of what each account said."
 *
 * That sentence was the reason a separate shared-report surface had to exist. Asked why a
 * participant was reading so many reports, this is one of the answers: the page that exists to show
 * a team the same picture would not show them the picture.
 *
 * NOTHING NEW WAS DISCLOSED. `divergence.items` was always the report's own divergence objects sent
 * whole - `positions` and `atStake` were on the wire the whole time, and every string in them goes
 * through `named()`, the same masking every other part of the board gets, so a reader who is not
 * entitled to know who somebody is still is not told. The client was not rendering fields it had.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SERVICE = strip(readFileSync(join(__dirname, 'board.service.ts'), 'utf8'));
const BOARD = strip(
  readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'board', 'BoardPage.tsx'), 'utf8'),
);

describe('where accounts differ', () => {
  it('prints what each account said', () => {
    /* Since request 109 the board draws only the sides that have words of their own, so the
       positions are filtered before they are mapped; each one printed still shows who and the view. */
    expect(BOARD).toMatch(/d\.positions(\.filter\(.+?\))?\.map\(/);
    /* `who`, not `.participantLabel`, which must never be printed (docs/answers-from-engine.md, U.10). */
    expect(BOARD).toContain('pos.who');
    expect(BOARD).not.toContain('pos.participantLabel');
    expect(BOARD).toContain('pos.view');
  });

  it('and why it matters', () => {
    expect(BOARD).toContain('{d.atStake}');
  });

  it('and no longer sends the reader to another page for it', () => {
    expect(SERVICE).not.toContain('holds the detail of what each account said');
    expect(BOARD).not.toContain('divergence.pointer');
  });

  it('with the names still masked the way the rest of the board masks them', () => {
    /*
     * The single guarantee this rests on: every string in the report row is resolved for this
     * reader before anything is put on the response, so positions were already filtered.
     *
     * IT USED TO PIN THE BOARD'S OWN WALKER - `v.map(named)` and `named(reportSafeRaw)`. That
     * walker covered the whitelisted fields only, which let `theJudgement` and `overTime` reach a
     * lead in labels, so the board now replaces the whole row through the report's own read
     * instead. Same guarantee, wider: what this rests on is that the resolution happens on the
     * ROW, before any section reads it. See the-board-uses-names-like-the-report.
     */
    expect(SERVICE).toMatch(/\(ground as any\)\.report = askTheReportsDoor\(\s*this\.reports,/);
    expect(SERVICE).toMatch(/const reportSafe = ground\.report \? pickBoardSafeReportFields\(/);
  });
});
