import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { findUndeclaredDependencies, SubjectRef, Mention, sayIt } from './nobody-wrote-the-dependency-down';
import { quietUntil } from '../subjects/detection-holds-its-tongue';
import { STOPWORDS } from '../knowledge/knowledge.service';
import { findGoalDivergence, sayIt as sayDivergence } from './describing-the-same-goal-differently';

/**
 * RUNNING THE DETECTORS THAT NEED A SUBJECT AND A VIEW ACROSS GROUNDS.
 *
 * The thirty-eight existing codes are unchanged and still run inside a check-in. This is only the
 * handful that could not exist before, because they are about a piece of the customer's own work
 * rather than about one person's account of their week.
 */
/** Months rather than weeks: an objective is a quarter-shaped thing and quiet for a fortnight is normal. */
export const UNMENTIONED_DAYS = 60;

@Injectable()
export class DetectorsService {
  private readonly logger = new Logger(DetectorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * WHICH SUBJECT SOMEBODY WAS TALKING ABOUT.
   *
   * There is no "this turn mentioned objective X" record, and inventing one at write time would
   * mean deciding, in the moment, what somebody meant - with no way to revisit it when the
   * objective's wording changes. So the match happens at read time against the title as it stands.
   *
   * Deliberately strict: EVERY meaningful word of the title has to appear. "Rebuild the billing
   * service" matches "the billing service rebuild is slipping" and does not match "billing". A
   * loose match here would produce dependencies nobody has, which is worse than producing none -
   * the finding is about two named objectives and being wrong about which ones is the whole error.
   */
  private mentionsOf(subjects: SubjectRef[], turns: { personExternalId: string; content: string; createdAt: Date }[]): Mention[] {
    const keyed = subjects.map((s) => ({
      s,
      words: s.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
    })).filter((k) => k.words.length > 0);

    const out: Mention[] = [];
    for (const t of turns) {
      const flat = t.content.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const k of keyed) {
        if (k.words.every((w) => flat.includes(w))) {
          out.push({ personExternalId: t.personExternalId, subjectExternalId: k.s.externalId, at: t.createdAt });
        }
      }
    }
    return out;
  }

  /**
   * A DECLARED OBJECTIVE NOBODY HAS REFERENCED IN MONTHS.
   *
   * The cheapest finding in the spec and one of the more useful: an objective that stopped being
   * talked about has usually stopped being worked on, and nobody has said so out loud. It needs the
   * conversations, which is why an OKR tool cannot produce it - their tool shows it as green until
   * somebody remembers to change it.
   *
   * NOT REPORTED FOR AN OBJECTIVE YOUNGER THAN THE WINDOW. Something set last week has not gone
   * quiet; it has just started, and saying otherwise on day three would be the product being wrong
   * in the way that teaches people to ignore it.
   */
  private async objectiveUnmentioned(
    organizationId: string,
    subjects: SubjectRef[],
    turns: { personExternalId: string; content: string; createdAt: Date }[],
  ): Promise<number> {
    const now = Date.now();
    const cutoff = now - UNMENTIONED_DAYS * 86_400_000;
    const mentions = this.mentionsOf(subjects, turns);
    const lastMention = new Map<string, number>();
    for (const m of mentions) {
      lastMention.set(m.subjectExternalId, Math.max(lastMention.get(m.subjectExternalId) ?? 0, m.at.getTime()));
    }

    const rows = await this.prisma.subject.findMany({
      where: { organizationId, sourceDeletedAt: null },
      select: { externalId: true, title: true, createdAt: true, dueDate: true },
    });

    let n = 0;
    for (const r of rows) {
      /* Too young to have gone quiet. */
      if (r.createdAt.getTime() > cutoff) continue;
      const last = lastMention.get(r.externalId);
      if (last && last > cutoff) continue;

      const says = last
        ? `Nobody has mentioned ${r.title} to me since ${new Date(last).toDateString()}. If it is still live, it is worth a word; if it is not, it is worth closing.`
        : `${r.title} has been on the books since ${r.createdAt.toDateString()} and nobody has mentioned it to me at all. That may mean it is being worked on somewhere I cannot see.`;

      const existing = await this.prisma.detectorResult.findFirst({
        where: { organizationId, key: 'objective_unmentioned', resolvedAt: null, subjectExternalId: r.externalId },
      });
      if (existing) {
        await this.prisma.detectorResult.update({ where: { id: existing.id }, data: { evidence: { says, lastMentionedAt: last ? new Date(last) : null } as any, lastSeenAt: new Date() } });
      } else {
        await this.prisma.detectorResult.create({
          data: {
            organizationId, subjectExternalId: r.externalId, key: 'objective_unmentioned',
            severity: 'low',
            evidence: { says, lastMentionedAt: last ? new Date(last) : null } as any,
          },
        });
      }
      n += 1;
    }
    return n;
  }

