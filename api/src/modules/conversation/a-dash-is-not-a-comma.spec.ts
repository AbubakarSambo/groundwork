import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * NO EM DASH AND NO EN DASH IN ANYTHING SOMEBODY READS.
 *
 * Her rule, twice: they are a tell for AI-written copy. The model's output has been cleaned since
 * the day it was written (`withoutDashes` runs on every reply and every report line), and the
 * product's OWN copy was never checked at all - so the screen said "The whole run in one place -
 * every session" with a dash in the file, and every toast in the app carried one.
 *
 * A hundred and thirteen files on the day this was written. Comments are exempt, deliberately: this
 * is about what reaches a person, and the prose in this repo's headers is for whoever is reading
 * the code. Everything else is copy until proven otherwise.
 *
 * AND SO ARE REGULAR EXPRESSIONS, WHICH IS NOT A LOOPHOLE. The code that TAKES DASHES OUT has to
 * contain one to match it. A first sweep did not know that and edited four of them, turning the
 * character class [\\s,:-] in the narration stripper into [\\s,: - -] - a live fault, caught by
 * eighteen failing specs, in the exact code whose job is this rule. A dash inside a pattern is
 * machinery; a dash inside a sentence is copy.
 */
const ROOTS = [join(__dirname, '..', '..'), join(__dirname, '..', '..', '..', '..', 'client', 'src')];

function everyFile(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) everyFile(full, out);
    else if ((full.endsWith('.ts') || full.endsWith('.tsx')) && !full.includes('.spec.')) out.push(full);
  }
  return out;
}

/**
 * Code with both kinds of comment blanked out, which is what a person can end up reading.
 *
 * Blanked rather than deleted so the line numbers below are the file's own. The first version
 * removed them and reported line 57 for something on line 186, which sends whoever has to fix it
 * to the wrong place.
 */
const withoutComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, (_m, pre) => pre);

/**
 * HER OWN WORDS, KEPT EXACTLY AS SHE WROTE THEM.
 *
 * `what-the-moat-is-made-of.ts` holds a document Hafsah wrote, and its own spec pins several
 * sentences character for character, em dashes included, with the reason in its header: a document
 * quoted to an investor is not copy for this rule to tidy. The sweep flattened three of them and
 * four of that file's specs said so within the minute.
 *
 * One file, named here rather than a pattern, because the exemption is about whose words they are.
 */
const NOT_OUR_COPY = ['what-the-moat-is-made-of.ts'];

/** A line building a pattern rather than a sentence. See the header. */
const isMachinery = (line: string) => {
  const t = line.trim();
  return /new RegExp|\.(replace|match|matchAll|split|test|search)\(|=\s*\/[^/]/.test(line)
    /* A pattern that begins on its own line, which is how the long ones are written here. */
    || (t.startsWith('/') && /\/[gimsuy]*,?;?$/.test(t));
};

describe('a dash is not a comma', () => {
  it('no em or en dash reaches a screen from the source', () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      let files: string[] = [];
      try { files = everyFile(root); } catch { continue; }
      for (const f of files) {
        if (NOT_OUR_COPY.some((name) => f.endsWith(name))) continue;
        const code = withoutComments(readFileSync(f, 'utf8'));
        code.split('\n').forEach((line, i) => {
          if ((line.includes('\u2014') || line.includes('\u2013')) && !isMachinery(line)) {
            offenders.push(`${f.replace(/^.*\/(api|client)\//, '$1/')}:${i + 1}  ${line.trim().slice(0, 90)}`);
          }
        });
      }
    }
    expect(offenders.join('\n')).toBe('');
  });
});
