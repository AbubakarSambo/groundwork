import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { aLocalDatabase, readAnEnvFile, whatIsWrongWithTheBuild } from './check-production-start';

/** The production-start check's own rules (npm run check:production-start). */
describe('the production-start check', () => {
  const made: string[] = [];
  const aBuild = (files: string[]) => {
    const dist = mkdtempSync(join(tmpdir(), 'gw-dist-'));
    made.push(dist);
    for (const f of files) { mkdirSync(join(dist, f, '..'), { recursive: true }); writeFileSync(join(dist, f), ''); }
    return dist;
  };
  afterAll(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });

  it('passes a build laid out as production starts it', () => {
    expect(whatIsWrongWithTheBuild(aBuild(['main.js', 'modules/embed/static/embed.js', 'modules/embed/static/panel.html']))).toEqual([]);
  });

  it('says what is wrong with the build of 5 October, where the server landed at dist/src/main.js', () => {
    expect(whatIsWrongWithTheBuild(aBuild(['src/main.js', 'src/modules/embed/static/embed.js']))).toEqual([
      'dist/main.js is missing, so `node dist/main` cannot start.',
      'dist/src exists, so something under src imports from outside src and the build root moved.',
      "The embed's embed.js is missing from dist/modules/embed/static.",
      "The embed's panel.html is missing from dist/modules/embed/static.",
    ]);
  });

  it('only ever starts against a database on this computer', () => {
    expect(aLocalDatabase('postgresql://me@localhost:5432/gw_test')).toBe(true);
    expect(aLocalDatabase('postgresql://me@127.0.0.1:5432/gw_test')).toBe(true);
    expect(aLocalDatabase('postgresql://me@db.example.com:5432/gw')).toBe(false);
    expect(aLocalDatabase(undefined)).toBe(false);
  });

  it('reads an env file without printing it', () => {
    expect(readAnEnvFile('# a note\nA=1\nB="two words"\nexport C=\'x\'\n\n')).toEqual({ A: '1', B: 'two words', C: 'x' });
  });
});
