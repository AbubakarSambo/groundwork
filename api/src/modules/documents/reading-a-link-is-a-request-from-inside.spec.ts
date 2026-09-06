/**
 * A LINK IS AN INSTRUCTION TO MAKE A REQUEST FROM INSIDE OUR NETWORK.
 *
 * `http://169.254.169.254/latest/meta-data/` is a link, and so is
 * `http://localhost:5432`. Every case here is somebody using a document reader as
 * a way to reach something that was never meant to be reachable.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  whatToFetch,
  isOutThere,
  isReadableType,
  textOutOf,
  looksLikeASignInPage,
  MOST_WE_WILL_READ,
} from './whether-we-can-read-it';

const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

describe('where a request may go', () => {
  it.each([
    ['127.0.0.1', 'loopback'],
    ['0.0.0.0', 'this host'],
    ['10.1.2.3', 'private'],
    ['172.16.5.4', 'private'],
    ['172.31.255.1', 'private'],
    ['192.168.1.1', 'private'],
    ['169.254.169.254', 'the cloud metadata service'],
    ['100.64.0.1', 'carrier-grade NAT'],
    ['224.0.0.1', 'multicast'],
    ['::1', 'loopback, v6'],
    ['fd00::1', 'private, v6'],
    ['fe80::1', 'link-local, v6'],
    ['::ffff:127.0.0.1', 'loopback wearing a v6 hat'],
  ])('refuses %s (%s)', (ip) => {
    expect(isOutThere(ip)).toBe(false);
  });

  it.each([['8.8.8.8'], ['1.1.1.1'], ['172.32.0.1'], ['2606:4700::1111']])('allows %s', (ip) => {
    expect(isOutThere(ip)).toBe(true);
  });
});

describe('what may be fetched at all', () => {
  it('only the web', () => {
    expect(whatToFetch('file:///etc/passwd').fetchable).toBe(false);
    expect(whatToFetch('gopher://example.com/x').fetchable).toBe(false);
    expect(whatToFetch('ftp://example.com/x').fetchable).toBe(false);
  });

  it('and only ports documents are served on', () => {
    expect(whatToFetch('http://example.com:5432/x').fetchable).toBe(false);
    expect(whatToFetch('http://example.com:6379/x').fetchable).toBe(false);
    expect(whatToFetch('https://example.com:443/x').fetchable).toBe(true);
  });

  it('asks Google for the text of a Doc rather than its page', () => {
    const plan = whatToFetch('https://docs.google.com/document/d/ABC123/edit?usp=sharing');
    expect(plan).toEqual({ fetchable: true, url: 'https://docs.google.com/document/d/ABC123/export?format=txt', asked: 'Google Docs' });
  });

  it('asks Dropbox for the file rather than the preview', () => {
    const plan = whatToFetch('https://www.dropbox.com/s/abc/x.txt?dl=0') as { url: string };
    expect(plan.url).toContain('dl=1');
  });

  it('does not guess at a Drive file, which has no public text form', () => {
    expect(whatToFetch('https://drive.google.com/file/d/ABC/view').fetchable).toBe(false);
  });
});

describe('what comes back', () => {
  it('is only kept when it is text we can honestly read', () => {
    expect(isReadableType('text/html; charset=utf-8')).toBe(true);
    expect(isReadableType('text/plain')).toBe(true);
    expect(isReadableType('application/pdf')).toBe(false);
    expect(isReadableType('application/octet-stream')).toBe(false);
    expect(isReadableType(null)).toBe(false);
  });

  it('is stripped to what it says, not how it looked', () => {
    const html = '<html><head><style>p{color:red}</style><script>alert(1)</script></head><body><h1>Renewal</h1><p>Two years, &amp; a break clause.</p></body></html>';
    const text = textOutOf(html, 'text/html');
    expect(text).toContain('Renewal');
    expect(text).toContain('Two years, & a break clause.');
    expect(text).not.toContain('alert(1)');
    expect(text).not.toContain('color:red');
    expect(text).not.toContain('<');
  });

  it('and a sign-in page is not the document', () => {
    expect(looksLikeASignInPage('Sign in to continue to Google Drive')).toBe(true);
    expect(looksLikeASignInPage('You need access. Request access, or switch to an account with access.')).toBe(true);
    expect(looksLikeASignInPage('The renewal contract runs for two years and may be terminated on notice.')).toBe(false);
  });
});

describe('the fetch itself', () => {
  const service = withoutComments('read-it-if-we-can.service.ts');

  it('checks the address on every hop, not only the first', () => {
    const loop = service.slice(service.indexOf('for (let hop'), service.indexOf('resolvesSomewherePublic(hostname'));
    expect(loop).toContain('resolvesSomewherePublic');
    expect(service).toContain("redirect: 'manual'");
  });

  it('checks what the name RESOLVES to, because a name can point anywhere', () => {
    expect(service).toContain('dns.promises.lookup');
    expect(service).toContain('every((a) => isOutThere(a.address))');
  });

  it('refuses a name that resolves to nothing rather than trying anyway', () => {
    const fn = service.slice(service.indexOf('private async resolvesSomewherePublic'));
    expect(fn.slice(0, fn.indexOf('\n  }'))).toContain('addresses.length > 0');
  });

  it('caps the body as it arrives, not after', () => {
    expect(service).toContain('reader.cancel()');
    expect(MOST_WE_WILL_READ).toBeLessThanOrEqual(5_000_000);
  });

  it('gives up rather than hanging', () => {
    expect(service).toContain('AbortSignal.timeout');
  });

  it('never throws, because a private link is the product working', () => {
    expect(service).not.toMatch(/throw new/);
  });
});
