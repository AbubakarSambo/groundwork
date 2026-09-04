import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpsMetricsService } from './ops-metrics.service';
import { resolveNumber, progressToward, MANUAL } from './where-this-number-comes-from';
import { METRICS_BY_KEY } from './a-number-you-can-open';
import { OpsIdentity } from './ops-people.service';
import { can } from './what-somebody-may-do';
import { mayPutAToDoOn } from './whose-list-you-may-write-on';
import {
  OpsObjectiveStatus,
  OpsCommitmentStatus,
  OpsTodoStatus,
} from '@prisma/client';

/**
 * What we said we would do: objectives and their key results for the quarter,
 * commitments for the fortnight, and to-dos for today.
 *
 * The three are not the same thing at three sizes. An objective is what a
 * workstream is for; a commitment is one person's word for one cycle; a to-do is
 * a task. Completing every to-do underneath a commitment leaves the commitment
 * incomplete, which is deliberate — the work getting done is not the same as the
 * thing being achieved, and a system that conflates them lets a person close
 * their list while the number stands still.
 */
@Injectable()
export class OpsIntentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: OpsMetricsService,
  ) {}

  // --- Objectives and key results -----------------------------------------

  async createObjective(input: {
    periodKey: string;
    workstreamKey: string;
    title: string;
    description?: string;
    ownerId: string;
    priority?: number;
  }) {
    const period = await this.prisma.opsPeriod.findUnique({ where: { key: input.periodKey } });
    if (!period) throw new NotFoundException(`No period called ${input.periodKey}`);
    const workstream = await this.prisma.opsWorkstream.findUnique({ where: { key: input.workstreamKey } });
    if (!workstream) throw new NotFoundException(`No workstream called ${input.workstreamKey}`);

    return this.prisma.opsObjective.create({
      data: {
        periodId: period.id,
        workstreamId: workstream.id,
        title: input.title,
        description: input.description,
        ownerId: input.ownerId,
        priority: input.priority ?? 3,
      },
    });
  }

  /**
   * Adds a key result, and refuses a source that names no metric.
   *
   * Caught here rather than at read time on purpose: a typo found on the day it
   * is written costs a second, and the same typo found in December costs the
   * quarter. MANUAL is always allowed — somebody's word is a legitimate source,
   * it just has to be declared as one.
   */
  async addKeyResult(input: {
    objectiveId: string;
    title: string;
    metricType: string;
    targetValue: number;
    unit: string;
    startValue?: number;
    measurementSource: string;
    ownerId: string;
    dueDate: Date;
  }) {
    if (input.measurementSource !== MANUAL && !METRICS_BY_KEY.has(input.measurementSource)) {
      throw new BadRequestException(
        `${input.measurementSource} is not a metric. Use one of the metric keys, or MANUAL if somebody is going to keep this up to date themselves.`,
      );
    }

    const objective = await this.prisma.opsObjective.findUnique({ where: { id: input.objectiveId } });
    if (!objective) throw new NotFoundException('No such objective');

    return this.prisma.opsKeyResult.create({ data: input });
  }

  /**
   * A quarter's objectives with every key result's live number attached.
   *
   * The numbers are resolved here, on read, rather than stored — so opening this
   * page is the same as recomputing it, and there is no version of it that is
   * out of date.
   */
  async objectives(periodKey: string) {
    const period = await this.prisma.opsPeriod.findUnique({ where: { key: periodKey } });
    if (!period) throw new NotFoundException(`No period called ${periodKey}`);

    const window = await this.metrics.windowForPeriod(periodKey);
    const objectives = await this.prisma.opsObjective.findMany({
      where: { periodId: period.id },
      include: { keyResults: true },
      orderBy: { priority: 'asc' },
    });

    const workstreams = await this.prisma.opsWorkstream.findMany();
    const workstreamName = new Map(workstreams.map((w) => [w.id, w.name]));

    return Promise.all(
      objectives.map(async (objective) => ({
        id: objective.id,
        title: objective.title,
        workstream: workstreamName.get(objective.workstreamId) ?? null,
        ownerId: objective.ownerId,
        status: objective.status,
        keyResults: await Promise.all(
          objective.keyResults.map(async (kr) => {
            const number = await resolveNumber(
              this.prisma,
              kr.measurementSource,
              Number(kr.currentValue),
              window,
            );
            return {
              id: kr.id,
              title: kr.title,
              target: Number(kr.targetValue),
              unit: kr.unit,
              dueDate: kr.dueDate,
              current: number.value,
              typedByHand: number.typedByHand,
              says: number.says,
              problem: number.problem,
              rows: number.rows,
              progress: progressToward(number.value, Number(kr.targetValue), Number(kr.startValue ?? 0)),
            };
          }),
        ),
      })),
    );
  }

  setObjectiveStatus(id: string, status: OpsObjectiveStatus) {
    return this.prisma.opsObjective.update({ where: { id }, data: { status } });
  }

  // --- Commitments --------------------------------------------------------

  async makeCommitment(input: {
    ownerId: string;
    operatingPeriodKey: string;
    title: string;
    description?: string;
    measureType: string;
    targetValue?: number;
    unit?: string;
    measurementSource: string;
    dueDate: Date;
    linkedKeyResultId?: string;
    workstreamKey?: string;
  }) {
    if (input.measurementSource !== MANUAL && !METRICS_BY_KEY.has(input.measurementSource)) {
      throw new BadRequestException(
        `${input.measurementSource} is not a metric. Use a metric key, or MANUAL.`,
      );
    }

    const period = await this.prisma.opsPeriod.findUnique({ where: { key: input.operatingPeriodKey } });
    if (!period) throw new NotFoundException(`No period called ${input.operatingPeriodKey}`);

    const workstream = input.workstreamKey
      ? await this.prisma.opsWorkstream.findUnique({ where: { key: input.workstreamKey } })
      : null;

    return this.prisma.opsCommitment.create({
      data: {
        ownerId: input.ownerId,
        operatingPeriodId: period.id,
        workstreamId: workstream?.id,
        linkedKeyResultId: input.linkedKeyResultId,
        title: input.title,
        description: input.description,
        measureType: input.measureType,
        targetValue: input.targetValue,
        unit: input.unit,
        measurementSource: input.measurementSource,
        startDate: period.startsOn,
        dueDate: input.dueDate,
      },
    });
  }

  /**
   * Somebody's commitments, with the live number against each.
   *
   * Their own always. Everybody's needs `commitments:read-all`, which is one
   * person's grant — a fortnightly commitment is a person's word, and reading
   * the whole team's is a management act rather than a default.
   */
  async commitmentsFor(identity: OpsIdentity, personKey: string, periodKey: string) {
    if (identity.key !== personKey && !can(identity.capabilities, 'commitments:read-all')) {
      throw new ForbiddenException(`${personKey}'s commitments are theirs. This needs commitments:read-all.`);
    }

    const person = await this.prisma.opsPerson.findUnique({ where: { key: personKey } });
    if (!person) throw new NotFoundException(`No one here called ${personKey}`);

    const period = await this.prisma.opsPeriod.findUnique({ where: { key: periodKey } });
    if (!period) throw new NotFoundException(`No period called ${periodKey}`);

    const window = await this.metrics.windowForPeriod(periodKey);
    const commitments = await this.prisma.opsCommitment.findMany({
      where: { ownerId: person.id, operatingPeriodId: period.id },
      include: { links: true },
      orderBy: { dueDate: 'asc' },
    });

    return Promise.all(
      commitments.map(async (c) => {
        const number = await resolveNumber(
          this.prisma,
          c.measurementSource,
          Number(c.currentValue ?? 0),
          window,
        );
        const target = c.targetValue === null ? null : Number(c.targetValue);
        return {
          id: c.id,
          title: c.title,
          status: c.status,
          blocked: c.blocked,
          blockerReason: c.blockerReason,
          dueDate: c.dueDate,
          target,
          unit: c.unit,
          current: number.value,
          typedByHand: number.typedByHand,
          says: target === null ? number.says : `${number.value} of ${target}`,
          problem: number.problem,
          rows: number.rows,
          links: c.links,
          actualResult: c.actualResult,
        };
      }),
    );
  }

  async closeCommitment(
    id: string,
    input: { status: OpsCommitmentStatus; actualResult: string; evidenceUrl?: string },
    identity: OpsIdentity,
  ) {
    const commitment = await this.prisma.opsCommitment.findUnique({ where: { id } });
    if (!commitment) throw new NotFoundException('No such commitment');
    if (commitment.ownerId !== identity.personId) {
      throw new ForbiddenException('A commitment is closed by the person who made it');
    }

    return this.prisma.opsCommitment.update({
      where: { id },
      data: {
        status: input.status,
        actualResult: input.actualResult,
        evidenceUrl: input.evidenceUrl,
        closedAt: new Date(),
        blocked: false,
      },
    });
  }

  async flagBlocked(id: string, reason: string | null, identity: OpsIdentity) {
    const commitment = await this.prisma.opsCommitment.findUnique({ where: { id } });
    if (!commitment) throw new NotFoundException('No such commitment');
    if (commitment.ownerId !== identity.personId) {
      throw new ForbiddenException('Only the person who made it can say it is blocked');
    }

    return this.prisma.opsCommitment.update({
      where: { id },
      data: { blocked: reason !== null, blockerReason: reason },
    });
  }

  linkCommitment(commitmentId: string, targetType: string, targetId: string) {
    return this.prisma.opsCommitmentLink.upsert({
      where: { commitmentId_targetType_targetId: { commitmentId, targetType, targetId } },
      update: {},
      create: { commitmentId, targetType, targetId },
    });
  }

  // --- To-dos -------------------------------------------------------------

  async addTodo(input: {
    title: string;
    ownerKey: string;
    assignedById: string;
    dueDate?: Date;
    relatedRecordType?: string;
    relatedRecordId?: string;
    notes?: string;
  }, identity: OpsIdentity) {
    const owner = await this.prisma.opsPerson.findUnique({ where: { key: input.ownerKey } });
    if (!owner) throw new NotFoundException(`No one here called ${input.ownerKey}`);

    const workstreams = await this.prisma.opsWorkstream.findMany();
    const gate = mayPutAToDoOn(identity, owner.id, workstreams);
    if (!gate.allowed) throw new ForbiddenException(gate.because);

    return this.prisma.opsTodo.create({
      data: {
        title: input.title,
        ownerId: owner.id,
        assignedById: input.assignedById,
        dueDate: input.dueDate,
        relatedRecordType: input.relatedRecordType,
        relatedRecordId: input.relatedRecordId,
        notes: input.notes,
      },
    });
  }

  async todosFor(identity: OpsIdentity, personKey: string) {
    const person = await this.prisma.opsPerson.findUnique({ where: { key: personKey } });
    if (!person) throw new NotFoundException(`No one here called ${personKey}`);

    const workstreams = await this.prisma.opsWorkstream.findMany();
    // Reading somebody's list and writing on it are the same reach: if you may
    // not give them work, their list is not your business either.
    const gate = mayPutAToDoOn(identity, person.id, workstreams);
    if (!gate.allowed) throw new ForbiddenException(`${personKey}'s to-dos are theirs. ${gate.because}`);

    return this.prisma.opsTodo.findMany({
      where: { ownerId: person.id },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async setTodoStatus(id: string, status: OpsTodoStatus, identity: OpsIdentity) {
    const todo = await this.prisma.opsTodo.findUnique({ where: { id } });
    if (!todo) throw new NotFoundException('No such to-do');
    const workstreams = await this.prisma.opsWorkstream.findMany();
    if (!mayPutAToDoOn(identity, todo.ownerId, workstreams).allowed) {
      throw new ForbiddenException('Somebody else closes their own to-dos');
    }

    return this.prisma.opsTodo.update({
      where: { id },
      data: { status, completedAt: status === 'DONE' ? new Date() : null },
    });
  }
}
