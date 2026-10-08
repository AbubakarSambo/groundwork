import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { theGroundIsHere } from './the-ground-is-here';
import { Figure, howItReads as figureReads } from './a-figure-is-a-value-with-a-source';
import { whatDoesNotAddUp, worthAsking, howItReads } from './what-does-not-add-up';
import { whatToAskNext, CandidateKey, whenNothingIsLeft, whatWouldAccountForIt } from './an-explanation-is-a-candidate';

/**
 * FIGURES, AND WHAT DOES NOT ADD UP BETWEEN THEM.
 *
 * The reasoning is in the three files beside this one; this holds it against a
 * database so that a difference lasts longer than the conversation it was noticed
 * in.
 *
 * NOTHING HERE COMPARES AN UNCONFIRMED FIGURE. A number a model read out of a
 * document is a reading, and a reading that quietly becomes an input to arithmetic
 * is the failure this whole area is most likely to die of. Somebody who would know
 * confirms it first, and the refusal says so.
 *
 * AND A DIFFERENCE IS RAISED ONCE, NOT EVERY MONTH. The same two figures compared
 * again find the same gap; without carrying the row forward, the product asks the
 * same question every session and reads as not listening.
 */
@Injectable()
export class AlignmentService {
  constructor(private readonly prisma: PrismaService) {}

  /** Record a figure. Unconfirmed until somebody who would know says it is right. */
  async recordFigure(
    organizationId: string,
    groundId: string,
    f: Omit<Figure, 'period'> & { periodFrom: Date; periodTo: Date; documentId?: string },
  ) {
    if (!Number.isInteger(f.minorUnits)) {
      throw new BadRequestException('A figure is held in minor units, as a whole number.');
    }
    if (!/^[A-Z]{3}$/.test(f.currency)) {
      throw new BadRequestException('A currency is a three-letter code.');
    }
    await theGroundIsHere(this.prisma, groundId, organizationId);

    return this.prisma.reportedFigure.create({
      data: {
        organizationId,
        groundId,
        says: f.says,
        minorUnits: f.minorUnits,
        currency: f.currency,
        periodFrom: f.periodFrom,
        periodTo: f.periodTo,
        source: f.source,
        statedBy: f.statedBy,
        from: f.from,
        documentId: f.documentId ?? null,
        /* A figure somebody typed or said IS their statement — it is confirmed by
           being said. Only a reading out of a document waits for a person. */
        confirmedAt: f.source === 'a document somebody uploaded' ? null : new Date(),
      },
      select: { id: true, says: true, minorUnits: true, currency: true, confirmedAt: true },
    });
  }

  async confirmFigure(organizationId: string, groundId: string, figureId: string, userId: string) {
    const found = await this.prisma.reportedFigure.findFirst({ where: { id: figureId, organizationId, groundId } });
    if (!found) throw new NotFoundException('No such figure.');
    return this.prisma.reportedFigure.update({
      where: { id: figureId },
      data: { confirmedAt: new Date(), confirmedByUser: userId },
      select: { id: true, confirmedAt: true },
    });
  }

  /**
   * Compare a stated figure against a set of parts, and keep the difference if
   * there is one worth anybody's month.
   */
  async compare(
    organizationId: string,
    groundId: string,
    statedFigureId: string,
    countedFigureIds: string[],
  ): Promise<
    | { difference: { id: string; says: string; ask: string | null } }
    | { nothing: string }
    | { cannot: string }
  > {
    const rows = await this.prisma.reportedFigure.findMany({
      where: { organizationId, groundId, id: { in: [statedFigureId, ...countedFigureIds] } },
    });
    const stated = rows.find((r) => r.id === statedFigureId);
    const counted = countedFigureIds.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as typeof rows;
    if (!stated || counted.length !== countedFigureIds.length) throw new NotFoundException('No such figure.');

    /* THE READING IS NOT THE FIGURE. A number extracted from a document and never
       checked by a person must not become an input to arithmetic that a commercial
       relationship then argues about. */
    const unchecked = [stated, ...counted].filter((r) => r.confirmedAt === null);
    if (unchecked.length) {
      return {
        cannot:
          `${unchecked.map((u) => `“${u.says}”`).join(' and ')} ${unchecked.length === 1 ? 'was' : 'were'} read out of a document `
          + 'and nobody has checked it yet. A reading is not a figure until somebody who would know says it is right.',
      };
    }

    const asFigure = (r: (typeof rows)[number]): Figure => ({
      says: r.says,
      minorUnits: r.minorUnits,
      currency: r.currency,
      period: { from: r.periodFrom, to: r.periodTo },
      source: r.source as Figure['source'],
      statedBy: r.statedBy,
      from: r.from,
    });

    const outcome = whatDoesNotAddUp(asFigure(stated), counted.map(asFigure));
    if (outcome === null) return { nothing: 'Those come to the same amount.' };
    if ('cannot' in outcome) return { cannot: outcome.cannot };
    if (!worthAsking(outcome.difference)) {
      return { nothing: 'They are apart by an amount too small to be worth anybody chasing.' };
    }

    /* Raised once. The same comparison next month finds the same gap, and asking
       about it again every session reads as not listening. */
    const already = await this.prisma.difference.findFirst({
      where: {
        groundId,
        statedFigureId,
        periodFrom: stated.periodFrom,
        state: { not: 'no longer there' },
      },
    });
    if (already) {
      return { difference: { id: already.id, says: howItReads(outcome.difference), ask: already.lastAsked } };
    }

    const next = whatToAskNext(outcome.difference);
    const saved = await this.prisma.difference.create({
      data: {
        organizationId,
        groundId,
        between: outcome.difference.between,
        minorUnits: outcome.difference.minorUnits,
        currency: outcome.difference.currency,
        periodFrom: stated.periodFrom,
        periodTo: stated.periodTo,
        statedFigureId,
        countedFigureIds,
        ruledOut: [],
        lastAsked: next?.ask ?? null,
        lastAskedAt: next ? new Date() : null,
      },
    });

    return { difference: { id: saved.id, says: howItReads(outcome.difference), ask: next?.ask ?? null } };
  }

