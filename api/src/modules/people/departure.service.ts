import { Injectable, Logger } from '@nestjs/common';
import { onceAcrossCopies, theDay } from '../prisma/once-across-copies';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommitmentState, DependencyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashed } from '../auth/a-token-is-stored-as-its-hash';

/**
 * A PARTICIPANT LINK THAT IS, OR WAS, THIS PERSON. Erasing an account rewrites the link's address
 * to a placeholder, so matching on the address alone let an erased person's raw turns outlive the
 * retention window - the opposite of what erasing is for (fix plan A16). The link keeps the hash of
 * the address it had; both sites that match a person to their links use this.
 */
export const wasThisPerson = (email: string) => ({ OR: [{ email }, { erasedFrom: hashed(email.toLowerCase()) }] });
import {
  clampRetention, collapsedAttribution, readyToAgeOut, RETENTION_DEFAULT_DAYS,
} from './when-somebody-leaves';

/**
 * THE STAGED DEPARTURE, AND WHY IT IS A JOB RATHER THAN A CASCADE.
 *
 * §13C.1 says it in one line: "deletion is a job with an audit record, not a cascade". The
 * difference is the whole point. A cascade removes the rows and leaves nothing behind saying it
 * happened, so the first thing a security review asks - show me that you deleted it, and what -
 * has no answer at all.
 *
 * Two stages, and the gap between them is deliberate:
 *
 *   AT DEPARTURE, immediately: commitments and blockers close, findings collapse their attribution.
 *   These are cheap, they are the things that read wrongly the moment somebody has gone, and none
 *   of them destroys anything.
 *
 *   AFTER THE WINDOW: raw turns and the embeddings derived from them are deleted. This is the part
 *   that cannot be undone, so it waits - and it waits AFTER the handover brief, which §13C.1 is
 *   explicit about: a brief built from data already gone is worse than no brief.
 */
@Injectable()
export class DepartureService {
  private readonly logger = new Logger(DepartureService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async retentionDays(organizationId: string): Promise<number> {
    const p = await this.prisma.retentionPolicy.findUnique({ where: { organizationId } });
    /* Clamped on read as well as on write, so a row written by a migration or before the bounds
       existed cannot be unbounded. */
    return clampRetention(p?.turnRetentionDays ?? RETENTION_DEFAULT_DAYS);
  }

  /**
   * STAGE ONE. Runs the moment somebody's assignment ends.
   *
   * Nothing here deletes. Everything here stops the record misleading whoever reads it next: an
   * open commitment against somebody who has left reads as live work and gets chased, and a finding
   * naming them reads as a statement about a colleague rather than about a role.
   */
  async onDeparture(organizationId: string, personExternalId: string, departedAt: Date, roleName: string | null) {
    const record = await this.prisma.departureRecord.upsert({
      where: { organizationId_personExternalId_departedAt: { organizationId, personExternalId, departedAt } },
      create: { organizationId, personExternalId, departedAt },
      update: {},
    });

    const commitments = await this.prisma.commitment.updateMany({
      where: { organizationId, personExternalId, state: { in: [CommitmentState.OPEN, CommitmentState.SLIPPED] } },
      /*
       * DROPPED, not SLIPPED. Slipped is a judgement - they said they would and did not - and
       * applying it to somebody on the day they left would put a failure on the record of everybody
       * who leaves mid-commitment. Dropped is "overtaken", which is what happened.
       */
      data: { state: CommitmentState.DROPPED, resolvedAt: departedAt },
    });

    const person = await this.prisma.person.findFirst({
      where: { organizationId, externalId: personExternalId }, select: { email: true },
    });
    const blockers = person?.email
      ? await this.prisma.groundDependency.updateMany({
        where: {
          status: { in: [DependencyStatus.BLOCKING, DependencyStatus.WAITING] },
          ground: { organizationId },
          OR: [
            { fromParticipant: wasThisPerson(person.email) },
            { onParticipant: wasThisPerson(person.email) },
          ],
        },
        data: { status: DependencyStatus.CLEARED, clearedAt: departedAt },
      })
      : { count: 0 };

    /*
     * The attribution collapses IN PLACE rather than the finding being deleted, because the finding
     * is what makes the objective's history intelligible to the people still on it. What goes is the
     * name; what stays is that it happened and what it was about.
     */
    const findings = await this.prisma.detectorResult.findMany({
      where: { organizationId, personExternalId },
      select: { id: true, evidence: true },
    });
    for (const f of findings) {
      const e = (f.evidence ?? {}) as Record<string, unknown>;
      await this.prisma.detectorResult.update({
        where: { id: f.id },
        data: {
          personExternalId: null,
          evidence: { ...e, attribution: collapsedAttribution(roleName), collapsedAt: new Date().toISOString() } as any,
        },
      });
    }

    await this.prisma.departureRecord.update({
      where: { id: record.id },
      data: {
        commitmentsClosed: commitments.count,
        blockersClosed: blockers.count,
        findingsCollapsed: findings.length,
      },
    });

    this.logger.log(
      `Departure of ${personExternalId}: ${commitments.count} commitment(s) closed, `
      + `${blockers.count} handoff(s) cleared, ${findings.length} finding(s) collapsed. `
      + 'Raw turns remain until the retention window closes.',
    );
    return record;
  }

  /**
   * STAGE TWO. The part that cannot be undone, which is why it is on a clock and not on an event.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async ageOutDepartedTurns() {
    /* Once for its time across every copy of the API (decision 74, item 7). */
    await onceAcrossCopies(this.prisma, 'age-out-departed-turns', theDay(), () => this.ageOutDepartedTurnsHere());
  }

  private async ageOutDepartedTurnsHere() {
    const orgs = await this.prisma.departureRecord.findMany({
      where: { turnsDeletedAt: null },
      select: { organizationId: true },
      distinct: ['organizationId'],
    });

    for (const { organizationId } of orgs) {
      try {
        const days = await this.retentionDays(organizationId);
        const pending = await this.prisma.departureRecord.findMany({
          where: { organizationId, turnsDeletedAt: null },
          select: { id: true, personExternalId: true, departedAt: true, turnsDeletedAt: true },
        });

        for (const d of readyToAgeOut(pending, days, new Date())) {
          const record = pending.find((p) => p.personExternalId === d.personExternalId)!;
          const person = await this.prisma.person.findFirst({
            where: { organizationId, externalId: d.personExternalId }, select: { email: true },
          });

          /*
           * Their own turns, in both places one exists: the check-in conversation and the assistant
           * panel. Missing either would make the deletion cosmetic in exactly the way §13C.1 warns
           * about embeddings.
           */
          const conversation = person?.email
            ? await this.prisma.conversationTurn.deleteMany({
              where: { checkIn: { participant: { ...wasThisPerson(person.email), ground: { organizationId } } } },
            })
            : { count: 0 };
          const assistant = await this.prisma.assistantTurn.deleteMany({
            where: { organizationId, personExternalId: d.personExternalId },
          });

          await this.prisma.departureRecord.update({
            where: { id: record.id },
            data: { turnsDeletedAt: new Date(), turnsDeleted: conversation.count + assistant.count },
          });

          this.logger.log(
            `Aged out ${conversation.count + assistant.count} turn(s) for ${d.personExternalId}, `
            + `${days} days after they left.`,
          );
        }
      } catch (err: any) {
        /* One organisation's failure must not stop the others: this is the job that answers a
           security review, and a silent stall in it is the worst outcome available. */
        this.logger.error(`Departure ageing failed for org ${organizationId}: ${err.message}`);
      }
    }
  }
}
