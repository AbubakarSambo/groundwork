import { readFileSync } from 'fs';
import { join } from 'path';
import { isTheBackOffice, normalisePath } from './the-back-office-has-a-door';

/**
 * THE BACK-OFFICE DOOR DOES NOT CARE HOW YOU SPELL THE PATH.
 *
 * The door matched the raw request path, case-sensitively and undecoded, while Express matched the
 * decoded path case-insensitively. So /API/v1/ADMIN and /api/v1/%61dmin routed to the back office and
 * walked past the door (fix plan B16, P2-007). The path is decoded and lower-cased before matching,
 * and routing is case-sensitive so the two agree.
 */
describe('the door', () => {
  it('recognises the back office however it is spelled', () => {
    expect(isTheBackOffice('/api/v1/admin/dashboard')).toBe(true);
    expect(isTheBackOffice('/API/v1/ADMIN/dashboard')).toBe(true);
    expect(isTheBackOffice('/api/v1/%61dmin/dashboard')).toBe(true);
    expect(isTheBackOffice('/api/v1/%4Fps/me')).toBe(true);
  });

  it('and still lets its own routes and the rest of the product through', () => {
    expect(isTheBackOffice('/api/v1/back-office/door')).toBe(false);
    expect(isTheBackOffice('/API/v1/BACK-OFFICE/door/enter')).toBe(false);
    expect(isTheBackOffice('/api/v1/grounds')).toBe(false);
    expect(isTheBackOffice('/api/v1/administration')).toBe(false);
  });

  it('a malformed escape is matched as written rather than crashing the door', () => {
    expect(normalisePath('/api/v1/%E0%A4%A')).toBe('/api/v1/%e0%a4%a');
    expect(isTheBackOffice('/api/v1/%E0%A4%A')).toBe(false);
  });

  it('and routing is case-sensitive, so the door and Express agree', () => {
    const main = readFileSync(join(__dirname, '..', '..', 'main.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(main).toContain("app.set('case sensitive routing', true)");
  });
});
