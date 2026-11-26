import * as crypto from 'crypto';
import { whoSentIt, readableBody } from './a-message-sent-to-us';
import { whichOrganisationAmongThese } from './the-assistants-address';
import type { InboundAttachmentMeta } from './inbound-mail-client';
import { theVoiceNoteInTheMail } from '../voice/the-transcriber';

/**
 * MAIL A TEAM MEMBER SENDS TO THEIR ORGANISATION'S ASSISTANT, as opposed to mail sent to the
 * company (a-message-sent-to-us.ts, which is never evidence and is left exactly as it was).
 *
 * This file only reads one webhook body and says things back in words. It decides nothing about
 * who the sender is or where the content goes; the service next to the check-in does that.
 */

export interface AForward {
  providerId: string | null;
  fromAddress: string;
  fromName: string | null;
  /** The assistant address it was sent to, and the organisation slug that address means. */
  toAddress: string;
  organisationSlug: string;
  subject: string | null;
  body: string | null;
  /** True where the message says it is automatic: a bounce, an out-of-office, a list. Never answered. */
  automatic: boolean;
  receivedAt: Date;
  attachments: InboundAttachmentMeta[];
  /** Every attachment the message carried, up to a larger limit. A senior person's material takes all of these; a check-in takes the first ten. */
  allAttachments: InboundAttachmentMeta[];
  /** How many more were attached than even that, so it is said and never quietly cut. */
  beyondTheLimit: number;
}

const MOST_ATTACHMENTS = 10;
const MOST_FOR_A_SENIOR_PERSON = 40;

function theAddressesIn(d: any): string[] {
  const out: string[] = [];
  for (const field of [d?.to, d?.cc]) {
    for (const one of Array.isArray(field) ? field : field ? [field] : []) if (typeof one === 'string') out.push(whoSentIt(one).address);
  }
  return out;
}

function sayingItIsAutomatic(d: any, from: string): boolean {
  const h = d?.headers ?? {};
  const get = (k: string) => String((Array.isArray(h) ? h.find((x: any) => String(x?.name).toLowerCase() === k)?.value : h[k] ?? h[k.replace(/(^|-)(\w)/g, (_m: string, a: string, b: string) => a + b.toUpperCase())]) ?? '');
  if (/^(?!no$)\S+/i.test(get('auto-submitted')) || /bulk|list|junk/i.test(get('precedence'))) return true;
  return /^(?:no-?reply|do-?not-?reply|mailer-daemon|postmaster)@/i.test(from);
}

/** Reads one `email.received` body. Null when nothing in it is sent to an assistant's address, or it has no sender. */
export function whatAForwardIs(event: any, env: Record<string, string | undefined> = process.env): AForward | null {
  const d = event?.data ?? {};
  const { address, name } = whoSentIt(d.from);
  if (!address.includes('@')) return null;
  const to = whichOrganisationAmongThese(theAddressesIn(d), env);
  if (!to) return null;
  const when = d.created_at ?? event?.created_at;
  const receivedAt = when ? new Date(when) : new Date();
  const everyAttachment: any[] = Array.isArray(d.attachments) ? d.attachments : [];
  const meta = (a: any, i: number): InboundAttachmentMeta => ({
    id: typeof a?.id === 'string' ? a.id : null,
    fileName: String(a?.filename ?? a?.file_name ?? `attachment-${i + 1}`).replace(/[\\/\0]/g, '_').slice(0, 200),
    mimeType: String(a?.content_type ?? a?.contentType ?? 'application/octet-stream'),
    size: typeof a?.size === 'number' ? a.size : null,
    contentBase64: typeof a?.content === 'string' ? a.content : null,
  });
  const allAttachments = everyAttachment.slice(0, MOST_FOR_A_SENIOR_PERSON).map(meta);
  const attachments = allAttachments.slice(0, MOST_ATTACHMENTS);
  return {
    providerId: typeof d.email_id === 'string' ? d.email_id : null,
    fromAddress: address,
    fromName: name,
    toAddress: to.address,
    organisationSlug: to.slug,
    subject: typeof d.subject === 'string' ? d.subject.slice(0, 500) : null,
    body: readableBody(d.text, d.html),
    automatic: sayingItIsAutomatic(d, address),
    receivedAt: Number.isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
    attachments,
    allAttachments,
    beyondTheLimit: Math.max(0, everyAttachment.length - MOST_FOR_A_SENIOR_PERSON),
  };
}

/**
 * ONE HASH FOR "THE SAME THING SENT TWICE", whatever id the provider gave it: who sent it, what it
 * says and what was attached. A person who forwards the same report twice has sent it once.
 */
export function theHashOfAForward(parts: { fromAddress: string; subject: string | null; body: string | null; fileHashes: string[] }): string {
  const h = crypto.createHash('sha256');
  h.update(parts.fromAddress.toLowerCase()).update('\0').update((parts.subject ?? '').trim()).update('\0').update((parts.body ?? '').replace(/\s+/g, ' ').trim()).update('\0').update([...parts.fileHashes].sort().join(','));
  return h.digest('hex');
}

