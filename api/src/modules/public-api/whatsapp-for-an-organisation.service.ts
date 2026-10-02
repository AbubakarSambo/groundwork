import { endsOnTheClose } from '../conversation/the-close-says-what-comes-next';
import { Injectable, Logger } from '@nestjs/common';
import { isAGuestIn } from '../participants/a-guest-is-never-somebody-on-the-hosts-list';
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
import { AMessageIntoACheckInDto, A_MESSAGE_MAX } from '../../common/dto';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ACheckInACustomerCanRunService } from './a-check-in-a-customer-can-run.service';
import { asATextMessage } from './a-reply-reads-as-a-text-message';
import { AnOpenCheckIn, sessionHeader, whichOneRows, whichOneAsText, pickedOne, pickedFromText, whatArrived, reportAsText, LANGUAGES_WE_CONVERSE_IN, A_FINISH_WORD, A_GREETING_ALONE } from './a-whatsapp-message-is-routed';
import { A_STOP_WORD, A_START_WORD, STOPPED_SAYING, RESUMED_SAYING } from '../whatsapp/a-message-outside-the-window';
import { keptOffThePhone, answerItInTheApp } from '../whatsapp/a-check-in-kept-off-the-phone';
import {
  aStrangerHearsNothing, NOT_ONE_OF_YOURS, type WhatCameBack, type WhoHoldsTheNumber,
} from './their-number-stays-theirs';

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
    /* A redelivery is not a second answer. The id is claimed before anything else happens. */
    if (message.id && !(await this.firstTimeWeSeeThis(organizationId, String(message.id)))) return;
    await this.prisma.whatsAppConnection.update({ where: { organizationId }, data: { lastInboundAt: new Date() } }).catch(() => undefined);
    await this.route(organizationId, from, whatArrived(message), {
      who: 'we do',
      say: (text) => this.whatsapp.sendFor(organizationId, from, text),
      list: (prompt, rows, asText) => this.whatsapp.sendListFor(organizationId, from, prompt, rows, asText),
      fetchMedia: (mediaId) => this.whatsapp.fetchMediaFor(organizationId, mediaId),
    });
  }

  /**
   * ONE MESSAGE, HANDED TO US BY THE SYSTEM THAT HOLDS THE NUMBER.
   *
   * Their WhatsApp Business number stays theirs and stays pointed at their own customer system.
   * When the sender is one of their team, that system hands us the message and sends our reply back
   * from their number - so their customers never touch us, because they never hand us one.
   *
   * A sender who is not on their roster comes back as "not ours" with nothing said and nothing
   * stored. See their-number-stays-theirs.
   */
  async relay(
    organizationId: string,
    from: string,
    arrived: ReturnType<typeof whatArrived>,
    messageId?: string | null,
  ): Promise<WhatCameBack> {
    if (!from) return NOT_ONE_OF_YOURS;
    /*
     * WHO THIS IS, BEFORE ANYTHING IS WRITTEN DOWN. On our own number the inbound stamp goes on
     * first, because somebody wrote to us. Here the first question is whether they are ours to
     * answer at all, and a stranger must leave no trace of having been asked about.
     */
    const who = await this.whatsapp.whoIsWritingTo(organizationId, from).catch(() => ({ personId: null, userId: null } as any));
    if (!who.personId && !who.userId) return NOT_ONE_OF_YOURS;
    if (messageId && !(await this.firstTimeWeSeeThis(organizationId, String(messageId)))) return { mine: true };
    await this.prisma.whatsAppConnection
      .update({ where: { organizationId }, data: { lastInboundAt: new Date() } })
      .catch(() => undefined);

    const said: string[] = [];
    await this.route(organizationId, from, arrived, {
      who: 'they do',
      say: async (text) => { if (text?.trim()) said.push(text.trim()); },
      /* No tappable list through a relay: their system sends our text from their own number, so the
         numbered version - which already exists as the fallback for a plain SMS - is what goes. */
      list: async (_prompt, _rows, asText) => { if (asText?.trim()) said.push(asText.trim()); },
      fetchMedia: async () => arrived.kind === 'media' && (arrived as any).buffer
        ? { buffer: (arrived as any).buffer as Buffer, mimeType: (arrived as any).mimeType as string }
        : null,
    });
    return { mine: true, reply: said.join('\n\n') || undefined };
  }

  private async route(
    organizationId: string,
    from: string,
    arrived: ReturnType<typeof whatArrived>,
    out: {
      who: WhoHoldsTheNumber;
      say: (text: string) => Promise<unknown>;
      list: (prompt: string, rows: any[], asText: string) => Promise<unknown>;
      fetchMedia: (mediaId: string) => Promise<{ buffer: Buffer; mimeType: string } | null>;
    },
  ): Promise<void> {
    /* Everything below is the same routing whoever holds the number - the only difference is where
       the words go, and the one sentence a stranger must never be sent from their business. */
    const say = async (text: string) => {
      if (aStrangerHearsNothing(text, out.who)) return;
      await out.say(text);
    };

    if (arrived.kind === 'other') { await say('I can read text, photos and documents here. Say it in words, or send the file.'); return; }
    /* The same checks as every other door, on the one field this door plucks off a raw request. */
    if (arrived.kind === 'text') {
      const checked = validateSync(plainToInstance(AMessageIntoACheckInDto, { message: arrived.text }));
      if (checked.length) {
        if (arrived.text.trim()) await say(`That is longer than a check-in can take in one message - up to ${A_MESSAGE_MAX.toLocaleString()} characters. Send it in parts.`);
        return;
      }
    }

    const who = await this.whatsapp.whoIsWritingTo(organizationId, from);
    if (!who.personId && !who.userId) {
      await say("This number is not on your organisation's roster yet. Ask your admin to add it, or add it yourself under Settings in Groundwork, then message again.");
      return;
    }
    /* The 24-hour window is measured from this, per person; and STOP means stop. */
    if (who.personId) {
      await this.prisma.person.update({ where: { id: who.personId }, data: { whatsappLastInboundAt: new Date() } }).catch(() => undefined);
      if (arrived.kind === 'text' && A_STOP_WORD.test(arrived.text)) {
        await this.prisma.person.update({ where: { id: who.personId }, data: { whatsappStoppedAt: new Date() } }).catch(() => undefined);
        await say(STOPPED_SAYING);
        return;
      }
      if (arrived.kind === 'text' && A_START_WORD.test(arrived.text)) {
        await this.prisma.person.update({ where: { id: who.personId }, data: { whatsappStoppedAt: null, whatsappConsentAt: new Date() } }).catch(() => undefined);
        await say(RESUMED_SAYING);
        return;
      }
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

    const everyOpen = userId ? await this.openCheckInsFor(organizationId, userId) : [];
    /*
     * A CHECK-IN KEPT IN THE APP TAKES NOTHING FROM THE PHONE (survey item 5). The lead said this one
     * stays off WhatsApp, so it is never offered in the list, never remembered as the current one, and
     * a message that would have gone into it is answered with where to answer it instead.
     */
    const open = everyOpen.filter((c) => !c.keptOffThePhone);
    const inTheApp = everyOpen.filter((c) => c.keptOffThePhone);
    const thread = await this.prisma.whatsAppThread.findUnique({ where: { organizationId_phone: { organizationId, phone: WhatsAppService.normalize(from) } } }).catch(() => null);
    if (!open.length && inTheApp.length) {
      const meant = inTheApp.find((c) => c.id === thread?.checkInId) ?? inTheApp[0];
      await say(answerItInTheApp(meant.label));
      return;
    }

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
      await out.list('You have more than one check-in open. Which is this for?', whichOneRows(open), whichOneAsText(open));
      return;
    }

    /* Their language, read once from the first thing they wrote. */
    if (arrived.kind === 'text' && who.personId) await this.readLanguageOnce(current.id, arrived.text);

    /* A photo or a document. */
    if (arrived.kind === 'media') {
      const fetched = await out.fetchMedia(arrived.mediaId);
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
        /* Not waiting for the end card: Meta's webhook will not hold a reply for fifty seconds. */
        await this.conversation.complete(current.id, userId!, { waitForTheCard: false });
        await this.prisma.whatsAppThread.deleteMany({ where: { organizationId, checkInId: current.id } }).catch(() => undefined);
        /* The report comes from the completion listener below, off this request: four polls at four
           seconds each and a translation held Meta's webhook past its patience, and the redelivery
           was another answer. Acknowledge, and let the listener send. */
        await say('Your check-in is complete and on record. Your report follows in a moment.');
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
      const r = await this.conversation.sendMessage(current.id, userId!, text, { door: 'whatsapp' });
      reply = reply ? `${reply}\n\n${r.reply}` : r.reply;
      /* The close already says to reply "finish" (the-close-says-what-comes-next); said once. */
      if (r.sessionComplete && !endsOnTheClose(r.reply)) reply += '\n\nThat is enough to close this check-in. Reply "finish" to complete it, or keep going.';
      await say(reply);
    } catch (e: any) {
      const said = e?.response?.message ?? e?.message ?? 'That could not be answered just now. Try again in a moment.';
      await say(Array.isArray(said) ? said.join(' ') : String(said));
    }
  }

  /* --- the report, on the phone, when a session closes anywhere --- */

  /**
   * THE REPORT REACHES THE CHANNEL THE PERSON WAS ACTUALLY USING. This returned early whenever ANY
   * thread row existed for the check-in, reasoning that the finish handler had sent it - but a thread
   * row is written on any WhatsApp interaction and deleted only in the WhatsApp finish branch, so
   * somebody who sent one message here and then finished in the app never got their report here. It
   * also required the organisation's own connection to be enabled, though sendFor falls back to the
   * platform number. The one fact that matters is whether a report send for this check-in already
   * went, and the send record says so. And it is not awaited into the request that completed the
   * session: the synthesis is polled, and that must not hold anybody's webhook or button.
   */
  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(e: CheckInCompletedEvent) {
    try {
      const c = await this.prisma.checkIn.findUnique({
        where: { id: e.checkInId },
        select: { id: true, sessionNumber: true, status: true, ground: { select: { id: true, organizationId: true, label: true, overWhatsApp: true } }, participant: { select: { userId: true, email: true } } },
      });
      if (!c?.participant.userId) return;
      /* Kept in the app by the lead: the report stays in the app too (survey item 5). */
      if (keptOffThePhone(c.ground)) return;
      /* A guest's report never goes to the phone of an entry on the host's list that shares their address. See a-guest-is-never-somebody-on-the-hosts-list. */
      if (await isAGuestIn(this.prisma, c.ground.organizationId, c.participant)) return;
      const person = c.participant.email ? await this.prisma.person.findFirst({ where: { organizationId: c.ground.organizationId, email: c.participant.email }, select: { phone: true } }) : null;
      if (!person?.phone) return;
      const alreadySent = await this.prisma.whatsAppSend.findFirst({ where: { checkInId: c.id, kind: { in: ['report', 'report:template'] }, sentAt: { not: null } }, select: { id: true } }).catch(() => null);
      if (alreadySent) return;
      void this.sendTheReport(c.ground.organizationId, { id: c.id, status: c.status, sessionNumber: c.sessionNumber, label: c.ground.label }, c.participant.userId, person.phone)
        .catch((err: any) => this.logger.warn(`WhatsApp report after completion failed for ${e.checkInId}: ${err?.message}`));
    } catch (err: any) {
      this.logger.warn(`WhatsApp report after completion failed for ${e.checkInId}: ${err?.message}`);
    }
  }

  /** Claims the message id. False on a redelivery, which is then not handled a second time. */
  private async firstTimeWeSeeThis(organizationId: string, messageId: string): Promise<boolean> {
    try {
      await this.prisma.whatsAppInboundMessage.create({ data: { organizationId, messageId } });
      return true;
    } catch (err: any) {
      if (err?.code === 'P2002') return false;
      /* The table being unreachable must not make every message a redelivery. */
      this.logger.warn(`Could not record inbound WhatsApp message ${messageId}: ${err?.message}`);
      return true;
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
      select: { id: true, status: true, sessionNumber: true, ground: { select: { label: true, overWhatsApp: true } } },
    });
    return rows.map((r) => ({ id: r.id, status: r.status, sessionNumber: r.sessionNumber, label: r.ground.label, keptOffThePhone: keptOffThePhone(r.ground) }));
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
