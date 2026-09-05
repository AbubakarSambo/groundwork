/**
 * THE GATE MOVED, SO THE THINGS THAT DEPENDED ON IT HAVE TO HAVE MOVED WITH IT.
 *
 * Changing what guards a door is the moment a second, older check gets left
 * behind still asking the old question — and the older one usually wins,
 * because it is the one nobody remembered to look at.
 */
import * as fs from 'fs';
import * as path from 'path';

const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

describe('the token exchange', () => {
  const controller = withoutComments('public-api.controller.ts');

  it('reads the access request', () => {
    expect(controller).toMatch(/apiAccessRequest\.findUnique/);
    expect(controller).toMatch(/mayUseTheApi\(access\)/);
  });

  it('and no longer reads the subscription to decide it', () => {
    /* The whole change. A subscription must not open this door and must not
       close it: what a customer pays for and what they may connect to are two
       decisions. */
    const gate = controller.slice(
      controller.indexOf('async token'),
      controller.indexOf('stampUse'),
    );
    expect(gate).not.toMatch(/subscriptionPlan|subscriptionStatus|isSubscribed/);
  });

  it('and refuses with the reason for THIS organisation, not one message for everybody', () => {
    expect(controller).toMatch(/whyTheApiIsRefused\(access\)/);
  });
});

describe('the queue our own organisation is in', () => {
  it('has no exemption for us anywhere in it', () => {
    /**
     * WE APPEAR ON THIS LIST LIKE ANYBODY ELSE, and that is the point of it. A
     * rule we are exempt from is a rule we stop noticing is broken — and this
     * particular rule guards the one thing we have to be able to prove works,
     * which is running Groundwork inside our own company's system.
     */
    const service = withoutComments('api-access.service.ts');
    const rule = withoutComments('access-is-asked-for-not-bought.ts');
    for (const source of [service, rule]) {
      expect(source).not.toMatch(/groundwork|myground|internal|ourOwn|isUs\b/i);
    }
  });
});

describe('deciding a request', () => {
  const service = withoutComments('api-access.service.ts');

  it('records who decided it and when', () => {
    expect(service).toMatch(/decidedByUserId: byUserId/);
    expect(service).toMatch(/decidedAt: new Date\(\)/);
  });

  it('and requires a reason for anything that is not an approval', () => {
    /* Somebody is being told no, or having a working integration switched off. */
    expect(service).toMatch(/status !== ApiAccessStatus\.APPROVED && !note/);
  });
});
