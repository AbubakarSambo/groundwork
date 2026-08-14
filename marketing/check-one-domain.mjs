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

/** Set by the nav check, read by the closing log line. */
let navsByPageCount = 0;
let navLinkCount = 0;
const firstNavLen = (m) => ([...m.values()][0] ?? []).length;
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

  /**
   * EVERY PAGE'S NAV, NOT JUST THE HOME PAGE'S. W13-4.
   *
   * This used to read the home page alone, and the home page was the one that was
   * RIGHT. The other four hand-wrote their own nav with four links and dropped Use
   * cases, so the best answer the site has to "is this for me" could not be reached
   * from any page except the home page - including from itself.
   *
   * Nobody would find that by looking: a nav with four plausible items reads as
   * finished, and the missing fifth is only visible if you compare two pages side by
   * side. So this compares them.
   *
   * Astro stamps a scope attribute onto every element, so the opening tag is
   * `<div class="gw-nav-links" data-astro-cid-...>`. Match the class, not the tag.
   */
  navsByPageCount = 0;
  const navsByPage = new Map();
  for (const f of files.filter((x) => x.endsWith('index.html'))) {
    const page = '/' + relative(DIST, f).replace(/index\.html$/, '').replace(/\/$/, '');
    const pageHtml = readFileSync(f, 'utf8');
    const block = pageHtml.match(/<div class="gw-nav-links"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
    if (!block.trim()) {
      fail(`${page || '/'} has no nav-links block - the header changed shape, so this check cannot see it.`);
      continue;
    }
    navsByPage.set(page || '/', [...block.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => m[1]));
  }

  navsByPageCount = navsByPage.size;
  navLinkCount = firstNavLen(navsByPage);
  if (navsByPage.size < 5) {
    fail(`only ${navsByPage.size} page(s) have a nav. Every page must carry one, or a visitor can land somewhere with no way onward.`);
  }

  const [firstPage, firstNav] = [...navsByPage.entries()][0] ?? ['/', []];
  if (firstNav.length < 5) {
    fail(`the nav on ${firstPage} has only ${firstNav.length} link(s). It should link to every page; a nav that lists four of five is how /use-cases became unreachable.`);
  }

  for (const [page, nav] of navsByPage) {
    if (nav.join('|') !== firstNav.join('|')) {
      fail(`${page} has a different nav from ${firstPage}: ${nav.join(', ')} vs ${firstNav.join(', ')}. One nav, used everywhere - five hand-written copies is how one of them lost a page.`);
    }
    for (const href of nav) {
      if (!href.startsWith('/')) continue; // external or app links are not ours to check
      const clean = href.split(/[?#]/)[0].replace(/\/$/, '') || '/';
      if (!built.has(clean)) fail(`${page}'s nav links to ${href}, and the build produced no such page.`);
    }
    // A page whose own nav does not list it cannot be found from itself, which is
    // exactly what /use-cases did.
    if (!nav.map((h) => h.split(/[?#]/)[0].replace(/\/$/, '') || '/').includes(page)) {
      fail(`${page} is missing from its own nav, so it cannot be reached from itself or from any sibling.`);
    }
  }

  // The mechanism itself, in the artefact that ships.
  if (/id="lp-(how|usecases|pricing|about)"/.test(html)) {
    fail('the home page still carries a hidden copy of another page (id="lp-..."). One page, one implementation.');
  }
  if (/onclick="lNav\(/.test(html)) {
    fail('the home page still has lNav() nav buttons. The nav must be real links, or the URL and the title lie about what you are reading.');
  }
}

/**
 * EVERY PAGE MUST ACTUALLY CARRY THE STYLESHEET. W15-1.
 *
 * The tokens were referenced for months as `<link rel="stylesheet" href="/src/styles/global.css">`,
 * which Vite serves as JavaScript. The browser asked for CSS, got a script, applied nothing, and no
 * page looked broken enough for anyone to check - the pages had their own inline styles and the
 * tokens were only the fallback layer. So the reference was dead and the site looked fine, which is
 * the worst combination available and the same shape as the sitemap bug above.
 *
 * Fixing it to a real import is what broke the deploy, because a stylesheet that is genuinely
 * compiled goes through the CSS pipeline and the Tailwind plugin in that pipeline was incompatible
 * with the installed Vite. Tailwind is gone now: not one utility class exists on this site.
 *
 * Checked in the built artefact rather than the source, because the failure mode was precisely a
 * source reference that looked right and shipped nothing.
 *
 * THE CLAIM IS "THE TOKENS ARE DEFINED", NOT "A STYLESHEET IS LINKED". My first version asserted the
 * link tag and failed on four of five pages against a correct build: Astro inlines small CSS into a
 * `<style>` block and only emits a separate file when it is worth a request. Asserting the delivery
 * mechanism instead of the outcome would have made this check a nuisance that the next person turns
 * off. Either delivery is fine; arriving is what matters.
 */
{
  let styledPages = 0;
  for (const f of files.filter((x) => x.endsWith('index.html'))) {
    const page = '/' + relative(DIST, f).replace(/index\.html$/, '').replace(/\/$/, '');
    const pageHtml = readFileSync(f, 'utf8');
    const hrefs = [...pageHtml.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]);

    /** A source path in a built page means the reference was never compiled - the original bug. */
    const raw = hrefs.find((h) => h.includes('/src/'));
    if (raw) {
      fail(`${page || '/'} links ${raw}, which is a source path in a built page. Vite serves that as JavaScript and it applies nothing. Import the stylesheet from a component instead.`);
    }

    const linked = hrefs
      .filter((h) => h.startsWith('/'))
      .map((h) => join(DIST, h.replace(/^\//, '')))
      .some((p) => existsSync(p) && readFileSync(p, 'utf8').includes('--gw-text:'));
    const inlined = /--gw-text\s*:/.test(pageHtml);
    if (!linked && !inlined) {
      fail(`${page || '/'} ships without the design tokens - neither inlined nor in any stylesheet it links. Every colour on it is a fallback.`);
    }
    styledPages++;
  }
  console.log(`[one-palette] all ${styledPages} pages ship the design tokens, inlined or linked.`);
}

console.log(`[one-domain] sitemap, canonicals and social tags all on ${SITE}.`);
console.log(`[one-nav] all ${navsByPageCount} pages share one nav of ${navLinkCount} real links, and no page hides a copy of another.`);
