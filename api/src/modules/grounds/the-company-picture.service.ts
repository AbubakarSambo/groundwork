import { whatEachCheckInFeeds } from './what-a-check-in-feeds';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { onceAcrossCopies, oneOrganisationAtATime, theDay } from '../prisma/once-across-copies';
import { PromptsService } from '../prompts';
import { AnthropicService } from '../conversation/anthropic.service';
import { GroundworkEvents } from '../../common/events';
import { EVALUATION_SCENARIOS } from '../reports/is-this-an-evaluation-check-in';
import { freshnessOf } from '../subjects/a-pointer-goes-stale';
import {
  COMPANY_PICTURE_PROMPT,
  COMPANY_PICTURE_PROMPT_KEY,
  COMPANY_PICTURE_SCHEMA,
  buildPicture,
  theInputKey,
  theRecordForTheModel,
  type HandoffFact,
  type PictureInput,
  type PriorityFacts,
  type SubjectFact,
  type TheModelsPicture,
} from './the-company-picture';

const DAY = 86_400_000;
const DONE = /\b(done|complete|completed|closed|achieved|met|delivered|cancelled|canceled)\b/i;

/**
 * WRITES THE COMPANY-WIDE PICTURE ONCE, WHEN THE RECORD CHANGES (request 17, decision 7).
 *
 * It listens for a check-in completing and for a handoff being raised, and looks once a night in
 * case the organisation's own system changed its priorities. Each time it works out what the
 * picture would be built from (`theInputKey`); the same record again means no second model call and
 * no new row. Opening the company page never comes here: CompanyService only reads the stored row.
 *
 * Check-ins on a performance plan, a promotion, a renewal or a probation are left out of everything it reads, except for one
 * extra plain reading per priority they feed, which only a reader who may open them is given (decision 93, row 23).
 * The row it writes holds no name, and the version of the instructions that wrote it.
 */
@Injectable()
export class CompanyPictureService {
  private readonly logger = new Logger(CompanyPictureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly prompts: PromptsService,
    private readonly anthropic: AnthropicService,
  ) {}

  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(e: { groundId: string }) {
    await this.forTheGround(e?.groundId);
  }

  @OnEvent(GroundworkEvents.BLOCKER_RAISED)
  async onBlockerRaised(e: { groundId?: string }) {
    await this.forTheGround(e?.groundId);
  }

  /** The nightly look: a change to the priorities in the organisation's own system arrives no other way. */
  @Cron('30 3 * * *', { timeZone: 'UTC' })
  async nightly() {
    /* Once across every copy of the API, and one organisation at a time with a pause after each model
       call, so the first night does not make every organisation's call at once (decision 74, item 7). */
    await onceAcrossCopies(this.prisma, 'the-company-picture', theDay(), async () => {
      const orgs = await this.prisma.subject.findMany({ distinct: ['organizationId'], select: { organizationId: true } }).catch(() => []);
      const { withWork } = await oneOrganisationAtATime((orgs as { organizationId: string }[]).map((o) => o.organizationId), (id) => this.rebuild(id));
      if (withWork) this.logger.log(`The company picture was written again for ${withWork} organisation(s) tonight.`);
    });
  }

