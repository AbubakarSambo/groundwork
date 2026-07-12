import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * Marketing link wiring tripwire.
 *
 * The marketing site (astro, a separate package with no shared types) links
 * into the app with plain strings: `${APP_URL}/start`, `${APP_URL}/entry`,
 * etc. Nothing connects those strings to the client's actual route table, so
 * a typo (`/entry` instead of `/start`, `/register` instead of `/start`) only
 * shows up when a real visitor clicks it and lands on a blank page - which is
 * exactly what happened on both the pricing and about pages. This test reads
 * both source trees as plain text and asserts every marketing CTA resolves
 * to a route that actually exists in App.tsx, so a bad link fails CI before
 * it ships instead of after a prospect clicks it.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MARKETING_PAGES_DIR = path.resolve(__dirname, '../../marketing/src/pages')
const APP_ROUTES_FILE = path.resolve(__dirname, './App.tsx')

/** Extracts every `${APP_URL}/...` href target from an astro page's source. */
function extractAppLinks(source: string): string[] {
  const matches = [...source.matchAll(/\$\{APP_URL\}(\/[^`"']*)/g)];
  return matches.map((m) => m[1]);
}

/** Strips query string / hash and trailing slash so it matches a route pattern. */
function normalizePath(p: string): string {
  const stripped = p.split(/[?#]/)[0];
  return stripped.length > 1 && stripped.endsWith('/') ? stripped.slice(0, -1) : stripped;
}

/** Extracts every literal `<Route path="...">` value from App.tsx, excluding the wildcard catch-all. */
function extractClientRoutes(source: string): string[] {
  const matches = [...source.matchAll(/<Route\s+path="([^"]+)"/g)];
  return matches.map((m) => m[1]).filter((p) => p !== '*');
}

/** Whether `actualPath` matches `routePattern`, treating `:param` segments as wildcards and `:param?` as optional. */
function routeMatches(routePattern: string, actualPath: string): boolean {
  const routeSegs = routePattern.split('/').filter(Boolean);
  const pathSegs = actualPath.split('/').filter(Boolean);

  const lastRouteSeg = routeSegs[routeSegs.length - 1];
  const hasOptionalTrailing = lastRouteSeg?.endsWith('?');

  if (routeSegs.length !== pathSegs.length) {
    // Only acceptable length mismatch: an optional trailing param omitted entirely.
    if (!(hasOptionalTrailing && routeSegs.length === pathSegs.length + 1)) return false;
  }

  for (let i = 0; i < pathSegs.length; i++) {
    const routeSeg = routeSegs[i];
    if (routeSeg === undefined) return false;
    if (routeSeg.startsWith(':')) continue; // dynamic segment - matches anything
    if (routeSeg !== pathSegs[i]) return false;
  }
  return true;
}

function pathExistsAsRoute(actualPath: string, routes: string[]): boolean {
  return routes.some((route) => routeMatches(route, actualPath));
}

describe('GW-LINK-WIRE: marketing CTAs point at routes that actually exist', () => {
  const clientRoutes = extractClientRoutes(readFileSync(APP_ROUTES_FILE, 'utf-8'));
  const marketingFiles = readdirSync(MARKETING_PAGES_DIR).filter((f) => f.endsWith('.astro'));

  it('sanity: found a non-trivial client route table and marketing page set (guards against a silently-empty test)', () => {
    expect(clientRoutes.length).toBeGreaterThan(10);
    expect(marketingFiles.length).toBeGreaterThan(0);
  });

  it('every ${APP_URL}/... link across every marketing page resolves to a real client route', () => {
    const broken: { file: string; link: string }[] = [];

    for (const file of marketingFiles) {
      const source = readFileSync(path.join(MARKETING_PAGES_DIR, file), 'utf-8');
      const links = extractAppLinks(source);
      for (const link of links) {
        const normalized = normalizePath(link);
        if (!pathExistsAsRoute(normalized, clientRoutes)) {
          broken.push({ file, link });
        }
      }
    }

    if (broken.length) {
      const detail = broken.map((b) => `  ${b.file} -> ${b.link}`).join('\n');
      throw new Error(`Marketing page(s) link to a route that does not exist in App.tsx:\n${detail}`);
    }
  });

  // Route-matcher unit coverage, independent of the current state of either
  // source tree - guards the matcher itself, not just today's link set.
  describe('routeMatches (matcher unit coverage)', () => {
    it('matches a static route exactly', () => {
      expect(routeMatches('/start', '/start')).toBe(true);
      expect(routeMatches('/start', '/entry')).toBe(false);
    });

    it('treats a dynamic segment as a wildcard', () => {
      expect(routeMatches('/grounds/:id', '/grounds/abc123')).toBe(true);
      expect(routeMatches('/grounds/:id/report', '/grounds/abc123/report')).toBe(true);
      expect(routeMatches('/grounds/:id/report', '/grounds/abc123')).toBe(false);
    });

    it('treats an optional trailing param as optional', () => {
      expect(routeMatches('/profile/:id?', '/profile')).toBe(true);
      expect(routeMatches('/profile/:id?', '/profile/abc123')).toBe(true);
    });

    it('rejects a path with no matching route (the exact class of bug this suite exists to catch)', () => {
      expect(pathExistsAsRoute('/entry', ['/start', '/auth', '/billing'])).toBe(false);
      expect(pathExistsAsRoute('/register', ['/start', '/auth', '/billing'])).toBe(false);
    });
  });
});
