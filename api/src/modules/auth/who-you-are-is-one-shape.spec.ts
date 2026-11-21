import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * SIGNING IN AND ASKING WHO YOU ARE MUST ANSWER THE SAME.
 *
 * They had two builders. `mayOpenCheckIns` reached one of them, and every page load calls the other
 * - so signing in hid "Start a check-in" from a member correctly, and their first refresh handed it
 * back. The client asks `mayOpenCheckIns !== false`, and `undefined !== false` is true, which is why
 * the drift was silent and total rather than merely wrong.
 *
 * The server still refused what they clicked, so nothing was ever opened that should not have been.
 * That is the guard working and it is not a defence: being shown a door, walking through it and
 * being turned away teaches somebody the product is broken rather than that the setting is
 * deliberate.
 *
 * Comments stripped, because this explanation names the field it protects.
 */
const SRC = readFileSync(join(__dirname, 'auth.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

const PROFILE = SRC.slice(SRC.indexOf('async getProfile('), SRC.indexOf('async getProfile(') + 700);

describe('who you are is built in one place', () => {
  it('there is exactly one builder for the user shape', () => {
    expect((SRC.match(/private theUserShape\(/g) ?? []).length).toBe(1);
  });

  it('asking who you are uses it', () => {
    expect(PROFILE).toContain('this.theUserShape(');
  });

  it('and signing in uses the same one', () => {
    /* Matched loosely on purpose: this pinned `private buildAuthResponse(` and the exact
       argument list, so making the helper async broke the guard without anything being wrong.
       What it protects is that signing in goes through the one builder, not how it is spelled. */
    const build = SRC.slice(SRC.indexOf('buildAuthResponse(user: UserWithOrg'), SRC.indexOf('private theUserShape('));
    expect(build).toContain('this.theUserShape(user');
  });

  it('so the permission field cannot reach one door and miss the other', () => {
    /* Asserted on the builder rather than on either route, which is the point of there being one. */
    const shape = SRC.slice(SRC.indexOf('private theUserShape('));
    /* The rule is asked once at the top of the shape, and the field reads that answer (bug 95 added its reason beside it). */
    expect(shape.slice(0, 600)).toContain('const mayOpenACheckIn = mayOpen(');
    expect(shape.slice(0, 2400)).toContain('mayOpenCheckIns: mayOpenACheckIn.may');
  });

  it('fetching a profile does not mint an access token', () => {
    /* Why this is a separate builder rather than a call to buildAuthResponse: asking who you are is
       not a reason to issue a credential. */
    expect(PROFILE).not.toContain('generateToken');
    expect(PROFILE).not.toContain('accessToken');
  });

  it('and still returns the two fields only this route ever had', () => {
    /* orgCode and emailNotifications were on the old hand-built object and nothing else sends them.
       Losing them while fixing a drift would be the same class of bug in the other direction. */
    expect(PROFILE).toContain('orgCode:');
    expect(PROFILE).toContain('emailNotifications:');
  });
});