  /**
   * An answer about a difference.
   *
   * A CANDIDATE IS ONLY EVER RULED OUT BY A PERSON SAYING SO. Nothing infers it,
   * because inferring which explanation is gone is how a product convinces itself
   * of the one nobody offered.
   */
  async answered(
    organizationId: string,
    groundId: string,
    differenceId: string,
    said: { ruledOut?: CandidateKey[]; accountedForBy?: string },
  ) {
    const d = await this.prisma.difference.findFirst({ where: { id: differenceId, organizationId, groundId } });
    if (!d) throw new NotFoundException('No such difference.');

    const ruledOut = [...new Set([...d.ruledOut, ...(said.ruledOut ?? [])])];

    if (said.accountedForBy) {
      const updated = await this.prisma.difference.update({
        where: { id: d.id },
        data: { state: 'explained', accountedForBy: said.accountedForBy, accountedAt: new Date(), ruledOut },
        select: { id: true, state: true },
      });
      return { ...updated, ask: null, said: 'Noted, and it stays on the record with what you said.' };
    }

    const asFigure = {
      between: d.between,
      minorUnits: d.minorUnits,
      currency: d.currency,
      period: { from: d.periodFrom, to: d.periodTo },
      state: d.state as any,
      share: 1,
    };
    const next = whatToAskNext(asFigure, ruledOut as CandidateKey[]);

    await this.prisma.difference.update({
      where: { id: d.id },
      data: { ruledOut, lastAsked: next?.ask ?? null, lastAskedAt: next ? new Date() : d.lastAskedAt },
    });

    return {
      id: d.id,
      state: d.state,
      ask: next?.ask ?? null,
      said: next ? null : whenNothingIsLeft(asFigure),
    };
  }

  /** What is open on this check-in, so a session can carry it forward rather than start again. */
  async whatIsOpen(organizationId: string, groundId: string) {
    const rows = await this.prisma.difference.findMany({
      where: { organizationId, groundId, state: { in: ['not explained yet', 'explained before, not now'] } },
      orderBy: { firstSeenAt: 'asc' },
    });
    return rows.map((d) => {
      const asFigure = {
        between: d.between,
        minorUnits: d.minorUnits,
        currency: d.currency,
        period: { from: d.periodFrom, to: d.periodTo },
        state: d.state as any,
        share: 1,
      };
      const stillToAsk = whatWouldAccountForIt(asFigure)
        .filter((c) => !d.ruledOut.includes(c.key))
        .map((c) => c.key);

      return {
      id: d.id,
      says: howItReads(asFigure),
      askedAlready: d.lastAsked,
      stillToAsk,
      /* WITH NOTHING LEFT TO ASK, A SESSION HAS TO BE TOLD WHAT THAT MEANS.
         Found by running it: a difference where every ordinary explanation had
         been ruled out came back with no question and no explanation of why, which
         reads as the product having given up rather than having finished asking. */
      andNow: stillToAsk.length === 0 ? whenNothingIsLeft(asFigure) : null,
      /* Since when, because a difference nobody has explained for three months is
         a different thing from one raised this morning — and that is the pattern
         across months this object exists to make possible. */
      openSince: d.firstSeenAt,
      };
    });
  }

  /** The figures on a check-in, each with where it came from. */
  async figures(organizationId: string, groundId: string) {
    const rows = await this.prisma.reportedFigure.findMany({
      where: { organizationId, groundId },
      orderBy: [{ periodFrom: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      says: figureReads({
        says: r.says,
        minorUnits: r.minorUnits,
        currency: r.currency,
        period: { from: r.periodFrom, to: r.periodTo },
        source: r.source as Figure['source'],
        statedBy: r.statedBy,
        from: r.from,
      }),
      checked: r.confirmedAt !== null,
    }));
  }
}
