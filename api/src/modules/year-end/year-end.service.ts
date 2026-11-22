/**
 * WHERE THE PRINCIPAL'S WORDS ABOUT HER DRAFT ARE HEARD (Fatima, increment 4). Chat and a reply to the mail both come here with the same
 * text, and a voice note's transcript is the same text, so "Add March", "Shorten this", "This is wrong: ...", "This is ready", "Update the
 * draft" and "Send the outstanding list" all act on the one draft. It answers only for the principal and the people she lets act for her,
 * and only when a draft exists; for everybody else it says nothing (null) and the caller carries on with what it was doing, which is how
 * "that is wrong" said by anybody else is still checked as a correction.
 */
import { readARevisionPlainly } from '../principal-work/the-work-reader';
import { theQuietHoursNow } from '../../common/the-clock';
import { Injectable, Optional } from '@nestjs/common';
import { AnthropicService } from '../conversation/anthropic.service';
import { PromptsService } from '../prompts/prompts.service';
import { THE_DRAFT_REQUEST_PROMPT, THE_DRAFT_REQUEST_PROMPT_KEY, mightAskForTheDraft, whatSheMeans, asWhatSheMeans, type WhatSheAsksFor, type WhatSheMeans, type AnExtractor } from './the-draft-request';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { whoIsTheReader } from '../outstanding/a-delegate-acts-for-a-principal';
import { theAssistantsAddress } from '../email/the-assistants-address';
import { ASKS_FOR_THE_REFRESH, approveTheDraft, theAckBeforeTheRevision, latestDraft, readTheChange, refreshTheDraft, reviseTheDraft, theVersionBeingBuilt, type TheDraftRow } from './the-year-end-versions';
import { contactOf, deliverTheFinal, markItToldOnWhatsApp, sendTheDraft, sendTheDraftOnRequest, sendTheRegister, type ThePorts } from './the-year-end-delivery';
import { theRealPorts } from './the-year-end-ports';
import { theStructureSaid } from './her-year-end-record';

export const ASKS_FOR_THE_REGISTER = /^\s*send\s+(?:me\s+)?the\s+outstanding\s+(?:list|register|matters|items)\s*[.!]*\s*$/i;


@Injectable()
export class YearEndService {
  constructor(private readonly prisma: PrismaService, private readonly email: EmailService, @Optional() private readonly whatsapp?: WhatsAppService, @Optional() private readonly engine?: AnthropicService, @Optional() private readonly prompts?: PromptsService) {}

  private ports(): ThePorts {
    return theRealPorts(this.email, this.whatsapp as WhatsAppService, this.prisma);
  }

  /** The cheap look first: nothing is read from the database for a message that is not one of these. */
  static isAboutTheDraft(message: string): boolean {
    return !!readTheChange(message, 2000) || ASKS_FOR_THE_REFRESH.test(message) || ASKS_FOR_THE_REGISTER.test(message) || mightAskForTheDraft(message);
  }

  async handle(a: { organizationId: string; userId: string; message: string; channel: string; now?: Date; ports?: ThePorts }): Promise<string | null> {
    if (!YearEndService.isAboutTheDraft(a.message)) return null;
    const extract: AnExtractor | null = this.engine ? (system, history, schema, options) => (this.engine as any).extract(system, history, schema, options) : null;
    const prompt = (await this.prompts?.getActive(THE_DRAFT_REQUEST_PROMPT_KEY).catch(() => null))?.content ?? THE_DRAFT_REQUEST_PROMPT;
    return handleTheDraftWords(this.prisma, a.ports ?? this.ports(), { ...a, now: a.now ?? theQuietHoursNow(), replyTo: await this.replyTo(a.organizationId), readTheRequest: (m, waiting) => whatSheMeans(m, { extract, prompt, waiting }) });
  }

  private async replyTo(organizationId: string): Promise<string | undefined> {
    const org: any = await (this.prisma as any).organization?.findUnique?.({ where: { id: organizationId }, select: { slug: true } }).catch(() => null);
    return org?.slug ? theAssistantsAddress({ slug: org.slug }) : undefined;
  }
}

