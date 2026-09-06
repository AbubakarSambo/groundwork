/**
 * SOMETIMES WE CAN JUST READ IT.
 *
 * A pasted link is recorded rather than read — see `where-a-document-lives.ts` —
 * and that is the honest default. But a fair share of what people paste is
 * genuinely public: a Google Doc set to "anyone with the link", a published Notion
 * page, a plain file on a company site. Refusing to read those is not caution,
 * it is a worse product for no gain.
 *
 * SO: TRY, AND BE LOUD ABOUT WHICH HAPPENED. Read it and say so, or record it and
 * say we could not. What must never happen is the middle — holding a document we
 * half-read, or claiming to have read one we did not.
 *
 * ==========================================================================
 * THIS FILE FETCHES A URL A STRANGER TYPED. Everything below is about that.
 * ==========================================================================
 *
 * OUR SERVER SITS INSIDE OUR NETWORK. A link is an instruction to make a request
 * from in here, and `http://169.254.169.254/latest/meta-data/` is a link. So is
 * `http://localhost:5432`. The rules:
 *
 *   ONLY http AND https, and only ports 80 and 443. A scheme we do not recognise
 *   and a port nobody serves documents on are both somebody probing.
 *
 *   THE ADDRESS IT RESOLVES TO IS CHECKED, NOT THE NAME. `internal.example.com`
 *   can resolve to 127.0.0.1, and a name-based blocklist never sees it.
 *
 *   REDIRECTS ARE FOLLOWED BY HAND, and every hop is checked again. A public host
 *   that 302s to a private one is the standard way around a check done once.
 *
 *   SIZE AND TIME ARE CAPPED. A link to a 4GB file is a link that takes the
 *   server down, and it does not have to be malicious to do it.
 *
 * AND WHAT COMES BACK IS SOMEBODY ELSE'S WRITING. It is stored and shown as a
 * document, never followed as an instruction — the same rule as every other
 * document in here.
 */

export const MOST_WE_WILL_READ = 2_000_000; // bytes
export const GIVE_UP_AFTER_MS = 8_000;
export const MOST_REDIRECTS = 3;

/** Content types we can turn into text without pretending. */
const READABLE = ['text/plain', 'text/html', 'text/markdown', 'application/json'];

export type CannotFetch = { fetchable: false; because: string };
export type CanFetch = { fetchable: true; url: string; asked: string };

/**
 * Where to actually GET, given what somebody pasted.
 *
 * Some providers have a public plain-text form of the same document, and using it
 * is the difference between reading a page of HTML chrome and reading the
 * document. This is the only place that mapping lives.
 */
export function whatToFetch(url: string): CanFetch | CannotFetch {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { fetchable: false, because: 'that is not an address' };
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { fetchable: false, because: 'only web addresses can be read' };
  }
  if (u.port && u.port !== '80' && u.port !== '443') {
    return { fetchable: false, because: 'that is not a port documents are served on' };
  }

  const host = u.hostname.toLowerCase();

  /* Google's own export endpoint. Public only if the document is public — which
     is exactly the question we want answered, and Google answers it for us with
     a redirect to a sign-in page we will not follow. */
  const googleDoc = host === 'docs.google.com' && u.pathname.match(/^\/document\/d\/([^/]+)/);
  if (googleDoc) {
    return {
      fetchable: true,
      url: `https://docs.google.com/document/d/${googleDoc[1]}/export?format=txt`,
      asked: 'Google Docs',
    };
  }

  /* Dropbox serves a preview page at the shared link and the file itself at
     dl=1. The preview is chrome; the file is the document. */
  if (host.endsWith('dropbox.com')) {
    return { fetchable: true, url: `${u.origin}${u.pathname}?dl=1`, asked: 'Dropbox' };
  }

  /* A Drive FILE has no public text form — its content depends on its type, and
     guessing produces bytes rather than a document. */
  if (host === 'drive.google.com') {
    return { fetchable: false, because: 'a Drive file has no public text form' };
  }

  return { fetchable: true, url: `${u.origin}${u.pathname}${u.search}`, asked: host };
}

/**
 * IS THIS ADDRESS SOMEWHERE ON THE PUBLIC INTERNET.
 *
 * Given an IP the name resolved to. Everything private, loopback, link-local,
 * multicast or reserved is refused — including the cloud metadata address, which
 * is the one that turns a document reader into a credential reader.
 */
export function isOutThere(ip: string): boolean {
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false; // link-local, and the metadata service
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
    if (a >= 224) return false; // multicast and reserved
    return true;
  }

  const v6 = ip.toLowerCase();
  if (v6 === '::1' || v6 === '::') return false;
  if (v6.startsWith('fe80') || v6.startsWith('fc') || v6.startsWith('fd')) return false;
  /* An IPv4 address wearing a v6 hat is still that address. */
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isOutThere(mapped[1]);
  return true;
}

/** Whether what came back is something we can honestly call text. */
export function isReadableType(contentType: string | null): boolean {
  if (!contentType) return false;
  const type = contentType.split(';')[0].trim().toLowerCase();
  return READABLE.includes(type);
}

/**
 * HTML to something worth keeping. Deliberately blunt: script and style out,
 * tags out, whitespace collapsed. A document is what it says, not how it looked.
 */
export function textOutOf(body: string, contentType: string): string {
  const type = contentType.split(';')[0].trim().toLowerCase();
  if (type !== 'text/html') return body.trim();

  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

/**
 * A SIGN-IN PAGE IS NOT THE DOCUMENT.
 *
 * The commonest failure is not an error: a private Drive link returns 200 and a
 * login page, and storing that means the assistant answers about the contract
 * using the words "Sign in to continue". Recognising it is the difference
 * between reading nothing and reading nonsense.
 */
export function looksLikeASignInPage(text: string): boolean {
  const first = text.slice(0, 2000).toLowerCase();
  return (
    /sign in|log in|login|you need access|request access|permission denied/.test(first)
    && first.length < 4000
  );
}
