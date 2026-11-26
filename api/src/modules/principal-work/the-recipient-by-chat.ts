/**
 * "SEND IT TO THE MANAGING DIRECTOR TOO" (Ebele, increment 6b; plan sections 14.3 and 19). She can name one more person who may be sent the final year-end
 * files, by saying so in chat, in a message, or in a voice note. The model reads who she means (the-work-reader.ts); what happens next is held by code,
 * because it is about who is sent her files:
 *   - only she can name one, and only she can say yes. The person who acts for her is told that plainly, and nothing is written;
 *   - what she asked is said back (who, at which address, and what they would get), and nothing is added until she says yes;
 *   - an address outside her own office is said to be outside, and needs her clear yes as well;
 *   - the person is added through the one function that adds a recipient (year-end/the-year-end-delivery.ts authoriseARecipient), never any other way.
 * A question that is waiting is a row in the year-end log, so a restart loses nothing and her yes can only answer what was really asked.
 */
import { A_RECIPIENT_SAID_BACK, authoriseARecipient, ONLY_SHE_CAN_NAME_A_RECIPIENT } from '../year-end/the-year-end-delivery';
import { writeItOnce } from '../year-end/the-year-end-log';

export const WHICH_ADDRESS = (who: string) => `I do not have an address for ${who}. Which address should I use?`;
export const WHICH_OF_THESE = (who: string, found: { name: string; email: string }[]) => `More than one person could be ${who}: ${found.map((f) => `${f.name} at ${f.email}`).join(', or ')}. Which one do you mean?`;
export const OUTSIDE_YOUR_OFFICE = (email: string) => `${email} is outside your own office, so I need a clear yes from you before I add it.`;
export const NOT_ADDED = 'Thank you. I have not added anyone.';
export const NOTHING_WAITING_TO_ADD = 'I am not waiting for an answer about adding anyone, so I have not added anybody.';

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const DAY = 86_400_000;
const domainOf = (email: string | null | undefined) => String(email ?? '').split('@')[1]?.toLowerCase() ?? '';
const without = (who: string) => who.toLowerCase().replace(/^(?:the|our|my)\s+/, '').trim();

export interface ARecipientAsk { organizationId: string; principalUserId: string; principalFirst: string; speaker: { userId: string; isPrincipal: boolean }; now: Date }

/** Who she means, found on the roster by name or by title. Only people with an address count. */
async function whoOnTheRosterIs(prisma: any, organizationId: string, who: string, notThem: string[]): Promise<{ name: string; email: string; title: string | null }[]> {
  const w = without(who);
  if (!w) return [];
  const people: any[] = (await prisma.person?.findMany?.({ where: { organizationId, active: true } }).catch(() => [])) ?? [];
  return people
    .filter((p) => p.email && !notThem.includes(String(p.email).toLowerCase()))
    .filter((p) => [p.displayName, [p.givenName, p.familyName].filter(Boolean).join(' '), p.title].filter(Boolean).some((x: string) => { const t = x.toLowerCase(); return t === w || t.includes(w) || (w.includes(t) && t.length >= 4); }))
    .map((p) => ({ name: p.displayName ?? ([p.givenName, p.familyName].filter(Boolean).join(' ') || String(p.email).split('@')[0]), email: String(p.email).toLowerCase(), title: p.title ?? null }));
}

type APending = { id: string; kind: 'say' | 'need'; subject: string; at: Date; data: any };

/** The question she has not answered, if one is waiting, and not older than three days. The newest wins. */
export async function theQuestionWaiting(prisma: any, principalUserId: string, now: Date): Promise<APending | null> {
  const asked: any[] = (await prisma.yearEndLog.findMany({ where: { principalUserId, kind: 'asked', subject: { startsWith: 'recipient:' } }, orderBy: { at: 'desc' } })) ?? [];
  for (const r of asked) {
    if (now.getTime() - new Date(r.at).getTime() > 3 * DAY) continue;
    const answered = await prisma.yearEndLog.findFirst({ where: { principalUserId, kind: 'told', subject: `answer:${r.subject}` } });
    if (!answered) return { id: r.id, kind: String(r.subject).startsWith('recipient:say:') ? 'say' : 'need', subject: r.subject, at: new Date(r.at), data: r.data ?? {} };
  }
  return null;
}
const close = (prisma: any, a: { organizationId: string; principalUserId: string; pending: APending; now: Date; detail: string }) =>
  writeItOnce(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: 'told', subject: `answer:${a.pending.subject}`, detail: a.detail, at: a.now });

