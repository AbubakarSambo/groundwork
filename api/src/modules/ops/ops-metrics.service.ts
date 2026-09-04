import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { METRICS, METRICS_BY_KEY, MetricWindow } from './a-number-you-can-open';
import { OpsIdentity } from './ops-people.service';
import { can } from './what-somebody-may-do';
import { BOARDS, BOARDS_BY_KEY } from './what-each-person-opens-to';

@Injectable()
export class OpsMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /** What the caller may look at. A metric they cannot open is not listed. */
  catalogue(identity: OpsIdentity) {
    return METRICS.filter((m) => can(identity.capabilities, m.capability)).map((m) => ({
      key: m.key,
      label: m.label,
      counts: m.counts,
    }));
  }

  /**
   * One metric, with its rows.
   *
   * The capability is checked here rather than on the route, because a metric's
   * permission belongs to the metric: putting it on the route means every new
   * metric silently inherits whatever the route was guarding.
   */
  async read(identity: OpsIdentity, key: string, window: MetricWindow) {
    const metric = METRICS_BY_KEY.get(key);
    if (!metric) throw new NotFoundException(`No metric called ${key}`);
    if (!can(identity.capabilities, metric.capability)) {
      throw new ForbiddenException(`${key} needs ${metric.capability}`);
    }

    const result = await metric.compute(this.prisma, window);
    return {
      key: metric.key,
      label: metric.label,
      counts: metric.counts,
      window,
      ...result,
    };
  }

  /**
   * A whole board: every number on it, each with its rows.
   *
   * Metrics the caller cannot hold are dropped. A board that says "you cannot
   * see this" in six places is not a board, it is a reminder of what you are not.
   */
  async board(identity: OpsIdentity, boardKey: string, window: MetricWindow) {
    const board = BOARDS_BY_KEY.get(boardKey);
    if (!board) throw new NotFoundException(`No board called ${boardKey}`);

    const readable = board.metrics
      .map((key) => METRICS_BY_KEY.get(key))
      .filter((m): m is NonNullable<typeof m> => m !== undefined && can(identity.capabilities, m.capability));

    return {
      key: board.key,
      name: board.name,
      answers: board.answers,
      window,
      numbers: await Promise.all(
        readable.map(async (metric) => {
          const result = await metric.compute(this.prisma, window);
          return {
            key: metric.key,
            label: metric.label,
            shape: metric.shape,
            counts: metric.counts,
            ...result,
          };
        }),
      ),
      /** What this board shows about the person looking, not about the company. */
      personalPanels: board.personalPanels,
      /** Named rather than silently missing, so the board is honest about itself. */
      hiddenFromYou: board.metrics.filter((key) => {
        const metric = METRICS_BY_KEY.get(key);
        return metric !== undefined && !can(identity.capabilities, metric.capability);
      }),
    };
  }

  /**
   * Which boards this person may open, and which one they land on.
   *
   * A board is offered when it is YOURS, or when you can see all of it. Offered
   * on partial visibility, a contributor holding sprint:read was shown "Running
   * the company" because two of its eleven numbers happened to be sprint
   * counts — a board that tells somebody they are looking at the company's
   * command centre while showing them a ninth of it. Better to not offer it and
   * let them open the two numbers directly, which they may.
   */
  boardsFor(identity: OpsIdentity) {
    const mine = BOARDS.filter((b) => b.landsFor.some((c) => can(identity.capabilities, c)));
    const canSeeAllOf = (b: (typeof BOARDS)[number]) =>
      b.metrics.every((key) => {
        const metric = METRICS_BY_KEY.get(key);
        return metric !== undefined && can(identity.capabilities, metric.capability);
      });

    return {
      lands: mine[0]?.key ?? null,
      boards: BOARDS.map((b) => ({
        key: b.key,
        name: b.name,
        answers: b.answers,
        yours: mine.includes(b),
        /** How much of it you would actually see. Nothing at all means do not offer it. */
        numbersYouCanSee: b.metrics.filter((key) => {
          const metric = METRICS_BY_KEY.get(key);
          return metric !== undefined && can(identity.capabilities, metric.capability);
        }).length,
        personalPanels: b.personalPanels,
      })).filter((b) => {
        const board = BOARDS_BY_KEY.get(b.key)!;
        if (b.yours) return true;
        return canSeeAllOf(board);
      }),
    };
  }

  /** The window a period covers, so a metric and a board always agree on dates. */
  async windowForPeriod(periodKey: string): Promise<MetricWindow> {
    const period = await this.prisma.opsPeriod.findUnique({ where: { key: periodKey } });
    if (!period) throw new NotFoundException(`No period called ${periodKey}`);
    return {
      from: period.startsOn,
      // Inclusive of the last day: a period that ends on the 30th includes
      // everything that happened on the 30th, not everything up to midnight
      // that morning.
      to: new Date(period.endsOn.getTime() + 86399999),
    };
  }
}
