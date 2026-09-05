import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * EVERY DOOR THAT MAKES AN ORGANISATION MAKES A HOLDER.
 *
 * Found by signing up through the entry chat and reading the row: a brand new organisation came out
 * with `ownerUserId` null. The migration had given every organisation that already existed a
 * holder and nothing gave one to any organisation created after - so the protection would have
 * covered yesterday's customers and nobody since, and they could never have claimed it, because
 * handing it over is something only a holder can do.
 *
 * A source guard rather than five service tests, because the thing that goes wrong here is a sixth
 * door being added without the line. Counting them is what catches that.
 */
const SRC = readFileSync(join(__dirname, 'auth.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

describe('a new organisation is never left unheld', () => {
  const doors = SRC.match(/tx\.organization\.create\(/g) ?? [];
  const claims = SRC.match(/theFirstAdminHoldsIt\(/g) ?? [];

  it('has the doors this file is known to have', () => {
    /* The entry chat's verified path, the invite fallback, and Google.
       WAS FIVE. `register` and `registerMagicLink` no longer create anything:
       both park the signup in `pendingSignup` and the organisation is built in
       `verifyEmail` when the link is opened, so nothing exists before the
       address is proved. GW-001. Fewer doors is the fix, not a regression -
       what this guard is for is a SIXTH being added without the claim line. */
    expect(doors).toHaveLength(3);
  });

  it('claims the organisation at every one of them', () => {
    expect(claims.length).toBeGreaterThanOrEqual(doors.length);
  });

  it('and the claim comes after the user exists, never before', () => {
    /* It needs an id. Ordered the other way it would write null and fail nothing. */
    for (const m of SRC.matchAll(/theFirstAdminHoldsIt\(tx, [^,]+, ([a-zA-Z.]+)\)/g)) {
      const idArg = m[1];
      expect(idArg).toMatch(/\.id$/);
      const created = SRC.lastIndexOf('tx.user.create(', m.index!);
      expect(created).toBeGreaterThan(-1);
      expect(created).toBeLessThan(m.index!);
    }
  });
});
