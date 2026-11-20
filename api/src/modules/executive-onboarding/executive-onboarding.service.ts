/**
 * THE REAL SEAMS BEHIND ONBOARDING WITHOUT REGISTRATION (Fatima, increment 5). Mail goes through the one mail door (EmailService), WhatsApp through the
 * one gate (WhatsAppService.sendFor: the 24-hour window, the approved templates, the night, the day's one message, STOP), and files are read by the
 * same code an upload is (DocumentsService.readForMaterial). Nothing here reaches either provider another way.
 *
 * The decisions are in the plain files next to this one, each testable with local fakes; this class only joins them to Nest and to the channels.
 */
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Cron } from '@nestjs/schedule';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { DocumentsService } from '../documents/documents.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { TRANSCRIBER, GeminiTranscriber, COULD_NOT_FETCH_THE_VOICE_NOTE, COULD_NOT_HEAR_THE_VOICE_NOTE, type Transcriber } from '../voice/the-transcriber';
import { YearEndService } from '../year-end/year-end.service';
import { addAnExecutive, theAddressForHer, type AddAnExecutive, type TheAddition } from './onboard-an-executive';
import { theQuietHoursNow } from '../../common/the-clock';
import { releaseTheIntroductionHeldForANumber, retryTheHeldIntroductions, type TheOnboardingPorts } from './the-introduction-delivery';
import { answerTheQuietBatches, type TheAcknowledgementPorts } from './the-first-picture';
import { herOwnWords, keepWhatWasForwarded, type TheIntakePorts } from './the-intake';
import { hearHer, whoIsSpeakingForWhom, type TheHearingPorts } from './her-words';
import { whichOneIsItFor } from './an-assistant-for-several-principals';
import { PrincipalWork } from '../principal-work/principal-work';
import { ReaderWithAModel, readerWithoutAModel, type TheWorkReader } from '../principal-work/the-work-reader';
import { keepATeamMembersReply } from './a-team-members-reply';
import { closeWhatTheyAnswered } from './information-gaps';
import { theTeamMemberWhoWroteFrom, type TheTeamPorts } from './team-introductions';
import type { TeamLoopService } from '../team-loop/team-loop.service';

export type AForwardForHer = {
  organizationId: string;
  userId: string | null;
  /** Asked only when it is needed: whether this person has a check-in open, which is then answered by the check-in. */
  hasOpenCheckIn: () => Promise<boolean>;
  fromAddress: string;
  providerId: string | null;
  subject: string | null;
  body: string | null;
  receivedAt: Date;
  beyondTheLimit: number;
  /** Fetches the files only when they are going to be kept. */
  loadFiles: () => Promise<{ fileName: string; mimeType: string; bytes: Buffer | null }[]>;
};

