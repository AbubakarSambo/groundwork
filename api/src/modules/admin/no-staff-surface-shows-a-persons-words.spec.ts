import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * NO STAFF SURFACE SHOWS A PERSON'S WORDS.
 *
 * The privacy page says Groundwork staff cannot read what people write. That holds at the level of
 * screens today - admin.service.ts carries an explicit exclusion list - and this is the ratchet that
 * keeps it holding (fix plan G3, the half that survives the frozen page): nothing under the ops,
 * admin or back-office modules reads a conversation turn, a record entry's text, or a lead's
 * context note.
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

describe('the staff consoles', () => {
  it('read no conversation turn, record entry text or lead context note', () => {
    const faults: string[] = [];
    for (const area of ['ops', 'admin', 'back-office']) {
      for (const file of every(join(MODULES, area))) {
        const code = strip(readFileSync(file, 'utf8'));
        for (const m of code.matchAll(/prisma\.(conversationTurn|recordEntry|leadContextNote)\.(findMany|findFirst|findUnique)/g)) {
          faults.push(`${file.slice(MODULES.length + 1)}: ${m[0]}`);
        }
        if (/content: true/.test(code) && /conversationTurn/.test(code)) faults.push(`${file.slice(MODULES.length + 1)}: selects turn content`);
      }
    }
    expect(faults).toEqual([]);
  });

  it('and the exclusion is written where the next reader would add it back', () => {
    const admin = readFileSync(join(MODULES, 'admin', 'admin.service.ts'), 'utf8');
    expect(admin).toMatch(/Hard privacy boundary/);
  });
});