  private async forTheGround(groundId?: string) {
    if (!groundId) return;
    try {
      const g = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { organizationId: true } });
      if (g) await this.rebuild(g.organizationId);
    } catch (err: any) {
      this.logger.warn(`Could not look at the company picture: ${err?.message ?? err}`);
    }
  }

  /** The record the picture is built from, for one organisation. */
  async readTheRecord(organizationId: string, now = new Date()): Promise<PictureInput> {
    const [subjectRows, grounds, memberships, persons, participants] = await Promise.all([
      this.prisma.subject.findMany({
        where: { organizationId },
        select: { id: true, externalId: true, type: true, title: true, measure: true, ownerExternalId: true, parentExternalId: true, status: true, dueDate: true, syncedAt: true, sourceDeletedAt: true, createdAt: true },
      }),
      this.prisma.ground.findMany({
        where: { organizationId, scenario: { notIn: EVALUATION_SCENARIOS } },
        select: {
          id: true, initiatorId: true, subjectExternalId: true,
          checkIns: { select: { status: true, completedAt: true, isSetup: true } },
          dependencies: { where: { status: { in: ['WAITING', 'BLOCKING'] }, clearedAt: null }, select: { id: true, what: true, status: true, onParticipantId: true, onLabel: true, waitingOnGroundId: true } },
        },
      }),
      this.prisma.organizationMembership.findMany({
        where: { organizationId },
        select: { userId: true, team: true, user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.person.findMany({ where: { organizationId }, select: { externalId: true, displayName: true, givenName: true, familyName: true, email: true, linkedUserId: true } }),
      this.prisma.groundParticipant.findMany({ where: { ground: { organizationId } }, select: { nameGiven: true, email: true } }),
    ]);

    const live = (subjectRows as any[]).filter((s) => freshnessOf(s, now) !== 'disconnected')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const top = live.filter((s) => s.type === 'OBJECTIVE' && !s.parentExternalId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const under = (externalId: string): Set<string> => {
      const seen = new Set<string>([externalId]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const s of live) if (s.parentExternalId && seen.has(s.parentExternalId) && !seen.has(s.externalId)) { seen.add(s.externalId); grew = true; }
      }
      return seen;
    };

    /* An owner the organisation's system names but nobody here matches is not an owner Groundwork can ask (4 October 2026 review, item C1). */
    const knownPeople = new Set((persons as any[]).map((p) => p.externalId).filter(Boolean));
    const ownerIsKnown = (externalId: string | null | undefined) => !externalId || knownPeople.has(externalId);

    const teamOfUser = new Map<string, string>();
    for (const m of memberships as any[]) if (m.team?.trim()) teamOfUser.set(m.userId, m.team.trim());
    /* What each check-in feeds, by the one rule the Desk reads too (what-a-check-in-feeds.ts): tied to a priority, or the one its lead owns. */
    const personOfUser = new Map((persons as any[]).filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p.externalId as string]));
    const feeds = whatEachCheckInFeeds(grounds as any[], live as any[], personOfUser);
    const gs = (grounds as any[]).map((g) => ({ ...g, subjectExternalId: feeds.get(g.id) ?? null, team: teamOfUser.get(g.initiatorId) ?? null }));
    const since = now.getTime() - 30 * DAY;
    const finished = (g: any) => (g.checkIns ?? []).filter((c: any) => c.status === 'COMPLETED' && !c.isSetup && c.completedAt && new Date(c.completedAt).getTime() >= since).length;

    /* The priority facts from a list of check-ins: the picture's own (no evaluation check-in), and the extended read below. */
    const factsOf = (checkIns: any[]): PriorityFacts[] => top.map((s, i) => {
      const branch = under(s.externalId);
      const feeding = checkIns.filter((g) => g.subjectExternalId && branch.has(g.subjectExternalId));
      const open = feeding.flatMap((g) => g.dependencies);
      return {
        id: s.id, number: i + 1, title: s.title, ownerExternalId: s.ownerExternalId ?? null, ownerKnown: ownerIsKnown(s.ownerExternalId),
        overdue: !!s.dueDate && s.dueDate.getTime() < now.getTime() && !DONE.test(s.status ?? ''),
        hasChildren: branch.size > 1,
        feedingGroundIds: feeding.map((g) => g.id),
        finishedLast30: feeding.reduce((n, g) => n + finished(g), 0),
        blocked: open.filter((d: any) => d.status === 'BLOCKING').length,
        waiting: open.filter((d: any) => d.status === 'WAITING').length,
        teams: [...new Set(feeding.map((g) => g.team).filter(Boolean))].sort() as string[],
      };
    });
    const priorities: PriorityFacts[] = factsOf(gs);

    /*
     * THE SAME PRIORITIES WITH THE PERFORMANCE PLANS, PROMOTIONS, RENEWALS AND PROBATIONS COUNTED IN (decision 93, row 23). They
     * are still left out of the picture everybody reads. Only for a priority one of them feeds, an extra plain reading is kept,
     * written from the counts alone and resting on those check-ins too, so it reaches only a reader who may open every one of
     * them: an admin given access to that check-in. Everybody else is given the reading they were given before.
     */
    const evaluationGrounds: any[] = await this.prisma.ground.findMany({
      where: { organizationId, scenario: { in: EVALUATION_SCENARIOS } },
      select: {
        id: true, initiatorId: true, subjectExternalId: true,
        checkIns: { select: { status: true, completedAt: true, isSetup: true } },
        dependencies: { where: { status: { in: ['WAITING', 'BLOCKING'] }, clearedAt: null }, select: { id: true, what: true, status: true, onParticipantId: true, onLabel: true, waitingOnGroundId: true } },
      },
    }).catch(() => []);
    const evaluationOnly = ((evaluationGrounds ?? []) as any[]).filter((g) => !gs.some((x) => x.id === g.id));
    const withEvaluation: PriorityFacts[] = evaluationOnly.some((g: any) => g.subjectExternalId)
      ? factsOf([...gs, ...evaluationOnly.map((g) => ({ ...g, team: teamOfUser.get(g.initiatorId) ?? null }))])
        .filter((ext, i) => ext.feedingGroundIds.length !== priorities[i].feedingGroundIds.length)
      : [];

    const numbersOf = (groundId: string) => priorities.filter((p) => p.feedingGroundIds.includes(groundId)).map((p) => p.number);
    const handoffs: HandoffFact[] = gs.flatMap((g) => g.dependencies.map((d: any) => ({
      id: d.id, groundId: g.id, team: g.team, about: (d.what ?? '').trim(), status: d.status, priorityNumbers: numbersOf(g.id),
      waitsOnSomebody: !!(d.onParticipantId || d.waitingOnGroundId || (d.onLabel ?? '').trim()),
    }))).filter((h: HandoffFact) => h.about).slice(0, 60);

    const onPriorities = gs.filter((g) => priorities.some((p) => p.feedingGroundIds.includes(g.id)));
    const subjects: SubjectFact[] = live.map((s) => ({
      id: s.id, externalId: s.externalId, type: s.type, title: s.title, ownerExternalId: s.ownerExternalId ?? null, ownerKnown: ownerIsKnown(s.ownerExternalId),
      parentExternalId: s.parentExternalId ?? null, measure: s.measure ?? null,
      overdue: !!s.dueDate && s.dueDate.getTime() < now.getTime() && !DONE.test(s.status ?? ''),
    }));

    const names = new Set<string>();
    const add = (t?: string | null) => { for (const part of (t ?? '').split(/\s+/)) if (part.trim().length >= 3) names.add(part.trim().toLowerCase()); };
    const addEmail = (e?: string | null) => { if (e) { names.add(e.toLowerCase()); add(e.split('@')[0]); } };
    for (const m of memberships as any[]) { add(m.user?.firstName); add(m.user?.lastName); addEmail(m.user?.email); }
    for (const p of persons as any[]) { add(p.displayName); add(p.givenName); add(p.familyName); addEmail(p.email); }
    for (const p of participants as any[]) { add(p.nameGiven); addEmail(p.email); }
    /* A team or a priority may share a word with a name; those words are never names here. */
    const ours = new Set([...priorities.flatMap((p) => p.teams), ...gs.map((g) => g.team).filter(Boolean)].flatMap((t) => t.toLowerCase().split(/\s+/)));
    for (const w of ours) names.delete(w);

    return {
      priorities, handoffs, subjects,
      ...(withEvaluation.length ? { withEvaluation } : {}),
      finishedOnPriorities: onPriorities.reduce((n, g) => n + finished(g), 0),
      groundsOnPriorities: onPriorities.map((g) => g.id),
      names: [...names],
    };
  }

  /** Looks at the record once; writes only when it is not what the stored picture was built from. */
  async rebuild(organizationId: string): Promise<'built' | 'unchanged' | 'nothing'> {
    try {
      const input = await this.readTheRecord(organizationId);
      if (input.priorities.length === 0 && input.subjects.length === 0) return 'nothing';
      const inputKey = theInputKey(input);
      const had = await this.prisma.companyPicture.findUnique({ where: { organizationId }, select: { inputKey: true } });
      if (had?.inputKey === inputKey) return 'unchanged';

      /* The stored version is the one that runs; the file is only what it is seeded from. */
      const version = await this.prompts.getActive(COMPANY_PICTURE_PROMPT_KEY).catch(() => null);
      let model: TheModelsPicture | null = null;
      if (input.priorities.length) {
        model = await this.anthropic.extract<TheModelsPicture>(
          version?.content ?? COMPANY_PICTURE_PROMPT, [{ role: 'user', content: theRecordForTheModel(input) }], COMPANY_PICTURE_SCHEMA,
        ).catch(() => null);
      }
      const picture = buildPicture(input, model);
      const data = {
        readings: picture.readings as any, notReaching: picture.notReaching as any,
        namedByTeams: picture.namedByTeams as any, saidAndShown: picture.saidAndShown as any,
        inputKey, promptVersionId: version?.id ?? null, builtAt: new Date(),
      };
      await this.prisma.companyPicture.upsert({ where: { organizationId }, create: { organizationId, ...data }, update: data });
      return 'built';
    } catch (err: any) {
      /* The picture is a courtesy on top of the record; it never fails what somebody just said. */
      this.logger.warn(`Could not write the company picture: ${err?.message ?? err}`);
      return 'nothing';
    }
  }
}
