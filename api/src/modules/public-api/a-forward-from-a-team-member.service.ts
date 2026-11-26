import { YearEndService } from '../year-end/year-end.service';
import { ReportsOnRequestService } from '../reports-on-request/reports-on-request.service';
import { ExecutiveOnboardingService } from '../executive-onboarding/executive-onboarding.service';
import { AssistantService } from '../assistant/assistant.service';
import { AskService } from '../ask/ask.service';
import { asATextMessage } from './a-reply-reads-as-a-text-message';
import { WHAT_WOULD_YOU_LIKE_TO_ADD } from '../conversation/add-something';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { DocumentsService } from '../documents/documents.service';
import { ConversationService } from '../conversation/conversation.service';
import { TRANSCRIBER, GeminiTranscriber, theNamesThisOrganisationUses, isAudio, isThisWhatYouSaidInTheMail, type Transcriber } from '../voice/the-transcriber';
import { AnthropicService } from '../conversation/anthropic.service';
import { WhatsAppForAnOrganisationService } from './whatsapp-for-an-organisation.service';
import { GroundworkEvents } from '../../common/events';
import { theAssistantsAddress } from '../email/the-assistants-address';
import { INBOUND_MAIL_CLIENT, InboundMailClient, ResendInboundMailClient } from '../email/inbound-mail-client';
import {
  AForward, aFirstName, theHashOfAForward, theHashOfBytes, theMessageAsAFile, theSubjectOfOurReply, whatAForwardIs,
  whatWeSayToTheirAnswer, whatWeSayWhenItWasKept, whatWeSayWhenNothingIsOpen, whatWeSayWhenWeCannotTellWhoItIs, whatWeSayWhenWeNeedToKnowWhich, whichOneDidTheySay, type WhatWasHeard,
} from '../email/a-forward-from-a-team-member';

export type WhatBecameOfAForward = 'ignored' | 'already seen' | 'not matched' | 'kept' | 'nothing open' | 'asked which' | 'year-end' | 'her words' | 'kept for her' | 'kept for a team member' | 'report' | 'ask';

