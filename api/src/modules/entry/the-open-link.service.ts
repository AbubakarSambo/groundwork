import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { whenItAsks } from '../participants/when-it-asks';
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
      select: { id: true, label: true, brief: true, scenario: true, status: true, cadence: true, cadenceDays: true, cadenceAnchorDay: true, workingDays: true, endsAt: true, initiator: { select: { firstName: true } } },
    });
    if (!ground) throw new NotFoundException('That link does not open anything.');
    if (['CLOSED', 'RESOLVED', 'STALLED', 'PAUSED'].includes(ground.status)) {
      throw new BadRequestException('This check-in has finished, so there is nothing to answer.');
    }
    return {
      groundLabel: ground.label,
      /*
       * THE LEAD'S OWN LINE, AND ONLY AS MUCH OF IT AS SOMEBODY READS BEFORE ANSWERING.
       *
       * Read live, 22 September 2026: a two-hundred-word brief printed whole at the top of the
       * phone screen, then the first question underneath repeating the half of it that was a
       * question. The whole card promises two minutes.
       *
       * `toldToParticipants` is the product's own short read of the brief, written once and used in
       * every "About this check-in" box; where it exists it is what this shows, and otherwise the
       * first few sentences of the brief that are about the situation rather than about how to run
       * the interview. See what-a-participant-is-told-about-this.
       */
      /*
       * NOTHING OF THE LEAD'S DESCRIPTION (U.6 review, privacy). This served the engine's reworded
       * brief ("This check-in is about Grace, the new operations lead, starting her role with...") to
       * anyone holding the link. An open link works as an invitation, and an invitation carries none
       * of the lead's words, not even reworded. So the question is served only where the lead wrote it
       * AS the question to be sent (Get updates from your team: the one line her team is asked, which
       * its invitation email already carries). Otherwise there is none, and the page shows the
       * check-in's name.
       */
      theQuestion: ground.scenario === 'TEAM_UPDATES' ? (ground.brief?.trim() || null) : null,
      /* And when it runs, as the invitation says it. */
      schedule: whenItAsks({ cadence: ground.cadence, cadenceAnchorDay: ground.cadenceAnchorDay, cadenceDays: (ground as any).cadenceDays, workingDays: ground.workingDays, leadFirstName: ground.initiator?.firstName ?? null, label: ground.label }),
      endsAt: ground.endsAt ? ground.endsAt.toISOString() : null,
      askedBy: ground.initiator?.firstName ?? null,
      scenario: ground.scenario,
    };
  }

  /** Start answering. Mints the row they will fill in at the end, and opens session one on it. */
  async start(joinToken: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { joinToken },
      select: { id: true, status: true, openerForALink: true },
    });
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
        /* How they arrived, recorded rather than left to be inferred later from an address that is
           about to be replaced. See an-open-link-has-no-roster. */
        cameThroughTheLink: true,
      },
      select: { id: true },
    });
    const checkIn = await this.prisma.checkIn.create({
      data: { groundId: ground.id, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED },
      select: { id: true },
    });
    /*
     * THE OPENER IS WRITTEN ONCE FOR THE WHOLE LINK.
     *
     * Measured on her own link: fourteen to eighteen seconds before the first question appears, and
     * the sentence is the same for everybody - an opener is composed from the brief and the scenario
     * and nothing else, and somebody who followed a link has told us nothing to compose against. A
     * hundred people were each paying for the same paragraph to be written again, at the one moment
     * in the whole conversation where nothing has been invested yet and leaving costs nothing.
     *
     * The first person through pays; everybody after gets it immediately. Stored after it has been
     * through the opener's guards, so what is reused is the held version.
     */
    const opened = await this.conversation.open(
      checkIn.id, { theParticipant: participant.id }, ground.openerForALink,
    );
    const itsOpener = (opened as any)?.theOpener as string | undefined;
    if (!ground.openerForALink && itsOpener) {
      await this.prisma.ground
        .updateMany({ where: { id: ground.id, openerForALink: null }, data: { openerForALink: itsOpener } })
        .catch(() => undefined);
    }
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
  async finish(key: string, email?: string, firstName?: string, wantsTheReport?: boolean, organisation?: string) {
    const row = await this.theirRow(key);
    const checkIn = row.checkIns[0];
    if (!checkIn) throw new BadRequestException('Open the link again to start.');

    const at = (email ?? '').trim().toLowerCase();
    /* THE NAME THEY GAVE, AND WHETHER THEY WANT THE REPORT, kept whether or not an address came with them.
       A name with no address still names their line on the lead's report. */
    const name = (firstName ?? '').trim().slice(0, 120) || null;
    /* AND WHO THEY ANSWERED FOR. On a check-in run across a network the organisation is the unit
       the report is about, and the link collected a name and an address and nothing else. */
    const org = (organisation ?? '').trim().slice(0, 160) || null;
    if (name || org || wantsTheReport != null) {
      await this.prisma.groundParticipant.update({
        where: { id: row.id },
        data: {
          ...(name ? { nameGiven: name } : {}),
          ...(org ? { organisationGiven: org } : {}),
          ...(wantsTheReport != null ? { wantsTheReport } : {}),
        },
      });
    }
    if (at) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(at)) throw new BadRequestException('That is not an email address.');
      /*
       * ONE PERSON, ONE ROW - AND THE ANSWER MOVES TO THE ROW THEY ALREADY HAVE.
       *
       * This refused: "that address is already on this check-in, use the link from your email
       * instead." Read on a live board, 22 September 2026: the check-in showed "Ehi Okosun" with
       * "nobody has said anything about this yet" beside an unnamed card holding everything he had
       * said. He had been invited by mail AND had answered on the shared link, so the ground held two
       * rows for him - one named and empty, one anonymous and full - and the board, the report and
       * every count read them as two people.
       *
       * Refusing was the wrong half of the right instinct. Two rows for one person is the thing to
       * avoid, and by the time somebody is typing their address the work is already done: the answer
       * exists, it is theirs, and the only question is which row it hangs on. So it moves onto the
       * row that was invited, and the row the link made goes. Nothing they said is lost, and the
       * person who was invited is now the person who answered.
       */
      const already = await this.prisma.groundParticipant.findFirst({
        where: { groundId: row.groundId, email: at, id: { not: row.id } },
        select: { id: true },
      });
      if (already) {
        /*
         * AND THE SECOND TIME THEY ANSWERED, WHICH THREW A 409 AND LOST IT.
         *
         * `CheckIn` is unique on (participantId, sessionNumber), and this moved the new answer onto
         * the existing row still calling itself session one. So anybody who had already answered on
         * this link with this address - their phone died and they started over, they were
         * interrupted at the event and came back, they simply answered twice - got "Something with
         * that name or key already exists" and their whole second conversation went nowhere.
         * Observed on the hundred-person run, 23 September 2026.
         *
         * Nothing they said is lost is the rule this merge already claimed, so the moving check-ins
         * take the next free session numbers on the row they are joining. Two answers from one
         * person are two sessions, which is what they are, and the report reads both.
         */
        const takenThere = await this.prisma.checkIn.findMany({
          where: { participantId: already.id },
          select: { sessionNumber: true },
        });
        const moving = await this.prisma.checkIn.findMany({
          where: { participantId: row.id },
          select: { id: true },
          orderBy: { sessionNumber: 'asc' },
        });
        let next = Math.max(0, ...takenThere.map((c) => c.sessionNumber));
        await this.prisma.$transaction([
          ...moving.map((c) => {
            next += 1;
            return this.prisma.checkIn.update({ where: { id: c.id }, data: { participantId: already.id, sessionNumber: next } });
          }),
          this.prisma.recordEntry.updateMany({ where: { participantId: row.id }, data: { participantId: already.id } }),
          this.prisma.groundDocument.updateMany({ where: { participantId: row.id }, data: { participantId: already.id } }),
          ...(name ? [this.prisma.groundParticipant.update({ where: { id: already.id }, data: { nameGiven: name } })] : []),
          ...(org ? [this.prisma.groundParticipant.update({ where: { id: already.id }, data: { organisationGiven: org } })] : []),
          ...(wantsTheReport != null ? [this.prisma.groundParticipant.update({ where: { id: already.id }, data: { wantsTheReport } })] : []),
          this.prisma.groundParticipant.delete({ where: { id: row.id } }),
        ]);
        this.logger.log(`Ground ${row.groundId}: an open-link answer joined the row already invited as ${at}.`);
        const theirs = await this.prisma.checkIn.findFirst({ where: { id: checkIn.id }, select: { id: true } });
        const done = await this.conversation.complete(theirs!.id, { theParticipant: already.id }, { theyAskedToFinish: true });
        return { ...(done as any), willGetTheReport: true, at };
      }
      await this.prisma.groundParticipant.update({ where: { id: row.id }, data: { email: at } });
    }
    /* "I am done" is asking to finish. See complete(): the floor lets the sentence out, and the button. */
    const done = await this.conversation.complete(checkIn.id, { theParticipant: row.id }, { theyAskedToFinish: true });
    return { ...(done as any), willGetTheReport: !!at, at: at || null };
  }
}
