import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * A TOOL SCHEMA THE CONVERTER CANNOT READ FAILS SILENTLY, AND LOGS SUCCESS.
 *
 * `convertTool` reads `tool.input_schema`. Written as `parameters` - which is what the same object
 * is called in most other tool APIs, and what anybody would write from memory - the tool converts
 * with NO schema, the model calls it with no arguments, and `extract` returns `{}`.
 *
 * Nothing about that looks like a failure. On 23 September 2026 a hundred accounts were read this
 * way: the call succeeded, the timing was logged as thirty-eight seconds, the column was written,
 * and the value was an empty object. It was found by opening the report and seeing nothing in it.
 *
 * So the name is checked across the whole codebase rather than at the one place it went wrong.
 */
const ROOT = join(__dirname, '../..');

describe('every tool schema uses the key the converter reads', () => {
  const files = execSync(`grep -rl "name: 'emit_\\|description: '" ${ROOT} --include=*.ts || true`, { encoding: 'utf8' })
    .split('\n').filter(Boolean).filter((f) => !f.endsWith('.spec.ts'));

  it('and none of them declares one called `parameters`', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      /*
       * A tool object is `name:` and `description:` followed by its schema. Only that shape is
       * checked: `parameters` is an ordinary word and a function that happens to take one must not
       * fail this.
       */
      for (const m of src.matchAll(/name:\s*'[^']+',\s*\n\s*description:\s*'[\s\S]{0,400}?',\s*\n\s*(\w+):\s*\{/g)) {
        if (m[1] === 'parameters') offenders.push(`${f.split('/src/')[1]}: ${m[0].slice(0, 60).replace(/\n/g, ' ')}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  /* And the converter still reads the name this guard is about, so the guard cannot outlive it. */
  it('and the converter still reads input_schema', () => {
    const svc = readFileSync(join(__dirname, 'anthropic.service.ts'), 'utf8');
    expect(svc).toMatch(/parameters: this\.convertSchema\(tool\.input_schema\)/);
  });
});
