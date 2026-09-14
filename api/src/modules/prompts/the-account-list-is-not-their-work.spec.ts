import { readFileSync } from 'fs';
import { join } from 'path';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SERVICE = strip(readFileSync(join(__dirname, 'prompts.service.ts'), 'utf8'));
const CONTROLLER = strip(readFileSync(join(__dirname, 'prompts.controller.ts'), 'utf8'));

/**
 * WHAT WE PUBLISH, AND WHAT THIS IS ALLOWED TO BE.
 *
 * "Groundwork staff have no way to read your check-ins in the product." That is the promise people
 * are actually afraid about, it is true, and it is held by its own guard
 * (no-staff-surface-shows-a-persons-words.spec.ts).
 *
 * Knowing WHO has a login with us is a different thing: it is our own account list, and support
 * cannot answer "did the invitation reach Musa" without it. The line between them is what this
 * file holds, on the read that was added for exactly that job.
 */
describe('the account list is not their work', () => {
  const at = SERVICE.indexOf('async peopleIn');
  const fn = SERVICE.slice(at, SERVICE.indexOf('async orgList'));

  it('exists at all', () => {
    expect(at).toBeGreaterThan(-1);
  });

  it('selects what reaches a person, and their standing', () => {
    for (const field of ['email: true', 'phoneNumber: true', 'firstName: true', 'role: true', 'isEmailVerified: true']) {
      expect(fn).toContain(field);
    }
  });

  it('and reads nothing anybody wrote', () => {
    /*
     * The whole point. A field added here in a hurry is how the promise gets broken, so the refusal
     * is by name rather than by intention.
     */
    for (const theirWork of ['recordEntry', 'checkIn', 'report', 'sharedPicture', 'conversationTurn', 'groundDocument']) {
      expect(fn).not.toContain(theirWork);
    }
  });

  it('is behind the platform guard, like the rest of the console', () => {
    expect(CONTROLLER).toContain('@UseGuards(PlatformAdminGuard)');
    const route = CONTROLLER.indexOf("org-list/:organizationId/people");
    expect(route).toBeGreaterThan(-1);
  });

  it('and a name is what somebody gave, never split out of their address', () => {
    /* This console has invented names from an email before - "Led by hafsah" - and an address is
       not what anybody is called. */
    expect(fn).toContain("|| null");
    expect(fn).not.toMatch(/email\.split\(/);
  });
});