/** Says it back and waits. Used when she names somebody, and when she answers the question about which address or which person. */
async function sayItBack(prisma: any, a: ARecipientAsk & { name: string; email: string; title: string | null; who: string }): Promise<string> {
  const me: any = await prisma.user.findUnique({ where: { id: a.principalUserId }, select: { email: true } }).catch(() => null);
  const email = a.email.toLowerCase();
  const people: any[] = (await prisma.person?.findMany?.({ where: { organizationId: a.organizationId, active: true } }).catch(() => [])) ?? [];
  const external = domainOf(email) !== domainOf(me?.email) && !people.some((p) => String(p.email ?? '').toLowerCase() === email);
  const label = a.title && a.name !== a.title ? `${a.name} (${a.title})` : a.name;
  await writeItOnce(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: 'asked', subject: `recipient:say:${email}:${a.now.toISOString()}`, recipient: email, data: { name: label, email, external }, at: a.now });
  return `${A_RECIPIENT_SAID_BACK(label, email)}${external ? ` ${OUTSIDE_YOUR_OFFICE(email)}` : ''}`;
}

/** She named somebody. */
export async function hearARecipient(prisma: any, a: ARecipientAsk & { who: string; email: string | null }): Promise<string> {
  if (!a.speaker.isPrincipal) return ONLY_SHE_CAN_NAME_A_RECIPIENT(a.principalFirst);
  const me: any = await prisma.user.findUnique({ where: { id: a.principalUserId }, select: { email: true } }).catch(() => null);
  const given = a.email ?? EMAIL.exec(a.who)?.[0]?.toLowerCase() ?? null;
  if (given) return sayItBack(prisma, { ...a, name: a.who.replace(EMAIL, '').trim() || given, email: given, title: null, who: a.who });
  const found = await whoOnTheRosterIs(prisma, a.organizationId, a.who, [String(me?.email ?? '').toLowerCase()]);
  if (found.length === 1) return sayItBack(prisma, { ...a, name: found[0].name, email: found[0].email, title: found[0].title, who: a.who });
  const spoken = a.who.trim();
  await writeItOnce(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: 'asked', subject: `recipient:need:${without(a.who).replace(/[^a-z0-9]+/g, '-')}:${a.now.toISOString()}`, data: { who: spoken, candidates: found }, at: a.now });
  return found.length > 1 ? WHICH_OF_THESE(spoken, found) : WHICH_ADDRESS(spoken);
}

/** Her reply to a question about who or which address. Null when the reply is not an answer to it (so it is handled as anything else would be). */
export async function hearTheAddress(prisma: any, a: ARecipientAsk & { message: string; pending: APending }): Promise<string | null> {
  if (a.pending.kind !== 'need') return null;
  if (!a.speaker.isPrincipal) return ONLY_SHE_CAN_NAME_A_RECIPIENT(a.principalFirst);
  const email = EMAIL.exec(a.message)?.[0]?.toLowerCase() ?? null;
  const candidates: { name: string; email: string; title: string | null }[] = a.pending.data?.candidates ?? [];
  const m = a.message.trim().toLowerCase();
  const chosen = email ? { name: a.pending.data?.who ?? email, email, title: null } : candidates.filter((c) => m === c.name.toLowerCase() || m.includes(c.name.toLowerCase()) || (c.name.toLowerCase().includes(m) && m.length >= 3))[0] ?? (/^\s*(?:the\s+)?(?:first|1)\b/i.test(m) ? candidates[0] : /^\s*(?:the\s+)?(?:second|2)\b/i.test(m) ? candidates[1] : undefined);
  if (!chosen || (!email && candidates.filter((c) => m.includes(c.name.toLowerCase())).length > 1)) return null;
  await close(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, pending: a.pending, now: a.now, detail: `Answered with ${chosen.email}.` });
  return sayItBack(prisma, { ...a, name: chosen.name, email: chosen.email, title: chosen.title, who: String(a.pending.data?.who ?? chosen.name) });
}

/** Her yes or no to "Shall I add them?". Only hers. A yes from anybody else adds nobody. */
export async function answerTheRecipient(prisma: any, a: ARecipientAsk & { answer: 'yes' | 'no'; pending: APending }): Promise<string | null> {
  if (a.pending.kind !== 'say') return null;
  if (!a.speaker.isPrincipal) return ONLY_SHE_CAN_NAME_A_RECIPIENT(a.principalFirst);
  const { name, email } = a.pending.data as { name: string; email: string };
  await close(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, pending: a.pending, now: a.now, detail: a.answer === 'yes' ? `The answer was yes to ${email}.` : `The answer was no to ${email}.` });
  if (a.answer === 'no') return NOT_ADDED;
  return authoriseARecipient(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, byUserId: a.speaker.userId, firstName: a.principalFirst, email, name, confirmed: true, now: a.now });
}
