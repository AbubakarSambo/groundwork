import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * NO PATH MAKES AN ORGANISATION NOBODY CAN CONTACT.
 *
 * An organisation created without a contact email sends its admin to "Set up your organization" on
 * every sign-in, forever - the page is deliberately bare, so they land somewhere with almost
 * nothing on it and no way out. It was reported from staging, the existing rows were backfilled,
 * and the column is NOT NULL as of 20260901160000.
 *
 * The database now refuses the row, which is the real protection. This exists for the other half:
 * a path that omits the field fails at RUNTIME, in whichever flow somebody happens to be in, and
 * the person who wrote it finds out from an exception in production rather than from a test. The
 * last thing in the system still doing it was the seed, which no type-check covers.
 *
 * Comments stripped, because this explanation names the field it protects.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '');

/** Every file that creates an organisation - application code and the seed alike. */
function filesThatCreateAnOrganisation(): { name: string; src: string }[] {
  const roots = [join(__dirname, '..', '..'), join(__dirname, '..', '..', '..', 'prisma')];
  const found: { name: string; src: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'migrations') continue;
      const p = join(dir, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      if (!entry.name.endsWith('.ts') || entry.name.endsWith('.spec.ts')) continue;
      const src = strip(readFileSync(p, 'utf8'));
      if (/organization\.(create|upsert)\(/.test(src)) found.push({ name: entry.name, src });
    }
  };
  roots.forEach(walk);
  return found;
}

describe('an organisation is born reachable', () => {
  const files = filesThatCreateAnOrganisation();

  it('finds the places that create one, so an empty sweep cannot pass', () => {
    expect(files.length).toBeGreaterThan(0);
    // The seed is the one a type-check does not cover, and the one that was wrong.
    expect(files.map(f => f.name)).toContain('seed.ts');
  });

  it('every one of them sets a contact email', () => {
    const offenders: string[] = [];
    for (const { name, src } of files) {
      // Each create/upsert call, from the call to the end of its data block.
      const calls = src.split(/organization\.(?:create|upsert)\(/).slice(1);
      for (const call of calls) {
        const body = call.slice(0, 700);
        const created = body.includes('create:') ? body.slice(body.indexOf('create:')) : body;
        if (!/\bemail\b/.test(created.slice(0, 500))) offenders.push(name);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('and the column itself refuses the row, which is the part that does not rely on this test', () => {
    const schema = readFileSync(join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma'), 'utf8');
    const org = schema.slice(schema.indexOf('model Organization '), schema.indexOf('\n}', schema.indexOf('model Organization ')));
    expect(org).toMatch(/^\s+email\s+String\s*$/m);
    expect(org).not.toMatch(/^\s+email\s+String\?/m);
  });
});
