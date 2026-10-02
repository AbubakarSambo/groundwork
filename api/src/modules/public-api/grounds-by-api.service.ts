import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { theGuestsHere, isAGuestHere, isAGuestIn } from '../participants/a-guest-is-never-somebody-on-the-hosts-list';
import { howForecastsHaveGone, NEVER_CONCLUDE_FROM_FORECASTS } from '../detectors/what-a-forecast-turned-out-to-be';
import { whereItStands, mayMarkMet, NEVER_CONCLUDE_FROM_CRITERIA } from './what-would-have-to-be-true';
import { theReadFor, NOTHING_ON_RECORD } from '../detectors/what-a-lead-should-read-first';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from '../grounds/grounds.service';
import { ReportsService } from '../reports/reports.service';
import { ObjectiveKind, ProposedChangeState, GroundScenario, GroundMoment } from '@prisma/client';
import { textAfter } from './six-is-still-the-target';
import { Fence, isFenced, mayTouch, mayReadGround, OUTSIDE_THE_FENCE } from './a-fence-around-a-credential';
import { Finding, Attention, attentionFor, ATTENTION_MEANS } from './where-a-finding-came-from';
import { Objective, senseCheck } from '../detectors/nobody-checked-the-management';
import { BoardService } from '../board/board.service';
import { ConfigService } from '@nestjs/config';
import { SeedInput, normalise, missingOwedTo, NOT_A_KIND } from './what-was-already-agreed';

/*
 * THE SITUATIONS AND MOMENTS WE HAVE, taken from the enum rather than typed out here.
 *
 * A hand-written copy is a list that goes stale the first time somebody adds a scenario, and the
 * failure it produces is the exact one this validation exists to stop: a valid value refused, with
 * a helpful error naming a set that is missing it.
 */
