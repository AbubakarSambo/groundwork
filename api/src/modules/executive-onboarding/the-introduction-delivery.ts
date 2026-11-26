/**
 * ONE INTRODUCTION, ONE CHANNEL, ONE ROW (Ebele, increment 5; plan 4: "separate real deliveries with delivery-state tracking, correct reply
 * routing and duplicate-safe retries").
 *
 * The email and the WhatsApp message to the same person are two rows with two states. A row is claimed before anything is sent (its `sendKey`
 * is unique, so a retry or a second copy of the API finds it and does not send again), and only the seam that really sent moves it to "sent".
 *
 *   queued       claimed, handed to the door or the gate
 *   sent         the mail service or WhatsApp took it
 *   held         not sent yet and will be tried again: the mail is held for the morning, or WhatsApp does not yet allow Groundwork to write
 *                first to this number (no approved opening message). The reason is in the row in plain words. It is never sent another way.
 *   suppressed   the person asked not to be written to on this channel (STOP, or an unsubscribed address)
 *   failed       the provider failed; tried again later
 *
 * "Delivered" (the provider's receipt) is not written here: nothing in this code listens for it yet, and a state nothing writes would be a lie.
 */
import { isHeldForTheNight } from '../whatsapp/quiet-hours-are-the-organisations';
import { FIRST_CONTACT_NOT_APPROVED } from '../whatsapp/the-first-message-to-a-number';
import { NOT_TODAY, NOT_TURNED_ON_QUIETLY, OUTSIDE_THE_WINDOW, THEY_SAID_NOT_NOW, THEY_SAID_STOP } from '../whatsapp/a-message-outside-the-window';

export interface TheOnboardingPorts {
  email: { send(a: { organizationId: string; to: string; subject: string; text: string; replyTo: string; sendKey: string }): Promise<'sent' | 'held' | 'suppressed'> };
  whatsapp: { send(a: { organizationId: string; phone: string; text: string; kind: string }): Promise<{ sent: boolean; error?: string }> };
}

export type ADeliveryState = 'queued' | 'sent' | 'held' | 'suppressed' | 'failed';

/** Why WhatsApp did not take it, in plain words for the person who reads the delivery state. */
export function whyWhatsAppHeldIt(error: string | undefined | null): { state: ADeliveryState; reason: string } {
  const e = error ?? '';
  if (isHeldForTheNight(e)) return { state: 'held', reason: 'It is night where the person is, so this message will go in the morning.' };
  if (e === THEY_SAID_STOP) return { state: 'suppressed', reason: 'Nothing was sent, because this number asked Groundwork to stop sending WhatsApp messages.' };
  if (e === FIRST_CONTACT_NOT_APPROVED) return { state: 'held', reason: 'This message is waiting. Groundwork cannot write first to this number on WhatsApp yet, because Meta has not approved the opening message. It will go once the opening message is approved, or once the person writes first.' };
  if (e === OUTSIDE_THE_WINDOW) return { state: 'held', reason: 'WhatsApp only lets Groundwork write first with an approved opening message, and there is not one for this yet. This message is waiting, and it will go as soon as one is approved, or after the person writes to this number first.' };
  if (e === NOT_TURNED_ON_QUIETLY) return { state: 'held', reason: 'This organisation has not turned on WhatsApp, so this message is waiting. It goes when WhatsApp is turned on.' };
  if (e === NOT_TODAY || e === THEY_SAID_NOT_NOW) return { state: 'held', reason: 'This message is waiting for another day. Groundwork has written to this number as often as it may today, or the person asked not to be written to just now.' };
  return { state: 'held', reason: 'WhatsApp did not take the message, and I will try again.' };
}

const RETRY_AFTER_MS = 60 * 60 * 1000;

export interface AnIntroductionToSend {
  organizationId: string;
  principalUserId: string;
  audience: 'principal' | 'team';
  channel: 'email' | 'whatsapp';
  /** An address for email, a number for WhatsApp. */
  recipient: string;
  subject: string | null;
  text: string;
  replyTo: string | null;
  sendKey: string;
  now: Date;
  /** The person has just written to this number. A held WhatsApp introduction is tried now, without waiting out the hour. */
  theyJustWrote?: boolean;
}

/**
 * Sends it once. Returns the state the row is in afterwards. A row already sent, suppressed or claimed by another copy is left alone; a held or
 * failed row is tried again only when an hour has passed since the last try.
 */
