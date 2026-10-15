import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, relative, resolve, sep } from 'path';

/**
 * NOTHING UNDER src IMPORTS FROM OUTSIDE src (5 October 2026).
 *
 * The build compiles `src/**`. One import of `../../../journey/...` from a spec pulled journey/ into the build, so the
 * compiler's root moved up a level, the server landed at `dist/src/main.js`, `node dist/main` did not start, and the
 * embed's static files were copied where the server no longer looked. Anything shared between src and the journeys
 * lives in src, and the journeys import it from there, never the other way.
 */
const SRC = resolve(__dirname);
/* An import or export statement's source, a side-effect import, or a require or import() call on a line of code (not a comment). */
const IMPORT = /^(?!\s*(?:\*|\/\/|\/\*))(?:\s*(?:import|export)\b[^'"]*?\bfrom\s+|\s*\}\s*from\s+|\s*import\s+|.*?\b(?:require|import)\s*\(\s*)['"](\.{1,2}\/[^'"]*)['"]/gm;

function everyFile(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== 'node_modules') everyFile(p, out); }
    else if (/\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}

const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('nothing under src imports from outside src', () => {
  it('every relative import stays inside src', () => {
    const outside: string[] = [];
    for (const file of everyFile(SRC)) {
      const text = withoutComments(readFileSync(file, 'utf8'));
      for (const m of text.matchAll(IMPORT)) {
        const target = resolve(dirname(file), m[1]);
        if (target !== SRC && !target.startsWith(SRC + sep)) outside.push(`${relative(SRC, file)} imports ${m[1]}`);
      }
    }
    expect(outside).toEqual([]);
  });

  it('finds such an import when there is one', () => {
    const lines = ['import { x } ' + "from '../../../journey/anchor/rules';", ' * a comment that names ' + "from '../../common'"].join('\n');
    expect([...lines.matchAll(IMPORT)].map((m) => m[1])).toEqual(['../../../journey/anchor/rules']);
  });
});
