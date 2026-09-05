import { BadRequestException, Injectable } from '@nestjs/common';
import { OpsServes } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { whyThisIsNotSaidYet, needsSomebodyToAgree } from './what-a-piece-of-work-serves';
import {
  whatIsRunningOn,
  whyThisIsNotOperabilityWork,
} from './the-phases-overlap-so-a-phase-is-not-a-period';
import { OpsFreezeService } from './ops-freeze.service';

/**
 * What each piece of work serves, and the work that has not said.
 *
 * The second is the point. A declaration is a form somebody fills in; the list
 * of work that filled in nothing is the first threat, and it costs one query.
 */
@Injectable()
export class OpsWhatItServesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly freeze: OpsFreezeService,
  ) {}

  /** Said once per item and changeable: work is re-aimed, and pretending otherwise makes the field a lie people work around. */
  async say(
    input: {
      recordType: string;
      recordId: string;
      serves: OpsServes;
      servesRecordId?: string;
      justification: string;
      dependsOn?: string;
      dependsOnOwnedBy?: string;
    },
    declaredById: string,
  ) {
    const notYet = whyThisIsNotSaidYet(input);
    if (notYet) throw new BadRequestException(notYet);

    /*
     * THE FIFTH CATEGORY IS BOUNDED BY THE PHASE THAT MAKES IT LEGITIMATE.
     *
     * Read on the day it is claimed rather than stored with the record: a
     * declaration made in November is about November, and re-reading an old one
     * against today's phases would retroactively invalidate work that was
     * legitimate when it was done.
     */
    if (input.serves === 'MAKES_THE_COMPANY_OPERABLE') {
      const today = new Date();
      const phases = await this.prisma.opsPhase.findMany();
      const outside = whyThisIsNotOperabilityWork({
        runningPhases: whatIsRunningOn(
          phases.map((p) => ({ ...p, exitTarget: p.exitTarget === null ? null : Number(p.exitTarget) })),
          today,
        ),
        on: today,
      });
      if (outside) throw new BadRequestException(outside);
    }

    const data = {
      serves: input.serves,
      servesRecordId: input.servesRecordId ?? null,
      justification: input.justification.trim(),
      dependsOn: input.dependsOn?.trim() || null,
      dependsOnOwnedBy: input.dependsOnOwnedBy?.trim() || null,
      declaredById,
    };

    const written = await this.prisma.opsWhatItServes.upsert({
      where: { recordType_recordId: { recordType: input.recordType, recordId: input.recordId } },
      update: data,
      create: { recordType: input.recordType, recordId: input.recordId, ...data },
    });

    /*
     * THE FREEZE, CHECKED HERE BECAUSE THIS IS WHERE THE ANSWER EXISTS.
     *
     * It cannot be checked when the item is created: nothing is known about it
     * yet. It is known the moment somebody says what it serves, which is also
     * the moment the answer is cheapest to argue with.
     *
     * Sales work only counts as "making what exists work" when the use case it
     * points at does not currently work. Pointing at one we already support is
     * an improvement to something fine — an addition wearing a permitted label.
     */
    const theUseCase = input.servesRecordId
      ? await this.prisma.opsClientUseCase.findUnique({ where: { id: input.servesRecordId } })
      : null;

    const needsAnException = await this.freeze.whyThisNeedsAnException({
      serves: input.serves,
      /* PRODUCT_READY is the only state that means it works. Everything else —
         unknown, reviewing, a gap found, in progress — is a use case somebody
         cannot run today, which is exactly what September is for. */
      theUseCaseIsUnsupported: theUseCase ? theUseCase.productReadiness !== 'PRODUCT_READY' : undefined,
    });

    return {
      needsAnException,
      ...written,
      /* Said rather than enforced here: the approval is a separate act with its
         own queue, and swallowing it into this write would make "somebody agreed
         it was necessary" a thing this endpoint claimed on its own. */
      needsSomebodyToAgree: needsSomebodyToAgree(input.serves),
      says: needsAnException
        ? needsAnException
        : needsSomebodyToAgree(input.serves)
          ? 'Recorded. Keeping-it-up work needs somebody to agree it was necessary, or the category becomes the drawer everything is filed in.'
          : 'Recorded.',
    };
  }

  /**
   * WORK THAT HAS NAMED NOTHING.
   *
   * The first threat, and it is the absence of a row rather than a complaint
   * anybody filed. Open work only: something closed months ago that nobody
   * declared is history, and a list that grows for ever is a list nobody reads.
   */
  async namedNothing() {
    const declared = await this.prisma.opsWhatItServes.findMany({ select: { recordType: true, recordId: true } });
    const said = new Set(declared.map((d) => `${d.recordType}:${d.recordId}`));

    const [roadmap, tech, ux] = await Promise.all([
      this.prisma.opsRoadmapItem.findMany({
        where: { status: { not: 'COMPLETED' } },
        select: { id: true, title: true },
      }),
      this.prisma.opsTechItem.findMany({ where: { status: { not: 'RESOLVED' } }, select: { id: true, title: true } }),
      this.prisma.opsUXItem.findMany({ where: { status: { not: 'RESOLVED' } }, select: { id: true, title: true } }),
    ]);

    const rows = [
      ...roadmap.map((r) => ({ recordType: 'OpsRoadmapItem' as const, ...r })),
      ...tech.map((r) => ({ recordType: 'OpsTechItem' as const, ...r })),
      ...ux.map((r) => ({ recordType: 'OpsUXItem' as const, ...r })),
    ].filter((r) => !said.has(`${r.recordType}:${r.id}`));

    return {
      rows,
      value: rows.length,
      says:
        rows.length === 0
          ? 'Every open piece of work has said what it serves.'
          : `${rows.length} open ${rows.length === 1 ? 'item has' : 'items have'} not said what they serve.`,
    };
  }

  /** Every dependency anybody has declared, and who owns it. The half a lockfile cannot see. */
  dependencies() {
    return this.prisma.opsWhatItServes.findMany({
      where: { dependsOn: { not: null } },
      orderBy: { declaredAt: 'desc' },
    });
  }
}
