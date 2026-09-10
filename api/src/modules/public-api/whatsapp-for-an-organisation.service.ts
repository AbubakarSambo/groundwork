import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CheckInStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConversationService } from '../conversation/conversation.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { AssistantService } from '../assistant/assistant.service';
import { DocumentsService } from '../documents/documents.service';
import { ReportsService } from '../reports/reports.service';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import { ACheckInACustomerCanRunService } from './a-check-in-a-customer-can-run.service';
import { asATextMessage } from './a-reply-reads-as-a-text-message';
import { AnOpenCheckIn, sessionHeader, whichOneRows, whichOneAsText, pickedOne, pickedFromText, whatArrived, reportAsText, LANGUAGES_WE_CONVERSE_IN, A_FINISH_WORD, A_GREETING_ALONE } from './a-whatsapp-message-is-routed';

/**
 * WHAT HAPPENS TO A WHATSAPP MESSAGE SENT TO AN ORGANISATION'S NUMBER.
 *
 * The sender is matched to a person on the roster by phone, then to their account. With one check-in
 * open to them, the message is their answer in it. With two or more, they are asked which, as a list
 * they can tap or a number they can type, and the pick is remembered. A photo or a document goes onto
 * the check-in as a document, the same pipeline the app uses. "finish" completes the session and the
 * short report comes back here. With nothing open, the message goes to the assistant. The person's
 * language is read from their first message and the conversation happens in it; the record stays in
 * English.
 */
@Injectable()
export class WhatsAppForAnOrganisationService {
  private readonly logger = new Logger(WhatsAppForAnOrganisationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly conversation: ConversationService,
    private readonly assistant: AssistantService,
    private readonly checkIns: ACheckInACustomerCanRunService,
    private readonly documents: DocumentsService,
    private readonly reports: ReportsService,
    private readonly anthropic: AnthropicService,
  ) {}

