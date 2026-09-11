import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { THE_THROTTLER } from './the-throttler';

/**
 * A LIMIT NAMED FOR A THROTTLER THAT DOES NOT EXIST IS DECORATION.
 *
 * @nestjs/throttler keys a route's limit under the throttler's name and never complains about a
 * name nobody registered. Five decorators said `default` against a registration that said `global`,
 * so two token routes whose comments said "nothing should be able to sit and try" had no limit, and
 * two webhooks had a harsher one than intended (fix plan A9). Every decorator names the one
 * throttler, and every anonymous handler that writes has one.
 */
const SRC = join(__dirname, '..');
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
function every(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...every(p));
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}
const files = every(SRC).map((p) => ({ p: p.slice(SRC.length + 1), code: strip(readFileSync(p, 'utf8')) }));

describe('every @Throttle in the tree', () => {
  it('names the registered throttler', () => {
    const wrong: string[] = [];
    let seen = 0;
    for (const { p, code } of files) {
      for (const m of code.matchAll(/@Throttle\(\{\s*(\w+)\s*:/g)) {
        seen += 1;
        if (m[1] !== THE_THROTTLER) wrong.push(`${p}: ${m[1]}`);
      }
    }
    expect(seen).toBeGreaterThan(15);
    expect(wrong).toEqual([]);
  });

  it('and the registration uses the same name', () => {
    const app = files.find((f) => f.p === 'app.module.ts')!.code;
    expect(app).toContain('ThrottlerModule.forRoot([{ name: THE_THROTTLER,');
  });
});

describe('every anonymous handler that writes', () => {
  it('carries a limit of its own', () => {
    const missing: string[] = [];
    for (const { p, code } of files) {
      if (!code.includes('@Public()')) continue;
      /* A decorator stack runs from @Public() to the handler's signature; the verb is in it. */
      for (const stack of code.split(/\n(?=\s*@Public\(\))/).slice(1)) {
        const head = stack.slice(0, stack.search(/\n\s*(?:async\s+)?\w+\s*\(/) + 1 || undefined);
        const verb = head.match(/@(Post|Patch|Put|Delete)\(/);
        if (!verb) continue;
        if (!/@Throttle\(/.test(head)) missing.push(`${p}: ${head.match(/@(?:Post|Patch|Put|Delete)\(([^)]*)\)/)?.[0]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
