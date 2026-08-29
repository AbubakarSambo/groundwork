import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from '../grounds/grounds.service';
import { ReportsService } from '../reports/reports.service';
import { ObjectiveKind, ProposedChangeState } from '@prisma/client';
import { textAfter } from './six-is-still-the-target';
import { Fence, isFenced, mayTouch, mayReadGround, OUTSIDE_THE_FENCE } from './a-fence-around-a-credential';
import { Finding, Attention, attentionFor, ATTENTION_MEANS } from './where-a-finding-came-from';
import { Objective, senseCheck } from '../detectors/nobody-checked-the-management';
import { BoardService } from '../board/board.service';
import { ConfigService } from '@nestjs/config';
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
    private readonly board: BoardService,
    private readonly config: ConfigService,
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
    /** email -> the caller's own id for that person, so invitations go back in their vocabulary. */
    const idByEmail = new Map<string, string>();
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
      idByEmail.set(row.email, p.personExternalId);
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

    /*
     * THE INVITATION LINKS, WHICH THE INTEGRATION HAS TO BE ABLE TO DELIVER ITSELF.
     *
     * Not a defect in the invite flow - a participant added by anybody, in the product or through
     * here, gets an invite token and is linked to an account only when they accept. That is consent
     * and it should stay.
     *
     * What was missing is that nothing gave the links back. Lovedida would have had to rely on
     * Groundwork's own emails arriving in their people's inboxes, which is precisely the thing an
     * embedded integration exists to avoid: the invitation belongs in the product those people
     * already have open.
     *
     * Groundwork still sends its own email as well. Suppressing that is a setting nobody has asked
     * for yet, and two invitations reaching somebody is a smaller problem than none.
     */
    const invited = await this.prisma.groundParticipant.findMany({
      where: { groundId: ground.id, inviteToken: { not: null } },
      select: { email: true, inviteToken: true, inviteTokenExpiresAt: true },
    });
    const base = (this.config.get<string>('resend.frontendUrl') ?? 'http://localhost:5173').replace(/\/$/, '');
    const invitations = invited
      .filter((i) => !!i.email && idByEmail.has(i.email))
      .map((i) => ({
        /*
         * Back in the caller's own vocabulary. They sent directory ids and deliberately never sent
         * an email address; handing addresses back would make them match on the one thing they were
         * careful to keep on their side.
         */
        personExternalId: idByEmail.get(i.email!)!,
        url: `${base}/invite?token=${i.inviteToken}`,
        expiresAt: i.inviteTokenExpiresAt,
      }));

    this.logger.log(`Ground opened by API for org ${organizationId} as ${dto.actingPersonExternalId}.`);
    return { ...ground, invitations };
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


  /**
   * WHAT NEEDS SOMEBODY, ACROSS THE WHOLE ORGANISATION.
   *
   * Assembled from what already exists rather than computed afresh: detector results, open handoffs,
   * and proposed changes waiting on an approver. Nothing new is inferred here - if a thing is not
   * already a finding, this is not the place it becomes one.
   *
   * Every item carries where it came from, because an inference and a verified fact arriving in the
   * same list looking identical is the fastest way to lose trust in the whole feed.
   */
  async structuredFindings(organizationId: string, fence: Fence = { boundToPersonExternalIds: [] }) {
    const appUrl = (this.config.get<string>('resend.frontendUrl') ?? 'http://localhost:5173').replace(/\/$/, '');
    const out: (Finding & { attention: Attention })[] = [];
    const add = (f: Finding) => {
      /* One place decides the bucket, so a caller cannot disagree with the rule. */
      out.push({ ...f, attention: attentionFor(f) });
    };

    const findings = await this.prisma.detectorResult.findMany({
      where: { organizationId, resolvedAt: null },
      select: { key: true, personExternalId: true, subjectExternalId: true, evidence: true,
        firstSeenAt: true, lastSeenAt: true },
    });
    for (const f of findings) {
      if (!mayTouch(fence, f.personExternalId ?? undefined) && f.personExternalId) continue;
      const says = (f.evidence as any)?.says;
      if (typeof says !== 'string') continue;
      add({
        kind: f.key === 'goal_divergence' ? 'divergence'
          : f.key === 'unowned_gap' ? 'responsibility_unclear' : 'unresolved_question',
        /* A detector is Groundwork working something out. Labelled as the weakest thing here, on
           purpose - it is the category most likely to be wrong. */
        provenance: 'groundwork_inferred',
        says,
        subjectExternalId: f.subjectExternalId,
        peopleInvolved: typeof (f.evidence as any)?.diverging === 'number' ? (f.evidence as any).diverging : undefined,
        firstSeenAt: f.firstSeenAt.toISOString(),
        lastSeenAt: f.lastSeenAt.toISOString(),
        permalink: `${appUrl}/findings`,
      });
    }

    const { waiting } = await this.board.waitingAcrossTheOrg(organizationId);
    for (const w of waiting) {
      if (!mayTouch(fence, w.fromPersonKey)) continue;
      add({
        kind: 'blocker',
        /* Somebody said it about their own work. One person's account, and labelled as one. */
        provenance: 'participant_proposed',
        says: `Waiting ${w.waitingDays} ${w.waitingDays === 1 ? 'day' : 'days'} on somebody else.`,
        permalink: `${appUrl}/grounds/${w.groundId}`,
      });
    }

    const pending = await this.prisma.proposedChange.findMany({
      where: { organizationId, state: ProposedChangeState.AWAITING_APPROVAL },
      include: { personObjective: { select: { text: true, externalId: true } } },
    });
    for (const c of pending) {
      if (!mayTouch(fence, c.proposedByExternalId)) continue;
      add({
        kind: 'objective_change_proposed',
        /* A person asked for this, in so many words. Not a guess and not an agreement. */
        provenance: 'participant_proposed',
        says: `A change has been asked for and is waiting on ${c.approverExternalId} to decide.`,
        objectiveExternalId: c.personObjective.externalId,
        permalink: `${appUrl}/proposed-changes/${c.id}`,
      });
    }

    const byAttention = {
      decision_required: out.filter((f) => f.attention === 'decision_required'),
      needs_clarification: out.filter((f) => f.attention === 'needs_clarification'),
      watch: out.filter((f) => f.attention === 'watch'),
      none: out.filter((f) => f.attention === 'none'),
    };
    return { findings: out, byAttention, meaning: ATTENTION_MEANS };
  }


  /**
   * SENSE-CHECK THE OBJECTIVES BEFORE A QUARTER IS SPENT ON THEM.
   *
   * Read-only, and every answer is a question addressed to whoever set the objective. Nothing here
   * corrects anybody's management - §13 asks for ambiguity to be flagged, not rewritten, and the
   * difference is the whole reason a customer would let this near their planning.
   */
  async senseCheckGround(organizationId: string, groundId: string, fence: Fence = { boundToPersonExternalIds: [] }) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { id: true },
    });
    if (!ground) throw new NotFoundException('No such check-in.');

    const rows = await this.prisma.personObjective.findMany({
      where: { groundId },
      include: { participant: { select: { email: true } } },
    });
    if (!rows.length) {
      return {
        questions: [],
        note: 'Nothing has been seeded onto this check-in yet, so there is nothing to sense-check.',
      };
    }

    /* Participants resolve to directory ids so the questions come back in the caller's vocabulary,
       and so a fenced credential can be told which ones are not its business. */
    const idFor = async (email: string | null | undefined) => {
      if (!email) return null;
      const row = await this.prisma.person.findFirst({
        where: { organizationId, email }, select: { externalId: true },
      });
      return row?.externalId ?? null;
    };

    const objectives: Objective[] = [];
    for (const r of rows) {
      const personExternalId = await idFor(r.participant?.email);
      if (!personExternalId) continue;
      objectives.push({
        externalId: r.externalId,
        personExternalId,
        text: r.text,
        kind: r.kind,
        scope: r.scope,
        check: r.check,
        dueKind: r.dueKind,
        /* No relation named for the owed-to side, so it is resolved by id in a second step - the
           column is a participant id, not an email. */
        owedToPersonExternalId: r.owedToParticipantId
          ? await idFor((await this.prisma.groundParticipant.findUnique({
            where: { id: r.owedToParticipantId }, select: { email: true },
          }))?.email)
          : null,
        seenBySubject: r.seenBySubject,
      });
    }

    const questions = senseCheck(objectives)
      /* A question about one person is theirs; a question about the plan belongs to nobody and is
         shown to anybody who may see the check-in at all. */
      .filter((q) => !q.personExternalId || mayTouch(fence, q.personExternalId));

    return { questions };
  }

}
