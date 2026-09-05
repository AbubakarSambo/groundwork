import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { keyFromName, whyTheseDatesAreWrong } from './a-target-list-is-something-you-set';
import {
  whatIsRunningOn,
  whereTheCompanyIs,
  canWeTellWhenThisIsDone,
  type APhase,
} from './the-phases-overlap-so-a-phase-is-not-a-period';
import {
  whyThisPeriodCannotOpenYet,
  whatStandsBetweenUsAndOpening as whatIsOutstanding,
} from './a-period-does-not-open-with-somebody-unset';

/** Reads of the standing furniture: periods and workstreams. */
@Injectable()
export class OpsFoundationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The period containing today first, then the rest in time order.
   *
   * This was "newest first, because the period anybody wants is nearly always
   * the current one" — and newest is not current. On 4 September the list
   * opened on Cycle 7, which begins on 24 December, and the period somebody
   * actually wanted was near the bottom. Two true sentences that do not follow
   * from each other.
   */
  async periods() {
    const periods = await this.prisma.opsPeriod.findMany({ orderBy: { startsOn: 'asc' } });
    const today = new Date();

    const containsToday = (p: (typeof periods)[number]) => p.startsOn <= today && p.endsOn >= today;

    return [
      // A target list and a quarter can both contain today; both belong at the top.
      ...periods.filter(containsToday),
      ...periods.filter((p) => !containsToday(p)),
    ];
  }

  workstreams() {
    return this.prisma.opsWorkstream.findMany({ orderBy: { name: 'asc' } });
  }

  /**
   * Start a list, over whatever stretch of time somebody says.
   *
   * Quarters and cycles are not created here on purpose. A quarter is the
   * calendar and a cycle hangs off one — neither is a choice, and both have
   * containment rules that a free-form form would quietly break. A target list is
   * the one period the company decides, so it is the one this writes.
   */
  async startATargetList(input: {
    name: string;
    startsOn: Date;
    endsOn: Date;
    goal?: string | null;
    actorPersonId?: string;
  }) {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('A target list needs a name — it is what every board will call it.');

    const wrong = whyTheseDatesAreWrong({ startsOn: input.startsOn, endsOn: input.endsOn });
    if (wrong) throw new BadRequestException(wrong);

    const key = keyFromName(name);
    const clash = await this.prisma.opsPeriod.findUnique({ where: { key } });
    if (clash) {
      throw new ConflictException(
        `There is already a period called "${clash.name}". Give this one a name that tells them apart — the key is made from the name and has to be unique.`,
      );
    }

    return this.prisma.opsPeriod.create({
      data: {
        key,
        name,
        kind: 'TARGET_LIST',
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        goal: input.goal?.trim() || null,
        status: 'PLANNED',
      },
    });
  }

  /**
   * Who is active, and who owns an objective in this period.
   *
   * One place, called by both the gate and the question it answers, so the page
   * that says "waiting on Adam" and the refusal that names Adam cannot come to
   * different conclusions.
   */
  private async whoIsSetIn(periodId: string) {
    const [active, objectives] = await Promise.all([
      this.prisma.opsPerson.findMany({
        where: { active: true },
        select: { id: true, displayName: true },
      }),
      this.prisma.opsObjective.findMany({ where: { periodId }, select: { ownerId: true } }),
    ]);

    return {
      active: active.map((p) => ({ personId: p.id, displayName: p.displayName })),
      ownerIds: new Set(objectives.map((o) => o.ownerId)),
    };
  }

  /**
   * THE WORKPLAN: five phases, overlapping, with what has to be true to leave
   * each one.
   *
   * No percentage complete anywhere. A phase ends when its exit condition is
   * true, and being three weeks from its end date says nothing about whether it
   * will be — so a progress bar here would be a confident answer to a question
   * nobody asked.
   */
  async theWorkplan() {
    const rows = await this.prisma.opsPhase.findMany({ orderBy: { ordinal: 'asc' } });
    const phases: APhase[] = rows.map((p) => ({
      ...p,
      exitTarget: p.exitTarget === null ? null : Number(p.exitTarget),
    }));

    const today = new Date();
    const running = new Set(whatIsRunningOn(phases, today).map((p) => p.key));

    return {
      today: whereTheCompanyIs(phases, today),
      phases: phases.map((p) => ({
        key: p.key,
        name: p.name,
        intent: p.intent,
        startsOn: p.startsOn,
        endsOn: p.endsOn,
        running: running.has(p.key),
        exitCondition: p.exitCondition,
        exitMetric: p.exitMetric,
        exitTarget: p.exitTarget,
        permitsOperability: p.permitsOperability,
        ...canWeTellWhenThisIsDone(p),
      })),
    };
  }

  /** What the gate would say, without opening anything. */
  async whatStandsBetweenUsAndOpening(key: string) {
    const period = await this.prisma.opsPeriod.findUnique({ where: { key } });
    if (!period) throw new NotFoundException(`No period called ${key}`);
    if (period.status === 'OPEN') {
      return { ready: true, says: `${period.name} is already open.`, waitingOn: [] };
    }
    return whatIsOutstanding({ periodName: period.name, ...(await this.whoIsSetIn(period.id)) });
  }

  /**
   * OPEN A PERIOD.
   *
   * The only way a quarter opens — there was none before this, which is why a
   * quarter could start with nobody set: nothing was ever asked.
   *
   * A target list can also be opened through `resetATargetList`, and that door
   * runs the same gate. Two doors and one gate; two doors and one of them
   * gateless is the same as no gate.
   */
  async openThePeriod(key: string) {
    const period = await this.prisma.opsPeriod.findUnique({ where: { key } });
    if (!period) throw new NotFoundException(`No period called ${key}`);
    if (period.status === 'OPEN') return period;
    if (period.status === 'CLOSED') {
      throw new BadRequestException(
        `${period.name} is closed. Reopening a period would change what was already reported against it.`,
      );
    }

    const refusal = whyThisPeriodCannotOpenYet({
      periodName: period.name,
      ...(await this.whoIsSetIn(period.id)),
    });
    if (refusal) throw new BadRequestException(refusal);

    return this.prisma.opsPeriod.update({ where: { key }, data: { status: 'OPEN' } });
  }

  /**
   * Move a target list's dates, rename it, or open and close it.
   *
   * THE KEY NEVER MOVES. It is made from the name at creation and then left
   * alone: every company, every contributor target and every saved board link
   * points at it, and a rename that re-slugged would silently empty all of
   * them. So a renamed list keeps the key it was born with, which is why the
   * key is shown on the form rather than hidden.
   */
  async resetATargetList(
    key: string,
    patch: { name?: string; startsOn?: Date; endsOn?: Date; goal?: string | null; status?: 'PLANNED' | 'OPEN' | 'CLOSED' },
  ) {
    const period = await this.prisma.opsPeriod.findUnique({ where: { key } });
    if (!period) throw new NotFoundException(`No period called ${key}`);
    if (period.kind !== 'TARGET_LIST') {
      throw new BadRequestException(
        `${period.name} is a ${period.kind.toLowerCase()}, not a target list. Quarters follow the calendar and cycles hang off a quarter — neither is ours to move.`,
      );
    }

    /* Checked against what the period will BE, not against what was sent: a
       patch that moves only the start date has to be judged against the end
       date already stored, or half a change passes a rule the whole fails. */
    const wrong = whyTheseDatesAreWrong({
      startsOn: patch.startsOn ?? period.startsOn,
      endsOn: patch.endsOn ?? period.endsOn,
    });
    if (wrong) throw new BadRequestException(wrong);

    /* THE SECOND DOOR. Opening through a patch runs the same gate as opening
       through `openThePeriod` — this is the door that already existed, so
       leaving it ungated would have made the gate decorative. */
    if (patch.status === 'OPEN' && period.status !== 'OPEN') {
      const refusal = whyThisPeriodCannotOpenYet({
        periodName: period.name,
        ...(await this.whoIsSetIn(period.id)),
      });
      if (refusal) throw new BadRequestException(refusal);
    }

    return this.prisma.opsPeriod.update({
      where: { key },
      data: {
        name: patch.name?.trim() || undefined,
        startsOn: patch.startsOn,
        endsOn: patch.endsOn,
        goal: patch.goal === undefined ? undefined : patch.goal?.trim() || null,
        status: patch.status,
      },
    });
  }
}