const SCENARIOS = Object.values(GroundScenario);
const MOMENTS = Object.values(GroundMoment);

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
      /*
       * NAMES THE CALL THAT CAUSED IT. This is three steps downstream of the
       * SCIM push, and the message used to describe only the symptom - so an
       * integrator's first instinct was that this endpoint was broken, when the
       * fault was in a call they made and got a 201 for.
       *
       * An error that can point at its own cause should.
       */
      throw new BadRequestException(
        `"${personExternalId}" has no email address here, so nobody can be matched to them. ` +
          'Push them again with an address in emails[] - or a userName that is one - and try this again.',
      );
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
      /** True when it runs until the lead ends it, as the product's own create takes it. */
      runsUntilEnded?: boolean;
      cadence?: string;
      participants?: { personExternalId: string; roleAsDescribed?: string }[];
      leadRemit?: string;
      /** When the first session opens (ISO date). Before it, nobody is asked anything. Omit for now. */
      startsAt?: string;
      /** No session is scheduled after this (ISO date). */
      endsAt?: string;
      /** What the lead wrote for everybody to work from. The standard the report reads against. */
      brief?: string;
    },
    fence: Fence = { boundToPersonExternalIds: [] },
  ) {
    if (!dto?.actingPersonExternalId) throw new BadRequestException('actingPersonExternalId is required.');
    /*
     * A START DATE THE PRODUCT ALREADY HONOURED AND THIS ROUTE NEVER PASSED. The ground and its
     * first check-in both read `startsAt`; the API dropped it, so "start on 1 October" had to be
     * done by logging in. Checked here so a bad date is a 400 that names the field, not an insert
     * that fails one layer down.
     */
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
    if (startsAt && Number.isNaN(startsAt.getTime())) throw new BadRequestException('startsAt is not a date. Send an ISO date, e.g. 2026-10-01.');
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : undefined;
    if (endsAt && Number.isNaN(endsAt.getTime())) throw new BadRequestException('endsAt is not a date. Send an ISO date.');
    if (startsAt && endsAt && endsAt < startsAt) throw new BadRequestException('endsAt is before startsAt.');
    if (!dto?.label?.trim()) throw new BadRequestException('label is required - it is what people see.');
    if (!dto?.scenario) throw new BadRequestException('scenario is required. A check-in without a situation is a form.');

    /*
     * A SCENARIO WE DO NOT HAVE IS A 400 THAT NAMES THE ONES WE DO.
     *
     * Found by driving it: sending `"scenario": "performance"` - a perfectly reasonable first
     * guess - reached Prisma and came back as a 500 whose body carried a source path, a line
     * number and the whole insert. Two things wrong at once. An integrator's opening mistake got
     * an error that does not say what to send instead, and the error told them about the inside of
     * this codebase, which is nobody's business but ours.
     *
     * Listed rather than described, because the answer to "what should I have sent" is a list.
     */
    const scenario = String(dto.scenario).toUpperCase();
    if (!(SCENARIOS as readonly string[]).includes(scenario)) {
      throw new BadRequestException(
        `"${dto.scenario}" is not a situation we have. Send one of: ${SCENARIOS.join(', ')}.`,
      );
    }
    /* Same for the moment, which fails the same way and one line later. */
    const moment = dto.moment ? String(dto.moment).toUpperCase() : undefined;
    if (moment && !(MOMENTS as readonly string[]).includes(moment)) {
      throw new BadRequestException(
        /* Points at where the rest of the closed sets are, so somebody who has
           just guessed one wrong does not have to guess the next. */
        `"${dto.moment}" is not a moment we have. Send one of: ${MOMENTS.join(', ')}. ` +
          'GET /api/org/v1/how-to-connect lists every closed set on this API.',
      );
    }

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
      scenario: scenario as any,
      moment: moment as any,
      ...(dto.mode ? { mode: dto.mode as any } : {}),
      ...(dto.timelineDays ? { timelineDays: dto.timelineDays } : {}),
      ...(dto.runsUntilEnded === true ? { runsUntilEnded: true } : {}),
      ...(dto.cadence ? { cadence: dto.cadence as any } : {}),
      ...(dto.leadRemit ? { leadRemit: dto.leadRemit } : {}),
      ...(startsAt ? { startsAt: startsAt.toISOString() } : {}),
      ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
      ...(dto.brief?.trim() ? { brief: dto.brief.trim() } : {}),
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
    /*
     * NAMED, NOT SPREAD, which is the rule everywhere else in this API and was not followed here.
     *
     * `return { ...ground }` handed back forty-five columns - our initiator and creator user ids,
     * the billing flags, the audit log, the join token. None of it is an integrator's business and
     * some of it is a credential. Found by running the call and counting what came back.
     *
     * A spread is also a promise nobody meant to make: every column added to `Ground` from now on
     * would appear in somebody's integration, and removing one later would break them.
     *
     * `id` STAYS, unlike in `present()` where our primary key is deliberately withheld. Here it is
     * the handle - `/grounds/:groundId/objectives`, `/report`, `/sense-check` all take it - so
     * withholding it would leave the caller unable to use the thing they just made.
     */
    return {
      id: ground.id,
      label: ground.label,
      scenario: ground.scenario,
      moment: ground.moment,
      mode: ground.mode,
      status: ground.status,
      timelineDays: (ground as any).runsUntilEnded ? null : ground.timelineDays,
      runsUntilEnded: !!(ground as any).runsUntilEnded,
      cadence: ground.cadence,
      startsAt: ground.startsAt,
      endsAt: ground.endsAt,
      /* Echoed so the caller can see the standard it set; it was stored and never shown. */
      brief: (ground as any).brief ?? null,
      invitations,
    };
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
      select: { id: true, participants: { select: { email: true, userId: true } } },
    });
    /* Scoped, so a guessed id from another tenant resolves to nothing rather than to their ground. */
    if (!ground) throw new NotFoundException('No such check-in.');

    /*
     * EVERY PARTY INSIDE THE FENCE, not any. A report is the synthesis of what several people
     * independently said, so one containing somebody outside the boundary hands over their account
     * through a credential that was never allowed near them.
     */
    if (isFenced(fence)) {
      /* A guest is nobody on this list, so a check-in with a guest on it is outside every fence. See a-guest-is-never-somebody-on-the-hosts-list. */
      const guests = await theGuestsHere(this.prisma, organizationId);
      const ids = await Promise.all(ground.participants.filter((p) => p.email).map(async (p) => {
        if (isAGuestHere(guests, p)) return null;
        const email = p.email;
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

    /*
     * THE WHOLE BATCH IS CHECKED BEFORE ANY OF IT IS WRITTEN (fix plan F14). This threw on the first
     * bad item with every earlier item already upserted, so a caller with a 400 could not tell
     * whether nothing, some or nearly all of their objectives had landed. Every check runs first,
     * every write runs inside one transaction: a rejected batch wrote nothing.
     */
    const checked: { item: SeedInput; participantId: string; owedToId: string | null }[] = [];
    for (const item of items) {
      if (!item.externalId) throw new BadRequestException('Each objective needs an externalId of its own.');
      if (!item.text?.trim()) {
        /*
         * NAMES THE FIELD. "has no text" reads as an empty value, and the
         * commonest cause is a caller who sent `described` - which is the word
         * every other part of this product uses for the same idea. An error that
         * knows the likely mistake should say it.
         */
        throw new BadRequestException(
          `Objective "${item.externalId}" has no text. The field is \`text\` - if you sent \`described\`, rename it. See GET /api/org/v1/how-to-connect.`,
        );
      }
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
      checked.push({ item, participantId: participant.id, owedToId: owedTo?.id ?? null });
    }

    const out = await this.prisma.$transaction(async (tx) => {
      const rows: { externalId: string; id: string; kind: string | null }[] = [];
      for (const { item, participantId, owedToId } of checked) {
        const shape = normalise(item);

        const row = await tx.personObjective.upsert({
          where: {
            groundId_sourceSystem_externalId: {
              groundId, sourceSystem: 'api', externalId: item.externalId,
            },
          },
          create: {
            groundId,
            participantId,
            text: item.text.trim(),
            ...shape,
            dueSaid: item.dueSaid ?? null,
            whyThisNumber: item.whyThisNumber?.trim() || null,
            owedToParticipantId: owedToId,
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
            whyThisNumber: item.whyThisNumber?.trim() || null,
            owedToParticipantId: owedToId,
            approvedByExternalId: item.approvedByExternalId ?? null,
            effectiveFrom: item.effectiveFrom ? new Date(item.effectiveFrom) : null,
            seenBySubject: item.seenBySubject === true,
            trackedUrl: item.trackedUrl ?? null,
          },
          select: { id: true, kind: true },
        });
        rows.push({ externalId: item.externalId, id: row.id, kind: String(row.kind) });
      }
      return rows;
    });

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
    const found = await this.prisma.groundParticipant.findFirst({
      where: { groundId, email: person.email },
      select: { id: true, userId: true, email: true },
    });
    /* A guest who shares this entry's address is not this entry, so nothing is written onto them in its name. See a-guest-is-never-somebody-on-the-hosts-list. */
    const participant = found && !(await isAGuestIn(this.prisma, organizationId, found)) ? { id: found.id } : null;
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

    /*
     * A 200 IS NOT A CONFIRMATION THAT ANYTHING LANDED.
     *
     * Every item is reported individually above, and every item can be `matched: false` — so this
     * call answers 200 having written nothing at all, and a caller that checks only the status code
     * believes its numbers are in. Our own back-office adapter reported "5 sent, 0 refused" on
     * exactly such a response, and it was reading the body.
     *
     * The endpoint stays 200: a nightly push covering a whole org will legitimately name objectives
     * that are not on any check-in, and failing the batch for that would make the tolerant case
     * impossible. What changes is that the summary is impossible to miss, and that nothing matching
     * at all is logged as a warning rather than counted quietly alongside the successes.
     */
    const matchedItems = out.filter((o) => o.matched);
    const unmatched = out.filter((o) => !o.matched).map((o) => o.objectiveExternalId);
    const says =
      matchedItems.length === 0
        ? `Nothing was written. None of these ${out.length} objectiveExternalIds is on a check-in in this organisation - check the ids you sent, or that the objectives were created with sourceSystem "api".`
        : unmatched.length === 0
          ? `${matchedItems.length} updated.`
          : `${matchedItems.length} updated. ${unmatched.length} matched no objective and were not written.`;

    const line = `Evidence: ${matchedItems.length}/${out.length} matched an objective on a check-in.`;
    if (matchedItems.length === 0) this.logger.warn(`${line} Nothing was written.`);
    else this.logger.log(line);

    return { received: out, matched: matchedItems.length, unmatched, says };
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
   * HOW SOMEBODY'S DATES HAVE TURNED OUT, ACROSS THE ONES THAT FINISHED.
   *
   * Read from commitments, which already hold the date somebody gave and the moment they were
   * resolved. No new table and no new writing: the two facts have sat beside each other all along
   * and nothing compared them.
   *
   * Part of the same read a lead opens before a conversation, because that is where a question
   * about somebody's estimates belongs - in a conversation with them, not on a dashboard.
   */
  async howTheirForecastsHaveGone(organizationId: string, personExternalId: string, fence?: Fence) {
    /* A credential bound to some people read any person in the organisation by path. The fence is the same one every other person-shaped read here asks. */
    if (!mayTouch(fence, personExternalId)) throw new ForbiddenException(OUTSIDE_THE_FENCE);
    const rows = await this.prisma.commitment.findMany({
      where: {
        organizationId,
        personExternalId,
        /* Only dated promises: an undated one cannot be early or late, which is a rule this
           product enforces everywhere and would be silly to break here. */
        dueAt: { not: null },
        resolvedAt: { not: null },
      },
      orderBy: { dueAt: 'asc' },
      take: 40,
      select: { text: true, dueAt: true, resolvedAt: true },
    }).catch(() => [] as any[]);

    const out = howForecastsHaveGone(
      rows.map((r) => ({ what: r.text, said: r.dueAt!, landed: r.resolvedAt })),
    );
    return { ...out, refusal: NEVER_CONCLUDE_FROM_FORECASTS };
  }

  /**
   * NUMBERS FROM THE CUSTOMER'S OWN PRODUCT.
   *
   * Upserted on (organisation, key, as-of), so re-sending yesterday's figure is harmless and
   * correcting it is a re-send. A metric with no `says` is refused: a key and a number mean nothing
   * to whoever reads the report, and "crash_rate: 8" in front of a non-technical reader is worse
   * than silence because it looks like information.
   */
  async pushMetrics(
    organizationId: string,
    sourceSystem: string | undefined,
    metrics: { key?: string; says?: string; value?: number; unit?: string; asOf?: string; subjectExternalId?: string }[],
  ) {
    const from = (sourceSystem ?? '').trim();
    if (!from) throw new BadRequestException('Say which system these came from. A reader has to be able to weigh them.');
    if (!Array.isArray(metrics) || !metrics.length) throw new BadRequestException('Send at least one metric.');

    const results: { key: string; stored: boolean; because?: string }[] = [];
    for (const m of metrics) {
      const key = (m.key ?? '').trim();
      const says = (m.says ?? '').trim();
      const asOf = m.asOf ? new Date(m.asOf) : null;

      if (!key) { results.push({ key: '', stored: false, because: 'A metric needs a key.' }); continue; }
      if (!says) {
        results.push({ key, stored: false, because: 'Say what this counts, in words. A key and a number mean nothing to whoever reads the report.' });
        continue;
      }
      if (typeof m.value !== 'number' || !Number.isFinite(m.value)) {
        results.push({ key, stored: false, because: 'A metric needs a number.' });
        continue;
      }
      if (!asOf || Number.isNaN(asOf.getTime())) {
        results.push({ key, stored: false, because: 'Say when this was true. A number with no date is a claim about right now.' });
        continue;
      }

      await this.prisma.productMetric.upsert({
        where: { organizationId_key_asOf: { organizationId, key, asOf } },
        create: { organizationId, key, says, value: m.value, unit: m.unit?.trim() || null, asOf, sourceSystem: from, subjectExternalId: m.subjectExternalId ?? null },
        update: { says, value: m.value, unit: m.unit?.trim() || null, sourceSystem: from, subjectExternalId: m.subjectExternalId ?? null },
      });
      results.push({ key, stored: true });
    }
    return { results };
  }

  /**
   * WHAT WOULD HAVE TO BE TRUE FOR A SUBJECT TO BE DONE.
   *
   * Pushed by the customer's own systems alongside the objective it belongs to, because the
   * definition of done is a thing their planning tool already holds and this product should not be
   * a second place to write it down. Replaces the whole set rather than merging: a criterion that
   * disappeared upstream was deleted on purpose, and keeping it would have this arguing with the
   * system of record about what was agreed.
   *
   * WHAT IS MET SURVIVES A RE-PUSH. Somebody marked it met with a reason, on a date, and a sync is
   * not a reason to lose that - so a criterion whose text is unchanged keeps its evidence.
   */
  async setAcceptanceCriteria(
    organizationId: string,
    subjectExternalId: string,
    criteria: { text: string }[],
  ) {
    const subject = await this.prisma.subject.findFirst({
      where: { organizationId, externalId: subjectExternalId },
      select: { id: true },
    });
    if (!subject) throw new NotFoundException('No such objective in what your organisation has sent us.');

    const clean = criteria
      .map((c) => (c?.text ?? '').trim())
      .filter((t) => t.length > 0 && t.length <= 500);
    if (!clean.length) throw new BadRequestException('Send at least one thing that would have to be true.');

    const existing = await this.prisma.acceptanceCriterion.findMany({
      where: { organizationId, subjectExternalId },
      select: { text: true, metAt: true, metBecause: true, metByExternalId: true },
    });
    const evidenceByText = new Map(existing.filter((e) => e.metAt).map((e) => [e.text, e]));

    await this.prisma.$transaction([
      this.prisma.acceptanceCriterion.deleteMany({ where: { organizationId, subjectExternalId } }),
      this.prisma.acceptanceCriterion.createMany({
        data: clean.map((text, i) => {
          const kept = evidenceByText.get(text);
          return {
            organizationId,
            subjectExternalId,
            text,
            ordinal: i + 1,
            metAt: kept?.metAt ?? null,
            metBecause: kept?.metBecause ?? null,
            metByExternalId: kept?.metByExternalId ?? null,
          };
        }),
      }),
    ]);

    return this.acceptanceCriteria(organizationId, subjectExternalId);
  }

  /** Where a subject stands against what was agreed. The shaping is in the module. */
  async acceptanceCriteria(organizationId: string, subjectExternalId: string) {
    const rows = await this.prisma.acceptanceCriterion.findMany({
      where: { organizationId, subjectExternalId },
      orderBy: { ordinal: 'asc' },
      select: { text: true, ordinal: true, metAt: true, metBecause: true },
    });
    return { subjectExternalId, ...whereItStands(rows), refusal: NEVER_CONCLUDE_FROM_CRITERIA };
  }

  /**
   * MARKING ONE MET, WHICH NEEDS A REASON.
   *
   * A tick with nothing behind it records somebody's belief as a fact and is read later by a person
   * who cannot check it. The sentence does not make the belief true; it puts the belief and its
   * evidence in the same place, which is what this product does everywhere else.
   */
  async markCriterionMet(
    organizationId: string,
    subjectExternalId: string,
    ordinal: number,
    because: string,
    byExternalId?: string,
  ) {
    const answer = mayMarkMet(because);
    if (!answer.may) throw new BadRequestException(answer.why);

    const row = await this.prisma.acceptanceCriterion.findFirst({
      where: { organizationId, subjectExternalId, ordinal },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('No such acceptance criterion on that objective.');

    await this.prisma.acceptanceCriterion.update({
      where: { id: row.id },
      data: { metAt: new Date(), metBecause: because.trim(), metByExternalId: byExternalId ?? null },
    });
    return this.acceptanceCriteria(organizationId, subjectExternalId);
  }

  /**
   * WHAT THE RECORD HOLDS ABOUT ONE PERSON, BEFORE A CONVERSATION ABOUT THEM.
   *
   * Every part of this already existed and nothing put them together for the person about to walk
   * into the room - so a lead prepared from memory, inside a product built to end exactly that.
   *
   * `handovers:read` RATHER THAN `findings:read`, and the reason is written in scopes.ts: a
   * handover brief is "the list of what is outstanding on one named person's desk, which is a good
   * deal more than a finding". This is that shape exactly, so it takes that scope. Granting an
   * integration the right to read findings must not silently grant it a per-person read.
   *
   * The shaping - what is said, what is refused, what it admits not knowing - is in
   * what-a-lead-should-read-first.ts, away from the queries, because that is the part that has to
   * be arguable without a database in front of you.
   */
  async beforeAConversation(organizationId: string, personExternalId: string, fence?: Fence) {
    if (!mayTouch(fence, personExternalId)) throw new ForbiddenException(OUTSIDE_THE_FENCE);
    const person = await this.prisma.person.findFirst({
      where: { organizationId, externalId: personExternalId },
      select: { email: true, displayName: true, givenName: true, familyName: true },
    });
    if (!person) throw new NotFoundException('No such person in what your organisation has sent us.');

    const label = person.displayName?.trim()
      || [person.givenName, person.familyName].filter(Boolean).join(' ').trim()
      || personExternalId;
    /*
     * An address that is a guest's here is not this entry's: a guest is from another organisation
     * and on nobody's row, so their check-ins and handoffs are never read as this person's. See
     * a-guest-is-never-somebody-on-the-hosts-list.
     */
    const key = person.email && !(await isAGuestIn(this.prisma, organizationId, { email: person.email }))
      ? person.email.toLowerCase()
      : null;

    const unseenObjectives = new Set<string>();

    const [commitments, findings, contributions] = await Promise.all([
      this.prisma.commitment.findMany({
        where: { organizationId, personExternalId, state: { in: ['OPEN', 'SLIPPED'] as any } },
        select: {
          text: true, state: true, dueAt: true, statedAt: true,
          /* The bridge to how the ordinary cycle has gone on this promise: the objective it was
             mirrored from names the participant, and the participant carries the coaching. */
          sourcePersonObjectiveId: true,
        },
      }),
      this.prisma.detectorResult.findMany({
        /* Never a pattern mirrored from a check-in, served or not: this read is about one named person,
           it printed the code as "A B5 finding", and it is mirrored after one session, before the person
           has read it. People read patterns only through patterns/who-reads-a-pattern. */
        where: { organizationId, personExternalId, resolvedAt: null, sourcePatternDetectionId: null },
        select: { key: true, evidence: true, subjectExternalId: true, firstSeenAt: true },
      }),
      this.prisma.contribution.findMany({
        where: { organizationId, personExternalId },
        select: { subjectExternalId: true, lastSeenAt: true },
      }),
    ]);

    const subjects = contributions.length
      ? await this.prisma.subject.findMany({
        where: { organizationId, externalId: { in: contributions.map((c) => c.subjectExternalId) } },
        select: { externalId: true, title: true, measure: true },
      })
      : [];
    const lastSeen = new Map(contributions.map((c) => [c.subjectExternalId, c.lastSeenAt]));

    /* Both sides of every handoff. One side alone is a charge sheet - see the module. */
    const { waiting } = await this.board.waitingAcrossTheOrg(organizationId);
    const side = (which: 'from' | 'on') => waiting
      .filter((w: any) => !!key && (which === 'from' ? w.fromPersonKey : w.onPersonKey) === key)
      .map((w: any) => ({
        what: w.what,
        status: String(w.status),
        waitingDays: w.waitingDays,
        onLabel: w.onLabel ?? null,
        escalatedAt: w.escalatedAt ?? null,
        /* The day it began, so the read says a date and not a count that changes on opening. */
        since: w.createdAt ?? null,
        /* Whether the claim names who and what - the board already decides this, and a read that
           decided it again would be a second opinion on the same question. */
        hasSubstance: w.hasSubstance ?? true,
      }));

    /*
     * Released reports they were in. Zero is what makes the picture "nothing yet" rather than
     * "thin" - a fact about the record, never about them.
     */
    const finishedCheckIns = key
      ? await this.prisma.groundParticipant.count({
        where: { email: key, ground: { organizationId, report: { releasedAt: { not: null } } } },
      })
      : 0;

    /*
     * HAS THE ORDINARY CYCLE BEEN TRIED AND FAILED TO MOVE THIS?
     *
     * Every input already existed and nothing asked the question, so a person could be coached
     * three times about the same thing and the fourth check-in would still open as though it were
     * the first. That is the failure the whole staircase was built to avoid, and it was happening
     * one level up from where anybody was looking.
     *
     * TWO OF THESE ARE WIDER THAN THE PROMISE THEY ARE READ AGAINST, and both widen the way that
     * says LESS:
     *   blockers is anything they are recorded as waiting on, not just on this promise - so a
     *     person blocked anywhere is not escalated about anything, which is the safe error;
     *   stepsManaged counts anything they managed in that conversation - so somebody who is moving
     *     is not escalated about the one thing that has not.
     * The one input that would over-escalate if widened - whether coaching was offered at all - is
     * scoped to the participant this promise came from, so a step given in a different check-in
     * about a different thing never reads as "the cycle was tried here".
     */
    const fromObjectives = commitments.map((c) => c.sourcePersonObjectiveId).filter((x): x is string => !!x);
    const coachingByObjective = new Map<string, { offered: number; managed: number }>();
    if (fromObjectives.length) {
      const objectives = await this.prisma.personObjective.findMany({
        where: { id: { in: fromObjectives } },
        select: { id: true, seenBySubject: true, participantId: true },
      });
      const states = objectives.length
        ? await this.prisma.coachingState.findMany({
          where: { participantId: { in: objectives.map((o) => o.participantId).filter(Boolean) as string[] } },
          select: { participantId: true, currentStep: true, history: true },
        })
        : [];
      const byParticipant = new Map(states.map((st) => [st.participantId, st]));
      for (const o of objectives) {
        const st = o.participantId ? byParticipant.get(o.participantId) : undefined;
        const history = Array.isArray(st?.history) ? (st!.history as any[]) : [];
        coachingByObjective.set(o.id, {
          offered: history.length + (st?.currentStep ? 1 : 0),
          /* Anything other than "did not" counts as movement. Slower than hoped is not stuck. */
          managed: history.filter((h) => h && typeof h === 'object' && h.outcome && h.outcome !== 'not_done').length,
        });
      }
      for (const o of objectives) if (!o.seenBySubject) coachingByObjective.set(o.id, { offered: 0, managed: 0 });
      /*
       * NOT SEEN READS AS NOT COACHED rather than as a separate flag, because the escalation refuses
       * on either and this keeps one source of truth for "the cycle has not been run here".
       */
      for (const o of objectives) if (!o.seenBySubject) unseenObjectives.add(o.id);
    }

    /*
     * PERIODS IS CHECK-INS THEY WERE IN SINCE THEY SAID IT, not weeks elapsed. Somebody on leave for
     * a month has not had three chances to move something and must not read as though they had.
     */
    const finishedSince = async (since: Date) => (key
      ? this.prisma.groundParticipant.count({
        where: { email: key, ground: { organizationId, report: { releasedAt: { gt: since } } } },
      })
      : 0);
    const howItHasGone = await Promise.all(commitments.map(async (c) => {
      const coaching = c.sourcePersonObjectiveId ? coachingByObjective.get(c.sourcePersonObjectiveId) : undefined;
      return {
        what: c.text,
        periods: await finishedSince(c.statedAt),
        seen: !!c.sourcePersonObjectiveId && !unseenObjectives.has(c.sourcePersonObjectiveId),
        blockers: side('from').length,
        stepsOffered: coaching?.offered ?? 0,
        stepsManaged: coaching?.managed ?? 0,
      };
    }));

    const read = theReadFor({
      howItHasGone,
      personLabel: label,
      finishedCheckIns,
      commitments: commitments.map((c) => ({ text: c.text, state: String(c.state), dueAt: c.dueAt, statedAt: c.statedAt })),
      waitingOnOthers: side('from'),
      othersWaiting: side('on'),
      findings: findings.map((f) => ({
        key: f.key,
        says: ((f.evidence as any)?.says ?? null) as string | null,
        subjectExternalId: f.subjectExternalId,
        firstSeenAt: f.firstSeenAt,
      })),
      carrying: subjects.map((s) => ({
        externalId: s.externalId,
        title: s.title,
        measure: s.measure,
        lastSeenAt: lastSeen.get(s.externalId) ?? null,
      })),
      now: new Date(),
    });

    return read.sections.length ? read : { ...read, nothingOnRecord: NOTHING_ON_RECORD };
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
      include: { participant: { select: { email: true, userId: true } } },
    });
    if (!rows.length) {
      return {
        questions: [],
        note: 'Nothing has been seeded onto this check-in yet, so there is nothing to sense-check.',
      };
    }

    /* Participants resolve to directory ids so the questions come back in the caller's vocabulary,
       and so a fenced credential can be told which ones are not its business. */
    /* A guest's aims are theirs, never an entry's on this list. See a-guest-is-never-somebody-on-the-hosts-list. */
    const guests = await theGuestsHere(this.prisma, organizationId);
    const idFor = async (participant: { email: string; userId?: string | null } | null | undefined) => {
      const email = participant?.email;
      if (!email || isAGuestHere(guests, participant!)) return null;
      const row = await this.prisma.person.findFirst({
        where: { organizationId, email }, select: { externalId: true },
      });
      return row?.externalId ?? null;
    };

    const objectives: Objective[] = [];
    for (const r of rows) {
      const personExternalId = await idFor(r.participant);
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
            where: { id: r.owedToParticipantId }, select: { email: true, userId: true },
          })))
          : null,
        seenBySubject: r.seenBySubject,
        /* Who set it, so the question goes to them rather than to the person it is about. */
        authoredBy: r.authoredBy,
        approvedByExternalId: r.approvedByExternalId,
        managerExternalId: await this.managerOf(organizationId, personExternalId),
      });
    }

    /* The lead is the last resort for a question nobody else can be asked - never the first. */
    const leadRow = await this.prisma.groundParticipant.findFirst({
      where: { groundId, partyType: 'INITIATOR' }, select: { email: true, userId: true },
    });
    const leadExternalId = await idFor(leadRow);

    const questions = senseCheck(objectives, leadExternalId)
      /* A question about one person is theirs; a question about the plan belongs to nobody and is
         shown to anybody who may see the check-in at all. */
      /*
       * ONLY THE AUTHOR SEES IT UNTIL IT IS DECIDED. Sahar reading a proposed rewrite of her own
       * target before her manager has answered is worse than her not seeing it - the transparency
       * this product is for is about what was agreed and what happened, not about watching somebody
       * think. Once decided it goes back through the normal proposal path, in the open.
       */
      .filter((q) => !q.addressedTo || mayTouch(fence, q.addressedTo));

    return { questions };
  }


  /** Their manager's directory id, for a question nobody else can be asked. */
  private async managerOf(organizationId: string, personExternalId: string): Promise<string | null> {
    const row = await this.prisma.person.findFirst({
      where: { organizationId, externalId: personExternalId },
      select: { managerExternalId: true },
    });
    return row?.managerExternalId ?? null;
  }

}
