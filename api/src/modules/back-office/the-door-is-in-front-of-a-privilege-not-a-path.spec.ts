/**
 * THE DOOR IS IN FRONT OF A PRIVILEGE, NOT A PATH.
 *
 * The door matched /ops and /admin. That is where the back office mostly lives, but the privilege
 * is not confined there: PlatformAdminGuard also sits on routes under /billing, /prompts,
 * /patterns, /coach and /feedback - platform statistics, contributor codes, the prompt library,
 * pattern accuracy, every piece of customer feedback. Each was reachable with a signed-in staff
 * session and no code, because the door was reading the URL and the privilege was somewhere else.
 *
 * The question is now what the handler demands. The sweep at the bottom is the half that matters:
 * it fails when a staff-guarded route exists that the door would not stand in front of, so a new
 * one written under a new prefix cannot quietly slip out.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { isAStaffGuard, isTheBackOffice, mayOpen, standsBehindTheDoor, A_STAFF_GUARD } from './the-back-office-has-a-door';

describe('what stands behind the door', () => {
  it('everything under the back office, as before', () => {
    expect(standsBehindTheDoor('/api/v1/ops/people', [])).toBe(true);
    expect(standsBehindTheDoor('/api/v1/admin/dashboard', [])).toBe(true);
  });

  it('and anything a staff guard protects, wherever it is mounted', () => {
    expect(standsBehindTheDoor('/api/v1/billing/admin/stats', ['PlatformAdminGuard'])).toBe(true);
    expect(standsBehindTheDoor('/api/v1/feedback', ['JwtAuthGuard', 'PlatformAdminGuard'])).toBe(true);
    expect(standsBehindTheDoor('/api/v1/prompts', ['OpsCapabilityGuard'])).toBe(true);
  });

  it('but not an ordinary customer route', () => {
    expect(standsBehindTheDoor('/api/v1/grounds', ['JwtAuthGuard', 'RolesGuard'])).toBe(false);
    expect(standsBehindTheDoor('/api/v1/reports/my-people', [])).toBe(false);
  });

  it('and never the door itself, or asking for a code would need the code', () => {
    expect(standsBehindTheDoor('/api/v1/back-office/door/send', ['PlatformAdminGuard'])).toBe(false);
    expect(isTheBackOffice('/api/v1/back-office/door/verify')).toBe(false);
  });

  it('reads a guard by name, and does not guess from a shape', () => {
    expect(isAStaffGuard('PlatformAdminGuard')).toBe(true);
    expect(isAStaffGuard('RolesGuard')).toBe(false);
    expect(isAStaffGuard(undefined)).toBe(false);
  });
});

describe('the decision, once it is behind the door', () => {
  const now = new Date('2026-09-11T10:00:00Z');
  const facts = (over: Partial<Parameters<typeof mayOpen>[0]> = {}) =>
    mayOpen({ path: '/api/v1/billing/admin/stats', behindTheDoor: true, signedIn: true, now, ...over });

  it('a staff route outside /admin now needs the code', () => {
    expect(facts().open).toBe(false);
  });

  it('a Google session still walks through', () => {
    expect(facts({ signedInVia: 'google' })).toEqual({ open: true, because: 'google' });
  });

  it('and a live pass still holds', () => {
    expect(facts({ passExpiresAt: new Date(now.getTime() + 1000) })).toEqual({ open: true, because: 'pass' });
  });
});

describe('no staff route escapes it', () => {
  const MODULES = join(__dirname, '..');
  const controllers = (dir: string): string[] => {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) out.push(...controllers(p));
      else if (p.endsWith('.controller.ts')) out.push(p);
    }
    return out;
  };

  it('every controller that names a staff guard is one the door stands in front of', () => {
    const missed: string[] = [];
    for (const file of controllers(MODULES)) {
      const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      const named = A_STAFF_GUARD.filter((g) => code.includes(g));
      if (!named.length) continue;
      /* The guard reads the same names off the handler's metadata, so naming one is enough. */
      if (!standsBehindTheDoor('/api/v1/somewhere-new', named)) missed.push(file.slice(MODULES.length + 1));
    }
    expect(missed).toEqual([]);
  });

  it('and the guard asks standsBehindTheDoor rather than the path on its own', () => {
    const guard = readFileSync(join(__dirname, 'back-office-door.guard.ts'), 'utf8');
    expect(guard).toMatch(/standsBehindTheDoor\(path, this\.guardsOn\(ctx\)\)/);
    expect(guard).not.toMatch(/if \(!isTheBackOffice\(path\)\) return true/);
  });
});
