import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * THE SERVER SAYS "CHECK-IN" TO A PERSON TOO. THE CLIENT-SIDE GUARD DID NOT REACH IT.
 *
 * The decision - the object a person opens is a "check-in", the thing inside it stays a "session" -
 * was enforced by a guard that walked `client/src` only. So the client said check-in and 106 exception
 * messages across 14 files still said ground, including the two most common things anybody sees:
 * "Ground not found" (43 times) and "You are not a party to this ground" (24 times).
 *
 * That is not a cosmetic gap. Those strings are rendered verbatim by the client - a lead who hits a
 * permission error reads the server's sentence, not the client's - so the product contradicted itself
 * at exactly the moment somebody was confused enough to be reading an error message.
 *
 * WHAT THIS DELIBERATELY DOES NOT CHECK, per the standing constraint: the data model. Tables, columns,
 * migrations, API field names, types, classes, variables, functions and filenames all still say
 * `ground` and must keep doing so. This looks only at the text inside a thrown message - the sentences
 * a person reads.
 *
 * WHY IT ALMOST WENT WRONG. Sweeping these with a word substitution rewrote `${ground.status}` inside a
 * template literal into `${check-in.status}` - an identifier, not prose. TypeScript caught it, which is
 * the only reason this file can be trusted: a check on strings cannot tell you that the code around
 * them still compiles.
 */
const SRC = join(__dirname);

const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(p, out);
    } else if (p.endsWith('.ts') && !p.includes('.spec.')) {
      out.push(p);
    }
  }
  return out;
};

/** The text of every thrown HTTP message in the codebase, with its file. */
const thrownMessages = (): { file: string; text: string }[] => {
  const found: { file: string; text: string }[] = [];
  const EXC = /(?:BadRequest|NotFound|Forbidden|Unauthorized|Conflict)Exception\(\s*(['"`])((?:(?!\1).)*)\1/g;
  for (const file of walk(SRC)) {
    const body = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const m of body.matchAll(EXC)) {
      /**
       * INTERPOLATIONS STRIPPED, because what is inside `${...}` is code, not prose.
       *
       * `\`Check-in in status "${ground.status}" cannot be paused\`` is CORRECT: the sentence says
       * check-in and the identifier says ground, which is exactly the standing rule. Without this the
       * guard flags it, and the only way to satisfy the guard would be to rename the identifier - the
       * one thing the constraint forbids. A guard that can only be satisfied by breaking the rule it
       * serves is worse than no guard.
       */
      found.push({ file: file.split('/src/')[1] ?? file, text: m[2].replace(/\$\{[^}]*\}/g, '') });
    }
  }
  return found;
};

/**
 * Email copy, line by line, with comments and interpolations removed.
 *
 * A whole-file read cannot work here: the file legitimately contains `myground.work` and `${groundUrl}`
 * on the same lines as prose, and both must keep saying ground. Line-accurate scanning is also what
 * finally found the last one - a link label reading "View ground →", which every earlier pattern missed
 * because of the arrow.
 */
const emailProse = (): { line: number; text: string }[] => {
  const lines = readFileSync(join(SRC, 'modules/email/email.service.ts'), 'utf8').split('\n');
  const out: { line: number; text: string }[] = [];
  let inBlockComment = false;
  lines.forEach((raw, i) => {
    const t = raw.trim();
    if (t.startsWith('/*')) inBlockComment = true;
    if (inBlockComment) {
      if (t.includes('*/')) inBlockComment = false;
      return;
    }
    if (t.startsWith('*') || t.startsWith('//')) return;
    /* `${...}` is code and `myground.work` is a domain. Neither is prose, and both must keep the
       word. A URL PATH is the third of the same kind: `/grounds/new` is the client's route, and
       the only way to satisfy this guard without stripping it would be to rename that route —
       which is the one thing the standing rule forbids. */
    const probe = raw
      .replace(/\$\{[^}]*\}/g, '')
      .replace(/myground\.work/g, '')
      .replace(/\/grounds?\b[A-Za-z0-9/_-]*/g, '');
    if (/\bgrounds?\b/i.test(probe)) out.push({ line: i + 1, text: probe.trim().slice(0, 90) });
  });
  return out;
};

describe('what the emails call it', () => {
  it('never says "ground" in copy somebody reads', () => {
    const offenders = emailProse().map((h) => `line ${h.line}: ${h.text}`);
    expect(offenders).toEqual([]);
  });

  it('and still links to the right place, which keeps the word', () => {
    /**
     * The counterpart. `${groundUrl}` and `app.myground.work` are an identifier and a domain, and a
     * sweep that renamed either would break the link while satisfying the test above.
     */
    const raw = readFileSync(join(SRC, 'modules/email/email.service.ts'), 'utf8');
    expect(raw).toMatch(/\$\{groundUrl\}/);
    expect(raw).toMatch(/myground\.work/);
    /* And the path, for the same reason: stripping it above must not let somebody delete it. */
    expect(raw).toMatch(/\/grounds\/new/);
  });
});

describe('what the server calls the thing when it talks to a person', () => {
  const messages = thrownMessages();

  it('found the messages, or this test proves nothing', () => {
    // A silent empty parse would make the assertion below pass vacuously - the one failure mode a
    // source-reading guard has.
    expect(messages.length).toBeGreaterThan(100);
  });

  it('never says "ground" in a message somebody reads', () => {
    const offenders = messages
      .filter((m) => /\bgrounds?\b/i.test(m.text))
      .map((m) => `${m.file}: "${m.text.slice(0, 70)}"`);
    expect(offenders).toEqual([]);
  });

  it('and still says "session" for the thing inside one', () => {
    /**
     * Both words were needed. Renaming everything to "check-in" makes "everyone checks in each
     * check-in" sayable, which is why three earlier attempts at this stalled.
     */
    const sessions = messages.filter((m) => /\bsessions?\b/i.test(m.text));
    expect(sessions.length).toBeGreaterThan(0);
  });
});

/**
 * AND IN THE CONTRACT CUSTOMERS BUILD AGAINST (fix plan B13). "Round" was retired from every human
 * surface and survived as the published name of the first webhook event and as two of the three
 * names for the session integer. One event name going forward, one integer name in the schema.
 */
describe('what the webhook contract and the schema call it', () => {
  it('the only event name still saying round is the deprecated alias, and it names its replacement', () => {
    const events = readFileSync(join(SRC, 'modules/webhooks/events-we-can-actually-send.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const names = [...new Set([...events.matchAll(/'([a-z_]+\.[a-z_]+)'/g)].map((m) => m[1]))];
    expect(names).toContain('session.completed');
    expect(names.filter((n) => /round/.test(n))).toEqual(['round.completed']);
    expect(events).toMatch(/DEPRECATED_EVENTS[\s\S]*'round\.completed': 'session\.completed'/);
  });

  it('the session integer has one name in the schema', () => {
    const schema = readFileSync(join(SRC, '..', 'prisma', 'schema.prisma'), 'utf8')
      .replace(/\/\/\/.*$/gm, '')
      .replace(/\/\/.*$/gm, '');
    expect(schema).not.toMatch(/^\s*roundNumber\s+Int/m);
    expect(schema).not.toMatch(/^\s*round\s+Int/m);
    expect((schema.match(/^\s*sessionNumber\s+Int/gm) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
