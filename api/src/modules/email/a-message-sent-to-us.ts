/**
 * MAIL SENT TO US, RATHER THAN BY US.
 *
 * `hello@myground.work` is on the marketing site, in the footer, and beside "Ask about Guided" on
 * the pricing page. It is the address a prospect writes to, and it arrived in one person's inbox -
 * invisible to everybody else, and unanswerable by anybody if she were away for a week.
 *
 * WHAT THIS IS NOT. It is not a mailbox and should never grow into one: no threads, no replies, no
 * folders, no assignment. Replying happens in whatever mail client the person already uses. This
 * exists so that a message reaching the company is VISIBLE to the company, which is a much smaller
 * job and the only part that was actually broken.
 *
 * AND IT IS NEVER EVIDENCE. Nothing here reaches a check-in, a report, or a record about anybody.
 * Somebody writing to ask about pricing has not consented to being read by a product that watches
 * how people work, and the fact that the same database holds both is not a reason to join them.
 */

export interface Inbound {
  providerId: string | null;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  subject: string | null;
  body: string | null;
  receivedAt: Date;
}

/* Long enough for a real first email, short enough that nobody can fill the table with one send. */
const MOST_OF_A_MESSAGE = 20_000;

/** "Sahar Jamal <sahar@example.com>" and "sahar@example.com" both arrive. */
export function whoSentIt(from: string | undefined | null): { address: string; name: string | null } {
  const raw = (from ?? '').trim();
  const angled = raw.match(/^(.*)<([^>]+)>\s*$/);
  if (angled) {
    const name = angled[1].trim().replace(/^"|"$/g, '').trim();
    return { address: angled[2].trim().toLowerCase(), name: name || null };
  }
  return { address: raw.toLowerCase(), name: null };
}

/**
 * WHY THE HTML IS THROWN AWAY.
 *
 * Rendering a stranger's HTML inside our own admin panel is the most direct way to hand somebody
 * else's markup our session, and no amount of sanitising makes that a good trade for a message
 * somebody is going to read as words anyway. Where a sender sent only HTML, the tags are stripped
 * and the text kept - a person can read that, and a script cannot run in it.
 */
export function readableBody(text: string | undefined | null, html: string | undefined | null): string | null {
  const plain = (text ?? '').trim();
  if (plain) return plain.slice(0, MOST_OF_A_MESSAGE);

  const fromHtml = (html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return fromHtml ? fromHtml.slice(0, MOST_OF_A_MESSAGE) : null;
}

/** The event kinds Resend uses for mail arriving at a domain we own. */
export const ARRIVING = new Set(['email.received', 'inbound.email.received']);

export function isSomethingSentToUs(type: string | undefined | null): boolean {
  return ARRIVING.has((type ?? '').trim());
}

/**
 * Reads one webhook body into the row we keep. Returns null when the payload is not a message we
 * can attribute to a sender - a message from nobody is not something a person can act on.
 */
export function whatArrived(event: any): Inbound | null {
  const d = event?.data ?? {};
  const { address, name } = whoSentIt(d.from);
  if (!address.includes('@')) return null;

  const to = Array.isArray(d.to) ? d.to[0] : d.to;
  if (!to || typeof to !== 'string') return null;

  /* Their time, not ours: when it was sent is what a person reading it wants to know. */
  const when = d.created_at ?? event?.created_at;
  const receivedAt = when ? new Date(when) : new Date();

  return {
    providerId: typeof d.email_id === 'string' ? d.email_id : null,
    fromAddress: address,
    fromName: name,
    toAddress: to.toLowerCase(),
    subject: typeof d.subject === 'string' ? d.subject.slice(0, 500) : null,
    body: readableBody(d.text, d.html),
    receivedAt: Number.isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
  };
}