/** The whole of it, with the ports given, so a test can run it with the local fakes. */
export async function handleTheDraftWords(
  prisma: any,
  ports: ThePorts,
  a: { organizationId: string; userId: string; message: string; channel: string; now: Date; replyTo?: string; /** What she asks for, read by meaning (the-draft-request.ts). Without it the plain reading is used. */ readTheRequest?: (message: string, waiting?: number | null) => Promise<WhatSheAsksFor | WhatSheMeans> },
): Promise<string | null> {
  /* An assistant who acts for several people names which in her words ("for Ifeoma Obi: ..."); when she names none, she is asked, not dropped into the chat (Fatima round 5). */
  const reader = await whoIsTheReader(prisma, a.organizationId, a.userId, null, a.message);
  if (reader.kind === 'which' && mightAskForTheDraft(a.message)) return `You act for ${reader.names.join(' and ')}. Tell me which one, for example "send Ifeoma's draft".`;
  if (reader.kind !== 'own' && reader.kind !== 'delegate') return null;
  const principalUserId = reader.principalUserId;
  const isPrincipal = reader.kind === 'own';
  const year = a.now.getUTCFullYear();
  const latest = await latestDraft(prisma, { organizationId: a.organizationId, principalUserId, year });
  if (!latest) {
    /* ONLY FOR SOMEBODY WITH A YEAR-END JOB (Batch S round 2, T8). A lead with none asked "can u send me a report" and read "There is no draft yet"; "send it to me" inside a spending setup was taken the same way. With no draft and no job these words are not about a year-end draft, and they go on as before. */
    const job = await Promise.resolve(prisma.persistentJob?.findFirst?.({ where: { organizationId: a.organizationId, principalUserId, kind: 'annual_report' }, select: { id: true } })).catch(() => null);
    if (!job) return null;
    /* Asked for a draft that does not exist yet, she is told so plainly. It used to fall through to the chat, which offered to email "what I said about" something else (Fatima round 3). */
    /* And asked to change one that does not exist yet ("add March to the report"), she is told so, never answered as an instruction to her team (release test of 22 November 2026, #74). */
    if (readTheChange(a.message, year)) return `There is no draft yet, so there is nothing to change. I make the first one when there is something on the record to put in it, and I will email it as soon as it is ready. Tell me then what to change.`;
    const asked = asWhatSheMeans(await (a.readTheRequest ?? ((m: string) => whatSheMeans(m, {})))(a.message, null).catch(() => null)).asks;
    return asked === 'send_draft' ? `There is no draft yet, ${isPrincipal ? 'so I have nothing to send you' : 'so I have nothing to send'}. I make the first one when there is something on the record to put in it, and I will email it as soon as it is ready.` : null;
  }
  const base = { organizationId: a.organizationId, principalUserId, now: a.now, replyTo: a.replyTo };
  const by = { userId: a.userId, isPrincipal };
  const first = latest.content.principalFirstName;

  const emailedNow = async (row: TheDraftRow): Promise<string> => {
    const sent = await sendTheDraft(prisma, ports, { ...base, row, direct: true });
    const o = sent[0]?.outcome;
    /* She asked for it, so this reply is the one message that says it went: the WhatsApp line is not sent as well, now or at night (Batch F, F4; E-1). */
    if (o === 'sent') await markItToldOnWhatsApp(prisma, { ...base, row, kind: 'draft' });
    return o === 'sent' ? `I have emailed version ${row.version} to ${isPrincipal ? 'you' : first}.` : o === 'held' ? `Version ${row.version} is ready and waiting to go to ${isPrincipal ? 'you' : first}. It has not been sent yet.` : o === 'already' ? '' : `I could not email version ${row.version} just now, and I will try again.`;
  };

  /*
   * APPROVE, DECLINE OR NEITHER IS READ BY MEANING, AND DONE BY CODE (fix plan 16 November, group 4). "I approve it", "I approve version 5", "yes, send it" and
   * "not yet" are the model's reading (rule 4); the approval itself is fixed, because it is something approved and sent: only the principal's own word, only the
   * version she names or, naming none, the newest, only a version she was sent (approveTheDraft). The phrase list that approved only "This is ready" is gone.
   * A message that is a change ("Add March") or a plain refresh or register request is read as before, and is never an approval.
   */
  const waiting = latest.status === 'draft' || latest.status === 'revised' ? latest.version : null;
  const typedAChange = !!readTheChange(a.message, year);
  const meant = typedAChange || ASKS_FOR_THE_REGISTER.test(a.message) || ASKS_FOR_THE_REFRESH.test(a.message)
    ? asWhatSheMeans('none')
    : asWhatSheMeans(await (a.readTheRequest ?? ((m: string) => whatSheMeans(m, {})))(a.message, waiting).catch(() => null));
  if (meant.asks === 'approve') {
    const r = await approveTheDraft(prisma, { ...base, by, firstName: first, named: meant.version });
    if (!r.approved || r.approved.status === 'final') return r.said;
    if (r.said.includes('already approved')) { const f = await deliverTheFinal(prisma, ports, { ...base, row: r.approved, direct: true }); return `${r.said} ${f.said}`; }
    const f = await deliverTheFinal(prisma, ports, { ...base, row: r.approved, direct: true });
    return `Thank you. I have marked version ${r.approved.version} as approved. ${f.said}`;
  }
  if (meant.asks === 'decline') return `Understood. I have not approved version ${latest.version}, and nothing has gone out as final. Tell me what to change, or say that you approve it when it is ready.`;
  if (ASKS_FOR_THE_REGISTER.test(a.message)) return (await sendTheRegister(prisma, ports, { ...base, row: latest, toName: isPrincipal ? 'you' : first })).said;
  if (ASKS_FOR_THE_REFRESH.test(a.message)) {
    const r = await refreshTheDraft(prisma, { ...base, by, channel: a.channel });
    if (r.version === latest.version) return r.said;
    const row = (await latestDraft(prisma, { organizationId: a.organizationId, principalUserId, year }))!;
    return `${r.said} ${await emailedNow(row)}`.trim();
  }
  /* The change she can ask for is read first, as before. Then, in any words, a request to be sent the draft or the list goes to the lifecycle's own sender (round 2, C2). */
  const change = readTheChange(a.message, year);
  if (!change) {
    const asked = meant.asks;
    /* The newest version at the moment it is sent, read again here: reading her words takes the model a few seconds, and an "update the draft" a moment before can have made a newer one in that time (D17: "Send me the draft" sent version 1 minutes after version 2). */
    const newest = (await latestDraft(prisma, { organizationId: a.organizationId, principalUserId, year })) ?? latest;
    if (asked === 'send_list') return (await sendTheRegister(prisma, ports, { ...base, row: newest, toName: isPrincipal ? 'you' : first })).said;
    if (asked === 'send_draft') {
      /* A version being built now is the one she will be sent: the one before is not sent again (Batch F, F4; E-1). */
      const coming = theVersionBeingBuilt(principalUserId);
      if (coming && coming > newest.version) return `I am making version ${coming} now, from the record as it is today. I will email it to ${isPrincipal ? 'you' : first} as soon as it is ready, so I have not sent version ${newest.version} again.`;
      return sendTheDraftOnRequest(prisma, ports, { ...base, row: newest, toName: isPrincipal ? 'you' : first });
    }
    if (asked === 'structure') return theStructureSaid(newest, isPrincipal ? 'you' : first);
  }
  /* A change asked for in ordinary words, typed or in a mail, is read as a voice note is: "make the presentation shorter" is the same change as "shorten this" (Fatima round 3). */
  /* Rewriting the report takes the model most of a minute. She is told at once that it is being done, so she is not left with nothing on her phone (Fatima round 7). */
  const asked = readARevisionPlainly(a.message, year);
  if (a.channel !== 'email' && asked) {
    const me = await contactOf(prisma, a.organizationId, a.userId);
    if (me.phone) await ports.whatsapp.send({ organizationId: a.organizationId, phone: me.phone, text: theAckBeforeTheRevision(asked.kind, latest.version + 1), kind: 'year-end-revision-ack' }).catch(() => undefined);
  }
  const r = await reviseTheDraft(prisma, { ...base, by, channel: a.channel, message: a.message, interpret: readARevisionPlainly });
  if (!r || !r.version) return r ? r.said : null;
  const row = (await latestDraft(prisma, { organizationId: a.organizationId, principalUserId, year }))!;
  return `${r.said} ${await emailedNow(row)}`.trim();
}
