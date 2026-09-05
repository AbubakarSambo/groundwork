import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { keyFromName, whyTheseDatesAreWrong } from './a-sprint-is-something-you-set';

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

  /**
   * Start a sprint, over whatever stretch of time somebody says.
   *
   * Quarters and cycles are not created here on purpose. A quarter is the
   * calendar and a cycle hangs off one — neither is a choice, and both have
   * containment rules that a free-form form would quietly break. A sprint is
   * the one period the company decides, so it is the one this writes.
   */
  async startASprint(input: {
    name: string;
    startsOn: Date;
    endsOn: Date;
    goal?: string | null;
    actorPersonId?: string;
  }) {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('A sprint needs a name — it is what every board will call it.');

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
        kind: 'SPRINT',
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        goal: input.goal?.trim() || null,
        status: 'PLANNED',
      },
    });
  }

  /**
   * Move a sprint's dates, rename it, or open and close it.
   *
   * THE KEY NEVER MOVES. It is made from the name at creation and then left
   * alone: every company, every contributor target and every saved board link
   * points at it, and a rename that re-slugged would silently empty all of
   * them. So a renamed sprint keeps the key it was born with, which is why the
   * key is shown on the form rather than hidden.
   */
  async resetASprint(
    key: string,
    patch: { name?: string; startsOn?: Date; endsOn?: Date; goal?: string | null; status?: 'PLANNED' | 'OPEN' | 'CLOSED' },
  ) {
    const period = await this.prisma.opsPeriod.findUnique({ where: { key } });
    if (!period) throw new NotFoundException(`No period called ${key}`);
    if (period.kind !== 'SPRINT') {
      throw new BadRequestException(
        `${period.name} is a ${period.kind.toLowerCase()}, not a sprint. Quarters follow the calendar and cycles hang off a quarter — neither is ours to move.`,
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
