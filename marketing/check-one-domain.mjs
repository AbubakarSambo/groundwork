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
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
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

/**
 * 4. THE NAV GOES TO THE PAGES, NOT TO A COPY OF THEM.
 *
 * The home page's nav was buttons calling `lNav()`, which hid the home page and
 * revealed a thinner inline copy of each section further down the same file. The
 * URL stayed `myground.work`, the tab still said "Groundwork - A clear picture",
 * and the visitor read a shorter, older version of a page that existed properly
 * somewhere else. `/about` is 14.7KB and has the team on it; its stub was 3.4KB
 * and had no team at all, and nothing in the nav could reach the real page.
 *
 * Nobody could have noticed from the source. Both versions were real HTML in one
 * file, both looked finished, and clicking About genuinely showed you something
 * headed About. It was found by Hafsah clicking About, reading to the bottom, and
 * her own team not being there.
 *
 * So this checks the built home page: every nav destination is a real anchor to a
 * page the build produced, and no page reveals another page by hiding itself.
 */
const home = join(DIST, 'index.html');
if (existsSync(home)) {
  const html = readFileSync(home, 'utf8');

  const built = new Set(
    files
      .filter((f) => f.endsWith('index.html'))
      .map((f) => '/' + relative(DIST, f).replace(/index\.html$/, '').replace(/\/$/, ''))
      .map((p) => p === '/' || p === '' ? '/' : p),
  );

  // Astro stamps a scope attribute onto every element, so the opening tag is
  // `<div class="l-nav-links" data-astro-cid-...>` in the artefact and
  // `<div class="l-nav-links">` in the source. Match the class, not the tag.
  const navBlock = html.match(/<div class="l-nav-links"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
  if (!navBlock.trim()) fail('the home page has no nav-links block - the header changed shape, so this check cannot see it.');

  const anchors = [...navBlock.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  if (anchors.length < 4) {
    fail(`the home nav has only ${anchors.length} link(s). It should link to every page; buttons that swap hidden divs are how /about became unreachable.`);
  }
  for (const href of anchors) {
    if (!href.startsWith('/')) continue; // external or app links are not ours to check
    const clean = href.split(/[?#]/)[0].replace(/\/$/, '') || '/';
    if (!built.has(clean)) fail(`the home nav links to ${href}, and the build produced no such page.`);
  }

  // The mechanism itself, in the artefact that ships.
  if (/id="lp-(how|usecases|pricing|about)"/.test(html)) {
    fail('the home page still carries a hidden copy of another page (id="lp-..."). One page, one implementation.');
  }
  if (/onclick="lNav\(/.test(html)) {
    fail('the home page still has lNav() nav buttons. The nav must be real links, or the URL and the title lie about what you are reading.');
  }
}

console.log(`[one-domain] sitemap, canonicals and social tags all on ${SITE}.`);
console.log('[one-nav] the home nav links to real pages, and no page hides a copy of another.');
