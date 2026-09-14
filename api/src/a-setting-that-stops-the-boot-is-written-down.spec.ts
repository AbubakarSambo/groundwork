import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A SETTING THAT STOPS THE BOOT HAS TO BE WRITTEN DOWN WHERE SOMEBODY DEPLOYING WILL SEE IT.
 *
 * A merge took production down because it needed a variable nobody knew to add. The API is supposed
 * to refuse to start rather than run without a secret, and that part is right. What was missing is
 * the other half: the list of what to set lives in .env.example, and a new blocker could be added to
 * the boot check without ever reaching that list.
 *
 * It happened again on this branch. EMAIL_SENDS_FOR_REAL became a boot blocker and was in no example
 * file anywhere, and RESEND_API_KEY was in the example as "re_..." - the exact placeholder the new
 * check rejects. Somebody setting up from the example would have copied a value guaranteed to fail.
 *
 * So the rule is held here rather than remembered: every variable that can stop the boot appears in
 * .env.example. This test reads the boot check itself, so a blocker added next month is caught by
 * the same rule rather than by a deploy.
 *
 * Comments are stripped from both first: a guard a comment satisfies is not a guard, and main.ts
 * explains each of these variables in prose right above the line that enforces it.
 */
describe('a setting that stops the boot', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const main = strip(readFileSync(join(__dirname, 'main.ts'), 'utf8'));
  const check = main.slice(main.indexOf('function assertProductionConfig'), main.indexOf('async function bootstrap'));
  const example = strip(readFileSync(join(__dirname, '..', '.env.example'), 'utf8'));

  /* Whatever the boot check reads, not a list somebody has to keep in step with it. */
  const blockers = [...new Set([...check.matchAll(/process\.env\.([A-Z_0-9]+)/g)].map((m) => m[1]))]
    .filter((v) => v !== 'NODE_ENV');

  it('finds the boot check, so an empty list can never pass this by accident', () => {
    expect(blockers.length).toBeGreaterThan(5);
    expect(blockers).toContain('JWT_SECRET');
    expect(check).toContain('process.exit(1)');
  });

  it.each(blockers)('%s is in .env.example, so somebody deploying knows to set it', (name) => {
    expect(example).toMatch(new RegExp(`^\\s*#?\\s*${name}=`, 'm'));
  });

  it('never ships a placeholder the boot check itself rejects', () => {
    /*
     * RESEND_API_KEY was "re_..." in the example and "re_..." is rejected by name in the check. The
     * example handed people a value that could not work. Any placeholder the check names is read out
     * of the check and refused here, so the next one cannot be copied in either.
     */
    const refused = [...check.matchAll(/startsWith\('([^']+)'\)|=== '([^']+)'/g)]
      .map((m) => m[1] ?? m[2])
      .filter((v) => v && v !== 'true' && v !== 'production');
    for (const value of refused) {
      expect(example).not.toMatch(new RegExp(`=\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm'));
    }
  });
});
