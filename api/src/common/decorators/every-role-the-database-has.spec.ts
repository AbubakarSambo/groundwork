import * as fs from 'fs';
import * as path from 'path';
import { Role } from './roles.decorator';

/**
 * TWO OF THE FOUR ROLES WERE VALUES NOBODY COULD NAME.
 *
 * `UserRole` in the schema has ADMIN, LEAD, MEMBER and GUEST. This enum had ADMIN and MEMBER — so
 * `@Roles(Role.LEAD)` could not be written, and `switchOrganization`, which writes a membership's
 * role straight onto `User.role`, could leave somebody holding a role the guard had never heard of.
 *
 * Nothing was exposed: every guarded route asks for ADMIN specifically, so an unknown role is
 * refused everywhere, which is the safe direction. What it cost was being able to say what a LEAD
 * may do without writing the string by hand — and a hand-written string is how two lists drift.
 */
/*
 * Comments out first. The enum is surrounded by `///` doc lines explaining what each role is for,
 * and a role NAMED in one of those would otherwise be read as a role the database has.
 */
const SCHEMA = fs
  .readFileSync(path.join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/\/?.*$/gm, '');

function rolesInTheDatabase(): string[] {
  const at = SCHEMA.indexOf('enum UserRole {');
  const block = SCHEMA.slice(at, SCHEMA.indexOf('\n}', at));
  /* Trailing `//` comments and `///` doc lines both live in here, so a pattern anchored to the end
     of the line reads half the enum — which is how a guard about two lists agreeing came within a
     character of asserting nothing. */
  /* A trailing `//` on the same line as a value survives the strip above, which only takes whole
     comment lines — so the pattern tolerates one. Without that it reads half the enum, which is how
     a guard about two lists agreeing comes within a character of asserting nothing. */
  return [...block.matchAll(/^\s{2}([A-Z_]+)\s*(?:\/\/.*)?$/gm)].map((m) => m[1]);
}

describe('the roles the code can name', () => {
  it('found them, so an empty read cannot pass this', () => {
    expect(rolesInTheDatabase().length).toBeGreaterThan(2);
  });

  it('are exactly the roles the database has', () => {
    expect(Object.values(Role).sort()).toEqual(rolesInTheDatabase().sort());
  });

  it('and each one is its own name, because the value is what is compared', () => {
    /* `RolesGuard` does `user.role === role`, and `user.role` is the database's string. A key that
       did not equal its value would refuse everybody holding it, silently. */
    for (const [key, value] of Object.entries(Role)) expect(value).toBe(key);
  });
});
