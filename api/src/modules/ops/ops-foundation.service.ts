import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
      // A sprint and a quarter can both contain today; both belong at the top.
      ...periods.filter(containsToday),
      ...periods.filter((p) => !containsToday(p)),
    ];
  }

  workstreams() {
    return this.prisma.opsWorkstream.findMany({ orderBy: { name: 'asc' } });
  }
}
