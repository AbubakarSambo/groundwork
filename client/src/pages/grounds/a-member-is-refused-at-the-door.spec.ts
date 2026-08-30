import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE TWO ROUTES A MEMBER SHOULD NEVER SEE THE INSIDE OF.
 *
 * Both were behind `RequireOrgSetup` and nothing else. A member who typed `/grounds/new` got all
 * eight steps and was refused on submit, and `/org/members` showed them the add-people screen. The
 * API refused both, correctly and every time - which is why nothing was ever wrongly created, and
 * is not the same as this being handled.
 *
 * Comments stripped: this explanation names the routes it protects.
 */
const APP = readFileSync(join(__dirname, '..', '..', 'App.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

/** One route element, so an assertion cannot wander into the route beside it. */
function route(path: string): string {
  const i = APP.indexOf(`path="${path}"`);
  expect(i).toBeGreaterThan(-1);
  return APP.slice(i, APP.indexOf('/>', i));
}

describe('a member is refused at the door, not on submit', () => {
  it('opening a check-in is behind the permission that decides it', () => {
    expect(route('/grounds/new')).toContain('<MayOpenCheckIns>');
  });

  it('adding people is behind being an admin', () => {
    expect(route('/org/members')).toContain('<AdminsOnly>');
  });

  it('each door reads one field and nothing else', () => {
    const may = APP.slice(APP.indexOf('function MayOpenCheckIns'), APP.indexOf('function AdminsOnly'));
    expect(may).toContain('user?.mayOpenCheckIns !== false');
    const admins = APP.slice(APP.indexOf('function AdminsOnly'), APP.indexOf('function RequireOrgSetup'));
    expect(admins).toContain("user?.role === 'ADMIN'");
  });

  it('and the org setup gate is still there, because it answers a different question', () => {
    for (const p of ['/grounds/new', '/org/members']) {
      expect(route(p)).toContain('<RequireOrgSetup>');
    }
  });
});

describe('what the refusal says', () => {
  const DOOR = readFileSync(
    join(__dirname, '..', '..', 'components', 'gw', 'a-door-you-cannot-open-says-so.tsx'), 'utf8',
  );

  it('says it is a setting rather than anything about the person', () => {
    expect(DOOR).toContain('This is a setting, not anything about you');
  });

  it('names who can change it, because a refusal with no next step reads as a fault', () => {
    expect(DOOR).toContain('An admin can change it');
  });

  it('leaves them somewhere to go', () => {
    expect(DOOR).toContain('Back to your check-ins');
  });

  it('never implies they were caught at something', () => {
    for (const wrong of ['not allowed', 'permission denied', 'forbidden', 'unauthorised', 'unauthorized', 'sorry']) {
      expect(DOOR.toLowerCase()).not.toContain(wrong);
    }
  });
});
