/**
 * THE SITEMAP AND THE CANONICALS MUST NAME THE SAME SITE.
 *
 * They did not, and nothing could have told us. astro.config.mjs said
 * https://www.groundwork.app while Layout.astro hardcoded https://myground.work, so
 * every URL in the sitemap pointed at a domain that does not resolve while the
 * canonical tags on the same pages were correct.
 *
 * The worst combination available: a crawler following the sitemap gets four dead
 * links, and nothing about the site as a person browses it looks wrong, so nobody
 * finds out. It was found by being told the real domain and checking, not by any
 * test.
 *
 * This runs after every build, including on the deploy. It FAILS the build rather
 * than warning, because a wrong domain in a sitemap is invisible by nature and a
 * warning in a build log is the same as silence.
 *
 * There is no test runner in this package and adding one for a single check would be
 * heavier than the thing it checks - so it is a postbuild script, which also means it
 * guards the artefact that actually ships rather than the source that produced it.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { SITE } from './src/site.mjs';

const DIST = 'dist';
const fail = (msg) => { console.error(`\n[one-domain] ${msg}\n`); process.exit(1); };

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

const files = walk(DIST);

// 1. Every sitemap URL is on the live domain.
for (const f of files.filter((f) => f.endsWith('.xml'))) {
  const locs = [...readFileSync(f, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const wrong = locs.filter((l) => !l.startsWith(SITE));
  if (wrong.length) fail(`${f} lists ${wrong.length} URL(s) that are not on ${SITE}. First: ${wrong[0]}`);
}

// 2. Every canonical agrees with it. A page whose canonical points elsewhere tells
//    search engines the real page is somewhere it is not.
for (const f of files.filter((f) => f.endsWith('.html'))) {
  const canonical = readFileSync(f, 'utf8').match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical && !canonical.startsWith(SITE)) fail(`${f} has canonical ${canonical}, which is not on ${SITE}.`);
}

// 3. And no page mentions a domain we used to claim. Cheap, and it is what would
//    have caught this: the old value survived in one file for months.
const RETIRED = ['groundwork.app', 'groundwork.africa'];
for (const f of files.filter((f) => f.endsWith('.html') || f.endsWith('.xml'))) {
  const text = readFileSync(f, 'utf8');
  for (const d of RETIRED) {
    if (text.includes(d)) fail(`${f} still mentions ${d}. The live site is ${SITE}.`);
  }
}

console.log(`[one-domain] sitemap, canonicals and social tags all on ${SITE}.`);
