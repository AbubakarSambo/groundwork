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

describe('four events out, three in, and no content either way', () => {
  it('sends only ready, resize, closed and a request for a new session', () => {
    /* `needs-session` carries nothing — it is the panel saying its fifteen minutes are nearly up.
       Only the host can get another, because the session comes from the customer's own signed
       identity token, which the panel cannot ask their server for. */
    const sent = new Set([...code(PANEL).matchAll(/send\('([\w-]+)'/g)].map((m) => m[1]));
    expect([...sent].sort()).toEqual(['closed', 'needs-session', 'ready', 'resize']);
  });

  it('accepts only open, context and a session handed back', () => {
    const handled = new Set([...code(PANEL).matchAll(/e\.data\.type === '([\w-]+)'/g)].map((m) => m[1]));
    expect([...handled].sort()).toEqual(['context', 'open', 'session']);
  });

  it('and the loader answers that request by handshaking again, not by inventing a token', () => {
    const loader = code(LOADER);
    expect(loader).toMatch(/e\.data\.type === 'needs-session'/);
    const branch = loader.slice(loader.indexOf("'needs-session'"), loader.indexOf("'closed'"));
    expect(branch).toContain('handshake()');
    expect(branch).toContain("type: 'session'");
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

/**
 * A PANEL OPEN ALL DAY.
 *
 * The session lasts fifteen minutes. The service's comment said the widget refreshed it silently
 * and the guard's refusal said "the panel will reconnect", and neither existed — so a conversation
 * stopped working mid-afternoon and blamed the network, until somebody reloaded the host page.
 */
describe('a session that is about to run out', () => {
  const panel = code(PANEL);
  const loader = code(LOADER);

  it('is asked about before it expires, not after somebody’s message fails', () => {
    /* Waiting for the 401 means the person loses a turn first. */
    expect(panel).toMatch(/setInterval\(askForANewSession/);
    const asked = Number(/ASK_AFTER_MS = (\d+) \* 60 \* 1000/.exec(panel)?.[1]);
    const lasts = Number(/SESSION_LASTS_MS = (\d+) \* 60 \* 1000/.exec(panel)?.[1]);
    expect(asked).toBeGreaterThan(0);
    expect(asked).toBeLessThan(lasts);
  });

  it('and again when a call comes back 401, once', () => {
    const fn = panel.slice(panel.indexOf('function withSession'), panel.indexOf('function bubble'));
    expect(fn).toContain('401');
    expect(fn).toContain('askForANewSession');
    /* One retry. If the new session fails too, the problem is not the session. */
    expect([...fn.matchAll(/run\(token\)/g)]).toHaveLength(2);
  });

  it('every call to us goes through it, so no call can miss the retry', () => {
    /*
     * STRONGER THAN IT WAS, because the exemption has gone.
     *
     * This used to subtract the opening call: it ran exactly once, at load, on a session seconds
     * old, so it was allowed to reach for `token` directly. It can now be redrawn when the host
     * says the person has navigated — an hour later, on a session that has run out — so there is no
     * longer any call that may skip the retry. The rule is now simply: no fetch to us holds
     * `token` itself.
     */
    const holdsTheTokenItself = [...panel.matchAll(/fetch\([^)]*Bearer ' \+ token/g)];
    /* A fetch reaching for `token` directly is one that dies at fifteen minutes. */
    expect(holdsTheTokenItself.map((m) => m[0])).toEqual([]);

    /* And every one of them is inside a withSession callback, which is what supplies `t`. */
    const calls = [...panel.matchAll(/fetch\(/g)].length;
    const wrapped = [...panel.matchAll(/withSession\(function/g)].length;
    expect(wrapped).toBeGreaterThan(0);
    expect(calls).toBeGreaterThanOrEqual(wrapped);
  });

  it('stops waiting if the host never answers', () => {
    /* An old loader that does not know the message, or a page that has gone away. Hanging every
       call behind a promise nobody will resolve is worse than the expiry it replaced. */
    expect(panel).toMatch(/setTimeout\(function \(\) \{ settle\(false\); \}/);
  });

  it('and the loader is the only thing that can mint one', () => {
    /* The session comes from the customer's own signed identity token. The panel has no way to ask
       their server for one, and must never look as though it does. */
    expect(panel).not.toMatch(/embed\/session/);
    expect(loader).toMatch(/embed\/session/);
  });
});
