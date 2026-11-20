/**
 * HANDING THE FILES OVER, AND SAYING ONLY WHAT HAPPENED (Fatima, increment 4).
 *
 * WHO MAY RECEIVE THEM. The draft goes to the principal only. The final goes to the principal and to anybody she has named and confirmed
 * (`year_end_recipients`). Somebody who acts for her may prepare and revise but is never a recipient unless she named them herself, and
 * nobody can name a recipient but her. Sending the files to the principal is sending them to the person who asked for them, which is the
 * product's rule for mail.
 *
 * ONCE. One send key for one job, one version, one kind and one person. The key is claimed as "queued" before the mail goes; a second try
 * finds it and does nothing. A mail the door refused or the provider failed gives its claim back, so it can be tried again. The one door
 * (email.service.ts) records "sent" itself, whether the mail went at once or was held for the morning.
 */
import { oneFile, theFiles, THE_DRAFT_SET, THE_FINAL_SET } from './the-year-end-files';
import { draftReadyEmail, finalEmail, DRAFT_READY_WHATSAPP, FINAL_WHATSAPP } from './the-year-end-words';
import { markTheYearEndFilesSent, sendKeyOf, writeItOnce } from './the-year-end-log';
import { markItFinal, type TheDraftRow } from './the-year-end-versions';
import type { AnAttachment } from '../email/attachments';

export interface TheMailPort {
  sendTheYearEndFiles(to: string, subject: string, text: string, files: AnAttachment[], sendKey: string, replyTo?: string, answeringNow?: boolean): Promise<'sent' | 'held' | 'suppressed'>;
}
export interface TheWhatsAppPort {
  send(a: { organizationId: string; phone: string; text: string; kind: string }): Promise<{ sent: boolean }>;
}
export interface ThePorts { email: TheMailPort; whatsapp: TheWhatsAppPort }

export interface TheContact { email: string | null; firstName: string; phone: string | null }

export async function contactOf(prisma: any, organizationId: string, userId: string): Promise<TheContact> {
  const user: any = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true } }).catch(() => null);
  const person: any = await prisma.person.findFirst({ where: { organizationId, linkedUserId: userId }, select: { phone: true } }).catch(() => null);
  return { email: user?.email ?? null, firstName: user?.firstName ?? 'there', phone: person?.phone ?? null };
}

/** Who may be sent which files. The principal for a draft; the principal and the people she named, for the final. */
export async function recipientsFor(prisma: any, a: { organizationId: string; principalUserId: string; kind: 'draft' | 'final' }): Promise<string[]> {
  const me = await contactOf(prisma, a.organizationId, a.principalUserId);
  const out = me.email ? [me.email.trim().toLowerCase()] : [];
  if (a.kind === 'final') {
    const named: any[] = (await prisma.yearEndRecipient.findMany({ where: { principalUserId: a.principalUserId, revokedAt: null } })) ?? [];
    for (const r of named) if (!out.includes(r.email)) out.push(r.email);
  }
  return out;
}

export const ONLY_SHE_CAN_NAME_A_RECIPIENT = (first: string) => `Only ${first} can say who else may be sent the year-end files. I have not added anyone.`;
export const A_RECIPIENT_SAID_BACK = (who: string, email: string) => `You want me to send the final year-end files to ${who} at ${email} as well as to you. Shall I add them? Nothing is sent to them until you say yes.`;
export const A_RECIPIENT_ADDED = (who: string) => `I have added ${who}. They will get the final files when you approve them, and the drafts stay with you only.`;

/** Written only on her own confirmed yes. A delegate's call is refused whatever it says. */
export async function authoriseARecipient(prisma: any, a: { organizationId: string; principalUserId: string; byUserId: string; firstName: string; email: string; name: string | null; confirmed: boolean; now: Date }): Promise<string> {
  if (a.byUserId !== a.principalUserId) return ONLY_SHE_CAN_NAME_A_RECIPIENT(a.firstName);
  if (!a.confirmed) return A_RECIPIENT_SAID_BACK(a.name ?? a.email, a.email);
  const email = a.email.trim().toLowerCase();
  await prisma.yearEndRecipient.upsert({
    where: { principalUserId_email: { principalUserId: a.principalUserId, email } },
    create: { organizationId: a.organizationId, principalUserId: a.principalUserId, email, name: a.name, confirmedAt: a.now },
    update: { revokedAt: null, name: a.name, confirmedAt: a.now },
  });
  return A_RECIPIENT_ADDED(a.name ?? email);
}

type Sent = { to: string; outcome: 'sent' | 'held' | 'suppressed' | 'already' | 'failed' };

