import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CheckInStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationService } from '../conversation/conversation.service';
import { GroundsService } from '../grounds/grounds.service';
import { whoThePanelIsSignedInAs } from './who-the-panel-is-signed-in-as';

/**
 * RUNNING A CHECK-IN FROM SOMEBODY ELSE'S APPLICATION.
 *
 * The one thing this product is — people asked separately, answers released
 * together — and the one thing the API could not do. A customer could push
 * every objective, read every report, and never hold a single session.
 *
 * IT ADDS NO RULES. Every refusal below this line belongs to the conversation
 * service and stays there: whose check-in it is, whether it is already
 * complete, whether the ground still takes input. This resolves who is asking
 * and then calls the same code the product's own screen calls, because a second
 * implementation of "may this person read this conversation" is how one of them
 * eventually says yes when the other says no.
 */
@Injectable()
export class ACheckInACustomerCanRunService {
  private readonly logger = new Logger(ACheckInACustomerCanRunService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversation: ConversationService,
    private readonly grounds: GroundsService,
  ) {}

  /**
   * Which account this panel person acts as.
   *
   * Links it on first success, so the address match happens once rather than on
   * every message — and so that a later change of address does not silently
   * move somebody's check-ins to a different account.
   */
  async actingAs(organizationId: string, personId: string): Promise<string> {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { id: true, externalId: true, email: true, linkedUserId: true },
    });
    if (!person) throw new NotFoundException('We cannot see that person in your organisation.');

    if (person.linkedUserId) return person.linkedUserId;

    /* Scoped to the organisation by the query, not by the rule. An account from
       another organisation must never reach the matching at all. */
    const accounts = await this.prisma.user.findMany({
      where: { organizationId },
      select: { id: true, email: true },
    });

    const who = whoThePanelIsSignedInAs(person, accounts);
    if (!who.linked) throw new BadRequestException(who.because);

    await this.prisma.person.update({
      where: { id: person.id },
      data: { linkedUserId: who.userId },
    });
    this.logger.log(`Linked ${person.externalId} to their account by address.`);

    return who.userId;
  }

  /**
   * WHAT IS WAITING FOR THEM, which is the route without which none of the
   * others can be called: a customer's page has a person, not a check-in id.
   */
  async whatIsWaitingFor(organizationId: string, personId: string) {
    const userId = await this.actingAs(organizationId, personId);

    const person = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { email: true },
    });

    /*
     * MATCHED BY ACCOUNT **OR** BY THE ADDRESS THE INVITATION WENT TO.
     *
     * A participant is linked to an account only when somebody ACCEPTS their
     * invitation. Until then the row carries their email and no `userId` — so a
     * query on the account alone told a person with a session sitting there that
     * nothing was waiting. Found on our own organisation: a check-in available
     * now, and the panel would have shown an empty list.
     *
     * The unaccepted ones are returned SEPARATELY and are not openable. Linking
     * them here would be the system accepting an invitation on somebody's
     * behalf, and accepting is the act by which a person agrees to take part —
     * it is not a formality to route around because it is in the way.
     */
    const checkIns = await this.prisma.checkIn.findMany({
      where: {
        participant: {
          ground: { organizationId },
          OR: [
            { userId },
            ...(person?.email ? [{ userId: null, email: person.email }] : []),
          ],
        },
        status: { in: [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS] },
      },
      include: { participant: { include: { ground: { select: { id: true, label: true, scenario: true } } } } },
      orderBy: { availableFrom: 'asc' },
    });

    const notAcceptedYet = checkIns.filter((c) => c.participant.userId === null);
    const theirs = checkIns.filter((c) => c.participant.userId !== null);

    return {
      /* Said rather than hidden. A person on the roster with a session sitting
         there, shown an empty list, concludes the product has nothing for them —
         which is the opposite of true and the harder mistake to recover from. */
      invitationNotAccepted: notAcceptedYet.map((c) => ({
        ground: { id: c.participant.ground.id, label: c.participant.ground.label },
        says: 'There is a check-in for you here, and the invitation has not been accepted yet. Accepting is how somebody agrees to take part, so it is not something this can do for them.',
      })),
      waiting: theirs
        .filter((c) => !c.availableFrom || c.availableFrom <= new Date())
        .map((c) => ({
          checkInId: c.id,
          sessionNumber: c.sessionNumber,
          status: c.status,
          ground: {
            id: c.participant.ground.id,
            label: c.participant.ground.label,
            scenario: c.participant.ground.scenario,
          },
        })),
      /* Said separately. A session that has not opened yet is not the same fact
         as having nothing to do, and a panel showing one as the other teaches
         somebody to stop looking. */
      notYet: theirs
        .filter((c) => c.availableFrom && c.availableFrom > new Date())
        .map((c) => ({
          checkInId: c.id,
          sessionNumber: c.sessionNumber,
          opensAt: c.availableFrom,
          ground: {
            id: c.participant.ground.id,
            label: c.participant.ground.label,
            scenario: c.participant.ground.scenario,
          },
        })),
    };
  }

  /**
   * GROUNDS THIS PERSON IS THE NAMED LEAD OF, WAITING ON THEM TO CONFIRM.
   *
   * A ground created through this API is created FOR a lead, and it sits at
   * AWAITING_LEAD until that person has read the context somebody set up for
   * them and said yes. Nothing happens before that — no session opens, nobody
   * is asked anything.
   *
   * There was no way to do it here, so a customer could create a ground from
   * their own system and the named lead had to log into OUR application to
   * start it. Found on our own organisation: one ground, stuck at
   * AWAITING_LEAD, which is why nobody in this company has ever run a check-in
   * in the product this company sells.
   */
  async whatIsWaitingOnYouToStart(organizationId: string, personId: string) {
    const userId = await this.actingAs(organizationId, personId);

    const grounds = await this.prisma.ground.findMany({
      where: { organizationId, initiatorId: userId, status: 'AWAITING_LEAD' },
      select: { id: true, label: true, scenario: true, brief: true, timelineDays: true },
    });

    return grounds.map((g) => ({
      groundId: g.id,
      label: g.label,
      scenario: g.scenario,
      /* What somebody else wrote for them to read. It is the thing being
         confirmed, so it is returned rather than summarised. */
      brief: g.brief,
      timelineDays: g.timelineDays,
      says: 'This was set up for you and has not started. Read what it says, change it if it is wrong, and confirm it — nothing is asked of anybody until you do.',
    }));
  }

  /**
   * The named lead confirms it, and only then does it begin.
   *
   * PANEL-AUTHENTICATED. A machine credential confirming this would be a
   * customer's server deciding on somebody's behalf that they have read the
   * context and agree with it — which is the one thing this step exists to
   * prevent, and it names an organisation and nobody in particular.
   */
  async confirmAsLead(
    organizationId: string,
    personId: string,
    groundId: string,
    edits?: { brief?: string; managingOnly?: boolean; remit?: string },
  ) {
    const userId = await this.actingAs(organizationId, personId);

    /* Scoped here as well as inside `confirmLead`, which checks the initiator.
       This one checks the ORGANISATION, which that call has no reason to know
       about and which a machine-facing surface must never leave to the caller. */
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { id: true },
    });
    if (!ground) throw new NotFoundException('No such check-in in your organisation.');

    return this.grounds.confirmLead(groundId, userId, edits);
  }

  async open(organizationId: string, personId: string, checkInId: string) {
    return this.conversation.open(checkInId, await this.actingAs(organizationId, personId));
  }

  async say(organizationId: string, personId: string, checkInId: string, content: string) {
    return this.conversation.sendMessage(checkInId, await this.actingAs(organizationId, personId), content);
  }

  async complete(organizationId: string, personId: string, checkInId: string) {
    return this.conversation.complete(checkInId, await this.actingAs(organizationId, personId));
  }

  async transcript(organizationId: string, personId: string, checkInId: string) {
    return this.conversation.getTranscript(checkInId, await this.actingAs(organizationId, personId));
  }
}
