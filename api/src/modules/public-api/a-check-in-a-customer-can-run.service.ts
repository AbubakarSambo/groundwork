import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CheckInStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationService } from '../conversation/conversation.service';
import { GroundsService } from '../grounds/grounds.service';
import { WhatIsTrueService } from '../assistant/what-is-true.service';
import { GroundsByApiService } from './grounds-by-api.service';
import { ScimService } from '../people/scim.service';
import { DocumentsService } from '../documents/documents.service';
import { askWhoItIsFor } from '../assistant/a-document-is-private-until-you-say-otherwise';
import { whoThePanelIsSignedInAs } from './who-the-panel-is-signed-in-as';
import { aNameOutOfAnAddress } from '../users/a-name-out-of-an-address';

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
    private readonly groundsByApi: GroundsByApiService,
    private readonly scim: ScimService,
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
      select: { id: true, label: true, scenario: true, brief: true, timelineDays: true, runsUntilEnded: true },
    });

    return grounds.map((g) => ({
      groundId: g.id,
      label: g.label,
      scenario: g.scenario,
      /* What somebody else wrote for them to read. It is the thing being
         confirmed, so it is returned rather than summarised. */
      brief: g.brief,
      timelineDays: g.runsUntilEnded ? null : g.timelineDays,
      runsUntilEnded: g.runsUntilEnded,
      says: 'This was set up for you and has not started. Read what it says, change it if it is wrong, and confirm it - nothing is asked of anybody until you do.',
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
    visibility?: string,
  ) {
    const userId = await this.actingAs(organizationId, personId);
    if (visibility && visibility !== 'OPEN' && visibility !== 'OWN') {
      throw new BadRequestException('visibility must be OPEN (everybody on the check-in) or OWN (only you). Omit it to be asked.');
    }

    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { id: true },
    });
    if (!ground) throw new NotFoundException('No such check-in in your organisation.');

    const document = await this.documents.upload(groundId, userId, file, false, uploaderNote);
    /*
     * SAID UP FRONT, SO NOT ASKED. A caller that names who the document is for gets it set now,
     * through the same rule the app applies; the question below is for the ones that did not say.
     */
    if (visibility === 'OPEN') {
      await this.documents.setVisibility(groundId, (document as { id: string }).id, userId, 'OPEN');
      return { documentId: (document as { id: string }).id, fileName: file.originalname, visibility: 'OPEN', says: `"${file.originalname}" is in, and everybody on this check-in can see it.` };
    }
    if (visibility === 'OWN') {
      return { documentId: (document as { id: string }).id, fileName: file.originalname, visibility: 'OWN', says: `"${file.originalname}" is in, and only you can see it.` };
    }

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
    /* The API shows no end card, so the close says what comes next there (the-close-says-what-comes-next). */
    return this.conversation.sendMessage(checkInId, await this.actingAs(organizationId, personId), content, { door: 'api' });
  }

  async complete(organizationId: string, personId: string, checkInId: string) {
    return this.conversation.complete(checkInId, await this.actingAs(organizationId, personId));
  }

  /**
   * THEIR OWN SESSION REPORT, FROM THE PANEL.
   *
   * A member could finish a check-in here and had nowhere to read what came of it: the only report
   * route on this API is the lead's, under a machine credential. This is the same report the app
   * shows under the transcript, read as the person the session belongs to, through the same owner
   * check the app applies.
   */
  async report(organizationId: string, personId: string, checkInId: string) {
    return this.conversation.getSessionReport(checkInId, await this.actingAs(organizationId, personId));
  }

  async transcript(organizationId: string, personId: string, checkInId: string) {
    return this.conversation.getTranscript(checkInId, await this.actingAs(organizationId, personId));
  }

  /**
   * OPEN A CHECK-IN FROM THE PANEL, AS YOURSELF.
   *
   * The panel could answer in a check-in and never start one, so a person with nothing waiting had
   * nowhere to go and every sentence they typed fell to the assistant's router - which is a
   * different thing wearing the same box, and reads as one. Her words: it is meant to act exactly
   * like the check-ins on our system, with more.
   *
   * THE SAME SERVICE THE MACHINE ROUTE USES, with one difference that is the whole safety property:
   * `actingPersonExternalId` is taken from the SESSION and cannot be sent by the caller. A panel
   * session is one person's session, so it can open a check-in as that person and as nobody else.
   * A customer's server naming any person it likes is a machine credential doing machine things;
   * a widget in a browser doing it would be somebody opening a record in a colleague's name.
   */
  async openACheckIn(
    organizationId: string,
    personId: string,
    dto: {
      label?: string;
      scenario?: string;
      moment?: string;
      timelineDays?: number;
      /** True when it runs until the lead ends it: no length, no planned last session. */
      runsUntilEnded?: boolean;
      cadence?: string;
      participants?: { personExternalId: string; roleAsDescribed?: string }[];
      startsAt?: string;
      endsAt?: string;
      brief?: string;
    },
  ) {
    const me = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { externalId: true },
    });
    if (!me?.externalId) throw new NotFoundException('We cannot see you in your organisation.');

    return this.groundsByApi.open(organizationId, {
      /* Not from the body. See above. */
      actingPersonExternalId: me.externalId,
      label: dto?.label ?? '',
      scenario: dto?.scenario ?? '',
      /* STARTING, not AT_THE_START. The vocabulary is a closed set and I guessed at it - the API's
         own refusal named the three, which is what that error message is for. */
      moment: dto?.moment ?? 'STARTING',
      timelineDays: dto?.timelineDays,
      runsUntilEnded: dto?.runsUntilEnded,
      cadence: dto?.cadence,
      participants: dto?.participants,
      startsAt: dto?.startsAt,
      endsAt: dto?.endsAt,
      brief: dto?.brief,
    });
  }

  /**
   * WHAT SUCCESS LOOKS LIKE, IN THE PERSON'S OWN WORDS, FROM THE PANEL.
   *
   * The machine route can seed a SUCCESS_DEFINITION for anybody; a member had no way to state their
   * own. This writes the same row the seed writes, owned by them, authored by them, so the report
   * reads it exactly as it reads one the customer's system pushed. One per person per check-in:
   * saying it again replaces it.
   */
  async statedSuccess(organizationId: string, personId: string, checkInId: string, text: string) {
    const userId = await this.actingAs(organizationId, personId);
    if (!text?.trim()) throw new BadRequestException('text is required: what success looks like, in your words.');
    const checkIn = await this.prisma.checkIn.findFirst({
      where: { id: checkInId, participant: { userId, ground: { organizationId } } },
      select: { groundId: true, participantId: true },
    });
    if (!checkIn) throw new NotFoundException('That check-in is not yours.');
    const externalId = `success:${checkIn.participantId}`;
    const row = await this.prisma.personObjective.upsert({
      where: { groundId_sourceSystem_externalId: { groundId: checkIn.groundId, sourceSystem: 'groundwork-panel', externalId } },
      create: {
        groundId: checkIn.groundId,
        participantId: checkIn.participantId,
        text: text.trim().slice(0, 1000),
        kind: 'SUCCESS_DEFINITION',
        scope: 'ONE_PERSON',
        authoredBy: 'participant',
        sourceSystem: 'groundwork-panel',
        externalId,
      },
      update: { text: text.trim().slice(0, 1000) },
      select: { id: true, text: true, kind: true },
    });
    return { ...row, says: 'Kept. The report reads your check-in against this.' };
  }

  /** Who can see a document on a check-in, changed by the person who put it there, under the app's own rules. */
  async setDocumentVisibility(organizationId: string, personId: string, groundId: string, docId: string, visibility: string) {
    const userId = await this.actingAs(organizationId, personId);
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId }, select: { id: true } });
    if (!ground) throw new NotFoundException('No such check-in in your organisation.');
    if (visibility !== 'OPEN' && visibility !== 'OWN' && visibility !== 'CLOSED') {
      throw new BadRequestException('visibility must be OPEN (everybody on the check-in), OWN (only you) or CLOSED (only the lead).');
    }
    return this.documents.setVisibility(groundId, docId, userId, visibility);
  }

  /**
   * ADD SOMEBODY TO THE ORGANISATION, FROM THE PANEL.
   *
   * Decided knowing what it means: a person's panel session can register a person, the way the
   * customer's directory sync does. What makes that safe is the queue - a person registered here is
   * a DIRECTORY ENTRY, not an account and not a member. They become neither until they accept an
   * invitation to something, and at that moment `participants.service.ts` queues them for an admin
   * of the organisation. So this creates somebody who can be invited, never somebody who is in.
   *
   * SCIM, not a second way of making people. The same upsert the directory push uses, keyed on the
   * same externalId, so a person added from the panel and the same person arriving later from the
   * customer's HR system are one row rather than two.
   */
  async addAPerson(
    organizationId: string,
    personId: string,
    dto: { email?: string; displayName?: string; externalId?: string; phone?: string; department?: string },
  ) {
    /* Refuses for the same reason every other panel route does: a session that cannot be resolved
       to a person is a session that may not act in this organisation at all. */
    await this.actingAs(organizationId, personId);

    const email = dto?.email?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw new BadRequestException('An email address is needed. It is how they are invited and how they sign in.');
    }
    const name = dto?.displayName?.trim() || aNameOutOfAnAddress(email);
    const [givenName, ...rest] = name.split(/\s+/);

    return this.scim.upsert(organizationId, 'panel', {
      /* Their address is the id when the caller has no id of their own to give - a person added by
         somebody typing an email has no directory key yet, and inventing a random one would make
         them a different person from the one the HR system pushes tomorrow. */
      externalId: dto?.externalId?.trim() || email,
      userName: email,
      name: { givenName, familyName: rest.join(' ') || undefined },
      emails: [{ value: email, primary: true }],
      ...(dto?.phone?.trim() ? { phoneNumbers: [{ value: dto.phone.trim(), primary: true }] } : {}),
      /* Department rides the same enterprise extension the directory sync uses, so the two doors
         write one column one way. Optional; blank is not sent, and never guessed from the address. */
      ...(dto?.department?.trim()
        ? { 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': { department: dto.department.trim().slice(0, 120) } }
        : {}),
      active: true,
    } as never);
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
    const checkIn = await this.prisma.checkIn.findFirst({
      /* Theirs, and here - not any check-in in the database. The upload two files away re-checks, and
         a fence that holds only because a neighbour happens to is not a fence. */
      where: { id: checkInId, participant: { userId, ground: { organizationId } } },
      select: { groundId: true },
    });
    if (!checkIn) throw new NotFoundException('We cannot see that check-in.');
    return this.documents.upload(checkIn.groundId, userId, file, consentConfirmed, uploaderNote);
  }
}