async function sendOne(prisma: any, ports: ThePorts, a: { organizationId: string; principalUserId: string; row: TheDraftRow; kind: 'draft' | 'final' | 'register'; day?: string; /** She asked for this just now: it goes now, in quiet hours too. */ direct?: boolean; to: string; subject: string; text: string; files: AnAttachment[]; replyTo?: string; now: Date }): Promise<Sent> {
  const sendKey = sendKeyOf({ principalUserId: a.principalUserId, year: a.row.year, version: a.row.version, kind: a.kind, recipient: a.to, day: a.day });
  const claimed = await writeItOnce(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: 'queued', subject: sendKey, version: a.row.version, recipient: a.to, detail: `${a.files.length} files`, at: a.now });
  if (!claimed) return { to: a.to, outcome: 'already' };
  const giveItBack = () => prisma.yearEndLog.deleteMany({ where: { principalUserId: a.principalUserId, kind: 'queued', subject: sendKey } }).catch(() => undefined);
  try {
    const outcome = await ports.email.sendTheYearEndFiles(a.to, a.subject, a.text, a.files, sendKey, a.replyTo, !!a.day || !!a.direct);
    if (outcome === 'sent') await markTheYearEndFilesSent(prisma, sendKey);
    if (outcome === 'suppressed') {
      await giveItBack();
      await writeItOnce(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: 'suppressed', subject: `${sendKey}:${a.now.toISOString().slice(0, 10)}`, version: a.row.version, recipient: a.to, detail: 'The mail was not sent: the person has asked not to be mailed, or it already went.', at: a.now });
    }
    return { to: a.to, outcome };
  } catch (err: any) {
    await giveItBack();
    await writeItOnce(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: 'failed', subject: `${sendKey}:${a.now.toISOString()}`, version: a.row.version, recipient: a.to, detail: String(err?.message ?? err).slice(0, 300), at: a.now });
    return { to: a.to, outcome: 'failed' };
  }
}

/** The draft, with both drafts attached, to the principal. Sent at most once for a version. */
export async function sendTheDraft(prisma: any, ports: ThePorts, a: { organizationId: string; principalUserId: string; row: TheDraftRow; replyTo?: string; now: Date; direct?: boolean; /** A day, when she asked for it: one send for each day, so asking again the same day does not send it twice. */ day?: string }): Promise<Sent[]> {
  const to = await recipientsFor(prisma, { ...a, kind: 'draft' });
  const { subject, text } = draftReadyEmail(a.row.content, a.row.version);
  const files = await theFiles(THE_DRAFT_SET, a.row.content, { version: a.row.version, status: a.row.status });
  const out: Sent[] = [];
  for (const t of to) out.push(await sendOne(prisma, ports, { ...a, kind: 'draft', to: t, subject, text, files }));
  return out;
}

/** "Please send me the draft", in any words: the same draft, with its files, to her only, once for each day, so asking twice on one day does not send it twice. */
export async function sendTheDraftOnRequest(prisma: any, ports: ThePorts, a: { organizationId: string; principalUserId: string; row: TheDraftRow; replyTo?: string; now: Date; toName: string }): Promise<string> {
  const day = a.now.toISOString().slice(0, 10);
  const sent = await sendTheDraft(prisma, ports, { ...a, day });
  const o = sent[0]?.outcome;
  const subject = draftReadyEmail(a.row.content, a.row.version).subject;
  if (o === 'sent') return `I have emailed version ${a.row.version} of the report and presentation to ${a.toName}, with the files attached.`;
  if (o === 'held') return `Version ${a.row.version} is ready and waiting to go to ${a.toName}. It has not been sent yet, and it goes in the morning.`;
  if (o === 'already') return `I already emailed version ${a.row.version} to ${a.toName} today, with the subject “${subject}”. I have not sent it a second time.`;
  if (!sent.length) return `I have no email address for ${a.toName}, so there is nowhere to send version ${a.row.version}. Please tell me where it should go.`;
  return `I could not send version ${a.row.version} to ${a.toName} just now. Nothing was sent, and I will not say it was.`;
}

/**
 * The line on WhatsApp, only once the email has been sent, so "I've emailed both to you" is true when she reads it. Told once per version.
 * Returns whether it was sent now.
 */
