import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { heldBy, holdsScope } from './scopes';

/**
 * A READ SCOPE DOES NOT WRITE.
 *
 * POST findings/run was annotated findings:read and wrote Recommendation rows, so a customer who
 * issued a read-only credential was writing proposals with it (fix plan A11). The route carries the
 * write scope now; for one release the read scope still opens it, through the same IMPLIED map that
 * lets graph:write read the graph, and the guard logs who is relying on that.
 */
const MODULES = join(__dirname, '..');
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
function every(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...every(p));
    else if (p.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}
const A_WRITE = /\.(create|createMany|update|updateMany|upsert|delete|deleteMany|propose|record|push|accept|decline|run)\(/;

describe('every handler declared with a read scope', () => {
  it('calls nothing that writes', () => {
    const faults: string[] = [];
    let seen = 0;
    for (const file of every(MODULES)) {
      const code = strip(readFileSync(file, 'utf8'));
      /* From the read-scope decorator to the end of the handler it decorates: the next decorator
         stack at the same indent, or the end of the class. */
      for (const m of code.matchAll(/@RequiresScope\('([a-z]+):read'\)([\s\S]*?)(?=\n  @|\n\}\n)/g)) {
        seen += 1;
        const body = m[2];
        const hit = body.match(A_WRITE);
        if (hit) faults.push(`${file.slice(MODULES.length + 1)} ${m[1]}:read calls ${hit[0]}`);
      }
    }
    expect(seen).toBeGreaterThan(10);
    expect(faults).toEqual([]);
  });

  it('and the route that runs the detectors and writes proposals carries the write scope', () => {
    const code = strip(readFileSync(join(MODULES, 'detectors', 'detectors.controller.ts'), 'utf8'));
    const run = code.slice(code.indexOf("@Post('findings/run')"), code.indexOf('async run('));
    expect(run).toContain("@RequiresScope('proposals:write')");
  });
});

describe('the grace period', () => {
  it('lets a read-only credential through this release, and says how it was let through', () => {
    expect(holdsScope(['findings:read'], 'proposals:write')).toBe(true);
    expect(heldBy(['findings:read'], 'proposals:write')).toEqual({ how: 'implied', by: 'findings:read' });
    expect(heldBy(['proposals:write'], 'proposals:write')).toEqual({ how: 'directly' });
    expect(heldBy(['reports:read'], 'proposals:write')).toBeNull();
  });
});
