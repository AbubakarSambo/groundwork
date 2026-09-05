/**
 * The gate that used to be a subscription.
 */
import {
  mayUseTheApi,
  whyTheApiIsRefused,
  whyThisRequestCannotBeRecorded,
} from './access-is-asked-for-not-bought';

describe('who may hold a machine token', () => {
  it('is an organisation whose request was approved', () => {
    expect(mayUseTheApi({ status: 'APPROVED' })).toBe(true);
  });

  it('and nobody else, whatever they pay', () => {
    /* The point of the change: paying and connecting are two decisions. Neither
       one implies the other, in either direction. */
    for (const status of ['PENDING', 'DECLINED', 'WITHDRAWN'] as const) {
      expect(mayUseTheApi({ status })).toBe(false);
    }
    expect(mayUseTheApi(null)).toBe(false);
    expect(mayUseTheApi(undefined)).toBe(false);
  });

  it('and the rule reads nothing about money', () => {
    const source = require('fs')
      .readFileSync(require('path').join(__dirname, 'access-is-asked-for-not-bought.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(source).not.toMatch(/subscription|isSubscribed|plan/i);
  });
});

describe('the refusal', () => {
  it('tells somebody who is waiting that they are waiting', () => {
    /* The old refusal flattened four situations into one. "You have not paid"
       could not tell an organisation that had asked from one that never had,
       and those need opposite things done about them. */
    expect(whyTheApiIsRefused({ status: 'PENDING' })).toContain('has not been decided yet');
  });

  it('tells somebody who was declined how to change it', () => {
    expect(whyTheApiIsRefused({ status: 'DECLINED' })).toContain('Ask again with what changed');
  });

  it('separates having it taken back from never having had it', () => {
    expect(whyTheApiIsRefused({ status: 'WITHDRAWN' })).toContain('has since been withdrawn');
    expect(whyTheApiIsRefused(null)).toContain('not been given API access yet');
  });

  it('and never blames the credential, because the credential is fine', () => {
    for (const r of [null, { status: 'PENDING' as const }, { status: 'DECLINED' as const }, { status: 'WITHDRAWN' as const }]) {
      expect(whyTheApiIsRefused(r)).toMatch(/Nothing (else )?(about the credential is wrong|is wrong with the credential)/);
    }
  });

  it('and answers rather than throwing on the case that never reaches it', () => {
    /* A function that throws on its own success case is one somebody works around. */
    expect(whyTheApiIsRefused({ status: 'APPROVED' })).toBe('Access is approved.');
  });
});

describe('asking for it', () => {
  it('needs somebody to say what they intend to build', () => {
    expect(whyThisRequestCannotBeRecorded('')).toContain('what you intend to build');
    expect(whyThisRequestCannotBeRecorded('api pls')).toContain('what you intend to build');
  });

  it('and takes a real sentence', () => {
    expect(
      whyThisRequestCannotBeRecorded('We want to open check-ins from inside our own HR system.'),
    ).toBeNull();
  });
});