/** A question about which check-in stands for three days; a later reply that names one is read as its answer. */
const THE_QUESTION_STANDS_FOR_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * A TEAM MEMBER'S FORWARDED MAIL IS THEIR CHECK-IN (Fatima, increment 1).
 *
 * Mail to assistant+<slug>@myground.work from an address that belongs to exactly one person on that organisation's roster (or one verified
 * account) is read as that person's own. Its words and files go to their open check-in as DOCUMENTS, through the same upload their WhatsApp
 * document takes, shared only with the people in that check-in. A document is context and never somebody's account, and nothing in a
 * forwarded message is ever acted on: no instruction in it reaches a model as an instruction, because nothing here runs a model on it.
 * (The check-in's own read-back of an attached document does, and it is fixed wording that treats the file as something to describe.)
 *
 * Not the company's inbox. hello@ keeps its own path and its rule that it is never evidence.
 */
/** What somebody just wrote in a reply, without the mail they were replying to (the "On ... wrote:" line and the quoted lines under it). */
export const theNewWordsOnly = (body: string): string => String(body ?? '').split(/\r?\n(?:On .{5,200}wrote:|-{2,}\s*Original Message|>)/i)[0].trim();

@Injectable()
export class AForwardFromATeamMemberService {
  private readonly logger = new Logger(AForwardFromATeamMemberService.name);
  private readonly client: InboundMailClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly documents: DocumentsService,
    private readonly conversation: ConversationService,
    private readonly whatsapp: WhatsAppForAnOrganisationService,
    @Optional() @Inject(INBOUND_MAIL_CLIENT) client?: InboundMailClient,
    /* The same transcriber a voice note on WhatsApp goes through. */
    @Optional() @Inject(TRANSCRIBER) transcriber?: Transcriber,
    @Optional() anthropic?: AnthropicService,
    /* The principal's words about her year-end draft, said in a reply to the mail it came in (year-end/year-end.service.ts). Last and optional, so what builds this positionally still compiles. */
    @Optional() private readonly yearEnd?: YearEndService,
    /* A senior person's forwards, and the replies of the people she named (executive-onboarding). Last and optional, so what builds this positionally still compiles. */
    @Optional() private readonly executive?: ExecutiveOnboardingService,
    /* A report they asked for: what they forward or attach is kept for it, and their words take it a step on (reports-on-request, S8). Last and optional, so what builds this positionally still compiles. */
    @Optional() private readonly reportsOnRequest?: ReportsOnRequestService,
    /* Ask, the same lanes a WhatsApp message with nothing open goes to. Last and optional, so what builds this positionally still compiles. */
    @Optional() private readonly assistant?: AssistantService,
    /* Ask for somebody who signs in: the same door the panel uses, which knows who they are, a guest included. */
    @Optional() private readonly ask?: AskService,
  ) {
    this.client = client ?? new ResendInboundMailClient();
    this.transcriber = transcriber ?? new GeminiTranscriber(anthropic as AnthropicService);
  }
  private readonly transcriber: Transcriber;

  @OnEvent(GroundworkEvents.MAIL_FOR_AN_ASSISTANT)
  async onMail(e: { event: any }): Promise<void> {
    try {
      await this.handle(e?.event);
    } catch (err: any) {
      /* Never the webhook's problem: a 500 makes the provider retry, which is how one failure becomes many. */
      this.logger.warn(`Could not handle a forward to an assistant: ${err?.message}`);
    }
  }

  async handle(event: any): Promise<WhatBecameOfAForward> {
    const f = whatAForwardIs(event);
    if (!f || f.automatic) return 'ignored';
    const org = await this.prisma.organization.findUnique({ where: { slug: f.organisationSlug }, select: { id: true, name: true, slug: true } });
    if (!org) return 'ignored';
    const db = this.prisma as any;

    /* A redelivery is not a second copy. */
    if (f.providerId && (await db.inboundForward.findUnique({ where: { providerId: f.providerId }, select: { id: true } }))) return 'already seen';

    const who = await this.whoSentIt(org.id, f.fromAddress);
    if (!who) return this.cannotTellWho(org, f);

    /* Where the webhook carried no words, they are fetched; a message with neither words nor files has nothing to keep. */
    if (!f.body && f.providerId) {
      const fetched = await this.client.body(f.providerId);
      if (fetched) f.body = (fetched.text ?? '').trim() || null;
    }

    /* Somebody on the roster with no account yet is joined the way WhatsApp joins them (one function owns it). */
    const userId = who.userId ?? (who.personId ? await this.whatsapp.theirCheckInAccount(org.id, who.personId).catch(() => null) : null);
    const open = userId ? await this.whatsapp.openCheckInsFor(org.id, userId) : [];

    /* THEIR ANSWER TO "WHICH ONE?" A short reply that names one of the check-ins we listed adds what they sent before to it. */
    if (!f.attachments.length && open.length > 1) {
      const held = await db.inboundForward.findFirst({ where: { organizationId: org.id, fromAddress: f.fromAddress, status: 'WHICH_ONE' }, orderBy: { receivedAt: 'desc' } });
      const meant = held && Date.now() - new Date(held.receivedAt).getTime() < THE_QUESTION_STANDS_FOR_MS ? whichOneDidTheySay(f.body, open) : null;
      if (held && meant && userId) {
        const earlier: AForward = { ...f, providerId: held.providerId, subject: held.subject, body: held.body, receivedAt: new Date(held.receivedAt), attachments: Array.isArray(held.attachments) ? held.attachments.map((a: any) => ({ id: a.id ?? null, fileName: a.fileName, mimeType: a.mimeType, size: null })) : [] };
        const files = await this.fetchTheFiles(earlier);
        return this.keep(org, who, userId, meant, earlier, files, held);
      }
    }

    /* A REPORT THEY ASKED FOR (reports-on-request, S8): asked for by mail, or what they forward and attach while one is open, and their yes to its outline. */
    if (userId && this.reportsOnRequest) {
      const said = await this.reportsOnRequest.byEmail({ organizationId: org.id, userId, subject: f.subject, newWords: theNewWordsOnly(f.body ?? ''), wholeBody: f.body, hasFiles: f.allAttachments.length > 0, files: async () => (await this.fetchTheFiles(f, true)).map((x) => ({ name: x.fileName, mimeType: x.mimeType, bytes: x.bytes })) }).catch(() => null);
      if (said) { await this.email.sendTheAssistantsReply(f.fromAddress, theSubjectOfOurReply(f.subject), said, theAssistantsAddress(org)); return 'report'; }
    }

    /* A REPLY ABOUT THE YEAR-END DRAFT revises the same draft, and is not check-in material. Only her own words, with nothing attached; what she is replying to (the quoted mail) is cut off first. */
    if (userId && this.yearEnd && !f.attachments.length && f.body) {
      const said = await this.yearEnd.handle({ organizationId: org.id, userId, message: theNewWordsOnly(f.body), channel: 'email' }).catch(() => null);
      if (said) { await this.email.sendTheAssistantsReply(f.fromAddress, theSubjectOfOurReply(f.subject), said, theAssistantsAddress(org)); return 'year-end'; }
    }

    /*
     * A SENIOR PERSON'S FORWARD IS HER MATERIAL, AND SOMEBODY SHE NAMED WHO WRITES BACK IS TAKING PART (executive-onboarding). Kept whole with its
     * originals, and answered once for the batch. Nothing in a forward is read as an instruction, and only her own words above the forwarded
     * part can answer for her.
     */
    if (this.executive) {
      const hers = await this.executive.receiveForward({
        organizationId: org.id, userId, hasOpenCheckIn: async () => open.length > 0, fromAddress: f.fromAddress, providerId: f.providerId, subject: f.subject, body: f.body, receivedAt: f.receivedAt, beyondTheLimit: f.beyondTheLimit,
        loadFiles: async () => (await this.fetchTheFiles(f, true)).map((x) => ({ fileName: x.fileName, mimeType: x.mimeType, bytes: x.bytes })),
      });
      if (hers) {
        if (hers.reply) await this.email.sendTheAssistantsReply(f.fromAddress, theSubjectOfOurReply(f.subject), hers.reply, theAssistantsAddress(org));
        return hers.became;
      }
    }

    const files = await this.fetchTheFiles(f);
    if (!f.body && !files.length) return 'ignored';

    const contentHash = theHashOfAForward({ fromAddress: f.fromAddress, subject: f.subject, body: f.body, fileHashes: files.map((x) => x.hash ?? `missing:${x.fileName}`) });
    const before = await db.inboundForward.findFirst({ where: { organizationId: org.id, personId: who.personId, contentHash } });
    if (before?.status === 'KEPT' || before?.status === 'WHICH_ONE') return 'already seen';

    const first = aFirstName(who.firstName);
    const subject = theSubjectOfOurReply(f.subject);
    const meta = files.map((x) => ({ id: x.id, fileName: x.fileName, mimeType: x.mimeType, hash: x.hash }));
    const base = { organizationId: org.id, personId: who.personId, userId, providerId: f.providerId, contentHash, fromAddress: f.fromAddress, toAddress: f.toAddress, subject: f.subject, body: f.body, attachments: meta, receivedAt: f.receivedAt };

    /*
     * THEIR OWN WORDS ARE A MESSAGE TO ASK, as on WhatsApp (whereThisGoes): a request, a question, a yes. With a check-in open, a reply in
     * its thread ("Re:") is their answer there (keep, below), and a new mail is a new message: Amina's "Which payments are overdue?" went
     * into her own check-in and was told "I need to understand your own part" (evaluation, 24 November 2026). A forward is material.
     */
    if ((!open.length || !/^\s*re:/i.test(f.subject ?? '')) && !files.length && f.body && !/^\s*fwd?:/i.test(f.subject ?? '')) {
      const words = theNewWordsOnly(f.body);
      const reply = userId && this.ask ? await this.ask.ask({ userId, email: f.fromAddress, organizationId: org.id }, { message: words }).catch(() => null)
        : who.personId && this.assistant ? await this.assistant.respondOnWhatsApp(org.id, who.personId, words).catch(() => null) : null;
      const answered = (reply as any)?.blocks ? asATextMessage(reply as any) : '';
      if (answered) { await this.email.sendTheAssistantsReply(f.fromAddress, subject, answered, theAssistantsAddress(org)); return 'ask'; }
    }
    if (!open.length || !userId) {
      if (!before) await db.inboundForward.create({ data: { ...base, status: 'NO_CHECK_IN' } }).catch((err: any) => this.logger.warn(`Storing a forward failed: ${err?.message}`));
      await this.email.sendTheAssistantsReply(f.fromAddress, subject, whatWeSayWhenNothingIsOpen(first), theAssistantsAddress(org));
      return 'nothing open';
    }
    /* More than one open, and nothing ties this to one: asked, as WhatsApp asks, and what they sent is kept until they say. */
    if (open.length > 1) {
      await db.inboundForward.create({ data: { ...base, status: 'WHICH_ONE' } }).catch((err: any) => this.logger.warn(`Storing a forward failed: ${err?.message}`));
      await this.email.sendTheAssistantsReply(f.fromAddress, subject, whatWeSayWhenWeNeedToKnowWhich(first, open.map((c) => c.label)), theAssistantsAddress(org));
      return 'asked which';
    }
    return this.keep(org, who, userId, open[0], f, files, before);
  }

  private async fetchTheFiles(f: AForward, every = false): Promise<Array<{ id: string | null; fileName: string; mimeType: string; bytes: Buffer | null; hash: string | null }>> {
    const files: Array<{ id: string | null; fileName: string; mimeType: string; bytes: Buffer | null; hash: string | null }> = [];
    for (const a of every ? f.allAttachments : f.attachments) {
      const bytes = await this.client.attachment(f.providerId, a);
      files.push({ id: a.id, fileName: a.fileName, mimeType: a.mimeType, bytes, hash: bytes ? theHashOfBytes(bytes) : null });
    }
    return files;
  }

  /** Puts the words, the files and the voice notes of one forward on one check-in, and says back what was done. */
  private async keep(
    org: { id: string; name: string; slug: string },
    who: { personId: string | null; firstName: string | null },
    userId: string,
    current: { id: string; label: string },
    f: AForward,
    files: Array<{ id: string | null; fileName: string; mimeType: string; bytes: Buffer | null; hash: string | null }>,
    before: any,
  ): Promise<WhatBecameOfAForward> {
    const db = this.prisma as any;
    const replyTo = theAssistantsAddress(org);
    const first = aFirstName(who.firstName);
    const subject = theSubjectOfOurReply(f.subject);
    const checkIn = await this.prisma.checkIn.findUnique({ where: { id: current.id }, select: { groundId: true, status: true } });
    /*
     * THEIR OWN REPLY IS THEIR ANSWER, AS ON WHATSAPP (evaluation, 23 November 2026). Eric answered the check-in's question by email, and his
     * words were filed as "a document, an email from Eric Kariuki", and the next question asked for an amount already in his file. A reply
     * with words and nothing attached goes into the conversation the way a WhatsApp message does. A forward, and anything with files, is
     * material and is kept below.
     */
    const theirWords = /^\s*fwd?:/i.test(f.subject ?? '') || files.length ? '' : theNewWordsOnly(f.body ?? '');
    if (theirWords && checkIn) {
      const opened: any = checkIn.status === 'NOT_STARTED' ? await this.conversation.open(current.id, userId, WHAT_WOULD_YOU_LIKE_TO_ADD) : null;
      const r: any = await this.conversation.sendMessage(opened?.checkInId ?? current.id, userId, theirWords);
      const data = {
        organizationId: org.id, personId: who.personId, userId, providerId: f.providerId,
        contentHash: theHashOfAForward({ fromAddress: f.fromAddress, subject: f.subject, body: f.body, fileHashes: [] }),
        fromAddress: f.fromAddress, toAddress: f.toAddress, subject: f.subject, body: f.body, attachments: [], receivedAt: f.receivedAt,
        status: 'KEPT', groundId: checkIn.groundId, checkInId: current.id, documentIds: [],
      };
      if (before) await db.inboundForward.update({ where: { id: before.id }, data: { status: 'KEPT', groundId: data.groundId, checkInId: data.checkInId } });
      else await db.inboundForward.create({ data }).catch((err: any) => this.logger.warn(`Storing a forward failed: ${err?.message}`));
      await this.email.sendTheAssistantsReply(f.fromAddress, subject, whatWeSayToTheirAnswer(first, String(r?.reply ?? '')), replyTo);
      return 'kept';
    }
    const documentIds: string[] = [];
    const kept: string[] = [];
    const couldNotOpen: string[] = [];
    const voice: WhatWasHeard = { couldNotHear: [], unsure: [] };
    /** `listedAs` is how the person is told it was kept; null for the message's own words, which are not a file they attached. */
    const offer = async (fileName: string, mimeType: string, bytes: Buffer | null, id: string | null, listedAs: string | null = fileName) => {
      if (!bytes) { couldNotOpen.push(fileName); return; }
      /* A voice note goes through the same transcriber as one on WhatsApp. Its words are kept as the person's own, in a text file named for it; the audio is kept as a reference only. */
      if (isAudio(mimeType, fileName)) {
        const heard = await this.transcriber.transcribe({ buffer: bytes, mimeType, fileName, names: await theNamesThisOrganisationUses(this.prisma, org.id) });
        await Promise.resolve((this.prisma as any).voiceNote?.create?.({ data: { organizationId: org.id, personId: who.personId, userId, channel: 'email', reference: [f.providerId, id].filter(Boolean).join('/') || fileName, mimeType, fileName, transcript: heard.ok ? heard.text : null, wasUnsure: heard.ok && heard.unclear.length > 0 } })).catch(() => undefined);
        if (!heard.ok) { voice.couldNotHear.push(fileName); return; }
        if (heard.unclear.length) voice.unsure.push(isThisWhatYouSaidInTheMail(fileName, heard.unclear));
        listedAs = `the voice note ${fileName}`;
        bytes = Buffer.from(`Voice note ${fileName}, sent by ${f.fromName ?? f.fromAddress}\n\n${heard.text}`, 'utf8');
        mimeType = 'text/plain';
        fileName = `Voice note ${fileName.replace(/\.[^.]+$/, '')}.txt`;
      }
      try {
        const doc: any = await this.documents.upload(checkIn!.groundId, userId, { originalname: fileName, mimetype: mimeType, buffer: bytes, size: bytes.length } as any, false, undefined, { sharedWithTheCheckIn: true });
        if (doc?.couldNotRead) { couldNotOpen.push(fileName); return; }
        if (doc?.id) documentIds.push(doc.id);
        if (listedAs) kept.push(listedAs);
      } catch {
        couldNotOpen.push(fileName);
      }
    };
    if (f.body) {
      const m = theMessageAsAFile(f);
      await offer(m.fileName, 'text/plain', Buffer.from(m.text, 'utf8'), null, null);
    }
    for (const x of files) await offer(x.fileName, x.mimeType, x.bytes, x.id);

    const meta = files.map((x) => ({ id: x.id, fileName: x.fileName, mimeType: x.mimeType, hash: x.hash }));
    const data = {
      organizationId: org.id, personId: who.personId, userId, providerId: f.providerId,
      contentHash: theHashOfAForward({ fromAddress: f.fromAddress, subject: f.subject, body: f.body, fileHashes: files.map((x) => x.hash ?? `missing:${x.fileName}`) }),
      fromAddress: f.fromAddress, toAddress: f.toAddress, subject: f.subject, body: f.body, attachments: meta, receivedAt: f.receivedAt,
      status: 'KEPT', groundId: checkIn!.groundId, checkInId: current.id, documentIds,
    };
    if (before) await db.inboundForward.update({ where: { id: before.id }, data: { status: 'KEPT', groundId: data.groundId, checkInId: data.checkInId, documentIds, attachments: meta } });
    else await db.inboundForward.create({ data }).catch((err: any) => this.logger.warn(`Storing a forward failed: ${err?.message}`));

    /* What is in it said back, as it is for a document sent on WhatsApp, and used as context for what is asked next. */
    const readBack: string | null = documentIds.length
      ? await Promise.resolve().then(() => this.conversation.documentReceived(current.id, userId)).then((r: any) => String(r?.reply ?? '').trim() || null).catch(() => null)
      : null;
    await this.email.sendTheAssistantsReply(f.fromAddress, subject, whatWeSayWhenItWasKept(first, current.label, kept, couldNotOpen, readBack, voice), replyTo);
    return 'kept';
  }

  /**
   * EXACTLY ONE PERSON, OR NOBODY. A roster entry carrying the address is the organisation's own word for whose it is; failing that, one
   * verified account. Two entries with one address, or none, is not a match, and nothing is guessed. Scoped to the organisation by the query.
   */
  private async whoSentIt(organizationId: string, address: string): Promise<{ personId: string | null; userId: string | null; firstName: string | null } | null> {
    const same = { equals: address, mode: 'insensitive' as const };
    const people = await this.prisma.person.findMany({ where: { organizationId, active: true, email: same }, select: { id: true, linkedUserId: true, givenName: true, displayName: true, userName: true } });
    if (people.length > 1) return null;
    if (people.length === 1) {
      const p = people[0];
      const account = p.linkedUserId ? null : await this.prisma.user.findFirst({ where: { organizationId, email: same, deletedAt: null }, select: { id: true } });
      return { personId: p.id, userId: p.linkedUserId ?? account?.id ?? null, firstName: p.givenName ?? p.displayName ?? null };
    }
    const accounts = await this.prisma.user.findMany({ where: { organizationId, email: same, deletedAt: null, isEmailVerified: true }, select: { id: true, firstName: true } });
    if (accounts.length !== 1) return null;
    const entry = await this.prisma.person.findFirst({ where: { organizationId, linkedUserId: accounts[0].id }, select: { id: true } });
    /* An account with no roster entry is still one person, and its own id is what the check-in knows. */
    return { personId: entry?.id ?? null, userId: accounts[0].id, firstName: accounts[0].firstName };
  }

  /** Nothing from the message is stored. They are told once, kindly, and a second attempt gets no second letter. */
  private async cannotTellWho(org: { id: string; name: string; slug: string }, f: AForward): Promise<WhatBecameOfAForward> {
    const db = this.prisma as any;
    const told = await db.inboundForward.findFirst({ where: { organizationId: org.id, fromAddress: f.fromAddress, status: 'NOT_MATCHED' }, select: { id: true } });
    if (told) return 'not matched';
    await db.inboundForward.create({ data: { organizationId: org.id, providerId: f.providerId, fromAddress: f.fromAddress, toAddress: f.toAddress, status: 'NOT_MATCHED', receivedAt: f.receivedAt } })
      .catch((err: any) => this.logger.warn(`Noting an unmatched sender failed: ${err?.message}`));
    await this.email.sendTheAssistantsReply(f.fromAddress, 'Thank you for your message', whatWeSayWhenWeCannotTellWhoItIs(org.name), theAssistantsAddress(org));
    return 'not matched';
  }
}
