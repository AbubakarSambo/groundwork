import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A PERSON MAY HAVE A DEPARTMENT, AND MAY NOT. Optional at every door, never inferred, never guessed
 * from an address, and blank means blank: a person with no department is in no department, which is
 * "no scope" and never "everyone's". The embed scope test used to match a blank department against an
 * empty string in the customer's excluded list; it does not now.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const read = (rel: string) => strip(readFileSync(join(__dirname, rel), 'utf8'));

describe('blank means blank', () => {
  it('the embed scope test never coerces a missing department to a string', () => {
    const embed = read('../embed/embed.service.ts');
    expect(embed).not.toMatch(/person\.department \?\? ''/);
    expect(embed).toMatch(/!!person\?\.department && config\.outOfScopeDepartments\.includes\(person\.department\)/);
  });

  it('every writer trims and stores null for blank, never a default', () => {
    expect(read('../grounds/grounds.service.ts')).toMatch(/department: dto\.department\?\.trim\(\) \|\| null/);
    expect(read('../entry/entry.service.ts')).toMatch(/department: dto\.department\?\.trim\(\)\.slice\(0, 120\) \|\| null/);
    expect(read('../public-api/a-check-in-a-customer-can-run.service.ts')).toMatch(/dto\?\.department\?\.trim\(\)\s*\?/);
  });

  it('nothing guesses a department from an email domain', () => {
    for (const rel of ['../grounds/grounds.service.ts', '../entry/entry.service.ts', '../public-api/a-check-in-a-customer-can-run.service.ts', '../people/scim.service.ts']) {
      const src = read(rel);
      expect(src).not.toMatch(/department[^\n]*split\('@'\)/);
    }
  });
});
