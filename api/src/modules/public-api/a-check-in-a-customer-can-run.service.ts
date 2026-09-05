import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CheckInStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationService } from '../conversation/conversation.service';
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

    const checkIns = await this.prisma.checkIn.findMany({
      where: {
        participant: { userId, ground: { organizationId } },
        status: { in: [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS] },
      },
      include: { participant: { include: { ground: { select: { id: true, label: true, scenario: true } } } } },
      orderBy: { availableFrom: 'asc' },
    });

    return {
      waiting: checkIns
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
      notYet: checkIns
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
