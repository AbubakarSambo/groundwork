import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { aRequestIsWaiting, aRequestWasDecided } from '../whatsapp/what-goes-to-a-phone';
import { theirRosterEntry } from './a-roster-entry-and-its-sign-in';
import type { AWaitingRequest } from './a-request-in-words';

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
  ) {}

  /** The approver, or every admin when an admin approves. Never the person who asked. */
  async approversOf(organizationId: string, approver: { kind: 'admin' } | { kind: string; userId: string }, personUserId: string): Promise<string[]> {
    if ('userId' in approver && approver.userId) return approver.userId === personUserId ? [] : [approver.userId];
    const admins = await this.prisma.organizationMembership
      .findMany({ where: { organizationId, role: 'ADMIN' }, select: { userId: true } })
      .catch(() => [] as { userId: string }[]);
    return (admins ?? []).map((a) => a.userId).filter((id) => id && id !== personUserId);
  }

  /** Tell each approver that this request waits for them. */
  async waiting(organizationId: string, approverUserIds: string[], request: AWaitingRequest): Promise<void> {
    if (!this.whatsapp) return;
    for (const userId of approverUserIds) {
      try {
        const to = await this.reach(organizationId, userId);
        if (!to.phone) continue;
        const said = aRequestIsWaiting(to.firstName, request.firstName, request.what);
        await this.whatsapp.sendFor(organizationId, to.phone, said.text, { kind: said.kind, params: said.params });
      } catch (err: any) {
        this.logger.warn(`Could not tell an approver about a ${request.kind} request: ${err?.message}`);
      }
    }
  }

  /** Tell the person what was decided about their own request, and by whom. True when it went. */
  async decided(organizationId: string, request: AWaitingRequest, outcome: 'approved' | 'declined', deciderUserId: string): Promise<boolean> {
    if (!this.whatsapp || !request.personUserId) return false;
    try {
      const to = await this.reach(organizationId, request.personUserId);
      if (!to.phone) return false;
      const decider = await this.prisma.user.findUnique({ where: { id: deciderUserId }, select: { firstName: true } }).catch(() => null);
      const said = aRequestWasDecided(to.firstName ?? request.firstName, request.what, outcome, decider?.firstName);
      return (await this.whatsapp.sendFor(organizationId, to.phone, said.text, { kind: said.kind, params: said.params })).sent;
    } catch (err: any) {
      this.logger.warn(`Could not tell somebody their ${request.kind} request was decided: ${err?.message}`);
      return false;
    }
  }

  /** A sign-in's first name, for the words; never an address. */
  async firstNameOf(userId: string): Promise<string> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } }).catch(() => null);
    return u?.firstName?.trim() || '';
  }

  /** Their WhatsApp number and first name: the roster's number first, then the one they typed into Settings. */
  async reach(organizationId: string, userId: string): Promise<{ phone: string | null; firstName: string | null }> {
    const entry = await theirRosterEntry(this.prisma, organizationId, userId, { phone: true, givenName: true }).catch(() => null);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, phoneNumber: true, deletedAt: true } }).catch(() => null);
    if (user?.deletedAt) return { phone: null, firstName: null };
    return { phone: entry?.phone ?? user?.phoneNumber ?? null, firstName: user?.firstName?.trim() || entry?.givenName?.trim() || null };
  }
}
