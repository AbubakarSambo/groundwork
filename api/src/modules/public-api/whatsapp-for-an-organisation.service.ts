import { Injectable, Logger } from '@nestjs/common';
import { CheckInStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConversationService } from '../conversation/conversation.service';
import { AssistantService } from '../assistant/assistant.service';
import { ACheckInACustomerCanRunService } from './a-check-in-a-customer-can-run.service';
import { asATextMessage, whereThisGoes } from './a-reply-reads-as-a-text-message';

/**
 * WHAT HAPPENS TO A WHATSAPP MESSAGE SENT TO AN ORGANISATION'S NUMBER.
 *
 * The sender is matched to a person on the organisation's roster by phone, then to their account.
 * With a check-in open to them, the message is their answer in it, exactly as if typed in the panel.
 * With none, it goes to the assistant: "what is due", "I'll send the proposal Friday", "add the rota
 * to my list" all work by text. The reply goes back on the organisation's own number.
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
  ) {}

  async handle(organizationId: string, body: any): Promise<void> {
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return;
    const from: string = message.from;
    if (!from) return;
    await this.prisma.whatsAppConnection.update({ where: { organizationId }, data: { lastInboundAt: new Date() } }).catch(() => undefined);

    if (message.type !== 'text') {
      await this.whatsapp.sendFor(organizationId, from, 'I can only read text here for now. Say it in words and it goes on your record.');
      return;
    }
    const text: string = (message.text?.body ?? '').trim();
    if (!text) return;

    const who = await this.whatsapp.whoIsWritingTo(organizationId, from);
    if (!who.personId && !who.userId) {
      await this.whatsapp.sendFor(organizationId, from, 'This number is not on your organisation\'s roster yet. Ask your admin to add it, or add it yourself under Settings in Groundwork, then message again.');
      return;
    }

    /* The account, made if the roster has an address and no account yet, the same way the panel does. */
    let userId = who.userId;
    if (!userId && who.personId) {
      try { userId = await this.checkIns.actingAs(organizationId, who.personId); } catch { userId = null; }
    }

    const open = userId
      ? await this.prisma.checkIn.findFirst({
          where: {
            participant: { userId, ground: { organizationId } },
            status: { in: [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS] },
            OR: [{ availableFrom: null }, { availableFrom: { lte: new Date() } }],
          },
          orderBy: { createdAt: 'asc' },
          select: { id: true, status: true },
        })
      : null;

    /*
     * INVITED AND NOT YET IN. The commonest state for a sales rep on day one: on the roster, added to a
     * check-in, invitation unopened. Their message would fall to the assistant and come back as a menu.
     * Say the one true thing instead.
     */
    if (!open) {
      const person = who.personId ? await this.prisma.person.findFirst({ where: { id: who.personId }, select: { email: true } }) : null;
      const waiting = person?.email
        ? await this.prisma.groundParticipant.findFirst({
            where: { email: person.email, userId: null, ground: { organizationId, status: { notIn: ['RESOLVED', 'STALLED'] } } },
            select: { ground: { select: { label: true } } },
            orderBy: { createdAt: 'desc' },
          }).catch(() => null)
        : null;
      if (waiting) {
        await this.whatsapp.sendFor(organizationId, from, `You are invited to "${waiting.ground.label}" and the invitation has not been accepted yet. Open the email, accept it, then reply here and your answers go straight in.`);
        return;
      }
    }

    const route = whereThisGoes(open);
    let reply: string;
    if (route === 'open-the-check-in' && userId && open) {
      const r = await this.conversation.open(open.id, userId);
      reply = r.reply;
      /* Their first message was not a greeting to a blank screen; it is an answer. Send it in too. */
      if (text.length > 12) {
        const second = await this.conversation.sendMessage(open.id, userId, text);
        reply = `${reply}\n\n${second.reply}`;
      }
    } else if (route === 'answer-in-the-check-in' && userId && open) {
      const r = await this.conversation.sendMessage(open.id, userId, text);
      reply = r.reply + (r.sessionComplete ? '\n\nThat is enough to close this check-in. Reply "finish" to complete it, or keep going.' : '');
      if (/^\s*(finish|complete|done)\s*[.!]?\s*$/i.test(text)) {
        try { await this.conversation.complete(open.id, userId); reply = 'Your check-in is complete and on record. The shared report follows when everyone is in.'; } catch (e: any) { reply = e?.message ?? reply; }
      }
    } else if (who.personId) {
      reply = asATextMessage(await this.assistant.respond(organizationId, who.personId, text));
    } else {
      reply = 'You have no check-in open right now. I will message you here when the next one is ready.';
    }
    await this.whatsapp.sendFor(organizationId, from, reply || 'Noted.');
  }
}
