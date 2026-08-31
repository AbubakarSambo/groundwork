import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * A TEST THAT ONLY PASSES ON ONE LAPTOP.
 *
 * I committed a spec with `/Users/hafsahjumare/...` in it. It passed here and could not pass
 * anywhere else, and CI said so within two minutes of the push - which is the system working, and
 * also two minutes that did not need spending.
 *
 * Every spec reads its subject by a path relative to itself. There is no case where an absolute
 * path is the right answer, so this is a flat rule rather than a list with exceptions.
 */
function everyFile(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) everyFile(full, out);
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('no source file hardcodes somebody\'s home directory', () => {
  const files = everyFile(__dirname);

  it('finds the files, so an empty list cannot pass', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('and none of them contains an absolute path into a home directory', () => {
    const offenders = files.filter((f) => {
      const src = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/^\s*\/\/.*$/gm, '');
      return /['"`]\/(Users|home)\//.test(src);
    });
    expect(offenders.map((f) => f.replace(__dirname, ''))).toEqual([]);
  });
});
