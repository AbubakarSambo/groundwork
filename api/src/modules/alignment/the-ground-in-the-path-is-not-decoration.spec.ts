import * as fs from 'fs';
import * as path from 'path';
import { whyThisIsNotYoursToSay } from './who-may-speak-for-a-side';

/**
 * BOTH OF THESE ARE MINE, FROM THE DAY I BUILT THIS MODULE.
 *
 * Every route carried a `:groundId` and no service method used it, so the path said one check-in
 * while the query meant "any of them in this organisation" — a URL under check-in A could amend an
 * agreement belonging to check-in B. And the controller had `JwtAuthGuard` and nothing else, so
 * saying "this version is signed" or "that is what the clause says" was open to any member.
 *
 * Found auditing my own work rather than by anybody hitting it, which is the only reason it is
 * cheap. The tests are written as the two mistakes.
 */
const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

describe('the ground in the path is the ground in the query', () => {
  const services = ['agreements.service.ts', 'assertions.service.ts', 'obligations.service.ts', 'alignment.service.ts'];

  it('every lookup by id is scoped by the check-in, not only by the organisation', () => {
    const loose: string[] = [];
    for (const file of services) {
      const src = withoutComments(file);
      /* A `where` naming an id and an organisation and NOT a ground is the shape of the bug. */
      for (const m of src.matchAll(/where:\s*\{([^}]*organizationId[^}]*)\}/g)) {
        const clause = m[1];
        if (!/\bid:/.test(clause)) continue;
        if (/groundId/.test(clause)) continue;
        loose.push(`${file}: ${clause.trim().slice(0, 80)}`);
      }
    }
    if (loose.length) {
      throw new Error(`These read a row by id without saying which check-in it belongs to:\n${loose.join('\n')}`);
    }
    expect(loose).toEqual([]);
  });

  it('and the nested ones say it through their parent', () => {
    const src = withoutComments('agreements.service.ts');
    expect(src).toContain('agreement: { organizationId, groundId }');
    expect(src).toContain('version: { agreement: { organizationId, groundId } }');
  });

  it('every route that names a ground hands it on', () => {
    const controller = withoutComments('alignment.controller.ts');
    const handlers = [...controller.matchAll(/@(?:Post|Get|Delete|Patch)\([^)]*\)([\s\S]*?)\n  \}/g)];
    expect(handlers.length).toBeGreaterThan(20);

    const dropped: string[] = [];
    for (const [, body] of handlers) {
      if (!/@Param\('groundId'\)/.test(body)) continue;
      /* Taking the parameter and not passing it is the same bug with a longer signature. */
      if (!/\(\s*organizationId,\s*groundId/.test(body) && !/groundId,/.test(body.split('return')[1] ?? '')) {
        dropped.push(body.trim().slice(0, 70).replace(/\s+/g, ' '));
      }
    }
    expect(dropped).toEqual([]);
  });
});

describe('saying what an agreement is', () => {
  const admin = { userId: 'u1', role: 'ADMIN', initiatorId: 'someone-else' };
  const lead = { userId: 'u2', role: 'MEMBER', initiatorId: 'u2' };
  const member = { userId: 'u3', role: 'MEMBER', initiatorId: 'somebody' };

  it('is for an admin', () => {
    expect(whyThisIsNotYoursToSay('speaking for this side', admin)).toBeNull();
  });

  it('and for whoever set the check-in up, who is frequently not an admin', () => {
    expect(whyThisIsNotYoursToSay('speaking for this side', lead)).toBeNull();
  });

  it('and not for anybody else with an account', () => {
    const why = whyThisIsNotYoursToSay('speaking for this side', member)!;
    expect(why).toContain('binds your organisation');
    /* And it says what they CAN do, because a refusal with no next step reads as broken. */
    expect(why).toContain('record a figure');
  });

  it('while the ordinary work stays open to everybody', () => {
    /* The person who knows why the VAT return is lower is rarely an admin. */
    expect(whyThisIsNotYoursToSay('the work', member)).toBeNull();
  });

  it('and the four acts that bind check before they write', () => {
    const src = withoutComments('agreements.service.ts');
    for (const method of ['async agreed(', 'async signed(', 'async checked(', 'async readsItDifferently(']) {
      const from = src.indexOf(method);
      const body = src.slice(from, src.indexOf('\n  async ', from + 10));
      if (!body.includes('mustBeAbleToSpeakForThisSide')) {
        throw new Error(`${method} writes without checking who is asking`);
      }
      const checks = body.indexOf('mustBeAbleToSpeakForThisSide');
      const writes = body.indexOf('.update(');
      if (writes > -1) expect(checks).toBeLessThan(writes);
    }
  });

  it('and reading is not one of them', () => {
    /* `standing`, `inForceOn` and `mayThisBeUsedTo` answer questions. Guarding a read here would
       mean the person who has to act on a term cannot see it. */
    const src = withoutComments('agreements.service.ts');
    for (const method of ['async standing(', 'async inForceOn(', 'async mayThisBeUsedTo(']) {
      const from = src.indexOf(method);
      const body = src.slice(from, src.indexOf('\n  async ', from + 10));
      expect(body).not.toContain('mustBeAbleToSpeakForThisSide');
    }
  });
});
