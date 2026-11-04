import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { GroundworkEvents, OrgSignedUpEvent, ApiAccessAskedEvent, CallAskedEvent } from '../../common/events';
import { isOneOfUs, recipients, theBackOfficeRoster, RosterAccount, WHAT_A_CALL_IS_ABOUT } from './the-team-is-told';

/**
 * THE TEAM IS TOLD. Three events, one mail each, to everybody on the back-office roster. Recipients
 * are read from the roster on every event, so connecting an account is enough to start receiving
 * them. Best-effort throughout: nothing a customer does waits on our own mail.
 */
@Injectable()
export class TheTeamIsToldService {
  private readonly logger = new Logger(TheTeamIsToldService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  private roster(): Promise<RosterAccount[]> {
    return theBackOfficeRoster(this.prisma);
  }

  private app(path: string) {
    return `${(this.config.get<string>('app.frontendUrl') ?? '').replace(/\/$/, '')}${path}`;
  }

  private async tell(subject: string, lines: string[], link: { label: string; url: string }, roster?: RosterAccount[]) {
    const to = recipients(roster ?? (await this.roster()));
    if (!to.length) { this.logger.warn(`Nobody on the back-office roster has an account; "${subject}" told nobody.`); return; }
    for (const address of to) await this.email.sendTeamAlert(address, subject, lines, link.label, link.url);
    this.logger.log(`"${subject}" told ${to.length} on the back office.`);
  }

  @OnEvent(GroundworkEvents.ORG_SIGNED_UP)
  async onOrgSignedUp(e: OrgSignedUpEvent) {
    try {
      const roster = await this.roster();
      if (isOneOfUs({ id: e.organizationId, adminEmail: e.adminEmail }, roster)) return;
      await this.tell(
        `New organisation: ${e.organizationName}`,
        [`${e.adminEmail} signed up and opened ${e.organizationName}.`],
        { label: 'See organisations', url: this.app('/admin') },
        roster,
      );
    } catch (err: any) { this.logger.warn(`org.signedUp alert failed: ${err?.message}`); }
  }

  @OnEvent(GroundworkEvents.API_ACCESS_ASKED)
  async onApiAccessAsked(e: ApiAccessAskedEvent) {
    try {
      const [org, who] = await Promise.all([
        this.prisma.organization.findUnique({ where: { id: e.organizationId }, select: { name: true } }),
        this.prisma.user.findUnique({ where: { id: e.askedByUserId }, select: { email: true } }),
      ]);
      await this.tell(
        `API access asked for: ${org?.name ?? 'an organisation'}`,
        [`${who?.email ?? 'Somebody'} at ${org?.name ?? 'an organisation'} asked to connect. They said:`, `"${e.whatFor}"`],
        { label: 'Decide', url: this.app('/admin/api-access') },
      );
    } catch (err: any) { this.logger.warn(`apiAccess.asked alert failed: ${err?.message}`); }
  }

  @OnEvent(GroundworkEvents.CALL_ASKED)
  async onCallAsked(e: CallAskedEvent) {
    try {
      /* A public request has no account or organisation row to read; it names itself. */
      const [org, who] = await Promise.all([
        e.organizationId ? this.prisma.organization.findUnique({ where: { id: e.organizationId }, select: { name: true } }) : null,
        e.askedByUserId ? this.prisma.user.findUnique({ where: { id: e.askedByUserId }, select: { email: true } }) : null,
      ]);
      const orgName = org?.name ?? e.requester?.orgName ?? 'an organisation';
      const whoAsked = who?.email ?? (e.requester ? `${e.requester.name} (${e.requester.email})` : 'Somebody');
      const about = WHAT_A_CALL_IS_ABOUT[e.subject] ?? e.subject.toLowerCase();
      await this.tell(
        `Asked for ${about}: ${orgName}`,
        [`${whoAsked} at ${orgName} asked for ${about}.`, ...(e.note ? [`They wrote: "${e.note}"`] : [])],
        { label: 'See requests', url: this.app('/ops/requests') },
      );
    } catch (err: any) { this.logger.warn(`call.asked alert failed: ${err?.message}`); }
  }
}
