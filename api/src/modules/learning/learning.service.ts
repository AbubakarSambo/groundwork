import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CheckInStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GroundworkEvents } from '../../common';
import {
  Counts, Kind, Tally, addCounts, countPatterns, countProbes, countSteps, emptyCounts, splitTallyKey,
  type PatternFact, type ProbeFact, type StepFact,
} from './how-signals-are-counted';
import { LEARNING_SIGNAL } from './learning-signal';
import { suggestWeight } from './a-suggested-weight';
import { plainLearningRows, type LearningRow } from './what-the-admin-reads';

/** The scope of the total across every organisation. An organisation's own rows use its id. */
export const EVERYONE = 'ALL';

export { LEARNING_SIGNAL };
/**
 * ONE PLACE THAT COUNTS WHAT WORKED (week 8b). Counts are rebuilt from the record when a new signal
 * comes in and by a periodic job (learning.cron), never when somebody opens a page. The rows read
 * here carry no person and no words, and what is written is counts and a suggested weight only.
 * Nothing in this file reads a person's answer: `personAnswer` is not selected, only whether there is one.
 */
@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(e: { checkInId?: string }) {
    if (!e?.checkInId) return;
    const c = await this.prisma.checkIn.findUnique({ where: { id: e.checkInId }, select: { ground: { select: { organizationId: true } } } }).catch(() => null);
    if (c?.ground?.organizationId) await this.recountOrganisation(c.ground.organizationId).catch((err) => this.logger.warn(`Learning recount failed: ${err.message}`));
  }

  @OnEvent(LEARNING_SIGNAL)
  async onSignal(e: { detectionId?: string }) {
    if (!e?.detectionId) return;
    const d = await this.prisma.patternDetection.findUnique({ where: { id: e.detectionId }, select: { ground: { select: { organizationId: true } } } }).catch(() => null);
    const org = d?.ground?.organizationId;
    if (org) await this.recountOrganisation(org).catch((err) => this.logger.warn(`Learning recount failed: ${err.message}`));
  }

  /** Every organisation, then the total. The periodic job calls this. */
  async recountEverything(): Promise<void> {
    const orgs = await this.prisma.organization.findMany({ select: { id: true } });
    for (const o of orgs) await this.recountOrganisation(o.id, { skipTotal: true });
    await this.rebuildTheTotal();
  }

  async recountOrganisation(organizationId: string, opts: { skipTotal?: boolean } = {}): Promise<void> {
    const tally = await this.tallyFor(organizationId);
    await this.store(organizationId, tally);
    if (!opts.skipTotal) await this.rebuildTheTotal();
  }

  /** What the record says for one organisation. No person id, name or words is selected anywhere. */
  async tallyFor(organizationId: string): Promise<Tally> {
    const ground = { organizationId };
    const [patterns, completed, coaching, sessions] = await Promise.all([
      this.prisma.patternDetection.findMany({
        where: { ground },
        select: { code: true, participantId: true, leadMark: true, personAnsweredAt: true, readyAt: true, talkedAboutAt: true, talkedAboutAtPeriod: true, seenInSessions: true },
      }),
      this.prisma.checkIn.groupBy({ by: ['participantId'], where: { ground, status: CheckInStatus.COMPLETED }, _max: { sessionNumber: true } }),
      this.prisma.coachingState.findMany({ where: { participant: { ground } }, select: { history: true } }),
      this.prisma.checkIn.findMany({ where: { ground, status: CheckInStatus.COMPLETED, specificityLevel: { not: null } }, select: { probeSources: true, specificityLevel: true } }),
    ]);
    const latest = new Map<string, number | null>(completed.map((c: any) => [c.participantId, c._max?.sessionNumber ?? null]));
    const patternFacts: PatternFact[] = patterns.map((p: any) => ({
      code: p.code,
      leadMark: p.leadMark ?? null,
      personAnswered: !!p.personAnsweredAt,
      reachedTheLead: !!p.readyAt,
      talkedAbout: !!p.talkedAboutAt,
      talkedAboutAtPeriod: p.talkedAboutAtPeriod ?? null,
      lastSeenPeriod: (p.seenInSessions ?? []).length ? Math.max(...p.seenInSessions) : null,
      latestPeriodCompleted: latest.get(p.participantId) ?? null,
    }));
    const stepFacts: StepFact[] = coaching.flatMap((c: any) =>
      (Array.isArray(c.history) ? c.history : []).map((h: any) => ({ step: typeof h?.step === 'string' ? h.step : '', outcome: h?.outcome ?? null })),
    );
    const probeFacts: ProbeFact[] = sessions.map((s: any) => ({ sources: s.probeSources ?? [], specificity: s.specificityLevel ?? null }));
    const tally: Tally = new Map();
    countPatterns(patternFacts, tally);
    countSteps(stepFacts, tally);
    countProbes(probeFacts, tally);
    return tally;
  }

  private async store(scope: string, tally: Tally): Promise<void> {
    const keep: { kind: string; key: string }[] = [];
    for (const [id, counts] of tally) {
      const { kind, key } = splitTallyKey(id);
      keep.push({ kind, key });
      await this.write(scope, kind, key, counts);
    }
    const existing = await this.prisma.learningSignalCount.findMany({ where: { scope }, select: { id: true, kind: true, key: true } });
    const kept = new Set(keep.map((x) => `${x.kind}\u0000${x.key}`));
    const gone = existing.filter((r: any) => !kept.has(`${r.kind}\u0000${r.key}`)).map((r: any) => r.id);
    if (gone.length) await this.prisma.learningSignalCount.deleteMany({ where: { id: { in: gone } } });
  }

  private async write(scope: string, kind: string, key: string, counts: Counts): Promise<void> {
    const { weight, moved } = suggestWeight(counts);
    const data = { ...counts, suggestedWeight: weight, weightMoved: moved };
    await this.prisma.learningSignalCount.upsert({
      where: { scope_kind_key: { scope, kind, key } },
      create: { scope, kind, key, ...data },
      update: data,
    });
  }

  /** The total is the sum of the organisations' own rows. It never goes back to a person's record. */
  async rebuildTheTotal(): Promise<void> {
    const rows = await this.prisma.learningSignalCount.findMany({ where: { scope: { not: EVERYONE } } });
    const tally: Tally = new Map();
    for (const r of rows as any[]) {
      const id = `${r.kind}\u0000${r.key}`;
      tally.set(id, addCounts(tally.get(id) ?? emptyCounts(), r));
    }
    await this.store(EVERYONE, tally);
  }

  /**
   * WHAT A READER IS GIVEN. Groundwork's own platform admin reads the total, with no organisation's
   * name or id beside anything. An organisation's own admin reads only their own organisation's
   * counts. Nobody is ever handed another organisation's row.
   */
  async readFor(reader: { isPlatformAdmin?: boolean; organizationId?: string | null }, opts: { own?: boolean } = {}): Promise<LearningRow[]> {
    const scope = reader.isPlatformAdmin && !opts.own ? EVERYONE : reader.organizationId;
    if (!scope) return [];
    const rows = await this.prisma.learningSignalCount.findMany({ where: { scope }, orderBy: [{ kind: 'asc' }, { key: 'asc' }] });
    return plainLearningRows(rows as any[]);
  }
}
