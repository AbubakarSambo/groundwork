import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A PERMISSION CHECK MUST NOT BE STRICTER THAN THE THING IT CHECKS.
 *
 * `POST /grounds` carries no role guard - any member of an organisation can open a check-in, and the
 * client's `canRunThisGround` is `isInitiator || isOrgAdmin` exactly so that they can. But
 * `GET /billing/can-create-ground`, which only ASKS whether another one is allowed, was
 * `@Roles(Role.ADMIN)`.
 *
 * So a member could create a check-in and could not find out whether they were permitted to. What
 * they actually saw was a red "Access denied - you do not have permission to perform this action"
 * on opening /grounds/new, over a page that then rendered and worked perfectly. The toast was true
 * about the request and false about the person, which is the worst kind of wrong: it teaches
 * somebody that the product is broken, or that they are trespassing, at the moment they first try
 * to use it.
 *
 * Found by opening the page as an ordinary member and reading the network log, not by any test.
 */
/**
 * COMMENTS OFF FIRST, because this spec looks for decorators by reading the lines above a route -
 * and a `@Roles(Role.ADMIN)` sitting inside an explanatory comment reads exactly like one that is
 * attached. This file quotes decorators in its own prose, which is the trap. See
 * a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const BILLING = strip(readFileSync(join(__dirname, 'billing.controller.ts'), 'utf8'));
const GROUNDS = strip(readFileSync(join(__dirname, '../grounds/grounds.controller.ts'), 'utf8'));

/** The decorators attached to a route, from the line above it back to the previous route. */
function decoratorsFor(source: string, route: string): string {
  const i = source.indexOf(route);
  expect(i).toBeGreaterThan(-1);
  const from = source.lastIndexOf('\n\n', i);
  return source.slice(from === -1 ? 0 : from, source.indexOf('async', i));
}

describe('opening a check-in', () => {
  it('is not restricted to admins', () => {
    // If this ever becomes admin-only, the check below must move with it - and the client route
    // has to gate too, rather than rendering a page that toasts on load.
    const create = decoratorsFor(GROUNDS, "@Post()");
    expect(create).not.toMatch(/@Roles\(/);
  });

  it('and asking whether you may is not restricted either', () => {
    const check = decoratorsFor(BILLING, "@Get('can-create-ground')");
    expect(check).not.toMatch(/@Roles\(/);
  });
});
