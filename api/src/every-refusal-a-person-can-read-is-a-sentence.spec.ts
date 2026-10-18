import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * PIECE 6: EVERY REFUSAL THE SCREENS' ROUTES THROW READS AS A SENTENCE FOR A PERSON.
 *
 * "Check-in not found", "User not found", "messages required" and 350 like them were the whole of what somebody read when
 * the product refused them, and none said what to do next. They are now sentences: a capital letter, a full stop, no code,
 * no role in capitals, no dash or colon joining two pieces, and a way forward. This guard keeps the next one from growing back.
 *
 * NOT COVERED, ON PURPOSE: the developer API and the integrations a developer's code calls (public-api, detectors, knowledge, people/SCIM,
 * subjects), whose messages name the field a developer sent, and the Groundwork team's own system (ops). The global filter makes any
 * message that is left a sentence for the screens' routes (a-refusal-is-plain.ts), so this guard is about the words, not the full stop.
 */
const NOT_FOR_A_PERSON = ['/modules/public-api/', '/modules/detectors/', '/modules/knowledge/', '/modules/people/', '/modules/subjects/', '/modules/ops/'];
/** Tokens the screens read instead of showing (MagicVerifyPage matches on them), so they are not sentences. */
const TOKENS_THE_SCREENS_READ = ['COMMIT_IN_PROGRESS', 'NO_ENTRY_SESSION'];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== 'node_modules' && e !== '__fixtures__') walk(p, out); }
    else if (/\.ts$/.test(e) && !/\.spec\.ts$/.test(e)) out.push(p);
  }
  return out;
}

type Thrown = { file: string; line: number; text: string };
function thrown(): Thrown[] {
  const found: Thrown[] = [];
  const EXC = /new\s+(?:BadRequest|NotFound|Forbidden|Unauthorized|Conflict|Gone|ServiceUnavailable|Unprocessable)\w*Exception\(\s*(?:\{\s*message:\s*)?(['"`])((?:\\.|(?!\1)[^\\])*)\1(\s*\+)?/g;
  for (const file of walk(join(__dirname))) {
    const where = file.replace(__dirname, '');
    if (NOT_FOR_A_PERSON.some((d) => where.includes(d))) continue;
    const body = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/^\s*\/\/.*$/gm, '');
    for (const m of body.matchAll(EXC)) {
      if (m[3]) continue; /* A sentence built in two pieces: only the whole of it can be judged. */
      if ((m[2].match(/\$\{/g) ?? []).length !== (m[2].match(/\}/g) ?? []).length) continue; /* A nested template cut short by the pattern. */
      if (/\$\{[^}]*\}$/.test(m[2])) continue; /* Ends in what is put in, so its last word is not ours to judge. */
      const line = body.slice(0, m.index).split('\n').length;
      found.push({ file: where, line, text: m[2] });
    }
  }
  return found;
}

const asRead = (t: string) => t.replace(/\$\{[^}]*\}/g, 'X').replace(/\\'/g, "'");

describe('what the screens\' routes refuse with is read as a sentence', () => {
  const all = thrown().filter((t) => !TOKENS_THE_SCREENS_READ.includes(t.text));
  it('finds the refusals to judge', () => {
    expect(all.length).toBeGreaterThan(400);
  });

  it('every one starts with a capital letter and ends with a full stop', () => {
    const bad = all.filter((t) => !/^[A-Z"“0-9]/.test(asRead(t.text)) || !/[.!?]["”')]?$/.test(asRead(t.text)));
    expect(bad.map((t) => `${t.file}:${t.line}  ${t.text.slice(0, 90)}`)).toEqual([]);
  });

  it('none is a code, a role in capitals, a class name, or two pieces joined by a dash or an arrow', () => {
    const bad = all.filter((t) => /\b(ADMIN|LEAD|MEMBER|GUEST|NULL|undefined|Exception|Prisma)\b| -> | => | - | – |\b[A-Z]{3,}_[A-Z_]{3,}\b/.test(asRead(t.text)));
    expect(bad.map((t) => `${t.file}:${t.line}  ${t.text.slice(0, 90)}`)).toEqual([]);
  });

  it('none says "not found" and stops: a refusal says what to do next', () => {
    const bad = all.filter((t) => /^[A-Za-z' -]{0,30}\b(not found|is required|required)\.?$/i.test(asRead(t.text)));
    expect(bad.map((t) => `${t.file}:${t.line}  ${t.text.slice(0, 90)}`)).toEqual([]);
  });
});
