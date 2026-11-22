/**
 * THE TEAM LOOP, JOINED TO NEST AND TO THE CHANNELS (Fatima, increment 6a). The decisions are in the plain files next to this one, each tested with
 * local fakes. This class gives them the real prisma, the one mail door and the one WhatsApp gate, the model seam, and the schedule.
 *
 * Mail goes through EmailService and WhatsApp through WhatsAppService.sendFor, whose own rules (the window and the template, quiet hours, STOP, the
 * day's one routine message) hold as well. A message held for the night counts as taken here, because it goes in the morning.
 */
import { asEvidence, recently, remember, theLastHelpWasAsking } from './the-conversation-so-far';
import { CONTACT_PREFIX } from '../executive-onboarding/a-team-members-reply';
import { theWordsInDoubt } from '../voice/the-transcriber';
import { theThingOf } from '../outstanding/a-promise-as-a-task';
import { isATable } from './a-table-is-not-a-claim';
import { theQuietHoursNow } from '../../common/the-clock';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { PromptsService } from '../prompts/prompts.service';
import { QUIET_HOURS_HELD } from '../whatsapp/quiet-hours-are-the-organisations';
import { theAddressForHer } from '../executive-onboarding/onboard-an-executive';
import { whoIsSpeakingForWhom } from '../executive-onboarding/her-words';
import { GeminiTeamMind, TEAM_MIND, aReplyToThemMadeSafe, isTheirOwnWords, whatTheyAreToldTheySaidIsTheirs, type TheTeamMind, type AFact } from './the-team-mind';
import { whatTheySaid } from './the-plain-reading';
import { turnTheirReplyIntoTheirCheckIn, theirWorkNow, thePersonBehind, type TheirCheckIn } from './what-their-reply-says';
import { NOTHING_ABOUT_OTHERS } from './the-team-words';
import { helpTheTeamMember } from './help-the-team-member';
import { nudgeWhereItHelps, theApproverNamed, type TheNudgePorts } from './a-nudge-that-helps';
import { hearAStandingInstruction, runTheStandingInstructions, theTeamSheMayAsk, type TheStandingPorts } from './standing-instructions';
import { checkACorrectionOnTheTeamsWork } from './their-corrections';
import { mightBeACorrection } from './a-cheap-look';

const HELD = QUIET_HOURS_HELD(new Date(0)).split(';')[0];