  async handle(organizationId: string, body: any): Promise<void> {
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return;
    const from: string = message.from;
    if (!from) return;
    await this.prisma.whatsAppConnection.update({ where: { organizationId }, data: { lastInboundAt: new Date() } }).catch(() => undefined);
    const arrived = whatArrived(message);
    const say = (text: string) => this.whatsapp.sendFor(organizationId, from, text);

    if (arrived.kind === 'other') { await say('I can read text, photos and documents here. Say it in words, or send the file.'); return; }

    const who = await this.whatsapp.whoIsWritingTo(organizationId, from);
    if (!who.personId && !who.userId) {
      await say("This number is not on your organisation's roster yet. Ask your admin to add it, or add it yourself under Settings in Groundwork, then message again.");
      return;
    }
    let userId = who.userId;
    if (!userId && who.personId) {
      /* On the roster, not connected to a sign-in: a different fact from "nothing open", and one the
         person can act on. It used to fall through to "You have no check-in open right now". */
      try { userId = await this.checkIns.actingAs(organizationId, who.personId); } catch { userId = null; }
      if (!userId) {
        await say("This number is on your organisation's roster but is not connected to a Groundwork sign-in yet - ask your admin to link it.");
        return;
      }
    }

    const open = userId ? await this.openCheckInsFor(organizationId, userId) : [];

    /* Nothing open: an invitation waiting, or the assistant. */
    if (!open.length) {
      const waiting = await this.invitationWaitingFor(organizationId, who.personId);
      if (waiting) { await say(`You are invited to "${waiting}" and the invitation has not been accepted yet. Open the email, accept it, then reply here and your answers go straight in.`); return; }
      if (arrived.kind === 'media') { await say('There is no check-in open to put that on. I will message you here when the next one opens; send it again then.'); return; }
      if (who.personId && arrived.kind === 'text') { await say(asATextMessage(await this.assistant.respond(organizationId, who.personId, arrived.text)) || 'Noted.'); return; }
      await say('You have no check-in open right now. I will message you here when the next one is ready.');
      return;
    }

    /* Which one. A pick (tapped or typed) settles it; a remembered pick holds; two or more with neither asks. */
    const thread = await this.prisma.whatsAppThread.findUnique({ where: { organizationId_phone: { organizationId, phone: WhatsAppService.normalize(from) } } }).catch(() => null);
    let current: AnOpenCheckIn | null = null;
    /* A typed number is a pick only while the question is fresh (a-whatsapp-message-is-routed.ts). */
    const picked = arrived.kind === 'pick' ? pickedOne(arrived.id, open) : arrived.kind === 'text' && open.length > 1 ? pickedFromText(arrived.text, open, thread?.pickPendingAt) : null;
    if (picked) {
      current = picked;
      await this.remember(organizationId, from, picked.id);
      if (arrived.kind === 'pick' || /^\s*\d{1,2}\s*$/.test(arrived.kind === 'text' ? arrived.text : '')) {
        /* The pick itself is not an answer. Open it if it is waiting, and say where they are. */
        const opened = await this.openIfWaiting(current, userId!);
        await say(`${sessionHeader(current)}${opened ? `\n\n${opened}` : ' Carry on where you left off.'}`);
        return;
      }
    } else if (thread && open.some((c) => c.id === thread.checkInId)) {
      current = open.find((c) => c.id === thread.checkInId)!;
    } else if (open.length === 1) {
      current = open[0];
      await this.remember(organizationId, from, current.id);
    } else {
      await this.askWhichOne(organizationId, from);
      await this.whatsapp.sendListFor(organizationId, from, 'You have more than one check-in open. Which is this for?', whichOneRows(open), whichOneAsText(open));
      return;
    }

    /* Their language, read once from the first thing they wrote. */
    if (arrived.kind === 'text' && who.personId) await this.readLanguageOnce(current.id, arrived.text);

    /* A photo or a document. */
    if (arrived.kind === 'media') {
      const fetched = await this.whatsapp.fetchMediaFor(organizationId, arrived.mediaId);
      if (!fetched) { await say('I could not fetch that file from WhatsApp. Send it again, or upload it in Groundwork.'); return; }
      const ground = await this.prisma.checkIn.findUnique({ where: { id: current.id }, select: { groundId: true } });
      try {
        const doc: any = await this.documents.upload(ground!.groundId, userId!, { originalname: arrived.fileName, mimetype: fetched.mimeType, buffer: fetched.buffer, size: fetched.buffer.length } as any, false, arrived.caption || undefined);
        await say(`"${arrived.fileName}" is on your check-in${arrived.caption ? ` with your note: ${arrived.caption}` : ''}. ${doc?.whoCanSeeIt ?? 'Only you can see it until you say otherwise.'} Anything it backs up is read against what you said.`);
      } catch (err: any) {
        await say(err?.message ?? 'That file could not be read. A PDF, an image, or a text document works.');
      }
      return;
    }

    if (arrived.kind !== 'text') return;
    const text = arrived.text;

    /*
     * FINISH, MATCHED BEFORE THE STATUS IS LOOKED AT. "finish" on a session not yet opened used to be
     * discarded by the twelve-character guard below; with that guard gone it would have been written
     * into the record as the first answer. Neither is right. Say what is true.
     */
    if (A_FINISH_WORD.test(text) && current.status === 'NOT_STARTED') {
      await say('There is nothing to finish yet - this check-in has not started. Say something and I will open it.');
      return;
    }
    if (A_FINISH_WORD.test(text) && current.status === 'IN_PROGRESS') {
      try {
        await this.conversation.complete(current.id, userId!);
        await this.prisma.whatsAppThread.deleteMany({ where: { organizationId, checkInId: current.id } }).catch(() => undefined);
        await say('Your check-in is complete and on record. Your report follows in a moment.');
        await this.sendTheReport(organizationId, current, userId!, from);
      } catch (e: any) {
        await say(e?.response?.message ?? e?.message ?? 'That could not be completed yet.');
      }
      return;
    }

    /*
     * OPEN IF WAITING, THEN THE ANSWER - AND WHATEVER REFUSES, THE PERSON HEARS IT. The finish branch
     * above was wrapped; this was not. A spent balance, the answer ceiling, a paused or closed ground
     * and an already-complete check-in all throw with a carefully written sentence, and every one of
     * them went to the controller's log-only catch. The person got silence, which on a phone reads as
     * the product being dead. One try, and say() the sentence. The highest-harm line in the slice.
     */
    try {
      let reply = '';
      if (current.status === 'NOT_STARTED') {
        const first = await this.conversation.open(current.id, userId!);
        reply = `${sessionHeader(current)}\n\n${first.reply}`;
        /* A short first answer is still an answer. "Not much yet", "It's blocked", "Behind again" are
           twelve characters or fewer and were thrown away. Only a greeting and nothing else is not
           handed in - matched by a list, not by a length. */
        if (A_GREETING_ALONE.test(text)) { await say(reply); return; }
      }
      const r = await this.conversation.sendMessage(current.id, userId!, text);
      reply = reply ? `${reply}\n\n${r.reply}` : r.reply;
      if (r.sessionComplete) reply += '\n\nThat is enough to close this check-in. Reply "finish" to complete it, or keep going.';
      await say(reply);
    } catch (e: any) {
      const said = e?.response?.message ?? e?.message ?? 'That could not be answered just now. Try again in a moment.';
      await say(Array.isArray(said) ? said.join(' ') : String(said));
    }
  }

