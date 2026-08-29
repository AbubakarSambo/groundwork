import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from '../grounds/grounds.service';
import { ReportsService } from '../reports/reports.service';

/**
 * OPENING A GROUNDWORK FROM SOMEBODY ELSE'S PRODUCT.
 *
 * The whole point of this file is how LITTLE it does. `GroundsService.createForLead` already opens a
 * ground on behalf of a lead, with participants pre-added by email and their role as described - an
 * admin doing for somebody else exactly what an integration does for its user. So this resolves who
 * is acting and calls it. Nothing about the ground that comes out differs from one opened in the
 * product, which is what makes parity the default rather than something to maintain: no engine
 * downstream asks how a ground was made.
 *
 * THE CALLER MUST NAME A PERSON, and that was a decision rather than a convenience. A machine token
 * carries an organisation and nobody in particular, while a ground has an initiator who is a real
 * person with a real record - somebody whose name appears in a report, who receives the invitations,
 * and whom a participant can ask about it. A token allowed to conjure an initiator would put grounds
 * in the record that nobody opened.
 */
@Injectable()
export class GroundsByApiService {
  private readonly logger = new Logger(GroundsByApiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly grounds: GroundsService,
    private readonly reports: ReportsService,
  ) {}

  /**
   * Their identity system's id for a person, resolved to the account that will own this.
   *
   * By email, which is the only identifier a `Person` and a `User` reliably share. Somebody in the
   * directory who has never signed in has no `User` - and that is a real answer with a fixable
   * cause, so it says which of the two is missing rather than "not found".
   */
  private async actingUser(organizationId: string, personExternalId: string) {
    const person = await this.prisma.person.findFirst({
      where: { organizationId, externalId: personExternalId },
      select: { email: true, displayName: true, active: true },
    });
    if (!person) {
      throw new NotFoundException(
        `No person with externalId "${personExternalId}" has been sent to us. Push them through SCIM first.`,
      );
    }
    if (!person.active) {
      /* A deactivated person opening a check-in is somebody's integration still running after they
         left, and the ground would name them as its initiator for the rest of its life. */
      throw new ForbiddenException('That person is deactivated here, so they cannot open a check-in.');
    }
    if (!person.email) {
      throw new BadRequestException('That person has no email address here, so nobody can be matched to them.');
    }

    const user = await this.prisma.user.findFirst({
      where: { organizationId, email: person.email },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new NotFoundException(
        `${person.displayName ?? personExternalId} is in the directory but has never signed in to Groundwork, `
        + 'so there is no account to open a check-in as.',
      );
    }
    return user;
  }

  /**
   * Open one.
   *
   * The acting person is BOTH the caller's authority and the lead of the ground, which is the shape
   * an integration actually has: Sahar clicking "check in with my team" inside her own product is
   * opening it and leading it. Where those differ, the caller names a separate `leadPersonExternalId`
   * and this becomes the same admin-opens-for-a-lead case the product already supports.
   */
  async open(
    organizationId: string,
    dto: {
      actingPersonExternalId: string;
      leadPersonExternalId?: string;
      label: string;
      scenario: string;
      moment: string;
      mode?: string;
      timelineDays?: number;
      cadence?: string;
      participants?: { personExternalId: string; roleAsDescribed?: string }[];
      leadRemit?: string;
    },
  ) {
    if (!dto?.actingPersonExternalId) throw new BadRequestException('actingPersonExternalId is required.');
    if (!dto?.label?.trim()) throw new BadRequestException('label is required - it is what people see.');
    if (!dto?.scenario) throw new BadRequestException('scenario is required. A check-in without a situation is a form.');

    const acting = await this.actingUser(organizationId, dto.actingPersonExternalId);
    const lead = dto.leadPersonExternalId
      ? await this.actingUser(organizationId, dto.leadPersonExternalId)
      : acting;

    /*
     * Participants by their directory id, resolved to emails here so the caller never has to know
     * anybody's address - their identity system already has it, and an integration passing raw email
     * addresses around is a copy of somebody's contact list nobody asked for.
     */
    const participants: { email: string; roleAsDescribed?: string }[] = [];
    for (const p of dto.participants ?? []) {
      const row = await this.prisma.person.findFirst({
        where: { organizationId, externalId: p.personExternalId, active: true },
        select: { email: true },
      });
      if (!row?.email) {
        throw new NotFoundException(`No active person with externalId "${p.personExternalId}".`);
      }
      participants.push({ email: row.email, roleAsDescribed: p.roleAsDescribed });
    }

    const ground = await this.grounds.createForLead(organizationId, acting.id, {
      leadEmail: lead.email,
      label: dto.label.trim(),
      scenario: dto.scenario as any,
      moment: dto.moment as any,
      ...(dto.mode ? { mode: dto.mode as any } : {}),
      ...(dto.timelineDays ? { timelineDays: dto.timelineDays } : {}),
      ...(dto.cadence ? { cadence: dto.cadence as any } : {}),
      ...(dto.leadRemit ? { leadRemit: dto.leadRemit } : {}),
      participants,
    } as any);

    this.logger.log(`Ground opened by API for org ${organizationId} as ${dto.actingPersonExternalId}.`);
    return ground;
  }

  /**
   * THE REPORT, READ AS SOMEBODY IN PARTICULAR.
   *
   * The caller names whose eyes it is being fetched through, and it comes back as exactly what that
   * person would see signed in - a party gets the party view, an admin gets the admin view, somebody
   * with no standing gets refused.
   *
   * This is the point. A machine token carries an organisation and nobody in particular, so treating
   * it as an org admin would make the API a way to read everybody's synthesis with a credential that
   * belongs to no one - a permission no human in the customer's company has. Naming the reader means
   * the API can never see more than a person could, and the audit trail says who it was for.
   */
  async report(organizationId: string, groundId: string, asPersonExternalId: string) {
    if (!asPersonExternalId) {
      throw new BadRequestException(
        'as is required: name the person this report is being read for. The API reads as somebody, never as nobody.',
      );
    }
    const user = await this.actingUser(organizationId, asPersonExternalId);
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { id: true },
    });
    /* Scoped, so a guessed id from another tenant resolves to nothing rather than to their ground. */
    if (!ground) throw new NotFoundException('No such check-in.');

    return this.reports.get(groundId, user.id, organizationId);
  }

}