@Injectable()
export class TeamLoopService {
  private readonly logger = new Logger(TeamLoopService.name);
  private readonly mind: TheTeamMind;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly whatsapp: WhatsAppService,
    @Optional() @Inject(TEAM_MIND) mind?: TheTeamMind,
    @Optional() private readonly anthropic?: AnthropicService,
    @Optional() private readonly prompts?: PromptsService,
  ) {
    this.mind = mind ?? new GeminiTeamMind(anthropic, prompts);
  }

  private get db(): any { return this.prisma as any; }

  private ports(): TheNudgePorts & TheStandingPorts {
    return {
      whatsapp: {
        send: async (a) => {
          const r = await this.whatsapp.sendFor(a.organizationId, a.phone, a.text, { kind: a.kind as any, ...(a.sendKey ? { sendKey: a.sendKey } : {}) });
          /* Held for the night is taken: it goes in the morning from the held queue. One the gate refused is not, so it is tried again. */
          return { sent: !!r.sent || String(r.error ?? '').startsWith(HELD), error: r.error };
        },
      },
      email: {
        send: (a) => this.email.sendTheRoutineMessageByEmail(a.to, a.subject, a.text, null, null, undefined, a.replyTo || undefined, a.askKey),
        /* The one mail door refuses a second mail with the same key, which is what makes each cycle's email go once. */
        sendOnce: (a) => this.email.sendTheIntroduction(a.to, a.subject, a.text, a.replyTo, a.sendKey),
      },
      replyTo: (organizationId) => theAddressForHer(this.db, organizationId),
      mind: this.mind,
    };
  }

  /** The narrative of a picture, from its facts only. */
  narrate = (facts: AFact[]) => this.mind.narrate({ facts });

  /** A batch a team member sent, read as their check-in. Returns what to say back, or null to let the plain thank-you go. */
  async theirCheckIn(a: { batchId: string; organizationId: string; principalUserId: string; contact: any; now: Date }): Promise<string | null> {
    const batch: any = await this.db.intakeBatch.findFirst({ where: { id: a.batchId } });
    const everything: any[] = (await this.db.principalMaterial.findMany({ where: { principalUserId: a.principalUserId, batchId: a.batchId } })) ?? [];
    const duplicates = everything.filter((r: any) => r.state === 'duplicate').length;
    /* A copy this person sent before, in this or an earlier message, is "exactly as you sent it". A copy only a colleague sent is only "already held": whose it was is never said (Fatima round 4, untrue line 10). */
    let duplicatesOfTheirOwn = 0;
    for (const r of everything.filter((x: any) => x.state === 'duplicate' && x.hash)) {
      const mine: any = await this.db.principalMaterial.findFirst({ where: { principalUserId: a.principalUserId, hash: r.hash, fromUserId: `${CONTACT_PREFIX}${a.contact?.id}`, id: { not: r.id }, batchId: { not: a.batchId } } }).catch(() => null);
      if (mine) duplicatesOfTheirOwn += 1;
    }
    /* Every file that came with this message, whether it was read, was already held, or could not be read: the reply is told, so it never says a file is missing that is there. */
    const files = everything.filter((r: any) => (r.kind === 'file' || r.kind === 'archive') && !r.insideArchive).map((r: any) => ({ name: String(r.fileName), how: r.state === 'duplicate' ? 'already held' : r.state === 'kept' && r.text ? 'read' : r.state === 'kept' ? 'kept, but it has no words to read' : 'could not be read' }));
    const rows: any[] = everything.filter((r: any) => r.state === 'kept' && !!r.text && !isATable(r));
    if (!rows.length) return null;
    /* Words a voice note's transcriber was not sure of are read as heard, never as fact, and the one question back is whether they were heard right (Dangote rerun, N4: "Oked Events" for Orchid). */
    const inDoubt: string[] = [...new Set<string>(rows.filter((r) => r.kind === 'voice' && Array.isArray(r.unsure)).flatMap((r) => r.unsure.map(String)))];
    const asHeard = (r: any) => (r.kind === 'voice' && Array.isArray(r.unsure) ? r.unsure.reduce((t: string, w: any) => t.split(String(w)).join(`${w} (as I heard it, not sure)`), String(r.text)) : String(r.text));
    const items = rows.map((r) => ({ materialId: r.id as string, text: asHeard(r), isDocument: r.kind === 'file' || r.kind === 'archive', at: r.receivedAt ? new Date(r.receivedAt) : undefined }));
    const contactId = String(a.contact?.id ?? '');
    const recent = asEvidence(contactId);
    const done0 = await turnTheirReplyIntoTheirCheckIn(this.db, this.mind, { contact: a.contact, items, now: a.now, since: batch?.openedAt ? new Date(batch.openedAt) : null, recent });
    const done = inDoubt.length ? { ...done0, asked: theWordsInDoubt(inDoubt), reply: theWordsInDoubt(inDoubt) } : done0;
    const said = (await this.aSpecificReply({ batchId: a.batchId, contact: a.contact, items, done, now: a.now, duplicates, duplicatesOfTheirOwn, recent, files })) ?? done.reply;
    for (const i of items) if (!i.isDocument) remember(contactId, { by: 'they', text: i.text });
    if (said) remember(contactId, { by: 'groundwork', text: said });
    return said;
  }

  /**
   * THE REPLY THAT SHOWS IT WAS READ (round 1, issue I-19). Nearly every reply to the team was "thank you, I have noted the 2 things" or a request for proof, whatever
   * they sent. The model now writes the reply from what they actually said and their job: it names the concrete thing, then asks ONE precise question or gives real
   * help, and says kindly where something is only their word. Code still decides what is true and what was recorded (turnTheirReplyIntoTheirCheckIn), gives the
   * model the one question it must ask where code decided one, lets it ask a question of its own at most once for a batch, and falls back to the plain reply
   * whenever the model is off or its words are not safe to send. Null means "use the plain reply".
   */
  private async aSpecificReply(a: { batchId: string; contact: any; items: { text: string; isDocument: boolean }[]; done: TheirCheckIn; now: Date; duplicates?: number; duplicatesOfTheirOwn?: number; recent?: string; files?: { name: string; how: string }[] }): Promise<string | null> {
    if (!this.mind.replyToThem) return null;
    const { work } = await theirWorkNow(this.db, a.contact);
    const person = await thePersonBehind(this.db, a.contact);
    const role: string | null = (await this.db.person?.findFirst?.({ where: { id: person?.id ?? '' }, select: { title: true } }).catch(() => null))?.title ?? null;
    const readings = a.done.readings ?? [];
    const mustSay: string[] = [];
    if (a.done.asked && !a.duplicates) mustSay.push(`Ask them exactly this one thing, in your own words and using their own words: ${a.done.asked}`);
    else mustSay.push('Code requires no question. You may ask one precise question of your own only if something they promised has no firm day, or a name or a number is missing.');
    /* What was really recorded from this reply is handed to the reply as content it must say, so a team member sees what Groundwork did with what they sent and not only a thank-you (Fatima round 8). Only what code wrote is named. */
    const recorded = readings.flatMap((r) => r.commitments.map((c) => theThingOf(c.text) + (c.whenSaid ? ` (${c.whenSaid})` : '')));
    if (recorded.length) mustSay.push(`Code has put ${recorded.length === 1 ? 'this' : 'these'} on their list from what they sent: ${recorded.slice(0, 3).join('; ')}. Say so in one plain sentence, in their words ("I have put ... on your list"), and say you will check with them if it has not moved. Promise nothing else. Ask nothing more unless the day or the name that the item needs is missing from what they wrote.`);
    mustSay.push('You cannot attach, send or forward any file or message in this reply. Never say that anything is attached or sent.');
    if (readings.some((r) => r.asksAboutOthers || r.kind === 'about_others')) mustSay.push('They also ask for something that belongs to somebody else. Say plainly, in one sentence, that you do not tell anybody what somebody else has sent you. Do not offer it.');
    if (a.duplicates) mustSay.push(a.duplicatesOfTheirOwn ? `Something in what they sent is exactly what you already have from them. Say so in one plain sentence ("I already have this exactly as you sent it"), and ask nothing about it.` : `Something in what they sent is a document you already have. Say so in one plain sentence ("I already have this document, so I have not added it again"). Never say who sent it to you, and never say they sent it. Ask nothing about it.`);
    if (readings.some((r) => (r.disputed?.length ?? 0) > 0 || r.disputesWhatWasForwarded)) mustSay.push('They say a figure or a claim is not backed up. Say plainly that you have put that flag on the record and that it is not counted as done or as true until something shows it. Ask only for the one figure or document that would settle it. Never ask them for their findings, and never repeat their own sentence back to them as a question.');
    if (a.items.some((i) => i.isDocument)) mustSay.push('Order the reply this way: first what you recorded or did with what they sent, then in plain words what the document shows, and last the one thing still missing, if there is one. Say only what a document itself states: its payee, reference, amount, date. If you cannot tell from it whether something was paid in full, paid at all, or approved, say "I cannot tell from this whether ..." and do not guess.');
    const hasDocuments = a.items.some((i) => i.isDocument);
    /* Only a result the reader kept with nothing to show it is said to be only their word (Batch F, F5; D13): what code decided, read from what it wrote, not decided again here. */
    if (!hasDocuments && (a.done.wrote.unproven ?? 0) > 0) mustSay.push('They say something is done. Nothing shows it yet, so it is only their word. Say that kindly, without doubting them, and say what would show it, such as the message or the document.');
    if (readings.some((r) => r.blockers.length)) {
      /* Whoever owns something that waits on an approval is never asked to chase the approver: Groundwork asks the approver (a-nudge-that-helps.ts), and the owner is told so. */
      const waitingOn = readings.flatMap((r) => r.blockers.map((b) => b.waitingOn).filter((x): x is string => !!x));
      const contacts: any[] = (await this.db.outreachContact.findMany({ where: { principalUserId: a.contact.principalUserId, state: 'introduced', kind: 'team' } }).catch(() => [])) ?? [];
      const principalFirst = (await this.db.user?.findUnique?.({ where: { id: a.contact.principalUserId }, select: { firstName: true } }).catch(() => null))?.firstName ?? 'Fatima';
      const who = waitingOn.map((w) => theApproverNamed(w, contacts, principalFirst, a.contact)).find((x) => x && x !== 'her');
      mustSay.push(`They say something is stuck. Say plainly what it waits on. Never ask them to follow it up with, chase, remind or contact the person or office it waits on: that is not theirs to do. ${who ? `Say that you will ask ${String(who.name).split(' ')[0]} about it yourself, so they do not need to.` : 'Say that you have noted what it waits on.'}`);
    }
    const text = a.items.map((i) => i.text).join('\n\n');
    const written = aReplyToThemMadeSafe(await this.mind.replyToThem({ files: a.files, recent: a.recent, first: work.first, role, text, said: readings[0] ?? { kind: 'other', commitments: [], outcomes: [], blockers: [], answers: [], vague: null }, work, hasDocuments, plain: a.done.reply, mustSay }).catch(() => null));
    if (!written) return null;
    /* What it says they said, confirmed or promised has to be in their own words: not a document's, not a colleague's (the-team-mind.ts). */
    const ownWords = [...a.items.filter((i) => !i.isDocument).map((i) => i.text), ...recently(String(a.contact?.id ?? '')).filter((s) => s.by === 'they').map((s) => s.text)].join('\n');
    if (!whatTheyAreToldTheySaidIsTheirs(written, ownWords)) return null;
    /* A question of the model's own is allowed once for a batch: the claim is written before it goes, so a second reading of the same batch does not ask again. */
    if (written.includes('?') && !a.done.asked) {
      const claimed = await this.db.informationGap.create({ data: { organizationId: a.contact.organizationId, principalUserId: a.contact.principalUserId, gapKey: `q:reply:${a.batchId}`, what: 'One question about what they sent.', askedOfEmail: a.contact.contactKey, askedOfName: a.contact.name, state: 'asked', askedAt: a.now } }).catch(() => null);
      if (!claimed) return null;
    }
    return written;
  }

  /**
   * A team member's short words, before they are kept as material: a request for help is answered now and privately, and a correction goes through
   * the claim probe. Anything else is null, and is kept and read as their check-in. A correction is about the work, so the caller keeps it on the record as
   * well (`keep.it`); a request for help, or a question about somebody else, is private and is never kept.
   */
  async hearATeamMember(a: { organizationId: string; contact: any; text: string; keep?: { it: boolean } }): Promise<string | null> {
    const text = String(a.text ?? '').trim();
    if (!text || text.length > 600) return null;
    const { work } = await theirWorkNow(this.db, a.contact);
    const contactId = String(a.contact?.id ?? '');
    /* What they wrote before and what was last said to them are read with this message (the-conversation-so-far.ts): "They are the Director and two officers" is the next part of the last request, not news. */
    const recent = asEvidence(contactId);
    const said = await whatTheySaid(this.mind, { text, hasDocuments: false, work, recent });
    remember(contactId, { by: 'they', text });
    const now = theQuietHoursNow();
    if (said.kind === 'help' || said.asksForHelp || (said.continuesTheLast && theLastHelpWasAsking(contactId))) return helpTheTeamMember(this.db, this.mind, { contact: a.contact, message: text, now, recent });
    /* "What did the others say about me?" is answered plainly, and nothing is passed on: what one person sent is never told to another. */
    if (said.kind === 'about_others') return NOTHING_ABOUT_OTHERS(work.first);
    if (said.kind === 'correction' && this.anthropic) {
      if (a.keep) a.keep.it = true;
      return checkACorrectionOnTheTeamsWork(this.db, this.anthropic as any, this.prompts as any, { organizationId: a.organizationId, principalUserId: a.contact.principalUserId, contacts: [a.contact], first: work.first, message: text, now, passOnWhenUnclear: false, whichShowsIt: (x) => this.mind.whichShowsIt(x) }).catch(() => null);
    }
    return null;
  }

  /**
   * Whether what was forwarded hands the team a matter with no owner or no day. Only the one question that follows is built from it, and the matter is shown back
   * only when those are words that were written (never the model's own); nothing is filed, made or sent from the forwarded words.
   */
  async anUnclearMatter(texts: string[]): Promise<{ matter: string | null; missing: ('owner' | 'date')[] } | null> {
    for (const text of texts) {
      const said = await this.mind.readAnInstruction({ text }).catch(() => null);
      if (said?.kind === 'unclear') return { matter: said.matter && isTheirOwnWords(said.matter, text) ? said.matter : null, missing: said.missing ?? ['owner', 'date'] };
    }
    return null;
  }

  /** The model that reads what people mean, for the places that need it (her yes, the people she names): the one seam, so a test or a version stored in the database changes it everywhere. */
  get theMind(): TheTeamMind { return this.mind; }

  /** Her words that are a standing instruction, or her answer to one that is waiting. Null when they are neither. */
  hearAnInstruction(a: { organizationId: string; userId: string | null; message: string; now?: Date; principalUserId?: string }): Promise<string | null> {
    return hearAStandingInstruction(this.db, this.mind, { organizationId: a.organizationId, userId: a.userId, message: a.message, now: a.now ?? theQuietHoursNow(), principalUserId: a.principalUserId });
  }

  /** Her words that are a standing instruction, her yes to one, or a correction of what her team told Groundwork. Null when they are none of those. */
  /* `now` is the clock the caller reads (a test's own day); left out, the API's clock. */
  async hearHer(a: { organizationId: string; userId: string | null; message: string; now?: Date }): Promise<string | null> {
    const instruction = await this.hearAnInstruction(a);
    if (instruction) return instruction;
    return this.hearACorrection(a);
  }

  /** Her words that correct what her team told Groundwork, checked like any claim. Null when they are not that. */
  async hearACorrection(a: { organizationId: string; userId: string | null; message: string }): Promise<string | null> {
    const now = theQuietHoursNow();
    if (!a.userId || !this.anthropic || !mightBeACorrection(a.message)) return null;
    const who = await whoIsSpeakingForWhom(this.db, a.organizationId, a.userId);
    if (!who) return null;
    const team = await theTeamSheMayAsk(this.db, who.principalUserId);
    if (!team.length) return null;
    return checkACorrectionOnTheTeamsWork(this.db, this.anthropic as any, this.prompts as any, { organizationId: a.organizationId, principalUserId: who.principalUserId, contacts: team, first: who.principalFirst, message: a.message, now, passOnWhenUnclear: true, whichShowsIt: (x) => this.mind.whichShowsIt(x) }).catch(() => null);
  }

  /** Every minute: the standing instructions that are due. */
  @Cron('* * * * *', { timeZone: 'UTC' })
  async sweepTheInstructions(): Promise<void> {
    await this.prisma.withAdvisoryLock(CronLock.TEAM_LOOP, async () => {
      const did = await runTheStandingInstructions(this.db, this.ports(), theQuietHoursNow()).catch((err) => { this.logger.warn(`The standing instructions failed: ${err?.message}`); return []; });
      if (did.length) this.logger.log(`Standing instructions did ${did.length} thing(s).`);
    });
  }

  /** Once an hour, a few minutes past: the nudges that help, if there are any. */
  @Cron('7 * * * *', { timeZone: 'UTC' })
  async sweepTheNudges(): Promise<void> {
    await this.prisma.withAdvisoryLock(CronLock.TEAM_LOOP_NUDGES, async () => {
      const run = await nudgeWhereItHelps(this.db, this.ports(), theQuietHoursNow()).catch((err) => { this.logger.warn(`The nudges failed: ${err?.message}`); return null; });
      if (run?.sent.length) this.logger.log(`Sent ${run.sent.length} nudge(s).`);
    });
  }
}
