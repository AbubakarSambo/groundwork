import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { METRICS, METRICS_BY_KEY, MetricWindow } from './a-number-you-can-open';
import { OpsIdentity } from './ops-people.service';
import { can } from './what-somebody-may-do';

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
