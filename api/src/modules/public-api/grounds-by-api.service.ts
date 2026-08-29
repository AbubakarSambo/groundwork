import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from '../grounds/grounds.service';
import { ReportsService } from '../reports/reports.service';
import { ObjectiveKind, ProposedChangeState } from '@prisma/client';
import { textAfter } from './six-is-still-the-target';
import { Fence, isFenced, mayTouch, mayReadGround, OUTSIDE_THE_FENCE } from './a-fence-around-a-credential';
import { SeedInput, normalise, missingOwedTo, NOT_A_KIND } from './what-was-already-agreed';

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
  private async actingUser(organizationId: string, personExternalId: string, fence?: Fence) {
    if (fence && !mayTouch(fence, personExternalId)) throw new ForbiddenException(OUTSIDE_THE_FENCE);
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
    fence: Fence = { boundToPersonExternalIds: [] },
  ) {
    if (!dto?.actingPersonExternalId) throw new BadRequestException('actingPersonExternalId is required.');
    if (!dto?.label?.trim()) throw new BadRequestException('label is required - it is what people see.');
    if (!dto?.scenario) throw new BadRequestException('scenario is required. A check-in without a situation is a form.');

    const acting = await this.actingUser(organizationId, dto.actingPersonExternalId, fence);
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
      /* Every participant, so a fenced credential cannot open a check-in that reaches outside it. */
      if (!mayTouch(fence, p.personExternalId)) throw new ForbiddenException(OUTSIDE_THE_FENCE);
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
  async report(
    organizationId: string,
    groundId: string,
    asPersonExternalId: string,
    fence: Fence = { boundToPersonExternalIds: [] },
  ) {
    if (!asPersonExternalId) {
      throw new BadRequestException(
        'as is required: name the person this report is being read for. The API reads as somebody, never as nobody.',
      );
    }
    const user = await this.actingUser(organizationId, asPersonExternalId, fence);
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { id: true, participants: { select: { email: true } } },
    });
    /* Scoped, so a guessed id from another tenant resolves to nothing rather than to their ground. */
    if (!ground) throw new NotFoundException('No such check-in.');

    /*
     * EVERY PARTY INSIDE THE FENCE, not any. A report is the synthesis of what several people
     * independently said, so one containing somebody outside the boundary hands over their account
     * through a credential that was never allowed near them.
     */
    if (isFenced(fence)) {
      const emails = ground.participants.map((p) => p.email).filter(Boolean) as string[];
      const ids = await Promise.all(emails.map(async (email) => {
        const row = await this.prisma.person.findFirst({
          where: { organizationId, email }, select: { externalId: true },
        });
        return row?.externalId ?? null;
      }));
      if (!mayReadGround(fence, ids)) throw new ForbiddenException(OUTSIDE_THE_FENCE);
    }

    return this.reports.get(groundId, user.id, organizationId);
  }


  /**
   * SEED WHAT WAS ALREADY AGREED.
   *
   * Upserted on `(groundId, sourceSystem, externalId)` so a customer pushing the same agreement
   * twice updates it rather than colliding with the one-per-kind constraint and getting an error
   * they cannot act on.
   *
   * WHAT THIS DELIBERATELY DOES NOT DO is let an integration set `seenBySubject` to true for
   * somebody. Whether a person has seen the standard they are held to is the hinge the whole
   * fairness rule turns on - the engine refuses to press anybody on an unseen objective - and an
   * integration asserting it on their behalf would quietly disarm that. A customer who has genuinely
   * shown somebody their target can say so, and it is recorded as their claim.
   */
  async seedObjectives(organizationId: string, groundId: string, items: SeedInput[]) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { id: true },
    });
    if (!ground) throw new NotFoundException('No such check-in.');
    if (!items?.length) throw new BadRequestException('Send at least one objective.');

    const out: { externalId: string; id: string; kind: string | null }[] = [];
    for (const item of items) {
      if (!item.externalId) throw new BadRequestException('Each objective needs an externalId of its own.');
      if (!item.text?.trim()) throw new BadRequestException(`Objective "${item.externalId}" has no text.`);
      if (!(Object.values(ObjectiveKind) as string[]).includes(item.kind)) {
        throw new BadRequestException(NOT_A_KIND);
      }
      if (missingOwedTo(item)) {
        throw new BadRequestException(
          `"${item.externalId}" is a COMMITMENT with no owedToPersonExternalId. A commitment is `
          + 'something somebody else is waiting on; without who, it is a private to-do and the '
          + 'handoff reasoning never sees it.',
        );
      }

      const participant = await this.participantFor(groundId, organizationId, item.personExternalId);
      const owedTo = item.owedToPersonExternalId
        ? await this.participantFor(groundId, organizationId, item.owedToPersonExternalId)
        : null;
      const shape = normalise(item);

      const row = await this.prisma.personObjective.upsert({
        where: {
          groundId_sourceSystem_externalId: {
            groundId, sourceSystem: 'api', externalId: item.externalId,
          },
        },
        create: {
          groundId,
          participantId: participant.id,
          text: item.text.trim(),
          ...shape,
          dueSaid: item.dueSaid ?? null,
          owedToParticipantId: owedTo?.id ?? null,
          /*
           * Not the acting user's id. `authoredBy` answers "who set this", and for a seeded
           * agreement the honest answer is the customer's system - which is what makes the intake
           * block able to say "your organisation records this" rather than "the lead said this".
           */
          authoredBy: 'lovedida',
          sourceSystem: 'api',
          externalId: item.externalId,
          approvedByExternalId: item.approvedByExternalId ?? null,
          effectiveFrom: item.effectiveFrom ? new Date(item.effectiveFrom) : null,
          seenBySubject: item.seenBySubject === true,
          trackedUrl: item.trackedUrl ?? null,
        },
        update: {
          text: item.text.trim(),
          ...shape,
          dueSaid: item.dueSaid ?? null,
          owedToParticipantId: owedTo?.id ?? null,
          approvedByExternalId: item.approvedByExternalId ?? null,
          effectiveFrom: item.effectiveFrom ? new Date(item.effectiveFrom) : null,
          seenBySubject: item.seenBySubject === true,
          trackedUrl: item.trackedUrl ?? null,
        },
        select: { id: true, kind: true },
      });
      out.push({ externalId: item.externalId, id: row.id, kind: String(row.kind) });
    }

    this.logger.log(`Seeded ${out.length} agreed objective(s) onto ground ${groundId}.`);
    return { seeded: out };
  }

  /** A person on this ground, by their directory id. Both sides of a commitment must be on it. */
  private async participantFor(groundId: string, organizationId: string, personExternalId: string) {
    const person = await this.prisma.person.findFirst({
      where: { organizationId, externalId: personExternalId },
      select: { email: true },
    });
    if (!person?.email) throw new NotFoundException(`No person with externalId "${personExternalId}".`);
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, email: person.email },
      select: { id: true },
    });
    if (!participant) {
      throw new BadRequestException(
        `"${personExternalId}" is not on this check-in. Add them when you open it, or open one that includes them.`,
      );
    }
    return participant;
  }


  /**
   * PUSH WHAT THE CUSTOMER'S SYSTEMS SAY IS HAPPENING NOW.
   *
   * Stored on the objective it is about, in `lastSeenState` and `lastSeenAt` - columns that already
   * existed for exactly this and were never read by anything. No new table: evidence with no
   * objective to be about is a number nobody can act on, and keeping the two together means the
   * check-in cannot show one without the other.
   */
  async pushEvidence(
    organizationId: string,
    items: { objectiveExternalId: string; observedAt?: string; state: Record<string, string | number> }[],
  ) {
    if (!items?.length) throw new BadRequestException('Send at least one piece of evidence.');
    const out: { objectiveExternalId: string; matched: boolean }[] = [];

    for (const item of items) {
      if (!item.objectiveExternalId) throw new BadRequestException('Each item needs an objectiveExternalId.');
      if (!item.state || typeof item.state !== 'object' || Array.isArray(item.state)) {
        throw new BadRequestException('state must be an object of counts and short labels.');
      }
      for (const [k, v] of Object.entries(item.state)) {
        if (typeof v === 'string' && v.length > 40) {
          /*
           * Short labels only. A long string here is somebody putting a note, a status update or a
           * quote into a field that goes straight into an interview prompt - which is the one way
           * this becomes a channel for the customer to tell the engine what to think.
           */
          throw new BadRequestException(`state.${k} is too long. Evidence is counts and short labels, not prose.`);
        }
      }

      const objective = await this.prisma.personObjective.findFirst({
        where: { sourceSystem: 'api', externalId: item.objectiveExternalId, ground: { organizationId } },
        select: { id: true },
      });
      if (!objective) {
        /* Reported rather than thrown: a nightly push covering the whole org will name objectives
           that are not on any check-in, and failing the batch for that would be useless. */
        out.push({ objectiveExternalId: item.objectiveExternalId, matched: false });
        continue;
      }

      await this.prisma.personObjective.update({
        where: { id: objective.id },
        data: {
          lastSeenState: JSON.stringify(item.state),
          /* THEIR observation time, not ours. A batch sent on Monday about Friday's numbers is three
             days old, and the freshness rule has to reflect that or it lies in the safe direction. */
          lastSeenAt: item.observedAt ? new Date(item.observedAt) : new Date(),
        },
      });
      out.push({ objectiveExternalId: item.objectiveExternalId, matched: true });
    }

    const matched = out.filter((o) => o.matched).length;
    this.logger.log(`Evidence: ${matched}/${out.length} matched an objective on a check-in.`);
    return { received: out };
  }


  /**
   * SOMEBODY ASKS FOR A CHANGE. NOTHING MOVES YET.
   *
   * Any earlier proposal about the same objective is superseded rather than left open - two live
   * proposals about one number would put an approver in front of a question with two answers, and
   * whichever they answered, the other would still be sitting there.
   */
  async proposeChange(
    organizationId: string,
    dto: { objectiveExternalId: string; proposedText: string; reason?: string;
           proposedByExternalId: string; approverExternalId: string },
  ) {
    if (!dto?.objectiveExternalId) throw new BadRequestException('objectiveExternalId is required.');
    if (!dto?.proposedText?.trim()) throw new BadRequestException('proposedText is required - say what is being asked for.');
    if (!dto?.approverExternalId) {
      throw new BadRequestException(
        'approverExternalId is required. A change with nobody to approve it is not awaiting approval, it is just a note.',
      );
    }

    const objective = await this.prisma.personObjective.findFirst({
      where: { sourceSystem: 'api', externalId: dto.objectiveExternalId, ground: { organizationId } },
      select: { id: true, text: true },
    });
    if (!objective) throw new NotFoundException(`No seeded objective with externalId "${dto.objectiveExternalId}".`);

    await this.prisma.proposedChange.updateMany({
      where: { personObjectiveId: objective.id, state: ProposedChangeState.AWAITING_APPROVAL },
      data: { state: ProposedChangeState.SUPERSEDED, decidedAt: new Date() },
    });

    const row = await this.prisma.proposedChange.create({
      data: {
        organizationId,
        personObjectiveId: objective.id,
        proposedText: dto.proposedText.trim(),
        reason: dto.reason?.trim() || null,
        proposedByExternalId: dto.proposedByExternalId,
        approverExternalId: dto.approverExternalId,
      },
    });
    this.logger.log(`Change proposed to objective ${dto.objectiveExternalId}, awaiting ${dto.approverExternalId}.`);
    /* The current agreement is returned alongside, so a caller displaying this cannot show one
       without the other. */
    return { proposal: row, stillAgreed: objective.text };
  }

  /**
   * THE ANSWER, WHICHEVER SYSTEM IT CAME FROM.
   *
   * `decidedIn` records where, because an approval nobody can locate afterwards is not much of an
   * approval - and the two models are genuinely different: one is a person clicking here, the other
   * is the customer telling us what their own process concluded.
   */
  async resolveChange(
    organizationId: string,
    id: string,
    dto: { approve: boolean; decidedByExternalId: string; decidedIn?: string; note?: string },
  ) {
    if (typeof dto?.approve !== 'boolean') throw new BadRequestException('approve must be true or false.');
    if (!dto?.decidedByExternalId) throw new BadRequestException('decidedByExternalId is required - who decided.');

    const row = await this.prisma.proposedChange.findFirst({
      where: { id, organizationId },
      include: { personObjective: { select: { id: true, text: true } } },
    });
    if (!row) throw new NotFoundException('No such proposed change.');
    if (row.state !== ProposedChangeState.AWAITING_APPROVAL) {
      throw new BadRequestException(`That change is already ${row.state.toLowerCase().replace(/_/g, ' ')}.`);
    }

    const state = dto.approve ? ProposedChangeState.APPROVED : ProposedChangeState.REJECTED;
    const updated = await this.prisma.proposedChange.update({
      where: { id: row.id },
      data: {
        state,
        decidedByExternalId: dto.decidedByExternalId,
        decidedIn: dto.decidedIn?.trim() || 'lovedida',
        decidedAt: new Date(),
        decisionNote: dto.note?.trim() || null,
      },
    });

    /*
     * THE ONE MOMENT THE AGREEMENT MOVES. Rejection changes nothing about the objective, which is the
     * point: it was never suspended, so there is nothing to restore.
     */
    if (dto.approve) {
      await this.prisma.personObjective.update({
        where: { id: row.personObjectiveId },
        data: { text: row.proposedText, approvedByExternalId: dto.decidedByExternalId },
      });
    }

    this.logger.log(`Proposed change ${row.id} ${state.toLowerCase()} by ${dto.decidedByExternalId}.`);
    return { change: updated, agreedNow: textAfter(state, row.personObjective.text, row.proposedText) };
  }

}