  /**
   * WHERE TWO PEOPLE ON ONE OBJECTIVE DESCRIBE IT AS DIFFERENT WORK.
   *
   * Only for grounds that were SUMMONED against a subject. A ground opened inside Groundwork has no
   * subject and never will, and inferring one from a title would mean deciding what somebody meant
   * and then reporting a divergence based on the guess - a finding about two named people, resting
   * on an inference nobody made.
   *
   * The accounts compared are what each person said the work IS: their own stated expectations
   * inside that check-in. Not how well they said it. There is no score for articulacy here and
   * there must never be one.
   */
  private async goalDivergence(organizationId: string, subjects: SubjectRef[]): Promise<number> {
    const grounds = await this.prisma.ground.findMany({
      where: { organizationId, subjectExternalId: { not: null } },
      select: { id: true, subjectExternalId: true },
    });
    if (!grounds.length) return 0;

    /* Grouped by subject, because two grounds against one objective are two rounds of the same
       conversation and the question is whether the PEOPLE agree, not whether the meetings did. */
    const bySubject = new Map<string, string[]>();
    for (const g of grounds) {
      bySubject.set(g.subjectExternalId!, [...(bySubject.get(g.subjectExternalId!) ?? []), g.id]);
    }

    let n = 0;
    for (const [subjectExternalId, groundIds] of bySubject) {
      const rows = await this.prisma.personObjective.findMany({
        where: { groundId: { in: groundIds } },
        select: {
          text: true, createdAt: true,
          participant: { select: { email: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      /* Resolved to identity-system ids, because a finding about people has to name people the
         customer's own systems know. Anybody unresolved is left out rather than guessed at. */
      const accounts: { personExternalId: string; text: string }[] = [];
      for (const r of rows) {
        if (!r.participant?.email || !r.text) continue;
        const person = await this.prisma.person.findFirst({
          where: { organizationId, email: r.participant.email.toLowerCase() },
          select: { externalId: true },
        });
        if (person) accounts.push({ personExternalId: person.externalId, text: r.text });
      }

      const title = subjects.find((s) => s.externalId === subjectExternalId)?.title ?? subjectExternalId;
      for (const d of findGoalDivergence(subjectExternalId, accounts)) {
        const existing = await this.prisma.detectorResult.findFirst({
          where: {
            organizationId, key: 'goal_divergence', resolvedAt: null,
            subjectExternalId,
            evidence: { path: ['between'], equals: d.between as any },
          },
        });
        const evidence = { between: d.between, overlap: d.overlap, says: sayDivergence(d, title) } as any;
        if (existing) {
          await this.prisma.detectorResult.update({ where: { id: existing.id }, data: { evidence, lastSeenAt: new Date() } });
        } else {
          await this.prisma.detectorResult.create({
            data: {
              organizationId, subjectExternalId, key: 'goal_divergence',
              /* The spec's own ordering: this is one of the two high-severity findings. */
              severity: 'high', evidence,
            },
          });
          n += 1;
        }
      }
    }
    return n;
  }

  /**
   * Run and record. Returns what it found so a caller can report it without a second query.
   *
   * HOLDS ITS TONGUE DURING A QUIET PERIOD, which is the whole reason that window is stamped at
   * import time. A first sync produces exactly the conditions this detector fires on - lots of
   * objectives, no conversations, nothing linked - and a wall of dependency findings on day one is
   * how a customer decides the tool is broken.
   */
  async run(organizationId: string) {
    const quiet = quietUntil(
      await this.prisma.detectionQuietPeriod.findMany({ where: { organizationId }, select: { endsAt: true } }),
      new Date(),
    );
    if (quiet) {
      this.logger.log(`Detection quiet until ${quiet.toISOString()} for org ${organizationId}; nothing run.`);
      return { ran: false, quietUntil: quiet, found: 0 };
    }

    const rows = await this.prisma.subject.findMany({
      where: { organizationId, sourceDeletedAt: null },
      select: { externalId: true, title: true, ownerExternalId: true, contributorExternalIds: true, parentExternalId: true },
    });
    const subjects: SubjectRef[] = rows.map((r) => ({
      externalId: r.externalId,
      title: r.title,
      ownerExternalId: r.ownerExternalId,
      contributorExternalIds: Array.isArray(r.contributorExternalIds) ? (r.contributorExternalIds as string[]) : [],
      parentExternalId: r.parentExternalId,
    }));
    if (!subjects.length) return { ran: true, found: 0 };

    const turns = await this.prisma.assistantTurn.findMany({
      where: { organizationId, role: 'person' },
      select: { personExternalId: true, content: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 2_000,
    });

    const found = findUndeclaredDependencies(subjects, this.mentionsOf(subjects, turns));
    const titleOf = (id: string) => subjects.find((s) => s.externalId === id)?.title ?? id;

    for (const d of found) {
      /*
       * Keyed on the pair rather than created afresh, so a standing dependency is ONE finding that
       * keeps being true rather than a new one every time this runs. A findings list that grows
       * every night is a list nobody opens twice.
       */
      const existing = await this.prisma.detectorResult.findFirst({
        where: {
          organizationId, key: 'undeclared_dependency', resolvedAt: null,
          personExternalId: d.personExternalId, subjectExternalId: d.fromSubjectExternalId,
          evidence: { path: ['toSubjectExternalId'], equals: d.toSubjectExternalId },
        },
      });
      const evidence = {
        toSubjectExternalId: d.toSubjectExternalId,
        mentions: d.mentions,
        says: sayIt(d, titleOf),
      } as any;

      if (existing) {
        await this.prisma.detectorResult.update({
          where: { id: existing.id },
          data: { evidence, lastSeenAt: d.lastSeenAt },
        });
      } else {
        await this.prisma.detectorResult.create({
          data: {
            organizationId,
            personExternalId: d.personExternalId,
            subjectExternalId: d.fromSubjectExternalId,
            key: 'undeclared_dependency',
            severity: 'medium',
            evidence,
            firstSeenAt: d.firstSeenAt,
            lastSeenAt: d.lastSeenAt,
          },
        });
      }
    }
    const unmentioned = await this.objectiveUnmentioned(organizationId, subjects, turns);
    const diverging = await this.goalDivergence(organizationId, subjects);

    this.logger.log(`Org ${organizationId}: ${found.length} undeclared dependencies, ${unmentioned} unmentioned, ${diverging} diverging.`);
    return { ran: true, found: found.length + unmentioned + diverging };
  }
}
