import * as crypto from 'crypto';
import { canSeal, open, seal, whyNoKey } from './a-secret-kept-sealed';

/** The seal on a secret typed into the back office. Every key below is made up for this test. */
const LONG = 'a-made-up-key-that-is-long-enough-for-this';
const B64 = crypto.randomBytes(32).toString('base64');
const HEX = crypto.randomBytes(32).toString('hex');
const PLACE = 'whatsapp.groundworksNumber:accessToken';

describe('the key', () => {
  it('32 bytes in base64 or hex, or 32 characters or more, can seal', () => {
    for (const k of [LONG, B64, HEX]) {
      expect(whyNoKey(k)).toBeNull();
      expect(open(seal('a-secret', PLACE, k), PLACE, k)).toBe('a-secret');
    }
  });

  it('a short key is refused, and so is none at all', () => {
    expect(whyNoKey('short')).toBe('too short');
    expect(canSeal(crypto.randomBytes(16).toString('base64'))).toBe(false);
    expect(whyNoKey(undefined)).toBe('missing');
    expect(() => seal('a-secret', PLACE, 'short')).toThrow('SETTINGS_ENCRYPTION_KEY is too short, so a secret cannot be saved.');
  });

  it('a different key does not open it', () => {
    expect(open(seal('a-secret', PLACE, LONG), PLACE, B64)).toBeNull();
  });
});

describe('the sealed text', () => {
  it('holds no trace of the secret', () => {
    expect(seal('a-secret-value', PLACE, LONG)).not.toContain('a-secret-value');
  });

  it('is bound to its place: sealed for one field, it does not open in another', () => {
    const sealed = seal('a-secret', PLACE, LONG);
    expect(open(sealed, 'whatsapp.groundworksNumber:appSecret', LONG)).toBeNull();
  });

  it('opens only with a 12-byte IV and a 16-byte tag', () => {
    const [v, iv, tag, data] = seal('a-secret', PLACE, LONG).split(':');
    const shortTag = Buffer.from(tag, 'base64').subarray(0, 4).toString('base64');
    const longIv = Buffer.concat([Buffer.from(iv, 'base64'), Buffer.alloc(4)]).toString('base64');
    expect(open([v, iv, shortTag, data].join(':'), PLACE, LONG)).toBeNull();
    expect(open([v, longIv, tag, data].join(':'), PLACE, LONG)).toBeNull();
  });

  it('altered by one byte, it does not open', () => {
    const [v, iv, tag, data] = seal('a-secret', PLACE, LONG).split(':');
    const bytes = Buffer.from(data, 'base64');
    bytes[0] ^= 1;
    expect(open([v, iv, tag, bytes.toString('base64')].join(':'), PLACE, LONG)).toBeNull();
  });
});
