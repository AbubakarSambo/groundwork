import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A SLOW SAVE IS NOT A LOST ONE. A merely slow concurrent commit threw COMMIT_IN_PROGRESS and the page
 * routed it, for anybody with entry intent, to the lost-session screen - which offers "Start a new
 * check-in" and discards a draft intact on the server. And every refused commit arrived as one generic
 * sentence, whatever the server had said.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const page = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'auth', 'MagicVerifyPage.tsx'), 'utf8'));

describe('the magic-verify page', () => {
  it('gives a save still running its own outcome, before the lost-session branch', () => {
    const still = page.indexOf("if (msg.includes('COMMIT_IN_PROGRESS') && hadEntryIntent) return { kind: 'stillSaving' }");
    const lost = page.indexOf("if (msg.includes('NO_ENTRY_SESSION') || msg.includes('COMMIT_IN_PROGRESS')) {");
    expect(still).toBeGreaterThan(-1);
    expect(still).toBeLessThan(lost);
    expect(page).toContain('Your check-in is still being saved.');
  });
  it('carries the server\'s sentence on a refused commit and keeps the generic line only without one', () => {
    expect(page).toMatch(/return \{ kind: 'commitError', message: msg \|\| undefined \}/);
    expect(page).toMatch(/\{commitErrorMessage \|\| 'Something went wrong saving your session/);
  });
  it('does not call a sign-in an account', () => {
    expect(page).not.toContain('Your account is active, but the check-in');
    expect(page).not.toContain('Your account is ready - go to your check-ins');
  });
});
