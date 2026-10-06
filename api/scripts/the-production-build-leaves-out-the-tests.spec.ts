import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * THE PRODUCTION BUILD LEAVES OUT THE TESTS (decision 110, B8; screens request 172).
 *
 * `nest build` compiled every spec and harness under `src/` and ran out of memory on the default heap. `tsconfig.build.json` (which `nest build`
 * uses by itself when it exists) leaves them out. This holds that it does, and that nothing the server runs imports what it leaves out, which
 * is the only way leaving it out could break `node dist/main`. `npm run check:production-start` is the proof that it starts.
 */
const API = join(__dirname, '..');
const build = JSON.parse(readFileSync(join(API, 'tsconfig.build.json'), 'utf8'));

describe('tsconfig.build.json', () => {
  it('extends the ordinary one and leaves out the specs, the harnesses, the fixtures and the journeys', () => {
    expect(build.extends).toBe('./tsconfig.json');
    for (const pattern of ['**/*.spec.ts', '**/*.test.ts', '**/__fixtures__/**', '**/*-harness.ts', '**/*-for-specs.ts', 'journey', 'node_modules', 'dist']) {
      expect(build.exclude).toContain(pattern);
    }
  });

  it('the ordinary one still holds them, so the type check and the tests still see everything', () => {
    const base = JSON.parse(readFileSync(join(API, 'tsconfig.json'), 'utf8'));
    expect(base.exclude).not.toContain('**/*.spec.ts');
    expect(base.include).toContain('src/**/*');
  });

  it('nothing the server runs imports what the build leaves out', () => {
    const left = /(\.spec|\.test)$|-harness$|-for-specs$|__fixtures__/;
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? (f === '__fixtures__' ? [] : walk(p)) : p.endsWith('.ts') ? [p] : [];
    });
    const files = walk(join(API, 'src')).filter((f) => !/\.(spec|test)\.ts$|-harness\.ts$|-for-specs\.ts$/.test(f));
    const offenders: string[] = [];
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/from\s+'(\.[^']+)'/g)) if (left.test(m[1])) offenders.push(`${relative(API, f)} imports ${m[1]}`);
    }
    expect(offenders).toEqual([]);
  });
});
