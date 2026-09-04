import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE ONE VARIABLE THAT DECIDES WHETHER ANYBODY CAN REACH THE BACK OFFICE.
 *
 * `PLATFORM_ADMIN_BOOTSTRAP_EMAIL` is read by admin.service.ts and was in no example file, so a
 * fresh deployment had no way to learn it exists. The cost is already on record in that service's
 * own comment: an operator set nothing, got no admin and no error, and the back-office surfaces were
 * unreachable for an entire eighteen-ground test run. The conclusion drawn at the time was that the
 * feature did not exist. GW-002.
 *
 * This asserts the documentation stays, and that it keeps saying the two things that make it usable:
 * that the account must exist first, and that it only ever promotes the first admin.
 */
const EXAMPLE = readFileSync(join(__dirname, '../../../.env.example'), 'utf8');

describe('the bootstrap variable is documented', () => {
  it('reads the real example file, so an empty one cannot pass', () => {
    expect(EXAMPLE.length).toBeGreaterThan(1000);
  });

  it('names the variable the service actually reads', () => {
    /* If the service is renamed and this is not, the example goes stale silently. */
    const service = readFileSync(join(__dirname, 'admin.service.ts'), 'utf8');
    expect(service).toContain('platformAdminBootstrapEmail');
    expect(EXAMPLE).toContain('PLATFORM_ADMIN_BOOTSTRAP_EMAIL=');
  });

  it('says the account has to exist first, which is the part people get wrong', () => {
    expect(EXAMPLE).toMatch(/never creates an account/i);
  });

  it('says it only ever promotes the first admin', () => {
    expect(EXAMPLE).toMatch(/no platform admin exists anywhere yet/i);
    expect(EXAMPLE).toMatch(/add-admin/);
  });

  it('carries no real email address, because an example that grants admin is a hazard', () => {
    /*
     * Left deliberately blank. A default here would promote whoever it names on every fresh
     * install that copied the file, and a person's address in tracked config is a standing grant
     * nobody reviews.
     */
    const line = EXAMPLE.split('\n').find((l) => l.startsWith('PLATFORM_ADMIN_BOOTSTRAP_EMAIL='));
    expect(line).toBe('PLATFORM_ADMIN_BOOTSTRAP_EMAIL=');
  });
});