export async function deliverOneIntroduction(prisma: any, ports: TheOnboardingPorts, a: AnIntroductionToSend): Promise<{ state: ADeliveryState | 'already'; reason: string | null; /** The state the row is really in, whoever moved it: what is told about a send is read from here, never assumed. */ was?: ADeliveryState }> {
  let row: any = await prisma.introductionDelivery.findFirst({ where: { sendKey: a.sendKey } });
  if (row) {
    /* A mail the door is holding for the morning is already its job: sending it again would be a second copy. Only WhatsApp that was held, a failure, or a claim nobody finished is tried again. */
    const tryable = (row.state === 'failed' || row.state === 'queued' || (row.state === 'held' && row.channel === 'whatsapp')) && (a.theyJustWrote || !row.lastTriedAt || a.now.getTime() - new Date(row.lastTriedAt).getTime() >= RETRY_AFTER_MS);
    if (!tryable) return { state: 'already', reason: row.reason ?? null, was: row.state };
  } else {
    try {
      row = await prisma.introductionDelivery.create({ data: { organizationId: a.organizationId, principalUserId: a.principalUserId, audience: a.audience, recipient: a.recipient.toLowerCase(), channel: a.channel, state: 'queued', subject: a.subject, text: a.text, replyTo: a.replyTo, sendKey: a.sendKey, attempts: 0 } });
    } catch (err: any) {
      if (err?.code === 'P2002') return { state: 'already', reason: null };
      throw err;
    }
  }
  /* Claimed for this attempt: only one writer moves a held or failed row on. */
  const claimed = await prisma.introductionDelivery.updateMany({ where: { id: row.id, state: { in: ['queued', 'held', 'failed'] }, attempts: row.attempts }, data: { state: 'queued', attempts: row.attempts + 1, lastTriedAt: a.now } });
  if (claimed && claimed.count === 0) return { state: 'already', reason: null };
  let state: ADeliveryState;
  let reason: string | null = null;
  try {
    if (a.channel === 'email') {
      const o = await ports.email.send({ organizationId: a.organizationId, to: a.recipient, subject: a.subject ?? '', text: a.text, replyTo: a.replyTo ?? '', sendKey: a.sendKey });
      state = o === 'sent' ? 'sent' : o === 'held' ? 'held' : 'suppressed';
      if (o === 'held') reason = 'The mail is held until the morning, because it is night where the person is. It goes then.';
      if (o === 'suppressed') reason = 'This address has asked not to be mailed by Groundwork, so nothing was sent.';
    } else {
      const r = await ports.whatsapp.send({ organizationId: a.organizationId, phone: a.recipient, text: a.text, kind: a.audience === 'principal' ? 'introduction' : 'team-introduction' });
      if (r.sent) state = 'sent';
      else ({ state, reason } = whyWhatsAppHeldIt(r.error));
    }
  } catch (err: any) {
    state = 'failed';
    reason = 'The message could not be sent, and I will try again.';
  }
  await prisma.introductionDelivery.update({ where: { id: row.id }, data: { state, reason } });
  return { state, reason, was: state };
}

/** The held WhatsApp, failed and unfinished introductions whose hour has passed, tried again. Returns how many went. */
export async function retryTheHeldIntroductions(prisma: any, ports: TheOnboardingPorts, now: Date): Promise<number> {
  const rows: any[] = (await prisma.introductionDelivery.findMany({ where: { state: { in: ['held', 'failed', 'queued'] } } })) ?? [];
  let went = 0;
  for (const r of rows) {
    const out = await deliverOneIntroduction(prisma, ports, { organizationId: r.organizationId, principalUserId: r.principalUserId, audience: r.audience, channel: r.channel, recipient: r.recipient, subject: r.subject ?? null, text: r.text, replyTo: r.replyTo ?? null, sendKey: r.sendKey, now }).catch(() => ({ state: 'failed' as const }));
    if (out.state === 'sent') went += 1;
  }
  return went;
}

/**
 * She (or somebody she named) has written to the number first, which is the other way a held WhatsApp introduction may go ("or after the person writes
 * to this number first", whyWhatsAppHeldIt above). The held introduction for that number is tried at once, once: its row is claimed before it is sent, so a
 * second message from her does not send it again. `normalise` makes the two spellings of a number the same number.
 */
export async function releaseTheIntroductionHeldForANumber(prisma: any, ports: TheOnboardingPorts, a: { phone: string; now: Date; normalise: (p: string) => string }): Promise<number> {
  const rows: any[] = (await prisma.introductionDelivery.findMany({ where: { channel: 'whatsapp', state: { in: ['held', 'failed'] } } })) ?? [];
  let went = 0;
  for (const r of rows.filter((x) => a.normalise(String(x.recipient)) === a.phone)) {
    const out = await deliverOneIntroduction(prisma, ports, { organizationId: r.organizationId, principalUserId: r.principalUserId, audience: r.audience, channel: 'whatsapp', recipient: r.recipient, subject: r.subject ?? null, text: r.text, replyTo: r.replyTo ?? null, sendKey: r.sendKey, now: a.now, theyJustWrote: true }).catch(() => ({ state: 'failed' as const }));
    if (out.state === 'sent') went += 1;
  }
  return went;
}

/** Called by the one mail door when it takes an introduction, now or after it was held. Never throws into a send. */
export async function markAnIntroductionSent(prisma: any, sendKey: string | undefined, _providerId?: string | null): Promise<void> {
  if (!sendKey || !sendKey.startsWith('intro:') || !prisma?.introductionDelivery?.updateMany) return;
  try {
    await prisma.introductionDelivery.updateMany({ where: { sendKey, state: { in: ['queued', 'held', 'failed'] } }, data: { state: 'sent', reason: null } });
  } catch {
    /* A record that cannot be written must not undo a mail that went. The row says "held", which is the honest word. */
  }
}
