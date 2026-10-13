const express = require('express');
import { createServer } from 'http';
import { howManyProxiesToTrust, theWarningWhenTheProxiesAreNotSaid } from './the-proxies-the-api-trusts';

const addressSeenBy = (hops: number, headers: Record<string, string>) =>
  new Promise<string>((resolve, reject) => {
    const app = express();
    app.set('trust proxy', hops);
    /* What the throttler counts a visitor by: req.ip. */
    app.get('/', (req: any, res: any) => res.send(req.ip));
    const server = createServer(app).listen(0, async () => {
      try {
        const { port } = server.address() as any;
        const r = await fetch(`http://127.0.0.1:${port}/`, { headers });
        resolve(await r.text());
      } catch (e) { reject(e); } finally { server.close(); }
    });
  });

describe('which address counts as the visitor', () => {
  it('is one proxy in production, and none anywhere else, unless it is said', () => {
    expect(howManyProxiesToTrust({ NODE_ENV: 'production' })).toBe(1);
    expect(howManyProxiesToTrust({ NODE_ENV: 'development' })).toBe(0);
    expect(howManyProxiesToTrust({})).toBe(0);
    expect(howManyProxiesToTrust({ NODE_ENV: 'production', TRUST_PROXY_HOPS: '2' })).toBe(2);
    expect(howManyProxiesToTrust({ NODE_ENV: 'production', TRUST_PROXY_HOPS: '0' })).toBe(0);
    expect(howManyProxiesToTrust({ NODE_ENV: 'production', TRUST_PROXY_HOPS: 'true' })).toBe(1);
    expect(howManyProxiesToTrust({ TRUST_PROXY_HOPS: '99' })).toBe(0);
  });

  it('counts two visitors behind one proxy as two addresses', async () => {
    const a = await addressSeenBy(1, { 'x-forwarded-for': '203.0.113.7' });
    const b = await addressSeenBy(1, { 'x-forwarded-for': '198.51.100.9' });
    expect(a).toBe('203.0.113.7');
    expect(b).toBe('198.51.100.9');
  });

  it('does not believe an address a visitor wrote into the header themselves', async () => {
    /* The proxy appended the real address (203.0.113.7) after the visitor's made-up one. */
    expect(await addressSeenBy(1, { 'x-forwarded-for': '1.2.3.4, 203.0.113.7' })).toBe('203.0.113.7');
  });

  it('with no proxy trusted, ignores the header altogether', async () => {
    const seen = await addressSeenBy(0, { 'x-forwarded-for': '1.2.3.4' });
    expect(seen).not.toContain('1.2.3.4');
  });
});

describe('the warning when nobody has said how many proxies there are', () => {
  it('is given once in production when TRUST_PROXY_HOPS is unset, says what it is and what to set it to', () => {
    const said = theWarningWhenTheProxiesAreNotSaid({ NODE_ENV: 'production' });
    expect(said).toContain('TRUST_PROXY_HOPS is not set');
    expect(said).toContain('content network');
    expect(said).toContain('2 if a content network also sits in front');
    expect(said).toContain('The API is starting anyway.');
  });

  it('is not given when the number is said, even as 0, or outside production', () => {
    expect(theWarningWhenTheProxiesAreNotSaid({ NODE_ENV: 'production', TRUST_PROXY_HOPS: '1' })).toBeNull();
    expect(theWarningWhenTheProxiesAreNotSaid({ NODE_ENV: 'production', TRUST_PROXY_HOPS: '0' })).toBeNull();
    expect(theWarningWhenTheProxiesAreNotSaid({ NODE_ENV: 'development' })).toBeNull();
    expect(theWarningWhenTheProxiesAreNotSaid({})).toBeNull();
  });
});
