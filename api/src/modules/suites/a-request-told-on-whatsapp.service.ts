import { theOrganisationsZone } from '../../common/the-organisations-own-day';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { EmailService } from '../email/email.service';
import { aRequestIsWaiting, aRequestWasDecided } from '../whatsapp/what-goes-to-a-phone';
import { theirRosterEntry } from './a-roster-entry-and-its-sign-in';
import type { AWaitingRequest } from './a-request-in-words';
import { SUITE_OF_A_REQUEST, recordIt } from './a-request-is-recorded';
import { aReasonSaid, inQuotes } from './a-question-about-a-request';
import { ApprovalsQueueService } from './the-approvals-queue.service';
import { itIsQuietNow, theSummaryByEmail, theSummaryOnWhatsApp, theSummaryParagraph } from './the-approvals-summary';
import { NOT_TODAY, THEY_SAID_NOT_NOW } from '../whatsapp/a-message-outside-the-window';
import { theirApprovedLeave, fallsInLeave } from './who-is-away';

/**
 * A REQUEST, TOLD ON WHATSAPP (decision 82, item 1).
 *
 * When a leave, hours or spending request is sent (after the person confirmed it), the one who
 * approves it is told on WhatsApp; when it is decided, the person who asked is told. In the app the
 * approver already reads it on Today ("Amina asked for leave ... It is waiting for you to approve."),
 * and the person reads the decision under their own leave, hours or spending.
 *
 * Every send goes through the WhatsApp sender, which keeps every rule in one place: STOP, the add-on
 * and the month's limit, the 24 hours (outside them only the approved template goes, and while it is
 * not approved the send is recorded as not sent), and how often Groundwork writes first
 * (`howOftenToday`). The approver's message counts towards that; the person's is a reply to their own
 * request, so it does not (a-message-outside-the-window.ts says why).
 *
 * Never throws into the request or the decision it follows: a message that could not go is recorded,
 * and the request stands.
 */
