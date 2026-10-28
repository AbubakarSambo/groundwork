import { createHash } from 'crypto';

/**
 * THE ONE OUTBOX (fix plan, pattern 6; quarter test, October 2026 to January 2027).
 *
 * People got the same message more than once: "your check-in is open" twice four minutes apart, "your report is ready" three times, the
 * same apology three times in twenty seconds, and a re-sent invitation for each check-in, every day. Each path checked whether it had sent
 * and then sent, and two paths, two timers or two copies of the server all passed the check. Now every email and WhatsApp claims one key
 * before it goes; a key already claimed was already sent, and the message is not sent again.
 *
 * The key is the channel, who it is to, what kind of message, what it is about, and when:
 *  - a message about something (a check-in, a report, a request) goes once a day for that thing;
 *  - an invitation goes to one person once a day, whichever check-in it is for;
 *  - an apology that something failed goes to one person once in half an hour;
 *  - a reply to what somebody wrote is never held, except the very same words twice within a minute.
 */
export type AChannel = 'email' | 'whatsapp';

const DAY = 86_400_000;
const hash = (t: string) => createHash('sha1').update(String(t ?? '')).digest('hex').slice(0, 16);
const bucket = (at: Date, ms: number) => Math.floor(at.getTime() / ms);

/** Kinds that are an invitation, sent once a day to a person, whatever check-in it is for. */
const AN_INVITATION = /invite|invitation|your-view-matters|would-like-your-take/i;
/** Words of an apology that something on our side failed. */
const AN_APOLOGY = /could not be reached|cannot continue this minute|a problem on our side/i;

export function theOutboxKey(m: { channel: AChannel; to: string; kind?: string | null; about?: string | null; text?: string | null; at?: Date }): string | null {
  const to = String(m.to ?? '').trim().toLowerCase();
  if (!to) return null;
  const at = m.at ?? new Date();
  const text = String(m.text ?? '');
  if (AN_APOLOGY.test(text)) return `${m.channel}|${to}|apology|${bucket(at, 30 * 60_000)}`;
  const kind = String(m.kind ?? '').trim();
  if (!kind || /^reply$/i.test(kind)) return `${m.channel}|${to}|reply|${hash(text)}|${bucket(at, 60_000)}`;
  if (AN_INVITATION.test(kind)) return `${m.channel}|${to}|invitation|${bucket(at, DAY)}`;
  return `${m.channel}|${to}|${kind}|${m.about ? m.about : hash(text)}|${bucket(at, DAY)}`;
}

/**
 * Claims the key; true when this message may go, false when it already went. A key it cannot claim for any other reason (the table is not
 * there yet, the database blinked) lets the message go: a message lost is worse than one sent twice.
 */
export async function mayItGo(prisma: any, key: string | null): Promise<boolean> {
  if (!key || !prisma?.outboxClaim?.create) return true;
  try {
    /* A reply's minute is a sliding one: the same words twelve seconds apart across the turn of a minute are the same reply (two-week check). */
    const reply = /\|reply\|[0-9a-f]+\|(\d+)$/.exec(key);
    if (reply && prisma.outboxClaim.findUnique) {
      const before = await prisma.outboxClaim.findUnique({ where: { key: key.replace(/\d+$/, String(Number(reply[1]) - 1)) } }).catch(() => null);
      if (before && Date.now() - new Date(before.createdAt).getTime() < 60_000) return false;
    }
    await prisma.outboxClaim.create({ data: { key } });
    return true;
  } catch (err: any) {
    return err?.code !== 'P2002';
  }
}
