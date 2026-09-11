import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * NO LOG LINE CARRIES WHAT SOMEBODY WROTE.
 *
 * One line in the context chat wrote fragments of what the lead actually said into the log, and the
 * local mail path logged whole message bodies - somebody's words and their sign-in links. Logs have
 * wider access than the database and no retention policy (fix plan G4). The count of shortened
 * phrases is logged, never the phrases; the dev mail log carries the address, the subject and the
 * links, never the body.
 */
const MODULES = join(__dirname, '..');
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
function every(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...every(p));
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

describe('the log', () => {
  it('counts shortened words rather than printing them', () => {
    const grounds = strip(readFileSync(join(MODULES, 'grounds', 'grounds.service.ts'), 'utf8'));
    expect(grounds).toContain('Shortened ${shortened.length} of their own words');
    expect(grounds).not.toMatch(/\$\{shortened\.join\(/);
  });

  it('never prints a mail body, in any mode', () => {
    const mail = strip(readFileSync(join(MODULES, 'email', 'email.service.ts'), 'utf8'));
    expect(mail).not.toMatch(/\[DEV EMAIL\] Body/);
    expect(mail).not.toMatch(/logger\.\w+\([^)]*options\.html/);
  });

  /**
   * THE PATTERN THAT COULD NOT SEE THE WORST LINES.
   *
   * The first version matched `\b\.text` - a word boundary before a dot, which never matches, so
   * `entries[b.line].text` sailed through it. Two anchoring lines were printing a record entry in
   * full and two hundred characters of a document passage, and this spec passed them while failing
   * on a WhatsApp error body. A guard that cannot see the thing it was written for is worse than
   * none, because it certifies.
   *
   * So: no boundaries, a wider list of the names that carry somebody's words, and an allowlist that
   * has to name each exception rather than a regex that quietly swallows them.
   */
  const CARRIES_SOMEBODYS_WORDS = /(\.text\b|\btext\b|content|passage|\bsays\b|\bbody\b|transcript|uploaderNote|\breply\b|\banswer\b)/;

  /** Interpolations that read as content but are not. Each names why it is safe. */
  const NOT_SOMEBODYS_WORDS = [
    'err?.message', 'err.message', 'e?.message', 'e.message', 'error.message', '(error as Error).message',
    'text.length', 'shortened.length', 'passageChars', 'saysChars', '.length',
    /* The lane an assistant reply took, which is one of a fixed set of names. */
    'reply.lane',
    /* Reads Meta's error code out of the body and returns only that - see metaErrorCode. */
    'metaErrorCode(',
  ];

  it('and no logger line anywhere interpolates a turn, a record entry or a message body', () => {
    const faults: string[] = [];
    for (const file of every(MODULES)) {
      const code = strip(readFileSync(file, 'utf8'));
      for (const call of code.matchAll(/this\.logger\.(?:log|warn|error|debug)\(([^;]*)\)/g)) {
        for (const interp of call[1].matchAll(/\$\{([^}]*)\}/g)) {
          const inside = interp[1];
          if (!CARRIES_SOMEBODYS_WORDS.test(inside)) continue;
          if (NOT_SOMEBODYS_WORDS.some((ok) => inside.includes(ok))) continue;
          faults.push(`${file.slice(MODULES.length + 1)}: \${${inside.trim().slice(0, 70)}}`);
        }
      }
    }
    expect(faults).toEqual([]);
  });

  it('and the anchoring decisions are logged by their ids, which is what a false match is chased with', () => {
    const conv = strip(readFileSync(join(MODULES, 'conversation', 'conversation.service.ts'), 'utf8'));
    const lines = [...conv.matchAll(/this\.logger\.log\(`anchoring-decision[^`]*`\)/g)].map((m) => m[0]);
    expect(lines.length).toBe(2);
    for (const line of lines) {
      expect(line).toMatch(/entry=\$\{/);
      expect(line).toMatch(/document=\$\{/);
      expect(line).not.toMatch(/\.text/);
    }
  });
});
