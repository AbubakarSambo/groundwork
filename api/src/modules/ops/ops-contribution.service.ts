import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpsSettingsService, OPS_SETTINGS } from './ops-settings.service';
import { earnedCredit, DEFAULT_VALUE_BANDS, ValueBand } from './what-a-client-is-worth';
import {
  countsAsOriginationFor,
  countsAsPositioningFor,
  PAYING_ONWARD,
  QUALIFIED_ONWARD,
  whyNoCredit,
} from './only-the-originator-gets-origination';

/**
 * What each person actually created, and what the company as a whole did.
 *
 * Three views, kept apart on purpose, because collapsing any two of them is how
 * somebody ends up with credit they did not create:
 *
 *   The company's commercial performance.
 *   The health of the function Sahar owns.
 *   What one person personally originated.
 *
 * Nothing here produces a score, a rank or an order. The numbers are reported
 * side by side and left that way - a single combined figure would be an
 * arbitrary weighting presented as a fact, and it would turn a record meant for
 * an equity conversation into a leaderboard.
 */
@Injectable()
export class OpsContributionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: OpsSettingsService,
  ) {}

  private async bands(): Promise<ValueBand[]> {
    const raw = await this.settings.get(OPS_SETTINGS.clientValueBands);
    try {
      const parsed = JSON.parse(raw) as ValueBand[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_VALUE_BANDS;
    } catch {
      /* A malformed setting falls back rather than throwing: a broken band
         configuration should not take the whole contribution page down. */
      return DEFAULT_VALUE_BANDS;
    }
  }

  private async opportunitiesIn(from?: Date, to?: Date) {
    return this.prisma.opsCommercialOpportunity.findMany({
      include: { company: true, payments: true },
      orderBy: { createdAt: 'desc' },
      where:
        from && to
          ? {
              /*
               * Dated by FIRST PAYMENT rather than by when the record was
               * created. "New revenue this quarter" means money that arrived
               * this quarter, and an opportunity opened in March that started
               * paying in July belongs to July.
               */
              payments: { some: { paidAt: { gte: from, lte: to } } },
            }
          : undefined,
    });
  }

  /** A. What the company did. Not anybody's personal contribution. */
  async companyPerformance(from?: Date, to?: Date) {
    const all = await this.opportunitiesIn();
    const bands = await this.bands();

    const inWindow = (d: Date | null) => !from || !to || (d !== null && d >= from && d <= to);
    const cashIn = (o: (typeof all)[number]) =>
      o.payments
        .filter((p) => inWindow(p.paidAt))
        .reduce((sum, p) => sum + Number(p.amount), 0);

    const qualified = all.filter((o) => QUALIFIED_ONWARD.includes(o.stage));
    const paying = all.filter((o) => PAYING_ONWARD.includes(o.stage));
    const newCustomers = paying.filter((o) => inWindow(o.firstPaymentAt));

    const retainedFor = (months: number) =>
      paying
        .filter((o) => earnedCredit(
          o.payments.map((p) => ({ amount: Number(p.amount), paidAt: p.paidAt })),
          bands,
        ).monthsRetained >= months)
        .reduce((sum, o) => sum + cashIn(o), 0);

    return {
      totalPipeline: all
        .filter((o) => !['LOST'].includes(o.stage) && !PAYING_ONWARD.includes(o.stage))
        .reduce((sum, o) => sum + Number(o.estimatedContractValue ?? 0), 0),
      qualifiedPipeline: qualified
        .filter((o) => !PAYING_ONWARD.includes(o.stage))
        .reduce((sum, o) => sum + Number(o.estimatedContractValue ?? 0), 0),
      newCustomers: newCustomers.length,
      newMrr: newCustomers.reduce((sum, o) => sum + Number(o.actualMrr ?? 0), 0),
      newArr: newCustomers.reduce((sum, o) => sum + Number(o.actualMrr ?? 0) * 12, 0),
      contractValue: paying.reduce((sum, o) => sum + Number(o.actualContractValue ?? 0), 0),
      cashCollected: all.reduce((sum, o) => sum + cashIn(o), 0),
      retained3Month: retainedFor(3),
      retained6Month: retainedFor(6),
      retained12Month: retainedFor(12),
      /** Of everything that concluded, how much converted. */
      conversion: (() => {
        const concluded = all.filter((o) => PAYING_ONWARD.includes(o.stage) || o.stage === 'LOST');
        if (concluded.length === 0) return null;
        return Math.round((paying.length / concluded.length) * 100);
      })(),
      /** Revenue on deals that came through somebody's positioning. */
      throughPositioning: all
        .filter((o) => o.positioningSourceId !== null)
        .reduce((sum, o) => sum + cashIn(o), 0),
    };
  }

  /**
   * B. The health of the function Sahar owns. FUNCTION metrics, not hers.
   *
   * Deliberately contains no revenue attributed to anybody. Everything here is
   * about whether the pipeline is being worked, which is what owning a function
   * means, and none of it is her personal contribution.
   */
  async functionHealth() {
    const all = await this.opportunitiesIn();
    const live = all.filter((o) => o.stage !== 'LOST' && !PAYING_ONWARD.includes(o.stage));
    const now = new Date();

    return {
      livePipeline: live.length,
      pipelineValue: live.reduce((sum, o) => sum + Number(o.estimatedContractValue ?? 0), 0),
      overdueFollowUps: live.filter((o) => o.nextActionDueAt !== null && o.nextActionDueAt < now).length,
      withNothingPlanned: live.filter((o) => !o.nextAction).length,
      /** Records nobody has said who created. The CRM's own honesty measure. */
      attributionUnresolved: all.filter((o) => o.originatorState === 'NEEDS_REVIEW').length,
      says:
        live.length === 0
          ? 'Nothing live in the pipeline'
          : `${live.length} live, ${live.filter((o) => !o.nextAction).length} with nothing planned`,
    };
  }

  /**
   * C. One person's commercial contribution.
   *
   * Recording this for somebody does NOT make commercial acquisition part of
   * their job. A technical contributor with nothing here is not underperforming;
   * they are doing the work they are responsible for. The ledger says what
   * somebody created, and says nothing at all about what they owed.
   */
  async ledgerFor(personId: string, from?: Date, to?: Date) {
    const all = await this.opportunitiesIn();
    const bands = await this.bands();

    const inWindow = (d: Date | null) => !from || !to || (d !== null && d >= from && d <= to);
    const cashIn = (o: (typeof all)[number]) =>
      o.payments.filter((p) => inWindow(p.paidAt)).reduce((sum, p) => sum + Number(p.amount), 0);

    const originated = all.filter((o) => countsAsOriginationFor(o, personId));
    const positioned = all.filter((o) => countsAsPositioningFor(o, personId));
    const paying = originated.filter((o) => PAYING_ONWARD.includes(o.stage));

    const credits = paying.map((o) =>
      earnedCredit(o.payments.map((p) => ({ amount: Number(p.amount), paidAt: p.paidAt })), bands),
    );

    const retainedRevenue = (months: number) =>
      paying
        .filter((_, i) => credits[i].monthsRetained >= months)
        .reduce((sum, o) => sum + cashIn(o), 0);

    const positioningRecords = await this.prisma.opsPositioningRecord.findMany({
      where: { contributorId: personId },
    });

    const positioningPaying = positioned.filter((o) => PAYING_ONWARD.includes(o.stage));

    return {
      origination: {
        qualifiedOpportunities: originated.filter((o) => QUALIFIED_ONWARD.includes(o.stage)).length,
        pipelineValue: originated
          .filter((o) => !PAYING_ONWARD.includes(o.stage) && o.stage !== 'LOST')
          .reduce((sum, o) => sum + Number(o.estimatedContractValue ?? 0), 0),
        payingClients: paying.length,
        mrr: paying.reduce((sum, o) => sum + Number(o.actualMrr ?? 0), 0),
        arr: paying.reduce((sum, o) => sum + Number(o.actualMrr ?? 0) * 12, 0),
        cashCollected: paying.reduce((sum, o) => sum + cashIn(o), 0),
        retained3Month: retainedRevenue(3),
        retained6Month: retainedRevenue(6),
        retained12Month: retainedRevenue(12),
        creditsEarned: credits.reduce((sum, c) => sum + c.earned, 0),
        creditsPossible: credits.reduce((sum, c) => sum + c.possible, 0),
        /** The rows, so every figure above opens onto what made it. */
        clients: paying.map((o, i) => ({
          company: o.company.name,
          opportunity: o.name,
          stage: o.stage,
          cash: cashIn(o),
          credit: credits[i].says,
        })),
      },
      positioning: {
        /*
         * Every stage counted separately. "Ten introductions" and "ten
         * introductions that produced two clients" are different facts, and the
         * only way to tell them apart is to keep the whole funnel.
         */
        introductions: positioningRecords.filter((r) => r.stage !== 'TARGET').length,
        qualifiedAccess: positioningRecords.filter((r) =>
          ['QUALIFIED_ACCESS', 'OPPORTUNITY_CREATED', 'COMMERCIAL_OUTCOME'].includes(r.stage),
        ).length,
        qualifiedOpportunities: positioned.filter((o) => QUALIFIED_ONWARD.includes(o.stage)).length,
        payingClients: positioningPaying.length,
        revenue: positioningPaying.reduce((sum, o) => sum + cashIn(o), 0),
        retained6Month: positioningPaying
          .filter(
            (o) =>
              earnedCredit(
                o.payments.map((p) => ({ amount: Number(p.amount), paidAt: p.paidAt })),
                bands,
              ).monthsRetained >= 6,
          )
          .reduce((sum, o) => sum + cashIn(o), 0),
      },
      /** Anything of theirs that is not counting, and why. */
      notCounting: all
        .filter(
          (o) =>
            (o.opportunityOriginatorId === personId || o.positioningSourceId === personId) &&
            o.originatorState !== 'APPROVED' && o.positioningState !== 'APPROVED',
        )
        .map((o) => ({ opportunity: o.name, company: o.company.name, why: whyNoCredit(o) })),
    };
  }

  /**
   * Share of new revenue created, by person.
   *
   * Reported as a share rather than a rank, and never combined with anything
   * else into a single figure. The purpose is relative visibility; an ordering
   * of people from best to worst is a different product and not this one.
   */
  async shareOfNewRevenue(from?: Date, to?: Date) {
    const all = await this.opportunitiesIn();
    const people = await this.prisma.opsPerson.findMany();

    const inWindow = (d: Date) => !from || !to || (d >= from && d <= to);
    const cashIn = (o: (typeof all)[number]) =>
      o.payments.filter((p) => inWindow(p.paidAt)).reduce((sum, p) => sum + Number(p.amount), 0);

    const credited = all.filter((o) => o.originatorState === 'APPROVED' && o.opportunityOriginatorId);
    const total = credited.reduce((sum, o) => sum + cashIn(o), 0);

    const rows = people
      .map((p) => {
        const theirs = credited.filter((o) => o.opportunityOriginatorId === p.id);
        const revenue = theirs.reduce((sum, o) => sum + cashIn(o), 0);
        return {
          person: p.displayName,
          personKey: p.key,
          revenue,
          share: total === 0 ? null : Math.round((revenue / total) * 100),
          clients: theirs.filter((o) => PAYING_ONWARD.includes(o.stage)).length,
        };
      })
      .filter((r) => r.revenue > 0);

    /**
     * Unattributed revenue is shown rather than dropped. Otherwise the shares
     * add to 100% of a number smaller than the company actually made, and the
     * gap is invisible - which is exactly the gap somebody should be closing.
     */
    const unattributed = all
      .filter((o) => o.originatorState !== 'APPROVED' || !o.opportunityOriginatorId)
      .reduce((sum, o) => sum + cashIn(o), 0);

    return {
      total,
      unattributed,
      rows: rows.sort((a, b) => b.revenue - a.revenue),
      says:
        total === 0
          ? 'No attributed revenue in this window'
          : `${total} attributed across ${rows.length}${unattributed > 0 ? `, and ${unattributed} not attributed to anybody` : ''}`,
    };
  }
}
