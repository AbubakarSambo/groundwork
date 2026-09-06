/**
 * A DOCUMENT THAT LIVES SOMEWHERE ELSE.
 *
 * Almost nothing a company works from lives in Groundwork. The job description is
 * in Drive, the contract is in Dropbox, the workplan is a page in Notion, and
 * asking somebody to download a file and upload it again is asking them to keep a
 * second copy in step with the first. They will do it once.
 *
 * So a link is a first-class thing to put on a check-in. What it is NOT is a
 * document we have read.
 *
 * THE HONESTY IS THE FEATURE, AND IT IS STRUCTURAL RATHER THAN STATED.
 *
 * We cannot open a private Drive file. Storing a link in the same table as an
 * uploaded document would put a row with no text where every prompt-assembling
 * read expects text, and the assistant would answer about "the contract" having
 * seen nothing but its file name. That is not a mistake anybody notices, because
 * a confident answer about a document nobody checked reads exactly like a correct
 * one.
 *
 * These live in their own table for that reason — see `DocumentElsewhere`. There
 * is no filter to forget, because there is nothing to filter: a read that
 * assembles document text cannot reach one of these at all.
 *
 * WHAT THE PERSON IS TOLD, PLAINLY: it is on the check-in, anybody it is for can
 * open it, and I have not read it. If what is in it matters to the conversation,
 * paste the part that does or upload the file.
 */

export interface WhereItLives {
  /** In the words a person would use for it. */
  livesIn: string;
  /** The address, normalised — never anything of the query string. */
  url: string;
}

const KNOWN: { host: RegExp; called: string }[] = [
  { host: /(^|\.)docs\.google\.com$/, called: 'Google Docs' },
  { host: /(^|\.)drive\.google\.com$/, called: 'Google Drive' },
  { host: /(^|\.)dropbox\.com$/, called: 'Dropbox' },
  { host: /(^|\.)sharepoint\.com$/, called: 'SharePoint' },
  { host: /(^|\.)onedrive\.live\.com$/, called: 'OneDrive' },
  { host: /(^|\.)notion\.(so|site)$/, called: 'Notion' },
  { host: /(^|\.)box\.com$/, called: 'Box' },
  { host: /(^|\.)atlassian\.net$/, called: 'Confluence' },
];

/**
 * Where a pasted address lives, or null when it is not one we can record.
 *
 * ONLY http AND https. A `file://` link is a path on one person's laptop that
 * nobody else can open, and a `javascript:` one is not a document at all.
 */
export function whereItLives(said: string): WhereItLives | null {
  const found = said.match(/https?:\/\/[^\s<>"']+/i);
  if (!found) return null;

  let parsed: URL;
  try {
    parsed = new URL(found[0]);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.toLowerCase();
  const known = KNOWN.find((k) => k.host.test(host));

  /*
   * THE QUERY STRING IS DROPPED, and this is not tidiness.
   *
   * Sharing links carry tokens — `?rscd=`, `?e=`, `?token=` — and a token in a
   * row that the whole check-in can read is the document handed to everybody who
   * can see the link, whatever the document's own permissions say. The path is
   * enough to open it for anybody who already has access, which is exactly who
   * should be opening it.
   */
  const url = `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, '');

  return { livesIn: known ? known.called : host, url };
}

/** What it is called on the check-in when nobody said. Never a token, never a whole URL. */
export function whatToCallIt(where: WhereItLives, said: string): string {
  const withoutLink = said.replace(/https?:\/\/[^\s<>"']+/gi, '').trim();
  const words = withoutLink
    .replace(/^[^a-z0-9]+/i, '')
    /* "here is the signed renewal contract" is a sentence; the document is called
       "the signed renewal contract". Only the handing-over words come off — the
       rest is what they chose to call it and is left exactly as they wrote it. */
    .replace(/^(?:here(?:'s| is)|this is|attaching|attached|see|sharing|adding)\s+/i, '')
    .trim();
  if (words.length >= 3) return words.slice(0, 120);

  const lastBit = decodeURIComponent(where.url.split('/').filter(Boolean).pop() ?? '');
  /* An id is not a name. "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" tells
     nobody what the thing is, so it is better to say where it lives. */
  const looksLikeAnId = /^[A-Za-z0-9_-]{16,}$/.test(lastBit);
  return looksLikeAnId || lastBit.length < 3 ? `A document in ${where.livesIn}` : lastBit.replace(/[-_]+/g, ' ');
}

/** Said once, when it goes on. The second sentence is the one that matters. */
export function whatWeCanAndCannotDo(where: WhereItLives, name: string): string {
  return (
    `"${name}" is on the check-in, in ${where.livesIn}. `
    + 'I have not read it and I cannot — it stays where it lives, and anybody it is for opens it there. '
    + 'If what is inside it matters here, paste the part that does or upload the file.'
  );
}
