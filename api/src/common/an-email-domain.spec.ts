import { aNameFromAnEmailAddress, isAPublicMailDomain, mayBeJoinedBy, theDomainOf } from './an-email-domain';

/**
 * Moved from client/src/lib/a-name-from-an-email-address.spec.ts with the list itself (U.3), so the
 * same cases now hold where the one list lives.
 */
describe('a suggested organisation name from an email address', () => {
  it('takes the organisation from the address, like a Slack workspace', () => {
    expect(aNameFromAnEmailAddress('hafsah@coamana.com')).toBe('Coamana');
    expect(aNameFromAnEmailAddress('Wairimu@Baridi.co.ke')).toBe('Baridi');
    expect(aNameFromAnEmailAddress('sam@blue-river.co.uk')).toBe('Blue River');
    expect(aNameFromAnEmailAddress('ops@mail.acme.org')).toBe('Acme');
  });

  it('suggests nothing for a public mail service, in any country', () => {
    for (const e of ['sam@gmail.com', 'sam@yahoo.com', 'sam@outlook.com', 'sam@icloud.com', 'sam@yahoo.co.ke', 'sam@hotmail.fr', 'sam@proton.me']) {
      expect(aNameFromAnEmailAddress(e)).toBeNull();
    }
    expect(isAPublicMailDomain('coamana.com')).toBe(false);
  });

  it('and nothing for something that is not an address yet', () => {
    for (const e of ['', 'sam', 'sam@', 'sam@acme', '@acme.com']) expect(aNameFromAnEmailAddress(e)).toBeNull();
  });
});

describe('which domains an organisation may be joined by', () => {
  it('a company\'s own, never a public mail service', () => {
    expect(mayBeJoinedBy('baridi.co.ke')).toBe(true);
    for (const d of ['gmail.com', 'yahoo.co.ke', 'outlook.com', 'hotmail.fr', '', 'baridi']) expect(mayBeJoinedBy(d)).toBe(false);
  });

  it('reads the domain of an address', () => {
    expect(theDomainOf(' Wairimu@Baridi.co.ke ')).toBe('baridi.co.ke');
    expect(theDomainOf('nope')).toBeNull();
  });
});

describe('GET /auth/name-from-address', () => {
  it('answers with the suggestion, or null, and nothing else', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AuthController } = require('../modules/auth/auth.controller');
    const c = new AuthController({} as any, { get: () => undefined } as any);
    expect(c.nameFromAddress('hafsah@coamana.com')).toEqual({ name: 'Coamana' });
    expect(c.nameFromAddress('sam@gmail.com')).toEqual({ name: null });
    expect(c.nameFromAddress(undefined as any)).toEqual({ name: null });
  });
});