  /* --- the report, on the phone, when a session closes anywhere --- */

  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(e: CheckInCompletedEvent) {
    try {
      const c = await this.prisma.checkIn.findUnique({
        where: { id: e.checkInId },
        select: { id: true, sessionNumber: true, status: true, ground: { select: { id: true, organizationId: true, label: true } }, participant: { select: { userId: true, email: true } } },
      });
      if (!c?.participant.userId) return;
      const connected = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId: c.ground.organizationId }, select: { enabled: true } }).catch(() => null);
      if (!connected?.enabled) return;
      const person = c.participant.email ? await this.prisma.person.findFirst({ where: { organizationId: c.ground.organizationId, email: c.participant.email }, select: { phone: true } }) : null;
      if (!person?.phone) return;
      /* Completed from the phone: the finish handler already sends it. Avoid saying it twice. */
      const thread = await this.prisma.whatsAppThread.findFirst({ where: { organizationId: c.ground.organizationId, checkInId: c.id } }).catch(() => null);
      if (thread) return;
      await this.sendTheReport(c.ground.organizationId, { id: c.id, status: c.status, sessionNumber: c.sessionNumber, label: c.ground.label }, c.participant.userId, person.phone);
    } catch (err: any) {
      this.logger.warn(`WhatsApp report after completion failed for ${e.checkInId}: ${err?.message}`);
    }
  }

  private async sendTheReport(organizationId: string, c: AnOpenCheckIn, userId: string, phone: string) {
    const row = await this.prisma.checkIn.findUnique({ where: { id: c.id }, select: { groundId: true, participant: { select: { language: true } } } });
    if (!row) return;
    /* The read is computed; right after completion it may still be forming, so it is tried a few times. */
    let report: any = null;
    for (let i = 0; i < 4 && !report; i++) {
      report = await this.reports.sessionReport(row.groundId, c.sessionNumber, userId, organizationId).catch(() => null);
      if (!report?.whereThingsStand) { report = null; await new Promise((r) => setTimeout(r, 4000)); }
    }
    let text = report ? reportAsText(report, c.label) : `Your check-in on ${c.label} is on record. The report is being written and is in Groundwork under Report.`;
    text = await this.inTheirLanguage(text, row.participant.language);
    /* Retry the SEND, not the report. The synthesis, four polls and a translation are already paid for; a
       failed send is retried once with the text in hand rather than by running all of that again. */
    const first = await this.whatsapp.sendFor(organizationId, phone, text, { checkInId: c.id, kind: 'report' });
    if (!first.sent) {
      await new Promise((r) => setTimeout(r, 3000));
      const second = await this.whatsapp.sendFor(organizationId, phone, text, { checkInId: c.id, kind: 'report-retry' });
      if (!second.sent) this.logger.error(`The report for check-in ${c.id} could not be sent to WhatsApp twice: ${second.error ?? 'no detail'}`);
    }
  }

  /* --- language: read once, converse in it, record in English --- */

  private async readLanguageOnce(checkInId: string, text: string) {
    const row = await this.prisma.checkIn.findUnique({ where: { id: checkInId }, select: { participantId: true, participant: { select: { language: true } } } });
    if (!row || row.participant.language || text.length < 8) return;
    const read = await this.anthropic.extract<{ language?: string }>(
      'Say which language this message is written in. Answer with the ISO 639-1 code only (en, ha, sw, yo, ig, fr, pt, ar, am, es). Mixed or unsure: the language most of the words are in.',
      [{ role: 'user', content: text }],
      { name: 'language_of', description: 'The language of the message', input_schema: { type: 'object', properties: { language: { type: 'string' } }, required: ['language'] } },
      /* One word out, and a person on WhatsApp waiting for it: the model's default budget is for reports. */
      { thinkingBudget: 128 },
    ).catch(() => null);
    const code = (read?.language ?? 'en').toLowerCase().slice(0, 2);
    const kept = LANGUAGES_WE_CONVERSE_IN[code] ? code : 'en';
    await this.prisma.groundParticipant.update({ where: { id: row.participantId }, data: { language: kept } }).catch(() => undefined);
    if (kept !== 'en') this.logger.log(`WhatsApp: participant ${row.participantId} writes in ${LANGUAGES_WE_CONVERSE_IN[kept]}.`);
  }

  private async inTheirLanguage(text: string, code: string | null | undefined): Promise<string> {
    if (!code || code === 'en' || !LANGUAGES_WE_CONVERSE_IN[code]) return text;
    const name = LANGUAGES_WE_CONVERSE_IN[code];
    const out = await this.anthropic.respond(
      `Translate the message into ${name}, plain everyday words. Keep every name, number, date and place exactly as written. Return only the translation.`,
      [{ role: 'user', content: text }],
    ).catch(() => '');
    return out?.trim() || text;
  }

  /* --- helpers --- */

  private async openCheckInsFor(organizationId: string, userId: string): Promise<AnOpenCheckIn[]> {
    const rows = await this.prisma.checkIn.findMany({
      where: {
        participant: { userId, ground: { organizationId } },
        status: { in: [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS] },
        OR: [{ availableFrom: null }, { availableFrom: { lte: new Date() } }],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, status: true, sessionNumber: true, ground: { select: { label: true } } },
    });
    return rows.map((r) => ({ id: r.id, status: r.status, sessionNumber: r.sessionNumber, label: r.ground.label }));
  }

  private async invitationWaitingFor(organizationId: string, personId: string | null): Promise<string | null> {
    if (!personId) return null;
    const person = await this.prisma.person.findFirst({ where: { id: personId }, select: { email: true } });
    if (!person?.email) return null;
    const waiting = await this.prisma.groundParticipant.findFirst({
      where: { email: person.email, userId: null, ground: { organizationId, status: { notIn: ['RESOLVED', 'STALLED'] } } },
      select: { ground: { select: { label: true } } },
      orderBy: { createdAt: 'desc' },
    }).catch(() => null);
    return waiting?.ground.label ?? null;
  }

  private async remember(organizationId: string, from: string, checkInId: string) {
    const phone = WhatsAppService.normalize(from);
    await this.prisma.whatsAppThread.upsert({
      where: { organizationId_phone: { organizationId, phone } },
      create: { organizationId, phone, checkInId },
      update: { checkInId, pickPendingAt: null },
    }).catch(() => undefined);
  }

  /** The question was asked now; a typed number is an answer to it only while that is fresh. */
  private async askWhichOne(organizationId: string, from: string) {
    const phone = WhatsAppService.normalize(from);
    await this.prisma.whatsAppThread.upsert({
      where: { organizationId_phone: { organizationId, phone } },
      create: { organizationId, phone, pickPendingAt: new Date() },
      update: { pickPendingAt: new Date() },
    }).catch(() => undefined);
  }

  private async openIfWaiting(c: AnOpenCheckIn, userId: string): Promise<string | null> {
    if (c.status !== 'NOT_STARTED') return null;
    const first = await this.conversation.open(c.id, userId);
    c.status = 'IN_PROGRESS';
    return first.reply;
  }
}
