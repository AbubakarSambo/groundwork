import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE BOARD AND THE REPORT COUNT THE SAME THINGS. The board recomputed the four tiles a second way
 * when the engine returned nothing, and three of the four differed from the report's. Now there is
 * one owner of the counts and one builder of the tiles, and neither surface has a copy of its own.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const read = (rel: string) => strip(readFileSync(join(__dirname, rel), 'utf8'));

describe('one owner of the session counts', () => {
  const board = read('../board/board.service.ts');
  const report = read('./the-session-report.ts');
  const service = read('./reports.service.ts');

  it('both surfaces build tiles through atAGlanceTiles and read counts through whatThisSessionHolds', () => {
    for (const src of [board, report]) expect(src).toMatch(/atAGlanceTiles\(/);
    for (const src of [board, service]) expect(src).toMatch(/whatThisSessionHolds\(this\.prisma, groundId/);
  });

  it('nobody computes movement from prevCount or counts every dependency on the ground any more', () => {
    for (const src of [board, service]) {
      expect(src).not.toMatch(/reduce\([^)]*o\.count - o\.prevCount/);
      expect(src).not.toMatch(/groundDependency\.count\(\{ where: \{ groundId, status/);
    }
    expect(board).not.toMatch(/across every session/);
  });

  it('the report keeps no tile literals of its own', () => {
    expect(report).not.toMatch(/label: 'Differences'/);
    expect(read('./what-this-session-holds.ts')).toMatch(/label: 'Differences'/);
  });
});
