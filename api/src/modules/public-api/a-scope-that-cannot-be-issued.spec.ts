/**
 * A route required `graph:read` and the scope list did not contain it, so no credential could ever
 * hold it: a documented GET that answered 403 to everybody, for ever. The pair of facts — what a
 * route asks for, and what can be granted — has to be checked together or neither notices.
 */
import * as fs from 'fs';
import * as path from 'path';
import { SCOPES, isScope, holdsScope } from './scopes';

const srcRoot = path.join(__dirname, '..', '..');

function everyRequiredScope(): { scope: string; where: string }[] {
  const out: { scope: string; where: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.ts') || entry.name.includes('.spec.')) continue;
      const text = fs.readFileSync(full, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of text.matchAll(/@RequiresScope\('([^']+)'\)/g)) {
        out.push({ scope: m[1], where: path.relative(srcRoot, full) });
      }
    }
  };
  walk(srcRoot);
  return out;
}

describe('every scope a route requires can actually be issued', () => {
  const required = everyRequiredScope();

  it('found the decorators at all, so a rename cannot make this pass by finding nothing', () => {
    expect(required.length).toBeGreaterThan(10);
  });

  it.each(required)('$scope, required in $where, is a scope', ({ scope }) => {
    expect(isScope(scope)).toBe(true);
  });
});

describe('and a wider scope holds a narrower one', () => {
  it('lets graph:write read the graph', () => {
    expect(holdsScope(['graph:write'], 'graph:read')).toBe(true);
  });

  it('does not invent implications in the other direction', () => {
    expect(holdsScope(['graph:read'], 'graph:write')).toBe(false);
  });

  it('is still exact for everything else', () => {
    expect(holdsScope(['reports:read'], 'findings:read')).toBe(false);
    expect(holdsScope(['findings:read'], 'findings:read')).toBe(true);
    expect(holdsScope([], 'graph:read')).toBe(false);
  });

  it('and graph:read is issuable in its own right', () => {
    expect(SCOPES).toContain('graph:read');
  });
});

describe('and the guard asks holdsScope rather than includes', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'machine-token.guard.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('consults the implication table', () => {
    /* `heldBy` since A11: the same table, and it also says HOW the scope was held, so the guard can log a credential relying on a grace. */
    expect(src).toContain('heldBy(scopes, required)');
    expect(src).not.toMatch(/scopes\.includes\(required\)/);
  });
});
