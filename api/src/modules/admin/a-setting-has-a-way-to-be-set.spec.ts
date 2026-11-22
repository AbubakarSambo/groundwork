import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * A SETTING HAS A WAY TO BE SET.
 *
 * `platform_settings` held four keys. Two had PATCH routes and an editor; two had readers, a page
 * that described them, and no writer anywhere but SQL - a hardcoded constant wearing a configuration
 * costume (fix plan B12). This walks every key the API reads from that table and demands a writer
 * for each, so the fifth one cannot appear.
 */
const SRC = join(__dirname, '..', '..');
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

const files = every(SRC).map((p) => ({ p, code: strip(readFileSync(p, 'utf8')) }));
const all = files.map((f) => f.code).join('\n');

/** The literal behind a key expression: a string, or a `X_KEY` constant / `Class.TOGGLE_KEY` resolved to its string. */
function literalOf(expr: string): string | null {
  const s = expr.trim();
  const direct = s.match(/^'([^']+)'$/);
  if (direct) return direct[1];
  const name = s.split('.').pop()!;
  const m = all.match(new RegExp(`(?:readonly\\s+)?${name}\\s*=\\s*'([^']+)'`));
  return m ? m[1] : null;
}

const readKeys = new Set<string>();
for (const m of all.matchAll(/platformSetting\.findUnique\(\{\s*where:\s*\{\s*key:\s*([^}]+?)\s*\}/g)) {
  const k = literalOf(m[1]);
  if (k) readKeys.add(k);
}
const writtenKeys = new Set<string>();
for (const m of all.matchAll(/platformSetting\.(?:upsert|update|create)\(\{[\s\S]{0,200}?key:\s*([^,}\s]+)/g)) {
  const k = literalOf(m[1]);
  if (k) writtenKeys.add(k);
}

describe('every platform setting the API reads', () => {
  it('is read somewhere (the sweep sees the keys)', () => {
    expect([...readKeys].sort()).toEqual(expect.arrayContaining(['correction_window_days', 'whatsapp_enabled']));
    /* Coaching is always on (Hafsah, 22 November 2026): its setting is read nowhere, so nothing can switch it off. */
    expect([...readKeys]).not.toContain('coaching_live');
  });

  it('has a writer in the API, not only in SQL', () => {
    const unwritable = [...readKeys].filter((k) => !writtenKeys.has(k)).sort();
    expect(unwritable).toEqual([]);
  });

  it('and the correction window is written from its admin route, and coaching has no switch to write', () => {
    const controller = strip(readFileSync(join(__dirname, 'admin.controller.ts'), 'utf8'));
    expect(controller).not.toMatch(/@Patch\('coaching'\)/);
    expect(controller).toMatch(/@Patch\('correction-window'\)/);
  });
});