export async function tellHerOnWhatsApp(prisma: any, ports: ThePorts, a: { organizationId: string; principalUserId: string; row: TheDraftRow; kind: 'draft' | 'final'; now: Date }): Promise<boolean> {
  const sent: any[] = (await prisma.yearEndLog.findMany({ where: { principalUserId: a.principalUserId, kind: 'sent', version: a.row.version, subject: { contains: `:${a.row.year}:v${a.row.version}:${a.kind}:` } } })) ?? [];
  if (!sent.length) return false;
  const me = await contactOf(prisma, a.organizationId, a.principalUserId);
  if (!me.phone) return false;
  const first = await writeItOnce(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: 'told', subject: `${a.kind}-ready:${a.row.year}:v${a.row.version}:whatsapp`, version: a.row.version, at: a.now });
  if (!first) return false;
  const text = a.kind === 'draft' ? DRAFT_READY_WHATSAPP(me.firstName, a.row.version) : FINAL_WHATSAPP(me.firstName);
  const res = await ports.whatsapp.send({ organizationId: a.organizationId, phone: me.phone, text, kind: a.kind === 'draft' ? 'year-end-draft-ready' : 'year-end-final' }).catch(() => ({ sent: false }));
  if (!res.sent) await prisma.yearEndLog.deleteMany({ where: { principalUserId: a.principalUserId, kind: 'told', subject: `${a.kind}-ready:${a.row.year}:v${a.row.version}:whatsapp` } }).catch(() => undefined);
  return !!res.sent;
}

export const NOT_APPROVED_YET = (version: number) => `Version ${version} has not been approved, so I have not sent a final. Nothing is sent as final until you approve it.`;

/** The final files, from the approved row as it was kept. Refused for anything that is not approved. The row becomes final only when the mail to her was sent. */
export async function deliverTheFinal(prisma: any, ports: ThePorts, a: { organizationId: string; principalUserId: string; row: TheDraftRow; replyTo?: string; now: Date; direct?: boolean }): Promise<{ said: string; sent: Sent[] }> {
  if (a.row.status !== 'approved' && a.row.status !== 'final') return { said: NOT_APPROVED_YET(a.row.version), sent: [] };
  const to = await recipientsFor(prisma, { ...a, kind: 'final' });
  const { subject, text } = finalEmail(a.row.content, a.row.version);
  const files = await theFiles(THE_FINAL_SET, a.row.content, { version: a.row.version, status: 'final' });
  const sent: Sent[] = [];
  for (const t of to) sent.push(await sendOne(prisma, ports, { ...a, kind: 'final', to: t, subject, text, files }));
  const principal = (await contactOf(prisma, a.organizationId, a.principalUserId)).email?.toLowerCase();
  const hers = sent.find((s) => s.to === principal);
  const wentToHer = hers?.outcome === 'sent' || hers?.outcome === 'already' && (await prisma.yearEndLog.findFirst({ where: { principalUserId: a.principalUserId, kind: 'sent', subject: sendKeyOf({ principalUserId: a.principalUserId, year: a.row.year, version: a.row.version, kind: 'final', recipient: principal ?? '' }) } }));
  if (wentToHer) await markItFinal(prisma, a.row);
  const said = hers?.outcome === 'sent' ? `The final files for version ${a.row.version} have been sent to you.`
    : hers?.outcome === 'held' ? `The final files for version ${a.row.version} are ready and waiting to go, and they have not been sent yet. They are held until the morning.`
    : hers?.outcome === 'already' ? `The final files for version ${a.row.version} were already queued, so I have not sent them again.`
    : `The final files for version ${a.row.version} have not been sent. ${hers?.outcome === 'failed' ? 'The mail could not be sent, and I will try again.' : 'The mail was not sent.'}`;
  return { said, sent };
}

/** "Send the outstanding list": the editable register and its readable summary, from the newest version, to her only. Once a day for one version. */
export async function sendTheRegister(prisma: any, ports: ThePorts, a: { organizationId: string; principalUserId: string; row: TheDraftRow; now: Date }): Promise<{ said: string }> {
  const to = await recipientsFor(prisma, { ...a, kind: 'draft' });
  const c = a.row.content;
  const files = [await oneFile('register_xlsx', c, { version: a.row.version, status: a.row.status }), await oneFile('register_pdf', c, { version: a.row.version, status: a.row.status })];
  const text = [`Hello ${c.principalFirstName},`, `I've attached the outstanding list from version ${a.row.version} of your year-end work, as a spreadsheet you can edit and a short summary you can read. Each line says which record it is taken from, or that it is unverified.`, 'Groundwork'].join('\n\n');
  const out: Sent[] = [];
  for (const t of to) out.push(await sendOne(prisma, ports, { ...a, kind: 'register', day: a.now.toISOString().slice(0, 10), to: t, subject: 'Your outstanding list', text, files }));
  const o = out[0]?.outcome;
  return { said: o === 'sent' ? `I have emailed you the outstanding list from version ${a.row.version}.` : o === 'held' ? `The outstanding list from version ${a.row.version} is ready and waiting to go. It has not been sent yet.` : o === 'already' ? `I already emailed you the outstanding list for version ${a.row.version} today, and nothing has changed since.` : 'I could not send the outstanding list just now.' };
}
