/**
 * "I want to make sure platform ops is only reserved for people I add."
 *
 * It already was — two ways onto the list and no more — but that was a fact
 * about the code, not something anybody using it could confirm. There was a way
 * to add somebody and no way to see who was on it, and no way to take anybody
 * off. So this asserts the property AND the ability to check it.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const API_SRC = join(__dirname, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

const stripped = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('who can become a platform admin', () => {
  /**
   * Every place in the API that sets the flag true. Two are expected: the
   * one-time bootstrap, which only runs while no admin exists at all, and
   * `addPlatformAdmin`, which is behind platform-admin plus an emailed code.
   *
   * A third would be a way in nobody decided on, which is exactly the thing
   * "only the people I add" has to rule out.
   */
  /*
   * `data: { ... }`, not any mention. `select: { isPlatformAdmin: true }` and
   * `where: { isPlatformAdmin: true }` are reads, and three files legitimately
   * do one — an earlier version of this guard counted them and named auth and
   * billing as ways to become an admin, which would have sent somebody looking
   * for a hole that is not there.
   */
  /* No `g` flag: a global regex carries `lastIndex` between calls, so reusing
     one inside a filter skips every other file. */
  const GRANTS = /data:\s*\{[^}]*isPlatformAdmin:\s*true/;

  const writers = walk(API_SRC)
    .filter((f) => GRANTS.test(stripped(readFileSync(f, 'utf8'))))
    .map((f) => f.replace(API_SRC, ''));

  it('found the file it is meant to be checking', () => {
    expect(writers).toContain('/modules/admin/admin.service.ts');
  });

  it('is written in exactly one file, so there is one place to read', () => {
    expect(writers).toEqual(['/modules/admin/admin.service.ts']);
  });

  it('and in that file, in exactly two places', () => {
    const source = stripped(readFileSync(join(API_SRC, 'modules/admin/admin.service.ts'), 'utf8'));
    /* `where: { isPlatformAdmin: true }` is a read, not a write. Only `data:` grants. */
    const grants = source.match(/data:\s*\{[^}]*isPlatformAdmin:\s*true/g) ?? [];
    expect(grants).toHaveLength(2);
  });

  it('and the bootstrap only fires while nobody holds it', () => {
    const source = stripped(readFileSync(join(API_SRC, 'modules/admin/admin.service.ts'), 'utf8'));
    const bootstrap = source.slice(source.indexOf('async onApplicationBootstrap'));
    expect(bootstrap.slice(0, 900)).toMatch(/anyPlatformAdminExists[\s\S]{0,80}return;/);
  });
});

describe('the routes that manage the list', () => {
  const CONTROLLER = stripped(
    readFileSync(join(API_SRC, 'modules/admin/admin.controller.ts'), 'utf8'),
  );

  it('let somebody read it without a code, because a check nobody makes is not a control', () => {
    const route = CONTROLLER.slice(CONTROLLER.indexOf("@Get('admins')"));
    expect(route.slice(0, 200)).not.toContain('OtpGuard');
  });

  it('require a code to add', () => {
    const route = CONTROLLER.slice(CONTROLLER.indexOf("@Post('add-admin')"));
    expect(route.slice(0, 200)).toContain('OtpGuard');
  });

  it('require a code to remove', () => {
    const route = CONTROLLER.slice(CONTROLLER.indexOf("@Post('admins/:userId/remove')"));
    expect(route.slice(0, 250)).toContain('OtpGuard');
  });

  it('and the whole controller is behind the platform-admin guard', () => {
    expect(CONTROLLER).toContain('@UseGuards(PlatformAdminGuard)');
  });
});
