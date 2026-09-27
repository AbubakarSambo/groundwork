/**
 * A PLACE IN THIS APP, AND NOTHING ELSE (U.3 review).
 *
 * Somebody who presses "Join Coamana" on an organisation's invite link signs up, confirms their
 * email from a link in their mailbox, and must come back to that invite, not to "Where do you
 * work?". So the place they were going is kept with the waiting sign-up (or the sign-in link) and
 * handed back when the link is opened.
 *
 * Whatever is kept came from a query string anybody can write, so only a path inside this app is
 * accepted: it starts with one "/", never "//" or "/\" (which a browser reads as another site), holds
 * no scheme, no spaces and no control characters, and is not the sign-out page, which would sign
 * them out again. Anything else is dropped, never repaired.
 */
export function aPathInThisApp(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const p = raw.trim();
  if (!p || p.length > 500) return null;
  if (!p.startsWith('/') || p.startsWith('//') || p.startsWith('/\\')) return null;
  if (/[\s\\\u0000-\u001f\u007f]/.test(p)) return null;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(p)) return null;
  if (/^\/signout(?:[/?#]|$)/.test(p)) return null;
  return p;
}

/** The invite code in "/j/<code>", or null for any other path. */
export function theInviteLinkCodeIn(path: string | null | undefined): string | null {
  const m = /^\/j\/([a-z0-9-]{1,80})(?:[?#].*)?$/i.exec(path ?? '');
  return m ? m[1].toLowerCase() : null;
}