@Injectable()
export class ARequestToldOnWhatsApp {
  private readonly logger = new Logger(ARequestToldOnWhatsApp.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly whatsapp?: WhatsAppService,
    /* Decision 106 item 7: a decision that cannot go by WhatsApp goes by email. */
    @Optional() private readonly mailer?: EmailService,
    /* How many requests wait for an approver: with two or more, one summary is sent and not one message each (the-approvals-summary.ts). */
    @Optional() private readonly queue?: ApprovalsQueueService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  /** The approver, or every admin when an admin approves. Never the person who asked. */
  async approversOf(organizationId: string, approver: { kind: 'admin' } | { kind: string; userId: string }, personUserId: string): Promise<string[]> {
    if ('userId' in approver && approver.userId) return approver.userId === personUserId ? [] : [approver.userId];
    const admins = await this.prisma.organizationMembership
      .findMany({ where: { organizationId, role: 'ADMIN' }, select: { userId: true } })
      .catch(() => [] as { userId: string }[]);
    return (admins ?? []).map((a) => a.userId).filter((id) => id && id !== personUserId);
  }

  /**
   * Tell each approver that this request waits for them, straight away (decision 92). It is never held for a summary, and is not the
   * person's one message of the day. Requests that arrive together are said once instead (`waitingMany`).
   */
  async waiting(organizationId: string, approverUserIds: string[], request: AWaitingRequest): Promise<void> {
    if (!this.whatsapp) return;
    for (const userId of approverUserIds) {
      try {
        const to = await this.reach(organizationId, userId);
        if (!to.phone) continue;
        const said = aRequestIsWaiting(to.firstName, request.firstName, request.what);
        const sent = await this.whatsapp.sendFor(organizationId, to.phone, said.text, { kind: said.kind, params: said.params });
        /* One record of who did what (decision 85, build step 5): told, only when it went. */
        if (sent?.sent) await recordIt(this.prisma, { organizationId, suite: SUITE_OF_A_REQUEST[request.kind], ref: request.ref, kind: 'told', toUserId: userId, basis: { message: said.kind } });
      } catch (err: any) {
        this.logger.warn(`Could not tell an approver about a ${request.kind} request: ${err?.message}`);
      }
    }
  }

  /**
   * Several requests arrived together (the clock passing them on, once a day). An approver whom one of them waits for is told as
   * before, at once; an approver whom two or more wait for is told once for all of it, at once, and not once for each. Hours are not
   * in this: they are told straight away by the time sheets.
   */
  async waitingMany(organizationId: string, batch: { approverUserIds: string[]; request: AWaitingRequest }[], now: Date = new Date()): Promise<void> {
    const byApprover = new Map<string, AWaitingRequest[]>();
    for (const b of batch) for (const id of b.approverUserIds) byApprover.set(id, [...(byApprover.get(id) ?? []), b.request]);
    const many = [...byApprover].filter(([, rs]) => rs.length >= 2).map(([id]) => id);
    for (const [userId, requests] of byApprover) {
      if (requests.length === 1) { await this.waiting(organizationId, [userId], requests[0]); continue; }
    }
    if (!many.length) return;
    try {
      const everyone = this.queue ? await this.queue.whatWaitsForEveryone(organizationId, now) : null;
      for (const userId of many) {
        const mine = everyone?.get(userId);
        if (mine) await this.summarise(organizationId, userId, mine, now);
      }
    } catch (err: any) {
      this.logger.warn(`Could not tell approvers what waits for them: ${err?.message}`);
    }
  }

  /**
   * WHAT WAITS FOR ONE APPROVER, SAID ONCE. On WhatsApp when it can go (STOP, the 24 hours, the approved template and how often
   * Groundwork writes first are the sender's; this is not counted as the person's message of the day), otherwise by email, never both. Held, with nothing sent and nothing recorded, in
   * the person's quiet hours, on leave, or when they said "Not now": the next morning tries again.
   * Each request it covers is recorded as told, so the next summary is only of what has not been said yet.
   */
  async summarise(
    organizationId: string, userId: string,
    mine: { counts: { all: number; leave: number; spend: number; pastTheDeadline: number }; refs: { suite: 'leave' | 'spend'; id: string }[]; oldestWorkingDays: number },
    now: Date = new Date(),
  ): Promise<'whatsapp' | 'email' | 'held' | 'nothing'> {
    if (!mine.counts.all) return 'held';
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, deletedAt: true } }).catch(() => null);
    if (!user || user.deletedAt) return 'nothing';
    if (fallsInLeave(now, await theirApprovedLeave(this.prisma, userId, organizationId))) return 'held';
    /* Quiet hours are where the person is: their own time zone when the directory has one (decision 83), else the organisation's (release plan Part 0). */
    const reach = await this.reach(organizationId, userId);
    if (itIsQuietNow(now, reach.timezone ?? (await theOrganisationsZone(this.prisma as any, organizationId).catch(() => null)))) return 'held';
    /* Only what has not been said to this person yet. */
    const told = await this.prisma.suiteEvent.findMany({ where: { organizationId, kind: 'told', toUserId: userId, ref: { in: mine.refs.map((r) => r.id) } }, select: { ref: true } }).catch(() => []);
    const said = new Set((told ?? []).map((t) => t.ref));
    const fresh = mine.refs.filter((r) => !said.has(r.id));
    if (!fresh.length) return 'nothing';
    const paragraph = theSummaryParagraph(mine.counts, mine.oldestWorkingDays);
    const base = (this.config?.get<string>('resend.frontendUrl') || '').replace(/\/$/, '');
    const link = `${base}/today`;
    let how: 'whatsapp' | 'email' | null = null;
    if (this.whatsapp && reach.phone) {
      const m = theSummaryOnWhatsApp(user.firstName, paragraph, link);
      const sent = await this.whatsapp.sendFor(organizationId, reach.phone, m.text, { kind: m.kind, params: m.params });
      if (sent?.sent) how = 'whatsapp';
      /* Held by how often Groundwork writes first, or by "Not now": that is the person's day, not a reason to email. */
      else if (sent?.error === NOT_TODAY || sent?.error === THEY_SAID_NOT_NOW) return 'held';
    }
    if (!how && this.mailer && user.email) {
      const m = theSummaryByEmail(user.firstName, paragraph);
      try { await this.mailer.sendApprovalsSummary(user.email, m.subject, m.greeting, m.paragraph, link); how = 'email'; } catch (err: any) { this.logger.warn(`Could not email what waits for an approver: ${err?.message}`); }
    }
    if (!how) return 'nothing';
    for (const r of fresh) {
      await recordIt(this.prisma, { organizationId, suite: r.suite, ref: r.id, kind: 'told', toUserId: userId, basis: { message: how === 'email' ? 'requests-waiting:email' : 'requests-waiting' } });
    }
    return how;
  }

  /** The morning sweep: every approver something waits for whom nothing has been said about yet, each once. */
  async theMorningSweep(now: Date = new Date()): Promise<{ whatsapp: number; email: number; held: number }> {
    const out = { whatsapp: 0, email: 0, held: 0 };
    if (!this.queue) return out;
    const orgs = await this.prisma.organizationSuite.findMany({ where: { suite: { in: ['leave', 'spend'] }, isOn: true }, select: { organizationId: true } }).catch(() => []);
    for (const organizationId of [...new Set((orgs ?? []).map((o) => o.organizationId))]) {
      try {
        const everyone = await this.queue.whatWaitsForEveryone(organizationId, now);
        for (const [userId, mine] of everyone) {
          const how = await this.summarise(organizationId, userId, mine, now);
          if (how === 'whatsapp') out.whatsapp += 1; else if (how === 'email') out.email += 1; else if (how === 'held') out.held += 1;
        }
      } catch (err: any) {
        this.logger.warn(`Could not tell the approvers of one organisation what waits for them: ${err?.message}`);
      }
    }
    return out;
  }

  /**
   * Tell the person what was decided about their own request, and by whom. True when it went. A reason
   * given with a decline is said inside the 24 hours (decision 85, build step 7): "Hi Aisha, your request
   * for leave on Monday 5 October was declined by Wairimu. Wairimu said, “Sales is two short that day.”
   * Open Groundwork to read it." Outside them the approved template goes as before, and the reason is
   * read in the app.
   */
  async decided(organizationId: string, request: AWaitingRequest, outcome: 'approved' | 'declined', deciderUserId: string, reason?: string | null): Promise<boolean> {
    if (!request.personUserId) return false;
    const sent = this.whatsapp ? await this.decidedOnWhatsApp(organizationId, request, outcome, deciderUserId, reason) : false;
    /*
     * STOP STOPS WHATSAPP, NOT THE DECISION (decision 106 item 7). "Leave and spending decisions still
     * reach you by email" is in the sentence a person reads when they say STOP, so it has to be true:
     * whenever the WhatsApp message did not go, for whatever reason, the same sentence goes by email.
     */
    if (!sent) await this.decidedByEmail(organizationId, request, outcome, deciderUserId, reason);
    return sent;
  }

  private async decidedByEmail(organizationId: string, request: AWaitingRequest, outcome: 'approved' | 'declined', deciderUserId: string, reason?: string | null): Promise<void> {
    if (!this.mailer || !request.personUserId) return;
    try {
      const person = await this.prisma.user.findUnique({ where: { id: request.personUserId }, select: { email: true, firstName: true, deletedAt: true } });
      if (!person || person.deletedAt) return;
      const decider = await this.prisma.user.findUnique({ where: { id: deciderUserId }, select: { firstName: true } }).catch(() => null);
      const said = aRequestWasDecided(person.firstName?.trim() || request.firstName, request.what, outcome, decider?.firstName);
      const sentence = outcome === 'declined' && reason?.trim()
        ? said.text.replace(/ Open Groundwork to read it\.$/, ` ${aReasonSaid(decider?.firstName?.trim() || 'They', reason)} Open Groundwork to read it.`)
        : said.text;
      await this.mailer.sendRequestDecided(person.email, sentence, request.what, outcome);
      await recordIt(this.prisma, { organizationId, suite: SUITE_OF_A_REQUEST[request.kind], ref: request.ref, kind: 'told', toUserId: request.personUserId, basis: { message: `${said.kind}:email` } });
    } catch (err: any) {
      this.logger.warn(`Could not email somebody that their ${request.kind} request was decided: ${err?.message}`);
    }
  }

  private async decidedOnWhatsApp(organizationId: string, request: AWaitingRequest, outcome: 'approved' | 'declined', deciderUserId: string, reason?: string | null): Promise<boolean> {
    if (!this.whatsapp || !request.personUserId) return false;
    try {
      const to = await this.reach(organizationId, request.personUserId);
      if (!to.phone) return false;
      const decider = await this.prisma.user.findUnique({ where: { id: deciderUserId }, select: { firstName: true } }).catch(() => null);
      const said = aRequestWasDecided(to.firstName ?? request.firstName, request.what, outcome, decider?.firstName);
      const withReason = outcome === 'declined' && reason?.trim()
        ? said.text.replace(/ Open Groundwork to read it\.$/, ` ${aReasonSaid(decider?.firstName?.trim() || 'They', reason)} Open Groundwork to read it.`)
        : said.text;
      const sent = (await this.whatsapp.sendFor(organizationId, to.phone, withReason, { kind: said.kind, params: said.params })).sent;
      /* One record of who did what (decision 85, build step 5): told, only when it went. */
      if (sent) await recordIt(this.prisma, { organizationId, suite: SUITE_OF_A_REQUEST[request.kind], ref: request.ref, kind: 'told', toUserId: request.personUserId, basis: { message: said.kind } });
      return sent;
    } catch (err: any) {
      this.logger.warn(`Could not tell somebody their ${request.kind} request was decided: ${err?.message}`);
      return false;
    }
  }

  /**
   * THE PERSON WHO DECIDES ASKED A QUESTION (decision 85, build step 7). The person who asked for the
   * leave is told, as a reply to their own request, so it does not count towards Groundwork's one
   * message of the day. Inside the 24 hours they read the question itself: "Hi Aisha, Wairimu has a
   * question about your request for leave from Monday 12 October to Friday 16 October. Wairimu asked,
   * “Who will cover the Project X milestone?” You can reply here with your answer, or answer it in
   * Groundwork. Your request is still waiting for Wairimu to decide." Outside them, until a template of
   * its own is approved (docs/whatsapp-templates.md), the approved `groundwork_request_decided`
   * template goes with "asked about": "Hi Aisha, your request for leave from ... was asked about by
   * Wairimu. Open Groundwork to read it." A reply here reaches the question: with no check-in open it
   * goes to Ask Groundwork, which says it back as the answer; with a check-in open, Groundwork asks once
   * "Is this your answer to Wairimu's question about your leave?" before it goes anywhere. True when
   * it went.
   */
  async asked(organizationId: string, request: AWaitingRequest, askerUserId: string, question: string): Promise<boolean> {
    if (!this.whatsapp || !request.personUserId) return false;
    try {
      const to = await this.reach(organizationId, request.personUserId);
      if (!to.phone) return false;
      const asker = (await this.firstNameOf(askerUserId)) || 'The person who decides it';
      const said = aRequestWasDecided(to.firstName ?? request.firstName, request.what, 'asked about' as never, asker);
      const text = `Hi ${to.firstName?.trim() || request.firstName || 'there'}, ${asker} has a question about your request for ${request.what}. ${asker} asked, ${inQuotes(question)} You can reply here with your answer, or answer it in Groundwork. Your request is still waiting for ${asker} to decide.`;
      const sent = (await this.whatsapp.sendFor(organizationId, to.phone, text, { kind: said.kind, params: said.params })).sent;
      if (sent) await recordIt(this.prisma, { organizationId, suite: SUITE_OF_A_REQUEST[request.kind], ref: request.ref, kind: 'told', toUserId: request.personUserId, basis: { message: 'request-question' } });
      return sent;
    } catch (err: any) {
      this.logger.warn(`Could not tell somebody about a question on their ${request.kind} request: ${err?.message}`);
      return false;
    }
  }

  /**
   * THE PERSON ANSWERED (decision 85, build step 7). Whoever asked is told, as one of the messages
   * Groundwork starts: "Hi Wairimu, Aisha has answered your question about Aisha's leave from Monday 12
   * October to Friday 16 October. Aisha said, “Brian will cover it.” Reply here to approve or decline it,
   * or open Groundwork to read it first." Outside the 24 hours the approved `groundwork_request_waiting`
   * template goes, which says the request waits for them.
   */
  async answered(organizationId: string, askerUserId: string, request: AWaitingRequest, answer: string): Promise<boolean> {
    if (!this.whatsapp) return false;
    try {
      const to = await this.reach(organizationId, askerUserId);
      if (!to.phone) return false;
      const said = aRequestIsWaiting(to.firstName, request.firstName, request.what);
      const text = `Hi ${to.firstName?.trim() || 'there'}, ${request.firstName || 'The person'} has answered your question about ${request.thing}. ${request.firstName || 'They'} said, ${inQuotes(answer)} Reply here to approve or decline it, or open Groundwork to read it first.`;
      const sent = (await this.whatsapp.sendFor(organizationId, to.phone, text, { kind: said.kind, params: said.params })).sent;
      if (sent) await recordIt(this.prisma, { organizationId, suite: SUITE_OF_A_REQUEST[request.kind], ref: request.ref, kind: 'told', toUserId: askerUserId, basis: { message: 'request-answered' } });
      return sent;
    } catch (err: any) {
      this.logger.warn(`Could not tell somebody a question was answered: ${err?.message}`);
      return false;
    }
  }

  /** A sign-in's first name, for the words; never an address. */
  async firstNameOf(userId: string): Promise<string> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } }).catch(() => null);
    return u?.firstName?.trim() || '';
  }

  /** Their WhatsApp number and first name: the roster's number first, then the one they typed into Settings. */
  async reach(organizationId: string, userId: string): Promise<{ phone: string | null; firstName: string | null; timezone?: string | null }> {
    const entry = await theirRosterEntry(this.prisma, organizationId, userId, { phone: true, givenName: true, timezone: true }).catch(() => null);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, phoneNumber: true, deletedAt: true } }).catch(() => null);
    if (user?.deletedAt) return { phone: null, firstName: null };
    return { phone: entry?.phone ?? user?.phoneNumber ?? null, firstName: user?.firstName?.trim() || entry?.givenName?.trim() || null, timezone: entry?.timezone ?? null };
  }
}