@Injectable()
export class ExecutiveOnboardingService {
  private readonly logger = new Logger(ExecutiveOnboardingService.name);
  private readonly transcriber: Transcriber;
  private readonly reader: TheWorkReader;
  private theWork?: PrincipalWork;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly whatsapp: WhatsAppService,
    private readonly documents: DocumentsService,
    private readonly moduleRef: ModuleRef,
    @Optional() @Inject(TRANSCRIBER) transcriber?: Transcriber,
    @Optional() anthropic?: AnthropicService,
    @Optional() private readonly yearEnd?: YearEndService,
    /** What a team member's reply means as their check-in, their private help, her standing instructions and corrections (team-loop). Last and optional, so what builds this positionally still compiles. */
    @Optional() @Inject('TEAM_LOOP') private readonly teamLoop?: TeamLoopService,
  ) {
    this.transcriber = transcriber ?? new GeminiTranscriber(anthropic as AnthropicService);
    this.reader = anthropic ? new ReaderWithAModel(anthropic) : readerWithoutAModel;
  }

  private get db(): any { return this.prisma as any; }

  /** Mail goes through the one door; WhatsApp through the one gate. A message held for the night is queued there and counts as held here, never as sent. */
  ports(): TheHearingPorts {
    return {
      theWork: (a) => this.work().hear(a),
      mind: this.teamLoop?.theMind ?? null,
      theInstruction: this.teamLoop ? (a) => this.teamLoop!.hearAnInstruction(a) : undefined,
      email: { send: (a) => this.email.sendTheIntroduction(a.to, a.subject, a.text, a.replyTo, a.sendKey) },
      whatsapp: {
        send: async (a) => {
          /* An introduction is the customer's own script, so it rides whole inside the first-contact template (the template's own words cap at 800 and would cut it). WhatsApp takes one line, so the paragraphs follow each other. */
          const whole = a.text.replace(/\s+/g, ' ').trim();
          const r = await this.whatsapp.sendFor(a.organizationId, a.phone, a.text, { kind: a.kind as any, ...(a.kind === 'introduction' || a.kind === 'team-introduction' ? { paramsFor: { groundwork_first_contact: [whole] } } : {}) });
          return { sent: !!r.sent, error: r.error };
        },
      },
      theirCheckInAccount: async (organizationId, personId) => {
        /* The existing join-from-roster logic, found when it is needed, so this service does not depend on the one that depends on it. */
        const { WhatsAppForAnOrganisationService } = await import('../public-api/whatsapp-for-an-organisation.service');
        const joiner = this.moduleRef.get(WhatsAppForAnOrganisationService, { strict: false });
        return joiner.theirCheckInAccount(organizationId, personId);
      },
    };
  }

  /** The payments, the Assembly report, voice changes to the draft, recipients and the briefings (principal-work/), built from what this service already holds. */
  private work(): PrincipalWork {
    return (this.theWork ??= new PrincipalWork({
      prisma: this.db,
      ports: {
        email: {
          reply: (a) => this.email.sendTheAssistantsReply(a.to, a.subject, a.text, a.replyTo),
          ask: async (a) => this.email.sendTheRoutineMessageByEmail(a.to, a.subject, a.text, null, null, undefined, (await theAddressForHer(this.db, a.organizationId).catch(() => undefined)) ?? undefined),
        },
        whatsapp: { send: async (a) => { const r = await this.whatsapp.sendFor(a.organizationId, a.phone, a.text, { kind: a.kind as any }); return { sent: !!r.sent, error: r.error }; } },
      },
      yearEnd: this.yearEnd ?? null,
      reader: this.reader,
      replyTo: async (organizationId) => (await theAddressForHer(this.db, organizationId)) ?? undefined,
      /* What waits for her to approve is read the way Ask reads it, found when it is needed so this service does not depend on the one that depends on it. */
      waitingForHer: async (organizationId, principalUserId) => {
        const { AssistantService } = await import('../assistant/assistant.service');
        const asks: any = this.moduleRef.get(AssistantService, { strict: false });
        return ((await asks.waitingForYouToDecide(organizationId, principalUserId)) as any[]).map((w) => ({ ref: w.ref, firstName: w.firstName, thing: w.thing }));
      },
    }));
  }

  private intakePorts(): TheIntakePorts {
    return { transcriber: this.transcriber, read: async (f) => this.documents.readForMaterial({ originalname: f.fileName, mimetype: f.mimeType, buffer: f.bytes }) };
  }

  private acknowledgementPorts(): TheAcknowledgementPorts {
    return {
      email: { reply: (a) => this.email.sendTheAssistantsReply(a.to, a.subject, a.text, a.replyTo) },
      whatsapp: { send: async (a) => { const r = await this.whatsapp.sendFor(a.organizationId, a.phone, a.text, { kind: a.kind as any }); return { sent: !!r.sent, error: r.error }; } },
      narrate: this.teamLoop ? (facts) => this.teamLoop!.narrate(facts) : undefined,
      theirCheckIn: this.teamLoop ? (a) => this.teamLoop!.theirCheckIn(a) : undefined,
      anUnclearMatter: this.teamLoop ? (texts) => this.teamLoop!.anUnclearMatter(texts) : undefined,
    };
  }

  /** An administrator adds a senior person. The permission is checked in here, in the backend. */
  add(args: Omit<AddAnExecutive, 'now'>): Promise<TheAddition> {
    return addAnExecutive(this.db, this.ports(), { ...args, now: theQuietHoursNow() });
  }

  /** Her words, from chat, a reply to the mail, WhatsApp or a voice note's transcript. Null when they are not about any of this. */
  async hearHer(a: { organizationId: string; userId: string | null; message: string }): Promise<string | null> {
    const said = await hearHer(this.db, this.ports(), { ...a, now: theQuietHoursNow() });
    if (said) return said;
    /* Not about her setup or a standing instruction (read first, in her-words.ts): a correction of what her team told Groundwork (team-loop). */
    return this.teamLoop ? this.teamLoop.hearACorrection(a).catch(() => null) : null;
  }

  /**
   * A forward arrives. Returns what became of it, or null when it is not hers, so the check-in's own handling carries on.
   *   her words      she (or her assistant) said something this code answers: "slow down", yes to the question, names and contacts.
   *   kept for her   it is her material, answered once for the batch.
   *   kept for a team member   somebody she named wrote back, and that is their participation.
   */
  async receiveForward(a: AForwardForHer): Promise<{ became: 'her words' | 'kept for her' | 'kept for a team member'; reply: string | null } | null> {
    const now = theQuietHoursNow();
    let speaking = await whoIsSpeakingForWhom(this.db, a.organizationId, a.userId);
    /* Somebody who acts for several senior people, and does not say which one this is for, is asked once (an-assistant-for-several-principals.ts). */
    let namedAmongSeveral = false;
    if (!speaking && a.userId && !(await a.hasOpenCheckIn())) {
      const several = await whichOneIsItFor(this.db, { organizationId: a.organizationId, userId: a.userId, text: [a.subject, herOwnWords(a.body, a.subject)].filter(Boolean).join(' '), now, withFiles: (await a.loadFiles()).length > 0 });
      if (several?.kind === 'ask') return { became: 'her words', reply: several.say };
      if (several?.kind === 'go') { speaking = await whoIsSpeakingForWhom(this.db, a.organizationId, a.userId, several.principalUserId); namedAmongSeveral = true; }
    }
    if (speaking && (speaking.speaker.isPrincipal || !(await a.hasOpenCheckIn()))) {
      const own = namedAmongSeveral ? '' : herOwnWords(a.body, a.subject);
      if (own) {
        const said = await hearHer(this.db, this.ports(), { organizationId: a.organizationId, userId: a.userId, message: own, now, channel: 'email' });
        if (said) return { became: 'her words', reply: said };
      }
      await keepWhatWasForwarded(this.db, this.intakePorts(), { organizationId: a.organizationId, principalUserId: speaking.principalUserId, fromUserId: speaking.speaker.userId, fromAddress: a.fromAddress, channel: 'email', providerId: a.providerId, subject: a.subject, body: a.body, receivedAt: a.receivedAt, files: await a.loadFiles(), beyondTheLimit: a.beyondTheLimit, now });
      /* Somebody who acts for her, asked about something that was missing, has answered it by sending this. */
      if (!speaking.speaker.isPrincipal) await closeWhatTheyAnswered(this.db, { organizationId: a.organizationId, email: a.fromAddress, now });
      return { became: 'kept for her', reply: null };
    }
    const contact = speaking ? null : await theTeamMemberWhoWroteFrom(this.db, a.organizationId, a.fromAddress).catch(() => null);
    if (contact && !(await a.hasOpenCheckIn())) {
      /* Short words that ask for help, or say a record is wrong, are answered now, privately; the rest is kept and read as their check-in. */
      const files = await a.loadFiles();
      const helped = !files.length && a.body && this.teamLoop ? await this.teamLoop.hearATeamMember({ organizationId: a.organizationId, contact, text: a.body }).catch(() => null) : null;
      if (helped) return { became: 'kept for a team member', reply: helped };
      await keepATeamMembersReply(this.db, this.intakePorts(), { organizationId: a.organizationId, contact, fromAddress: a.fromAddress, channel: 'email', providerId: a.providerId, subject: a.subject, body: a.body, receivedAt: a.receivedAt, files, beyondTheLimit: a.beyondTheLimit, now });
      return { became: 'kept for a team member', reply: null };
    }
    return null;
  }

  /**
   * A WhatsApp message from her, her assistant, or somebody she named. Null when it is none of those, or when it belongs to a check-in that is
   * open, so the check-in's own handling carries on. A reply of null inside the answer means it was kept and will be answered once for the batch.
   */
  async onWhatsApp(a: { organizationId: string; from: string; userId: string | null; personId: string | null; hasOpenCheckIn: () => Promise<boolean>; arrived: any; fetchMedia: (mediaId: string) => Promise<{ buffer: Buffer; mimeType: string } | null> }): Promise<{ reply: string | null } | null> {
    const now = theQuietHoursNow();
    const phone = WhatsAppService.normalize(a.from);
    const speaking = await whoIsSpeakingForWhom(this.db, a.organizationId, a.userId);
    const person: any = a.personId ? await this.db.person.findUnique({ where: { id: a.personId }, select: { id: true } }).catch(() => null) : null;
    const contact = !speaking && person ? await this.db.outreachContact.findFirst({ where: { organizationId: a.organizationId, personId: person.id, state: 'introduced' } }).catch(() => null) : null;
    if (!speaking && !contact) return null;
    /* Writing to this number first is what lets a held introduction go: it goes now, once, before anything else is said. */
    const introductionsReleased = await releaseTheIntroductionHeldForANumber(this.db, this.ports(), { phone, now, normalise: WhatsAppService.normalize }).catch((err) => { this.logger.warn(`Releasing the held introduction failed: ${err?.message}`); return 0; });
    if (!speaking?.speaker.isPrincipal && (await a.hasOpenCheckIn())) return null;

    let text: string | null = a.arrived.kind === 'text' ? a.arrived.text : null;
    let files: { fileName: string; mimeType: string; bytes: Buffer | null }[] = [];
    if (a.arrived.kind === 'media') {
      const got = await a.fetchMedia(a.arrived.mediaId).catch(() => null);
      /* A voice note that could not be fetched is said so, and asked for again: never kept in silence (Fatima round 3, the senior person gets an answer to every voice note). */
      if (a.arrived.what === 'recording' && !got && speaking) return { reply: COULD_NOT_FETCH_THE_VOICE_NOTE };
      if (a.arrived.what === 'recording' && got) {
        const heard = await this.transcriber.transcribe({ buffer: got.buffer, mimeType: got.mimeType || a.arrived.mimeType, fileName: a.arrived.fileName }).catch(() => ({ ok: false as const }));
        if (!heard.ok && speaking) return { reply: COULD_NOT_HEAR_THE_VOICE_NOTE };
        /* What she said aloud is heard as her words first: a change to her draft, a go-ahead, names. Anything else is kept as material. */
        if (heard.ok && speaking) {
          /* A change to her draft, said aloud, is read as what she meant and made to the current draft. Where the transcriber was unsure, she is asked first and nothing changes yet. */
          const revised = await this.work().hearAVoiceNote({ organizationId: a.organizationId, userId: a.userId!, text: heard.text, unclear: heard.unclear, channel: 'whatsapp', now }).catch(() => null);
          if (revised) return { reply: revised };
          if (!heard.unclear.length) {
            const spoken = (await this.yearEnd?.handle({ organizationId: a.organizationId, userId: a.userId!, message: heard.text, channel: 'whatsapp' }).catch(() => null)) ?? (await hearHer(this.db, this.ports(), { organizationId: a.organizationId, userId: a.userId, message: heard.text, now, channel: 'whatsapp' }));
            if (spoken) return { reply: spoken };
          }
        }
      }
      files = [{ fileName: a.arrived.fileName, mimeType: a.arrived.mimeType, bytes: got?.buffer ?? null }];
      text = a.arrived.caption || null;
    } else if (a.arrived.kind !== 'text') return null;

    if (speaking) {
      /* Plain words that are not about her setup go on to Ask and the check-in as they always did. */
      if (a.arrived.kind === 'text') {
        const said = await hearHer(this.db, this.ports(), { organizationId: a.organizationId, userId: a.userId, message: a.arrived.text, now, channel: 'whatsapp' });
        if (said) return { reply: said };
        /* Her first words to this number are what let her introduction go, and the introduction is the answer to them: a second hello from the chat, seconds later, answers nothing more (Fatima round 4, N26). */
        return introductionsReleased > 0 && speaking.speaker.isPrincipal ? { reply: null } : null;
      }
      await keepWhatWasForwarded(this.db, this.intakePorts(), { organizationId: a.organizationId, principalUserId: speaking.principalUserId, fromUserId: speaking.speaker.userId, fromAddress: phone, channel: 'whatsapp', providerId: null, subject: null, body: text, receivedAt: now, files, beyondTheLimit: 0, now });
      /* A voice note is answered at once, with when the rest follows: she is not left wondering for three minutes whether it was heard (Fatima round 5). */
      return { reply: a.arrived.what === 'recording' ? 'I have your voice note and I am listening to it now. I will tell you what I made of it in a few minutes.' : null };
    }
    if (a.arrived.kind === 'text' && this.teamLoop) {
      const helped = await this.teamLoop.hearATeamMember({ organizationId: a.organizationId, contact, text: a.arrived.text }).catch(() => null);
      if (helped) return { reply: helped };
    }
    await keepATeamMembersReply(this.db, this.intakePorts(), { organizationId: a.organizationId, contact, fromAddress: contact.email ?? phone, channel: 'whatsapp', providerId: null, subject: null, body: text, receivedAt: now, files, beyondTheLimit: 0, now });
    return { reply: null };
  }

  /** Every minute: the batches that have gone quiet are answered once, and the introductions that were held are tried again when their hour has passed. */
  @Cron('* * * * *', { timeZone: 'UTC' })
  async sweep(): Promise<void> {
    await this.prisma.withAdvisoryLock(CronLock.EXECUTIVE_ONBOARDING, async () => {
      const replyTo = (organizationId: string) => theAddressForHer(this.db, organizationId);
      /* The sheets, the weekly report and the voice notes in what she forwarded are read first, so a batch that is only those is answered by what was done with it. */
      const worked = await this.work().readTheQuietBatches(theQuietHoursNow()).catch((err) => { this.logger.warn(`Reading the batches failed: ${err?.message}`); return 0; });
      await this.work().sendWhatIsDue(theQuietHoursNow()).catch((err) => { this.logger.warn(`Sending the standing notes failed: ${err?.message}`); return 0; });
      const answered = await answerTheQuietBatches(this.db, this.acknowledgementPorts(), theQuietHoursNow(), replyTo).catch((err) => { this.logger.warn(`Answering the batches failed: ${err?.message}`); return []; });
      const retried = await retryTheHeldIntroductions(this.db, this.ports(), theQuietHoursNow()).catch((err) => { this.logger.warn(`Retrying the introductions failed: ${err?.message}`); return 0; });
      if (answered.length || retried || worked) this.logger.log(`Answered ${answered.length} batch(es), read ${worked} for work, and sent ${retried} held introduction(s).`);
    });
  }
}
