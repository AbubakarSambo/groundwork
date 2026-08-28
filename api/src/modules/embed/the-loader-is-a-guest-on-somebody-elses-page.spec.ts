import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THIS SCRIPT RUNS ON EVERY PAGE OF SOMEBODY ELSE'S APPLICATION.
 *
 * It must never block their render, never throw into their console, and never take their site down
 * because ours is having a bad day. None of that is provable from a unit test, so what is pinned
 * here is the SHAPE that makes it true - and the shape is what a later edit breaks.
 *
 * Both files were driven in a real browser from a page that was not ours: the launcher appeared,
 * the panel opened knowing who she was, a question was answered from her own records, and after
 * her department was excluded she got nothing at all.
 */
const DIR = join(__dirname, 'static');
const LOADER = readFileSync(join(DIR, 'embed.js'), 'utf8');
const PANEL = readFileSync(join(DIR, 'panel.html'), 'utf8');
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe("the loader is a guest on somebody else's page", () => {
  it('never lets an error escape into their console by default', () => {
    expect(code(LOADER)).toMatch(/\.catch\(/);
  });

  it('but says something when the integrator opts in', () => {
    /*
     * THE SILENCE HID A BUG OF MINE. A renamed parameter left a ReferenceError inside mount, the
     * catch swallowed it, and the widget simply did not appear - nothing in the console to search
     * for. Silence is right for a customer and wrong for whoever is integrating.
     */
    expect(code(LOADER)).toMatch(/data-debug/);
    expect(code(LOADER)).toMatch(/console\.error/);
  });

  it('renders NOTHING when the person is out of scope', () => {
    /* Not a disabled launcher and not a message - somebody out of scope should not learn there is
       something they are out of. */
    expect(code(LOADER)).toMatch(/!session\.visible[\s\S]{0,40}return/);
  });

  it('uses an iframe rather than injected markup', () => {
    /* Injected DOM inherits the host application's CSS and breaks unpredictably across customers. */
    expect(code(LOADER)).toMatch(/createElement\('iframe'\)/);
    expect(code(LOADER)).toMatch(/setAttribute\('sandbox'/);
  });

  it('puts the session token in the fragment, never the query string', () => {
    /* A fragment is never sent to a server and never lands in an access log - not ours, not a
       proxy's, not the customer's. */
    expect(code(LOADER)).toMatch(/'#' \+ encodeURIComponent\(session\.sessionToken\)/);
    expect(code(LOADER)).not.toMatch(/[?&]token=/);
  });

  it('posts only to our own origin, never to a wildcard', () => {
    const posts = [...code(LOADER).matchAll(/postMessage\([^;]*\)/g)].map((m) => m[0]);
    expect(posts.length).toBeGreaterThan(0);
    for (const p of posts) expect(p).toMatch(/,\s*API\s*\)/);
  });

  it('ignores messages that are not from our own frame', () => {
    expect(code(LOADER)).toMatch(/e\.origin !== API/);
    expect(code(LOADER)).toMatch(/e\.source !== panel\.contentWindow/);
  });

  it('falls back to nothing rather than somewhere the customer did not choose', () => {
    /* Anchor mode with no container must not quietly become a floating widget on every page. */
    expect(code(LOADER)).toMatch(/if \(!host\) return;/);
  });
});

describe('three events out, two in, and no content either way', () => {
  it('sends only ready, resize and closed', () => {
    const sent = new Set([...code(PANEL).matchAll(/send\('(\w+)'/g)].map((m) => m[1]));
    expect([...sent].sort()).toEqual(['closed', 'ready', 'resize']);
  });

  it('accepts only open and context', () => {
    const handled = new Set([...code(PANEL).matchAll(/e\.data\.type === '(\w+)'/g)].map((m) => m[1]));
    expect([...handled].sort()).toEqual(['context', 'open']);
  });

  it('context carries an identifier and never content', () => {
    /* A host that put a document in here would be posting its own content into our frame. */
    expect(code(LOADER)).toMatch(/subjectExternalId: String\(/);
    expect(code(LOADER)).toMatch(/\.slice\(0, 200\)/);
  });
});

describe('the panel renders text as text', () => {
  it('never uses innerHTML for anything that came through a customer', () => {
    expect(code(PANEL)).not.toMatch(/innerHTML/);
    expect(code(PANEL)).toMatch(/textContent/);
  });

  it('stamps which spoke on a rules-composed reply', () => {
    expect(code(PANEL)).toMatch(/composedBy === 'rules'/);
    expect(PANEL).toMatch(/answered from your records/);
  });

  it('says something rather than nothing when the API cannot be reached', () => {
    expect(PANEL).toMatch(/could not reach the record/);
  });
});

describe('what a browser fetches is not wrapped in our envelope', () => {
  it('the interceptor lets the loader and the panel through untouched', () => {
    /*
     * IT DID NOT, AND THE WIDGET NEVER RAN. `/embed.js` came back as a JSON envelope carrying a
     * JavaScript content type, so Chrome refused it outright - ERR_BLOCKED_BY_ORB - and the
     * loader's own "fail quietly" design meant there was nothing in the console to say why. Exactly
     * the OAuth envelope bug a few days earlier: an envelope added for our convenience, breaking a
     * contract somebody else parses.
     */
    const SRC = readFileSync(join(__dirname, '../../common/interceptors/transform.interceptor.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(SRC).toMatch(/embed\\\.js/);
    expect(SRC).toMatch(/embed\\\/panel/);
    expect(SRC).toMatch(/api\\\/org\\\/v1/);
  });
});
