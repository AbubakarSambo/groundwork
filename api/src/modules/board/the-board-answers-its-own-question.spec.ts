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
    expect(BOARD).toContain('d.positions.map(');
    expect(BOARD).toContain('pos.participantLabel');
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
    /* The single guarantee this rests on: `named()` walks every string in the report object before
       it is put on the response, so positions were already filtered. If that ever stops recursing
       into arrays and objects, this section starts printing names the reader may not have. */
    expect(SERVICE).toMatch(/if \(Array\.isArray\(v\)\) return v\.map\(named\);/);
    expect(SERVICE).toMatch(/const reportSafe = reportSafeRaw \? \(named\(reportSafeRaw\)/);
  });
});
