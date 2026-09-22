import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { CheckInStatus, PartyType } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationService } from '../conversation/conversation.service';

/**
 * THE OPEN LINK: ANSWER FIRST, SAY WHO YOU ARE AT THE END.
 *
 * Hafsah, 19 September 2026: "the update can also be a QR code we share where people can provide
 * the update and add their email in the end to get the final report themselves."
 *
 * The link and the QR already existed. What they did was ask for a name, an address and a role,
 * then email a link, and only then let somebody say anything - three steps of admin in front of a
 * two-minute answer, which is the whole reason people do not answer.
 *
 * So this is the same link with the order reversed. Scanning it starts a real check-in - the same
 * engine, the same probing, the same record - against a participant row that has no name on it
 * yet. At the end they give an address, and that is what turns the row into a person and puts them
 * on the list for the report.
 *
 * THE ROW IS NOT A PERSON UNTIL THEY SAY SO, and the placeholder address is built so that nothing
 * can ever mistake it for one: it is on a domain that cannot receive mail, and the mailer refuses
 * it by name. Somebody who answers and then closes the tab leaves a record with no address on it,
 * which is exactly what happened: an answer from somebody who chose not to be named.
 */
export const AN_UNCLAIMED_ADDRESS = '@unclaimed.invalid';

@Injectable()
export class TheOpenLinkService {
  private readonly logger = new Logger(TheOpenLinkService.name);

  constructor(private prisma: PrismaService, private conversation: ConversationService) {}

  /** What this link is, before anybody commits to anything. */
  async whatThisIs(joinToken: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { joinToken },
      select: { id: true, label: true, brief: true, scenario: true, status: true, initiator: { select: { firstName: true } } },
    });
    if (!ground) throw new NotFoundException('That link does not open anything.');
    if (['CLOSED', 'RESOLVED', 'STALLED', 'PAUSED'].includes(ground.status)) {
      throw new BadRequestException('This check-in has finished, so there is nothing to answer.');
    }
    return {
      groundLabel: ground.label,
      /* The lead's own line is the question, which is the one thing worth showing before they start. */
      theQuestion: ground.brief ?? null,
      askedBy: ground.initiator?.firstName ?? null,
      scenario: ground.scenario,
    };
  }

  /** Start answering. Mints the row they will fill in at the end, and opens session one on it. */
  async start(joinToken: string) {
    const ground = await this.prisma.ground.findUnique({ where: { joinToken }, select: { id: true, status: true } });
    if (!ground) throw new NotFoundException('That link does not open anything.');
    if (['CLOSED', 'RESOLVED', 'STALLED', 'PAUSED'].includes(ground.status)) {
      throw new BadRequestException('This check-in has finished, so there is nothing to answer.');
    }
    const key = crypto.randomBytes(24).toString('hex');
    const participant = await this.prisma.groundParticipant.create({
      data: {
        groundId: ground.id,
        email: `open-${key.slice(0, 12)}${AN_UNCLAIMED_ADDRESS}`,
        partyType: PartyType.PARTICIPANT,
        /* Their own secret, and the only thing that reaches this row. */
        inviteToken: key,
        invitedAt: new Date(),
      },
      select: { id: true },
    });
    const checkIn = await this.prisma.checkIn.create({
      data: { groundId: ground.id, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED },
      select: { id: true },
    });
    const opened = await this.conversation.open(checkIn.id, { theParticipant: participant.id });
    this.logger.log(`Somebody started answering ${ground.id} through the open link.`);
    return { key, checkInId: checkIn.id, reply: (opened as any)?.reply ?? null, brief: (opened as any)?.brief ?? null };
  }

  private async theirRow(key: string) {
    const row = await this.prisma.groundParticipant.findFirst({
      where: { inviteToken: key },
      select: { id: true, email: true, groundId: true, checkIns: { orderBy: { sessionNumber: 'asc' }, select: { id: true, status: true } } },
    });
    if (!row) throw new NotFoundException('That answer does not belong to anything. Open the link again.');
    return row;
  }

  async say(key: string, message: string) {
    const row = await this.theirRow(key);
    const checkIn = row.checkIns[0];
    if (!checkIn) throw new BadRequestException('Open the link again to start.');
    return this.conversation.sendMessage(checkIn.id, { theParticipant: row.id }, message);
  }

  /**
   * Done, and here is where to send the report.
   *
   * The address is the last thing rather than the first, so it arrives after the work. Somebody who
   * gives a real address gets the report; somebody who does not still leaves their account on the
   * record, because the lead asked a question and they answered it.
   */
  async finish(key: string, email?: string, firstName?: string, wantsTheReport?: boolean) {
    const row = await this.theirRow(key);
    const checkIn = row.checkIns[0];
    if (!checkIn) throw new BadRequestException('Open the link again to start.');

    const at = (email ?? '').trim().toLowerCase();
    /* THE NAME THEY GAVE, AND WHETHER THEY WANT THE REPORT, kept whether or not an address came with them.
       A name with no address still names their line on the lead's report. */
    const name = (firstName ?? '').trim().slice(0, 120) || null;
    if (name || wantsTheReport != null) {
      await this.prisma.groundParticipant.update({
        where: { id: row.id },
        data: { ...(name ? { nameGiven: name } : {}), ...(wantsTheReport != null ? { wantsTheReport } : {}) },
      });
    }
    if (at) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(at)) throw new BadRequestException('That is not an email address.');
      /* Somebody already on this check-in keeps their row: two rows for one person would split
         their account in the report, which is the one thing the report cannot recover from. */
      const already = await this.prisma.groundParticipant.findFirst({
        where: { groundId: row.groundId, email: at, id: { not: row.id } },
        select: { id: true },
      });
      if (already) throw new BadRequestException('That address is already on this check-in. Use the link from your email instead.');
      await this.prisma.groundParticipant.update({ where: { id: row.id }, data: { email: at } });
    }
    /* "I am done" is asking to finish. See complete(): the floor lets the sentence out, and the button. */
    const done = await this.conversation.complete(checkIn.id, { theParticipant: row.id }, { theyAskedToFinish: true });
    return { ...(done as any), willGetTheReport: !!at, at: at || null };
  }
}
