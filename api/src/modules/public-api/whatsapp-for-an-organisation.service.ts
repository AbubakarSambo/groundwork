import { askNameOf } from '../assistant/ask-name';
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
import { aDecisionIn } from '../suites/a-request-in-words';
import { aQuestionAskedAboutARequest } from '../suites/an-approver-asks-by-saying-so';
import { BACK_TO_THE_CHECK_IN, YES_OR_NO_TO_AN_ANSWER, isThisYourAnswer, type AQuestionWaiting } from '../suites/a-question-about-a-request';
import { plainlyEnglish } from './plainly-english';
import { namesTheyCanTellApart } from '../../common/check-ins-you-can-tell-apart';
import { closingSoonestFirst, oneAtATime, theNextOne } from './several-check-ins-open';
import { whenItIsDue } from '../whatsapp/what-goes-to-a-phone';
import { formsOfTheSameNumber } from '../whatsapp/a-number-whatsapp-can-reach';
import { theCheckInIsCompleteSaying, enoughToCloseSaying } from '../grounds/what-is-sent-in-simpler-words';
import { AnOpenCheckIn, whatTheFileIsCalled, sessionHeader, whichOneRows, whichOneAsText, pickedOne, pickedFromText, whatArrived, reportAsText, nothingToReadYet, THANKS_YOUR_ANSWER_IS_IN, reportAsTemplateBlanks, LANGUAGES_WE_CONVERSE_IN, A_FINISH_WORD, A_GREETING_ALONE, A_NOT_NOW, NOT_NOW_SAYING,
  NOT_ENOUGH_YET_TO_FINISH, isAnAskWord, A_BACK_WORD, A_SWITCH_WORD, A_YES, A_NO, THE_WORDS, NOW_ASKING, ASKING_NEEDS_A_ROSTER_ENTRY, ASK_READS_WORDS,
  ONLY_ONE_OPEN, NONE_OPEN, BACK_IN, BACK_TO_NOTHING, ASKING, isAsking, wasIn, namedCheckIn, looksLikeARequest, shallITreatThisAs, YES_OR_NO, HELD_WORDS_PUT_IN, heldWordsNotPut, type ARequest,
} from './a-whatsapp-message-is-routed';
import { A_STOP_WORD, A_START_WORD, STOPPED_SAYING, RESUMED_SAYING, UNKNOWN_NUMBER_SAYING } from '../whatsapp/a-message-outside-the-window';
import { keptOffThePhone, answerItInTheApp } from '../whatsapp/a-check-in-kept-off-the-phone';
import { WhichNumber, anInboundKey } from '../whatsapp/one-number-per-conversation';
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

  /**
   * `via` is the number the message came in on: `theirs` (the organisation's own, the default) or
   * `ours` (Groundwork's). Every reply goes back on that same number (survey item 8).
   */
  async handle(organizationId: string, body: any, via: WhichNumber = 'theirs'): Promise<void> {
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return;
    const from: string = message.from;
    if (!from) return;
    /* A redelivery is not a second answer. The id is claimed before anything else happens, with the
       number it came in on, which is how the last number this person wrote to is known. */
    if (message.id && !(await this.firstTimeWeSeeThis(organizationId, anInboundKey(via, WhatsAppService.normalize(from), String(message.id))))) return;
    if (via === 'theirs') await this.prisma.whatsAppConnection.update({ where: { organizationId }, data: { lastInboundAt: new Date() } }).catch(() => undefined);
    await this.route(organizationId, from, whatArrived(message), {
      /* A reply quoting one of our messages, or a template's button, carries that message's id (decision 106 item 1). */
      repliesTo: typeof message.context?.id === 'string' ? message.context.id : null,
      who: 'we do',
      say: (text) => this.whatsapp.sendOn(via, organizationId, from, text),
      list: (prompt, rows, asText) => this.whatsapp.sendListOn(via, organizationId, from, prompt, rows, asText),
      fetchMedia: (mediaId) => this.whatsapp.fetchMediaOn(via, organizationId, mediaId),
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
    if (messageId && !(await this.firstTimeWeSeeThis(organizationId, anInboundKey('theirs', WhatsAppService.normalize(from), String(messageId))))) return { mine: true };
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
      repliesTo?: string | null;
      who: WhoHoldsTheNumber;
      say: (text: string) => Promise<unknown>;
      list: (prompt: string, rows: any[], asText: string) => Promise<unknown>;
      fetchMedia: (mediaId: string) => Promise<{ buffer: Buffer; mimeType: string } | null>;
    },
  ): Promise<void> {
    /* Everything below is the same routing whoever holds the number - the only difference is where
       the words go, and the one sentence a stranger must never be sent from their business. */
    /* Said once, before the next thing said: "You have two check-ins open: ... Let's start with ..." (decision 106 item 1). */
    let intro = '';
    const say = async (text: string) => {
      if (aStrangerHearsNothing(text, out.who)) return;
      const t = intro ? `${intro}\n\n${text}` : text;
      intro = '';
      await out.say(t);
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
    /* START said to begin the check-in, not to resume after STOP. */
    let beginning = false;
    if (!who.personId && !who.userId) {
      await say(UNKNOWN_NUMBER_SAYING);
      return;
    }
    /* The 24-hour window is measured from this, per person; and STOP means stop. */
    if (who.personId) await this.prisma.person.update({ where: { id: who.personId }, data: { whatsappLastInboundAt: new Date() } }).catch(() => undefined);
    /*
     * STOP STOPS EVERYTHING TO THIS NUMBER (decision 106 item 2), whether the number is on the roster or
     * only on a sign-in: the roster entry is stamped where there is one, and the word itself is kept in the
     * send record for every number, which is what the sender reads.
     */
    if (arrived.kind === 'text' && A_STOP_WORD.test(arrived.text)) {
      if (who.personId) await this.prisma.person.update({ where: { id: who.personId }, data: { whatsappStoppedAt: new Date() } }).catch(() => undefined);
      await this.whatsapp.stopOrResume(organizationId, from, 'stopped');
      await say(STOPPED_SAYING);
      return;
    }
    /*
     * START: after STOP it resumes; otherwise it is the "Reply START to begin" of checkin_open
     * (decision 83), and begins the check-in like a greeting rather than becoming an answer.
     */
    if (arrived.kind === 'text' && A_START_WORD.test(arrived.text)) {
      const me = who.personId ? await this.prisma.person.findUnique({ where: { id: who.personId }, select: { whatsappStoppedAt: true } }).catch(() => null) : null;
      const stoppedHere = await this.whatsapp.hasSaidStop(from).catch(() => false);
      if (me?.whatsappStoppedAt || stoppedHere) {
        if (who.personId) await this.prisma.person.update({ where: { id: who.personId }, data: { whatsappStoppedAt: null, whatsappConsentAt: new Date() } }).catch(() => undefined);
        await this.whatsapp.stopOrResume(organizationId, from, 'resumed');
        await say(RESUMED_SAYING);
        return;
      }
      beginning = !!who.personId || !!who.userId;
    }
    /* "Not now" always works (decision 83): nothing more is written first to this person today. */
    if (arrived.kind === 'text' && A_NOT_NOW.test(arrived.text)) {
      await this.whatsapp.notNow(organizationId, from);
      await say(NOT_NOW_SAYING);
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

    const ask = await askNameOf(this.prisma, organizationId);
    const everyOpen = userId ? await this.openCheckInsFor(organizationId, userId) : [];
    /*
     * A CHECK-IN KEPT IN THE APP TAKES NOTHING FROM THE PHONE (survey item 5). The lead said this one
     * stays off WhatsApp, so it is never offered in the list, never remembered as the current one, and
     * a message that would have gone into it is answered with where to answer it instead.
     */
    const open = everyOpen.filter((c) => !c.keptOffThePhone);
    const inTheApp = everyOpen.filter((c) => c.keptOffThePhone);
    const thread = await this.prisma.whatsAppThread.findUnique({ where: { organizationId_phone: { organizationId, phone: WhatsAppService.normalize(from) } } }).catch(() => null);
    const said = arrived.kind === 'text' ? arrived.text : '';

    /*
     * WORDS HELD FOR A YES OR A NO ARE NEVER LOST. "Shall I treat this as a leave request?" or "Is this
     * your answer to Wairimu's question about your leave?" holds the person's words for ten minutes.
     * When nobody answered in time, the words were wiped, and they went nowhere. Now, at the person's
     * next message after the ten minutes, on whichever copy of the API reads it, the words go where
     * they would have gone without the question, which is the check-in they were held from, as the
     * "no" does. Then this message is handled as it always was. While the person is in Ask
     * Groundwork the words wait until they come back to the check-in.
     */
    if (userId && !isAsking(thread?.checkInId) && this.aHoldHasExpired(thread)) {
      await this.forgetTheRequest(organizationId, from);
      const heldFrom = open.find((c) => c.id === thread!.checkInId);
      if (heldFrom) await say(await this.putInTheCheckIn(heldFrom, userId, thread!.requestWords!, organizationId));
      else await say(heldWordsNotPut(thread!.requestWords!, ask));
    }

    /*
     * "ASK" REACHES ASK GROUNDWORK, AND "BACK" RETURNS (survey item 2). Ask Groundwork was blocked
     * while any check-in was open, so a question became an answer in the check-in. Now "ask" (or "Ask
     * Groundwork") moves this conversation to Ask Groundwork and every message after it goes there,
     * until "back", or the check-in's name or number from the list, returns them.
     */
    if (arrived.kind === 'text' && isAnAskWord(said, ask)) {
      if (!who.personId) { await say(ASKING_NEEDS_A_ROSTER_ENTRY(ask)); return; }
      const goBackTo = isAsking(thread?.checkInId)
        ? wasIn(thread?.checkInId)
        : (open.find((c) => c.id === thread?.checkInId) ?? (open.length === 1 ? open[0] : null))?.id ?? null;
      await this.rememberAsking(organizationId, from, goBackTo);
      await say(NOW_ASKING(ask));
      return;
    }
    if (isAsking(thread?.checkInId) && who.personId) {
      const named = arrived.kind === 'pick' ? pickedOne(arrived.id, open) : arrived.kind === 'text' ? namedCheckIn(said, open) : null;
      if (named || (arrived.kind === 'text' && A_BACK_WORD.test(said))) {
        const target = named ?? open.find((c) => c.id === wasIn(thread?.checkInId)) ?? (open.length === 1 ? open[0] : null);
        if (target) {
          await this.remember(organizationId, from, target.id);
          const opened = await this.openIfWaiting(target, userId!);
          await say(opened ? `${sessionHeader(target)} ${THE_WORDS(ask)}\n\n${opened}` : BACK_IN(target));
          return;
        }
        if (open.length > 1) {
          await this.askWhichOne(organizationId, from);
          await out.list('You have more than one check-in open. Which is this for?', whichOneRows(open), whichOneAsText(open));
          return;
        }
        await say(inTheApp.length ? answerItInTheApp(inTheApp[0].label) : BACK_TO_NOTHING(ask));
        return;
      }
      if (arrived.kind !== 'text') { await say(ASK_READS_WORDS(ask)); return; }
      await say(asATextMessage(await this.assistant.respondOnWhatsApp(organizationId, who.personId, said)) || 'Noted.');
      return;
    }

    /* "SWITCH": the list of open check-ins again (survey item 2). */
    if (arrived.kind === 'text' && A_SWITCH_WORD.test(said)) {
      if (open.length > 1) {
        await this.askWhichOne(organizationId, from);
        await out.list('You have more than one check-in open. Which is this for?', whichOneRows(open), whichOneAsText(open));
        return;
      }
      await say(open.length === 1 ? ONLY_ONE_OPEN(open[0].label, ask) : inTheApp.length ? answerItInTheApp(inTheApp[0].label) : NONE_OPEN(ask));
      return;
    }

    if (!open.length && inTheApp.length) {
      const meant = inTheApp.find((c) => c.id === thread?.checkInId) ?? inTheApp[0];
      await say(answerItInTheApp(meant.label));
      return;
    }

    /* Nothing open: an invitation waiting, or the assistant. */
    if (!open.length) {
      /* "back" with nothing to go back to is not a question for Ask Groundwork ("I cannot answer that one yet. Here is what I can do with "back"."). */
      if (arrived.kind === 'text' && A_BACK_WORD.test(said)) { await say(BACK_TO_NOTHING(ask)); return; }
      const waiting = await this.invitationWaitingFor(organizationId, who.personId);
      if (waiting) { await say(`You are invited to "${waiting}" and the invitation has not been accepted yet. Open the email, accept it, then reply here and your answers go straight in.`); return; }
      if (arrived.kind === 'media') { await say('There is no check-in open to put that on. I will message you here when the next one opens; send it again then.'); return; }
      if (who.personId && arrived.kind === 'text') { await say(asATextMessage(await this.assistant.respondOnWhatsApp(organizationId, who.personId, arrived.text)) || 'Noted.'); return; }
      await say('You have no check-in open right now. I will message you here when the next one is ready.');
      return;
    }

    /*
     * WHICH ONE (decision 106 item 1). A pick (tapped, or a number typed while the list is fresh) settles it.
     * Then a reply to one of our messages about a check-in, or its Start button: that check-in. Then START
     * after an opening notice newer than where they were: the check-in that notice was about. Then where
     * they were: they stay in it until they finish or write "switch". Then the only one. With several and
     * none of these, one at a time, the one closing soonest first, said in a sentence. The numbered list
     * is only for "switch", when Groundwork genuinely cannot tell.
     */
    let current: AnOpenCheckIn | null = null;
    /* A typed number is a pick only while the question is fresh (a-whatsapp-message-is-routed.ts). */
    const picked = arrived.kind === 'pick' ? pickedOne(arrived.id, open) : arrived.kind === 'text' && open.length > 1 ? pickedFromText(arrived.text, open, thread?.pickPendingAt) : null;
    const repliedTo = !picked && open.length > 1 ? await this.theCheckInARepliedMessageWasAbout(out.repliesTo, open) : null;
    const remembered = thread && open.some((c) => c.id === thread.checkInId) ? open.find((c) => c.id === thread.checkInId)! : null;
    const announced = !picked && !repliedTo && beginning && open.length > 1 ? await this.theLastOpeningNoticeTo(from, open, remembered ? thread!.updatedAt : null) : null;
    if (repliedTo || announced) {
      current = (repliedTo ?? announced)!;
      await this.remember(organizationId, from, current.id);
    } else if (picked) {
      current = picked;
      await this.remember(organizationId, from, picked.id);
      if (arrived.kind === 'pick' || /^\s*\d{1,2}\s*$/.test(arrived.kind === 'text' ? arrived.text : '')) {
        /* The pick itself is not an answer. Open it if it is waiting, and say where they are. */
        const opened = await this.openIfWaiting(current, userId!);
        await say(`${sessionHeader(current)}${opened ? ` ${THE_WORDS(ask)}\n\n${opened}` : ' Carry on where you left off.'}`);
        return;
      }
    } else if (remembered) {
      current = remembered;
    } else if (open.length === 1) {
      current = open[0];
      await this.remember(organizationId, from, current.id);
    } else {
      const ordered = closingSoonestFirst(open);
      current = ordered[0];
      await this.remember(organizationId, from, current.id);
      intro = oneAtATime(ordered);
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
        await say(`${whatTheFileIsCalled(arrived)} is on your check-in${arrived.caption ? ` with your note: ${arrived.caption}` : ''}. ${doc?.whoCanSeeIt ?? 'Only you can see it until you say otherwise.'} Anything it backs up is read against what you said.`);
      } catch (err: any) {
        await say(err?.message ?? 'That file could not be read. A PDF, an image, or a text document works.');
      }
      return;
    }

    if (arrived.kind !== 'text') return;
    let text = arrived.text;

    /*
     * A LEAVE, HOURS OR SPENDING REQUEST SAID DURING A CHECK-IN (decision 82, item 2). "I want leave on
     * 20 October" became an answer in the check-in. Now a message that plainly is one is asked about,
     * once, in Hafsah's words ("Shall I treat this as a leave request?"), and only the person's answer
     * decides: yes hands it to Ask Groundwork through its own entry, which says it back and asks before
     * anything is sent; no puts it in the check-in, as it would have gone before.
     */
    const pending = await this.aRequestAskedAbout(organizationId, from, thread);
    if (pending?.kind === 'answer') {
      /*
       * AN ANSWER TO A QUESTION ABOUT THE PERSON'S OWN REQUEST (decision 85, build step 7). They were
       * asked "Is this your answer to Wairimu's question about your leave?". Yes sends their words as
       * the answer, through the suite's own code; no puts them in the check-in, as they would have gone.
       */
      if (A_YES.test(text) && who.personId) {
        await this.forgetTheRequest(organizationId, from);
        const sent = await this.assistant.answerAQuestionOnWhatsApp(organizationId, who.personId, pending.questionId ?? '', pending.text);
        await say(`${sent} ${BACK_TO_THE_CHECK_IN}`);
        return;
      }
      if (A_NO.test(text)) {
        await this.forgetTheRequest(organizationId, from);
        text = pending.text;
      } else {
        const q = who.personId ? await this.aQuestionWaitsFor(organizationId, who.personId) : null;
        await say(YES_OR_NO_TO_AN_ANSWER(q ?? { askedBy: '', about: 'your request' }));
        return;
      }
    } else if (pending) {
      if (A_YES.test(text) && who.personId) {
        await this.forgetTheRequest(organizationId, from);
        await this.rememberAsking(organizationId, from, current.id);
        const answered = asATextMessage(await this.assistant.respondOnWhatsApp(organizationId, who.personId, pending.text)) || 'Noted.';
        await say(`${answered}\n\nWrite "back" to return to your check-in.`);
        return;
      }
      if (A_NO.test(text)) {
        await this.forgetTheRequest(organizationId, from);
        text = pending.text;
      } else {
        await say(YES_OR_NO(pending.kind as ARequest));
        return;
      }
    } else if (who.personId && (aDecisionIn(text) || aQuestionAskedAboutARequest(text)) && (await this.aDecisionWaitsFor(organizationId, who.personId))) {
      /*
       * AN APPROVER'S "APPROVE" OR "DECLINE", OR A QUESTION ABOUT A REQUEST ("question for Amina about her
       * leave: ...") DURING A CHECK-IN (decision 82, item 1) is not an answer in it. It goes to Ask Groundwork, which says back what they are deciding and acts only on a
       * yes; the conversation stays there for that yes, until "back".
       */
      await this.rememberAsking(organizationId, from, current.id);
      const answered = asATextMessage(await this.assistant.respondOnWhatsApp(organizationId, who.personId, text)) || 'Noted.';
      await say(`${answered}\n\nWrite "back" to return to your check-in.`);
      return;
    } else if (who.personId) {
      const kind = looksLikeARequest(text);
      if (kind) {
        await this.askAboutTheRequest(organizationId, from, text, kind);
        await say(shallITreatThisAs(kind));
        return;
      }
      /*
       * A QUESTION ABOUT THEIR OWN REQUEST IS WAITING FOR THEIR ANSWER (decision 85, build step 7).
       * Whoever decides it asked them, and their reply here would have gone into the check-in. Asked
       * once for each question, never for a greeting, "finish" or the first word that starts a check-in.
       */
      if (!beginning && !A_FINISH_WORD.test(text) && !A_GREETING_ALONE.test(text)) {
        const q = await this.aQuestionWaitsFor(organizationId, who.personId);
        if (q && thread?.questionAskedAbout !== q.id) {
          await this.askAboutTheAnswer(organizationId, from, text, q.id);
          await say(isThisYourAnswer(q));
          return;
        }
      }
    }

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
        /* When it finishes, the next one is offered, and remembered, so START or an answer goes to it (decision 106 item 1). */
        const next = closingSoonestFirst(open.filter((c) => c.id !== current!.id))[0] ?? null;
        if (next) await this.remember(organizationId, from, next.id);
        /* The report comes from the completion listener below, off this request: four polls at four
           seconds each and a translation held Meta's webhook past its patience, and the redelivery
           was another answer. Acknowledge, and let the listener send. */
        await say(`${theCheckInIsCompleteSaying(current.simplerWords)}${next ? `\n\n${theNextOne(next)}` : ''}`);
      } catch (e: any) {
        /* "Not enough yet" asks for something the person can give, so it is said in the words of this door ("finish"), not the app's ("complete", "the record is still thin"). */
        await say(e?.response?.canContinue ? NOT_ENOUGH_YET_TO_FINISH : (e?.response?.message ?? e?.message ?? 'That could not be completed yet.'));
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
    /* This message went to THIS check-in over WhatsApp. It is what "doing this session on WhatsApp" means for the halfway messages (whatsapp/a-check-in-left-halfway.ts): a note, never a message sent. */
    await (this.prisma as any).whatsAppSend?.create?.({ data: { organizationId, phone: from, kind: 'answered-here', checkInId: current.id, sentAt: null, failedAt: null, status: null, error: null } })?.catch?.(() => undefined);
    if (beginning && current.status !== 'NOT_STARTED') { await say(`${sessionHeader(current)} Carry on where you left off.`); return; }
    try {
      let reply = '';
      if (current.status === 'NOT_STARTED') {
        const first = await this.conversation.open(current.id, userId!);
        /* The words that switch, said once, when the check-in starts on WhatsApp. */
        reply = `${sessionHeader(current)} ${THE_WORDS(ask)}\n\n${first.reply}`;
        /* A short first answer is still an answer. "Not much yet", "It's blocked", "Behind again" are
           twelve characters or fewer and were thrown away. Only a greeting and nothing else is not
           handed in - matched by a list, not by a length. */
        if (A_GREETING_ALONE.test(text) || beginning) { await say(reply); return; }
      }
      const r = await this.conversation.sendMessage(current.id, userId!, text, { door: 'whatsapp' });
      reply = reply ? `${reply}\n\n${r.reply}` : r.reply;
      /* The close already says to reply "finish" (the-close-says-what-comes-next); said once. */
      if (r.sessionComplete && !endsOnTheClose(r.reply)) reply += `\n\n${enoughToCloseSaying(current.simplerWords)}`;
      await say(reply);
    } catch (e: any) {
      const said = e?.response?.message ?? e?.message ?? 'That could not be answered just now. Try again in a moment.';
      await say(Array.isArray(said) ? said.join(' ') : String(said));
    }
  }

  /** The question about this person's own request waiting for their answer (decision 85, build step 7). Never throws. */
  private async aQuestionWaitsFor(organizationId: string, personId: string): Promise<AQuestionWaiting | null> {
    try { return (await this.assistant.aQuestionWaitsForYourAnswer?.(organizationId, personId)) ?? null; } catch { return null; }
  }

  /** Whether anything waits for this person to approve or decline (decision 82, item 1). Never throws. */
  private async aDecisionWaitsFor(organizationId: string, personId: string): Promise<boolean> {
    try { return !!(await this.assistant.somethingWaitsForYouToDecide(organizationId, personId)); } catch { return false; }
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
        select: { id: true, sessionNumber: true, status: true, ground: { select: { id: true, organizationId: true, label: true, overWhatsApp: true, simplerWords: true } }, participant: { select: { userId: true, email: true } } },
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
      void this.sendTheReport(c.ground.organizationId, { id: c.id, status: c.status, sessionNumber: c.sessionNumber, label: c.ground.label, simplerWords: c.ground.simplerWords }, c.participant.userId, person.phone)
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
    let text = nothingToReadYet(report) ? THANKS_YOUR_ANSWER_IS_IN(c.label) : report ? reportAsText(report, c.label, c.simplerWords) : `Your check-in on ${c.label} is on record. The report is being written and is in Groundwork under Report.`;
    text = await this.inTheirLanguage(text, row.participant.language);
    /* Outside the 24 hours it goes as groundwork_report_ready: the name and one short line, never a line break. */
    const params = reportAsTemplateBlanks(report, c.label);
    /* Retry the SEND, not the report. The synthesis, four polls and a translation are already paid for; a
       failed send is retried once with the text in hand rather than by running all of that again. */
    /* On the number the person last wrote to, so the report arrives in the same conversation (survey item 8). */
    const via = (await this.whatsapp.lastWroteTo(organizationId, phone).catch(() => null)) ?? 'theirs';
    const first = await this.whatsapp.sendOn(via, organizationId, phone, text, { checkInId: c.id, kind: 'report', params });
    if (!first.sent) {
      await new Promise((r) => setTimeout(r, 3000));
      const second = await this.whatsapp.sendOn(via, organizationId, phone, text, { checkInId: c.id, kind: 'report-retry', params });
      if (!second.sent) this.logger.error(`The report for check-in ${c.id} could not be sent to WhatsApp twice: ${second.error ?? 'no detail'}`);
    }
  }

  /* --- language: read once, converse in it, record in English --- */

  private async readLanguageOnce(checkInId: string, text: string) {
    const row = await this.prisma.checkIn.findUnique({ where: { id: checkInId }, select: { participantId: true, participant: { select: { language: true } } } });
    if (!row || row.participant.language || text.length < 8) return;
    /* Plainly English is English: the one-word read once took Kenyan shop names for Swahili (plainly-english.ts). */
    const read = plainlyEnglish(text) ? { language: 'en' } : await this.anthropic.extract<{ language?: string }>(
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
      select: { id: true, status: true, sessionNumber: true, availableFrom: true, createdAt: true, ground: { select: { label: true, createdAt: true, initiator: { select: { firstName: true } }, overWhatsApp: true, cadence: true, simplerWords: true } } },
    });
    /* Two of the same name are told apart by when each started (or who runs it), so "You have two check-ins open" can be answered. */
    const said = namesTheyCanTellApart(rows.map((r) => ({ id: r.id, label: r.ground.label, startedAt: r.ground.createdAt, leadName: r.ground.initiator?.firstName })));
    /* The one closing soonest first (decision 106 item 1), by the same due date the reminders use. */
    return closingSoonestFirst(rows.map((r) => ({
      id: r.id, status: r.status, sessionNumber: r.sessionNumber, label: said.get(r.id) ?? r.ground.label, simplerWords: r.ground.simplerWords, keptOffThePhone: keptOffThePhone(r.ground),
      dueAt: whenItIsDue(r.availableFrom ?? r.createdAt, r.ground.cadence),
    })));
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

  /** The open check-in a message we sent was about, when the person replied to it (its id is the reply's context). */
  private async theCheckInARepliedMessageWasAbout(messageId: string | null | undefined, open: AnOpenCheckIn[]): Promise<AnOpenCheckIn | null> {
    if (!messageId) return null;
    const sent = await (this.prisma.whatsAppSend as any).findFirst?.({ where: { providerMessageId: messageId }, select: { checkInId: true } })?.catch?.(() => null);
    return sent?.checkInId ? open.find((c) => c.id === sent.checkInId) ?? null : null;
  }

  /** The open check-in the last opening notice to this number was about, when it came after where the person was. */
  private async theLastOpeningNoticeTo(from: string, open: AnOpenCheckIn[], sinceTheyWereIn: Date | null): Promise<AnOpenCheckIn | null> {
    const last = await (this.prisma.whatsAppSend as any).findFirst?.({
      where: { phone: { in: formsOfTheSameNumber(from) }, kind: { startsWith: 'checkin-open' }, sentAt: { not: null }, checkInId: { in: open.map((c) => c.id) }, ...(sinceTheyWereIn ? { createdAt: { gt: sinceTheyWereIn } } : {}) },
      orderBy: { createdAt: 'desc' },
      select: { checkInId: true },
    })?.catch?.(() => null);
    return last?.checkInId ? open.find((c) => c.id === last.checkInId) ?? null : null;
  }

  private async remember(organizationId: string, from: string, checkInId: string) {
    const phone = WhatsAppService.normalize(from);
    await this.prisma.whatsAppThread.upsert({
      where: { organizationId_phone: { organizationId, phone } },
      create: { organizationId, phone, checkInId },
      update: { checkInId, pickPendingAt: null },
    }).catch(() => undefined);
  }

  /** Talking to Ask Groundwork now, with the check-in to go back to. */
  private async rememberAsking(organizationId: string, from: string, goBackTo: string | null) {
    const phone = WhatsAppService.normalize(from);
    const checkInId = `${ASKING}${goBackTo ?? ''}`;
    await this.prisma.whatsAppThread.upsert({
      where: { organizationId_phone: { organizationId, phone } },
      create: { organizationId, phone, checkInId },
      update: { checkInId, pickPendingAt: null },
    }).catch(() => undefined);
  }

  /*
   * THE REQUEST WAITING FOR A YES OR A NO, for ten minutes, on the person's WhatsApp thread (by
   * organisation and number). It was held in this copy of the API's memory, so after a restart, or
   * on another copy, the yes or no went into the check-in as an answer. The words are kept because
   * the answer needs them: a yes hands them to Ask Groundwork, which reads the days or the amount
   * from them, and a no puts them in the check-in as they would have gone. They are cleared on the
   * answer. Once ten minutes have passed with no answer, the person's next message puts them in the
   * check-in they were held from, as a no does, so they are never lost.
   */
  private static readonly A_REQUEST_WAITS_MS = 10 * 60 * 1000;
  private static readonly NO_REQUEST = { requestKind: null, requestWords: null, requestAskedAt: null };
  private async askAboutTheRequest(organizationId: string, from: string, text: string, kind: ARequest) {
    const phone = WhatsAppService.normalize(from);
    const asked = { requestKind: kind, requestWords: text, requestAskedAt: new Date() };
    await this.prisma.whatsAppThread.upsert({
      where: { organizationId_phone: { organizationId, phone } },
      create: { organizationId, phone, ...asked },
      update: asked,
    }).catch(() => undefined);
  }
  private async aRequestAskedAbout(
    organizationId: string,
    from: string,
    thread: { requestKind?: string | null; requestWords?: string | null; requestAskedAt?: Date | string | null; questionAskedAbout?: string | null } | null,
  ): Promise<{ text: string; kind: ARequest | 'answer'; questionId?: string | null } | null> {
    /*
     * Nobody else's held words are wiped here any more: an unanswered request past its ten minutes
     * waits on its own thread until that person writes again, and then goes into their check-in
     * (aHoldHasExpired, in route). Here only a hold still inside its ten minutes counts.
     */
    if (!thread?.requestAskedAt || !thread.requestKind || thread.requestWords == null) return null;
    if (this.aHoldHasExpired(thread)) return null;
    return { text: thread.requestWords, kind: thread.requestKind as ARequest | 'answer', questionId: thread.questionAskedAbout ?? null };
  }
  /**
   * NOTHING STAYS HELD PAST ITS TEN MINUTES, EVEN WHEN NOBODY WRITES (decision 110, P12).
   *
   * The words wait for a yes or a no for ten minutes and were cleared by the answer or by the person's next message, never by a clock, so a person
   * who did not write again left their words in the database. Each hold that has outlived its ten minutes is cleared now, and the words go where
   * the person's next message would have put them: into the check-in they were held from, as a no does, so they are never lost. Claimed first,
   * so a person writing at that moment, or a second copy of the API, puts them in once. A person who has since gone to Ask Groundwork has their
   * words put in the check-in they came from. Where there is no open check-in to put them in, they are cleared and logged without them.
   */
  async putAwayWordsHeldTooLong(now: Date = new Date()): Promise<{ putIn: number; cleared: number }> {
    const cutoff = new Date(now.getTime() - WhatsAppForAnOrganisationService.A_REQUEST_WAITS_MS);
    const rows = await this.prisma.whatsAppThread.findMany({
      where: { requestAskedAt: { lt: cutoff }, requestKind: { not: null } },
      select: { id: true, organizationId: true, phone: true, checkInId: true, requestWords: true, requestAskedAt: true },
      take: 500,
    });
    let putIn = 0; let cleared = 0;
    for (const r of rows as any[]) {
      /* Claimed on the very moment it was asked, so only one copy, or the person's own reply, gets it. */
      const claimed = await this.prisma.whatsAppThread.updateMany({ where: { id: r.id, requestAskedAt: r.requestAskedAt }, data: WhatsAppForAnOrganisationService.NO_REQUEST });
      if (!claimed?.count) continue;
      cleared += 1;
      const words: string | null = r.requestWords ?? null;
      const heldFrom = isAsking(r.checkInId) ? wasIn(r.checkInId) : r.checkInId;
      if (!words || !heldFrom) continue;
      try {
        const who = await this.whatsapp.whoIsWritingTo(r.organizationId, r.phone);
        const ci: any = await this.prisma.checkIn.findUnique({ where: { id: heldFrom }, select: { id: true, status: true } });
        if (!who.userId || !ci || !['NOT_STARTED', 'IN_PROGRESS'].includes(ci.status)) { this.logger.warn(`Held words for ${heldFrom} could not be put in the check-in, and were cleared.`); continue; }
        if (ci.status === 'NOT_STARTED') await this.conversation.open(ci.id, who.userId);
        await this.conversation.sendMessage(ci.id, who.userId, words, { door: 'whatsapp' });
        putIn += 1;
      } catch (err: any) {
        this.logger.warn(`Held words for ${heldFrom} could not be put in the check-in, and were cleared: ${err?.message}`);
      }
    }
    return { putIn, cleared };
  }

  /** Words were held for a yes or a no, and the ten minutes passed with no answer. */
  private aHoldHasExpired(thread: { requestKind?: string | null; requestWords?: string | null; requestAskedAt?: Date | string | null } | null): boolean {
    if (!thread?.requestAskedAt || !thread.requestKind || thread.requestWords == null) return false;
    return new Date(thread.requestAskedAt).getTime() < Date.now() - WhatsAppForAnOrganisationService.A_REQUEST_WAITS_MS;
  }
  /**
   * The words go into the check-in as an answer, as the "no" puts them, and the check-in's reply is
   * what the person reads. A check-in not yet started is opened first. A refusal is said, never lost.
   */
  private async putInTheCheckIn(c: AnOpenCheckIn, userId: string, words: string, organizationId?: string): Promise<string> {
    const ask = await askNameOf(this.prisma, organizationId ?? (c as any).organizationId);
    try {
      const opened = await this.openIfWaiting(c, userId);
      const r = await this.conversation.sendMessage(c.id, userId, words, { door: 'whatsapp' });
      const reply = `${HELD_WORDS_PUT_IN(words)}\n\n${r.reply}`;
      return opened ? `${sessionHeader(c)} ${THE_WORDS(ask)}\n\n${opened}\n\n${reply}` : reply;
    } catch (e: any) {
      const refused = e?.response?.message ?? e?.message;
      return `${heldWordsNotPut(words, ask)}${refused ? ` ${Array.isArray(refused) ? refused.join(' ') : refused}` : ''}`;
    }
  }
  /**
   * The person's reply held while they are asked whether it is their answer to a question about their
   * own request, with the question it would answer. The question stays remembered after the answer,
   * so it is asked about once only.
   */
  private async askAboutTheAnswer(organizationId: string, from: string, text: string, questionId: string) {
    const phone = WhatsAppService.normalize(from);
    const asked = { requestKind: 'answer', requestWords: text, requestAskedAt: new Date(), questionAskedAbout: questionId };
    await this.prisma.whatsAppThread.upsert({
      where: { organizationId_phone: { organizationId, phone } },
      create: { organizationId, phone, ...asked },
      update: asked,
    }).catch(() => undefined);
  }
  private async forgetTheRequest(organizationId: string, from: string) {
    const phone = WhatsAppService.normalize(from);
    await this.prisma.whatsAppThread.updateMany({
      where: { organizationId, phone },
      data: WhatsAppForAnOrganisationService.NO_REQUEST,
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
