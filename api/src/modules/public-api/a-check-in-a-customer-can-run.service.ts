import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CheckInStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationService } from '../conversation/conversation.service';
import { GroundsService } from '../grounds/grounds.service';
import { WhatIsTrueService } from '../assistant/what-is-true.service';
import { DocumentsService } from '../documents/documents.service';
import { askWhoItIsFor } from '../assistant/a-document-is-private-until-you-say-otherwise';
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
    private readonly truth: WhatIsTrueService,
    private readonly documents: DocumentsService,
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
  /**
   * WHAT IS WAITING FOR THEM, from the one assembly.
   *
   * This used to query for itself, and was the copy that got it wrong: it
   * matched on the account alone and told somebody with a session in front of
   * them that nothing was waiting, because a participant is linked to an
   * account only when they accept. Three copies of one question, and the one
   * furthest from the chat was the one that drifted.
   */
  async whatIsWaitingFor(organizationId: string, personId: string) {
    /* Still called: it is what LINKS the account, and the assembly reads that
       link rather than making it. Its refusal is also the useful one — a person
       we cannot match to an account gets a sentence, not an empty list. */
    await this.actingAs(organizationId, personId);

    const truth = await this.truth.forPerson(organizationId, personId);
    if (!truth) throw new NotFoundException('We cannot see that person in your organisation.');

    const of = (standing: string) => truth.sessions.value.filter((s) => s.standing === standing);

    return {
      invitationNotAccepted: of('invitation not accepted').map((s) => ({
        ground: { id: s.groundId, label: s.label },
        says: 'There is a check-in for you here, and the invitation has not been accepted yet. Accepting is how somebody agrees to take part, so it is not something this can do for them.',
      })),
      waiting: of('open to you').map((s) => ({
        checkInId: s.checkInId,
        ground: { id: s.groundId, label: s.label },
      })),
      /* Named for what it is now the assembly holds it: a ground set up for them
         that nobody has begun. The old `notYet` meant a session dated in the
         future, which the assembly leaves out because it is not true yet. */
      waitingOnYouToStart: of('waiting on you to start').map((s) => ({
        groundId: s.groundId,
        label: s.label,
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

  /**
   * A DOCUMENT, PUT IN FROM THE PANEL.
   *
   * The product's own upload route wants a signed-in product user, which a panel session is not —
   * so this is the same resolution every other check-in route here does, and then the same service.
   * No second implementation of what a file may be or how big it can get.
   *
   * IT ARRIVES PRIVATE. The upload defaults to the uploader alone, and the question of who it is
   * for is asked afterwards in the conversation. A file that became visible to a team because
   * somebody walked away mid-sentence is not a mistake anybody can take back.
   */
  async putADocumentIn(
    organizationId: string,
    personId: string,
    groundId: string,
    file: Express.Multer.File,
    uploaderNote?: string,
  ) {
    const userId = await this.actingAs(organizationId, personId);

    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { id: true },
    });
    if (!ground) throw new NotFoundException('No such check-in in your organisation.');

    const document = await this.documents.upload(groundId, userId, file, false, uploaderNote);

    /*
     * THE QUESTION IS PARKED HERE RATHER THAN LEFT TO THE PANEL.
     *
     * So the conversation carries it: the file goes in, the assistant asks who it is for, and the
     * answer resolves in the same box. A panel that asked on its own would be a second place the
     * decision could be made, and the two would eventually disagree.
     */
    const person = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { externalId: true },
    });

    const fileName = file.originalname;
    await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: person!.externalId,
        kind: 'document',
        summary: askWhoItIsFor(fileName),
        payload: { documentId: (document as { id: string }).id, groundId, fileName } as never,
      },
    });

    return { documentId: (document as { id: string }).id, fileName, asks: askWhoItIsFor(fileName) };
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

  /**
   * ATTACH SOMETHING TO A CHECK-IN, FROM SOMEBODY ELSE'S PAGE.
   *
   * The panel could say things and not show anything. Reported as: why is there no document
   * uploader for context in the chat - and the answer was that the API had no way to take one, so
   * a customer building their own panel had no way either. Everything the product does with an
   * attachment - reading it, refusing a transcript nobody has consented to, assessing it, keeping
   * it to the party who attached it - is DocumentsService, and this is the same call with the
   * person resolved to their account.
   *
   * A DOCUMENT NEEDS A CHECK-IN TO BE ABOUT. There is no floating file store here on purpose: a
   * document in this product is evidence attached to a record, read against the thing being
   * discussed, and visible under the rules of that record. A file uploaded to nothing would have
   * none of that - no scope, no reader, and no rule saying who may see it.
   */
  async attach(
    organizationId: string,
    personId: string,
    checkInId: string,
    file: Express.Multer.File,
    consentConfirmed: boolean,
    uploaderNote?: string,
  ) {
    const userId = await this.actingAs(organizationId, personId);
    /* The check-in is named by id; the document belongs to its ground. Resolved here rather than
       asking the caller for both, because a caller holding a check-in has no reason to know the
       ground's id and asking for it invites the two arriving mismatched. */
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      select: { groundId: true },
    });
    if (!checkIn) throw new NotFoundException('We cannot see that check-in.');
    return this.documents.upload(checkIn.groundId, userId, file, consentConfirmed, uploaderNote);
  }
}