export function theHashOfBytes(bytes: Buffer): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

/** The text a forwarded message is kept as when it becomes a document on a check-in: what it was, who sent it, and the words. Context, never somebody's account. */
export function theMessageAsAFile(f: Pick<AForward, 'fromAddress' | 'fromName' | 'subject' | 'body' | 'receivedAt'>): { fileName: string; text: string } {
  const day = f.receivedAt.toISOString().slice(0, 10);
  return {
    fileName: `Email forwarded on ${day}.txt`,
    text: [`Subject: ${f.subject ?? '(no subject)'}`, `Sent by: ${f.fromName ?? f.fromAddress}`, `Date: ${day}`, '', f.body ?? ''].join('\n'),
  };
}

export const theSubjectOfOurReply = (subject: string | null): string => {
  const s = (subject ?? '').trim();
  if (!s) return 'Thank you for your message';
  return /^re:/i.test(s) ? s : `Re: ${s}`;
};

/* ---- What a person reads. Plain, full sentences; no colons joining pieces; no labels on anybody. ---- */

export function aFirstName(name: string | null | undefined): string {
  const first = (name ?? '').trim().split(/\s+/)[0] ?? '';
  return first && !first.includes('@') ? first : '';
}

const hello = (first: string) => (first ? `Hello ${first},` : 'Hello,');

/** What was heard in the voice notes in the mail: the ones that could not be read, and the phrases the transcriber was unsure of. Said once, in plain words. */
export interface WhatWasHeard { couldNotHear: string[]; unsure: string[] }
export const NOTHING_TO_SAY_ABOUT_VOICE: WhatWasHeard = { couldNotHear: [], unsure: [] };

export function whatWeSayWhenItWasKept(first: string, checkIn: string, files: string[], couldNotOpen: string[], readBack: string | null, voice: WhatWasHeard = NOTHING_TO_SAY_ABOUT_VOICE): string {
  const lines = [hello(first), ''];
  lines.push(`Thank you. I have read what you sent and added it to your check-in "${checkIn}".${files.length ? ` That includes ${aList(files)}.` : ''}`);
  if (couldNotOpen.length) lines.push(`I could not open ${aList(couldNotOpen)}. Please send ${couldNotOpen.length === 1 ? 'it' : 'them'} again as a PDF, a Word file or plain text.`);
  for (const f of voice.couldNotHear) lines.push(theVoiceNoteInTheMail(f));
  for (const u of voice.unsure) lines.push(u);
  if (readBack) lines.push('', readBack);
  lines.push('', 'I will not ask again about anything you have already sent me. You do not need to sign in to anything. You can just reply to this email.');
  return lines.join('\n');
}

/** Their reply was an answer in the check-in, as a WhatsApp message is: the check-in's own reply, and how to carry on. */
export function whatWeSayToTheirAnswer(first: string, reply: string): string {
  return [hello(first), '', reply.trim(), '', 'You can just reply to this email.'].join('\n');
}

/** Several check-ins are open, so nothing is added until the person says which. What they sent is kept. */
export function whatWeSayWhenWeNeedToKnowWhich(first: string, labels: string[]): string {
  return [
    hello(first), '',
    'Thank you. You have more than one check-in open, and I do not want to guess which one this belongs to. Which is it for?', '',
    ...labels.map((l, i) => `${i + 1}. ${l}`), '',
    'Reply to this email with the number or the name. I have kept what you sent, and I will add it to that check-in as soon as you tell me.',
  ].join('\n');
}

/**
 * WHICH ONE THEY MEANT, from the first thing they wrote back (quoted text and the earlier thread are not read): its number in the list we sent,
 * or exactly one check-in's name. Anything else is not an answer, and nothing is guessed.
 */
export function whichOneDidTheySay<T extends { label: string }>(reply: string | null, open: T[]): T | null {
  const firstLine = (reply ?? '').split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith('>') && !/^on .{3,80} wrote:?$/i.test(l)) ?? '';
  if (!firstLine) return null;
  const n = /^\d{1,2}\.?$/.test(firstLine) ? Number(firstLine.replace('.', '')) : NaN;
  if (Number.isInteger(n) && n >= 1 && n <= open.length) return open[n - 1];
  const named = open.filter((c) => firstLine.toLowerCase().includes(c.label.toLowerCase()));
  return named.length === 1 ? named[0] : null;
}

export function whatWeSayWhenNothingIsOpen(first: string): string {
  return [hello(first), '', 'Thank you. You have no check-in open right now, so I have not added what you sent to anything.', 'When your next check-in opens, send it to me again and I will put it straight in.'].join('\n');
}

export function whatWeSayWhenWeCannotTellWhoItIs(organisationName: string | null): string {
  return [
    'Hello,',
    '',
    `Thank you for writing. I could not tell which person at ${organisationName || 'the organisation'} this address belongs to, so I have not kept anything you sent, and I have not used it.`,
    'Please write to me again from the email address your organisation has for you. If you are not sure which address that is, ask the person who set up Groundwork for your team.',
  ].join('\n');
}

function aList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
