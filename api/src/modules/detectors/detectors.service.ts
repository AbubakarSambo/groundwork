import { aDaySaidInFull } from '../board/a-day-said-in-full';
import { thePersonJudgementsAreOn } from '../organisation/person-judgements';
import { Injectable, Logger } from '@nestjs/common';
import { CheckInStatus, DependencyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardingService } from '../grounds/onboarding.service';
import { findUndeclaredDependencies, SubjectRef, Mention, sayIt } from './nobody-wrote-the-dependency-down';
import { ClearedHandoff, unblockingCredits } from './somebody-else-says-you-unblocked-them';
import {
  Turn, findUnattachedWork, findNoLead, findNoCheckIn, sayUnattached, sayNoLead, sayNoCheckIn,
} from './the-three-that-were-not-built';
import { quietUntil } from '../subjects/detection-holds-its-tongue';
import { STOPWORDS } from '../knowledge/knowledge.service';
import { namesFor, turnMentions } from './a-name-is-how-people-say-it';
import { turnsFromCheckIns } from './a-check-in-is-where-people-talk';
import { theGuestsHere, isAGuestHere } from '../participants/a-guest-is-never-somebody-on-the-hosts-list';
import { findGoalDivergence, sayIt as sayDivergence } from './describing-the-same-goal-differently';
import {
  ContributionRow, findUnrecognisedContributors, findNominalOnly, sayUnrecognised, sayNominal,
} from './who-is-actually-carrying-it';
import { SubjectFacts, whatIsMissing, unownedGaps } from './what-this-objective-is-missing';
import { findMeasureGaps, sayIt as sayMeasureGap, Mention as MeasureMention, TheirFigure } from './nobody-mentions-what-it-is-measured-by';
import { findNeglectedPrimary, sayNeglectedPrimary, Cadence as ActionCadenceValue } from './the-one-action-that-converts';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly onboarding: OnboardingService,
  ) {}

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
   *
   * AND THAT RULE NEVER MATCHED ANYTHING, because nobody says "the Atlas market entry study"; they
   * say "Atlas". Measured on a whole fictional firm, 25 September 2026: twenty-eight conversations
   * about three named projects produced zero matches, so every read built on this was computing
   * over an empty set - and told six of seven people's leads that they were "listed on 4 pieces of
   * work and not mentioned in any of them". The strict path is kept, exactly as it was, and a name
   * is now also a mention. See a-name-is-how-people-say-it for what counts as a name and why the
   * ordinary words of consulting work can never be one.
   */
  private mentionsOf(subjects: SubjectRef[], turns: { personExternalId: string; content: string; createdAt: Date }[]): Mention[] {
    const keyed = subjects.map((s) => ({
      s,
      words: s.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
    })).filter((k) => k.words.length > 0);
    const names = namesFor(keyed.map((k) => ({ externalId: k.s.externalId, title: k.s.title, words: k.words })));

    const out: Mention[] = [];
    for (const t of turns) {
      const flat = t.content.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const k of keyed) {
        if (turnMentions(flat, k.words, names.get(k.s.externalId) ?? [])) {
          out.push({ personExternalId: t.personExternalId, subjectExternalId: k.s.externalId, at: t.createdAt });
        }
      }
    }
    return out;
  }

  /**
   * THE OBJECTIVE IS DISCUSSED AND ITS MEASURE IS NOT.
   *
   * Deliberately next to `objectiveUnmentioned`, because they read the same two inputs and answer
   * opposite questions. That one fires when nobody has said a word about an objective. This one
   * needs it to be talked about, repeatedly, with the number on it never coming up.
   *
   * It carries the TEXT of what was said, which `mentionsOf` throws away - it only needs to know
   * that a mention happened. Nothing is quoted out of here; the text is read and discarded.
   */
  private async measureUnmentioned(
    organizationId: string,
    subjects: SubjectRef[],
    turns: { personExternalId: string; content: string; createdAt: Date }[],
  ): Promise<number> {
    const measured = await this.prisma.subject.findMany({
      where: { organizationId, sourceDeletedAt: null, measure: { not: null } },
      select: { externalId: true, title: true, measure: true, target: true },
    });
    if (!measured.length) return 0;

    /* The same title match `mentionsOf` uses, keeping what was said. */
    const keyed = subjects.map((sub) => ({
      externalId: sub.externalId,
      words: sub.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
    })).filter((k) => k.words.length > 0);

    const mentions: MeasureMention[] = [];
    for (const t of turns) {
      const flat = t.content.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const k of keyed) {
        if (k.words.every((w) => flat.includes(w))) {
          mentions.push({ subjectExternalId: k.externalId, text: t.content, at: t.createdAt });
        }
      }
    }

    /*
     * WHAT THEIR OWN SYSTEMS ARE PUSHING FOR THESE OBJECTIVES.
     *
     * Evidence lands on the person's objective rather than on the subject, because a figure is
     * observed against somebody's expectation and not against a row in a catalogue. So the join is
     * by external id, which is the id the customer sent on both.
     *
     * Scoped through the ground to this organization: an external id is only unique inside the
     * customer that issued it, and reading it any wider would put one customer's figure into
     * another customer's finding.
     */
    const figures: TheirFigure[] = (
      await this.prisma.personObjective.findMany({
        where: {
          lastSeenState: { not: null },
          externalId: { in: measured.map((m) => m.externalId) },
          ground: { organizationId },
        },
        select: { externalId: true, lastSeenState: true, lastSeenAt: true },
      })
    ).map((r) => ({
      subjectExternalId: r.externalId,
      state: r.lastSeenState as string,
      /* Their observation time, or none. Never ours - see TheirFigure. */
      observedAt: r.lastSeenAt,
    }));

    let n = 0;
    for (const gap of findMeasureGaps(measured, mentions, figures)) {
      const says = sayMeasureGap(gap);
      const existing = await this.prisma.detectorResult.findFirst({
        where: { organizationId, key: 'measure_unmentioned', resolvedAt: null, subjectExternalId: gap.subjectExternalId },
      });
      const evidence = {
        says, measure: gap.measure, target: gap.target, mentions: gap.mentions,
        lastMentionedAt: gap.lastMentionedAt,
        /* Their figure, where one is arriving, so the finding can be checked against their system. */
        theirFigure: gap.theirFigure,
      } as any;
      if (existing) {
        /*
         * SEVERITY IS REVISED, NOT JUST STAMPED AT BIRTH.
         *
         * Found by running it: a finding raised before a feed existed stayed medium forever, and
         * the day their CRM started pushing the number - the day it became certain - nothing about
         * it changed. A standing finding has to be allowed to get more serious.
         */
        await this.prisma.detectorResult.update({
          where: { id: existing.id },
          data: { evidence, severity: gap.theirFigure ? 'high' : 'medium', lastSeenAt: new Date() },
        });
      } else {
        await this.prisma.detectorResult.create({
          data: {
            organizationId, subjectExternalId: gap.subjectExternalId, key: 'measure_unmentioned',
            /*
             * HIGHER WHEN THEIR SYSTEM IS KEEPING THE NUMBER. Not because the gap is bigger, but
             * because the finding is certain: with a feed running there is no reading of this where
             * the measure is simply the wrong one and nothing is wrong.
             */
            severity: gap.theirFigure ? 'high' : 'medium',
            evidence, firstSeenAt: new Date(), lastSeenAt: new Date(),
          },
        });
      }
      n += 1;
    }
    return n;
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
        ? `Nobody has mentioned ${r.title} to me since ${aDaySaidInFull(new Date(last))}. If it is still live, it is worth a word; if it is not, it is worth closing.`
        : `${r.title} has been on the books since ${aDaySaidInFull(r.createdAt)} and nobody has mentioned it to me at all. That may mean it is being worked on somewhere I cannot see.`;

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

    /* A guest's aims are theirs, never an entry's on this list. See a-guest-is-never-somebody-on-the-hosts-list. */
    const guests = await theGuestsHere(this.prisma, organizationId);
    let n = 0;
    for (const [subjectExternalId, groundIds] of bySubject) {
      const rows = await this.prisma.personObjective.findMany({
        where: { groundId: { in: groundIds } },
        select: {
          text: true, createdAt: true,
          participant: { select: { email: true, userId: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      /* Resolved to identity-system ids, because a finding about people has to name people the
         customer's own systems know. Anybody unresolved is left out rather than guessed at. */
      const accounts: { personExternalId: string; text: string }[] = [];
      for (const r of rows) {
        if (!r.participant?.email || !r.text) continue;
        if (isAGuestHere(guests, r.participant)) continue;
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
   * WHO IS ACTUALLY CARRYING THE WORK, AND THE TWO FINDINGS THAT FALL OUT OF IT.
   *
   * ASSIGNED comes from the imported graph. STATED is somebody describing the work in their own
   * words. REFERENCED is somebody else describing them doing it - and that one is where the care
   * is: what gets stored is HOW MANY DISTINCT OTHERS, never which, because which is attributed
   * testimony and a count cannot be turned back into a quote.
   *
   * UNBLOCKING is the fourth, and it is the one nobody can claim for themselves: it exists only
   * because the person who was WAITING stopped saying so. This comment used to say there are no
   * blockers in this product - there were, and had been for a long time. The stale premise, not the
   * missing machinery, is what kept the kind unproduced.
   */
  private async contribution(
    organizationId: string,
    subjects: SubjectRef[],
    turns: { personExternalId: string; content: string; createdAt: Date }[],
  ): Promise<number> {
    if (!subjects.length) return 0;
    const people = await this.prisma.person.findMany({
      where: { organizationId, active: true },
      select: { externalId: true, displayName: true, userName: true, email: true },
    });
    if (!people.length) return 0;

    const rows: ContributionRow[] = [];

    /* ASSIGNED: what their tool says. */
    for (const s of subjects) {
      for (const p of [s.ownerExternalId, ...s.contributorExternalIds].filter(Boolean) as string[]) {
        rows.push({ personExternalId: p, subjectExternalId: s.externalId, kind: 'ASSIGNED', weight: 1 });
      }
    }

    const mentions = this.mentionsOf(subjects, turns);

    /* STATED: they described the work themselves. */
    const stated = new Map<string, number>();
    for (const m of mentions) {
      const k = `${m.personExternalId}::${m.subjectExternalId}`;
      stated.set(k, (stated.get(k) ?? 0) + 1);
    }
    for (const [k, n] of stated) {
      const [personExternalId, subjectExternalId] = k.split('::');
      rows.push({ personExternalId, subjectExternalId, kind: 'STATED', weight: n });
    }

    /*
     * REFERENCED: somebody ELSE described them doing it. A turn that names a person and a subject,
     * written by anybody but that person.
     *
     * The set of speakers is built here and thrown away - only its SIZE is written. That is the
     * whole of the privacy decision, and it is why this is a Set rather than a list.
     */
    const referencedBy = new Map<string, Set<string>>();
    const named = people
      .map((p) => ({ id: p.externalId, needle: (p.displayName ?? p.userName ?? '').toLowerCase().split(' ')[0] }))
      .filter((p) => p.needle.length >= 3);

    for (const t of turns) {
      const flat = t.content.toLowerCase();
      const subjectsHere = mentions.filter((m) => m.at.getTime() === t.createdAt.getTime() && m.personExternalId === t.personExternalId);
      if (!subjectsHere.length) continue;
      for (const person of named) {
        if (person.id === t.personExternalId) continue;
        if (!flat.includes(person.needle)) continue;
        for (const m of subjectsHere) {
          const k = `${person.id}::${m.subjectExternalId}`;
          referencedBy.set(k, (referencedBy.get(k) ?? new Set()).add(t.personExternalId));
        }
      }
    }
    /*
     * UNBLOCKING: a handoff somebody was waiting on is now cleared, and it was about this subject.
     *
     * Both sides resolve to a person rather than a participant, because the same human is a
     * different participant row in every ground and the credit belongs to the human. A participant
     * with no email cannot be resolved and is skipped - crediting the wrong person for unblocking
     * somebody is worse than not crediting anyone.
     */
    const clearedRows = await this.prisma.groundDependency.findMany({
      where: { status: DependencyStatus.CLEARED, ground: { organizationId } },
      select: {
        what: true,
        fromParticipant: { select: { email: true, userId: true } },
        onParticipant: { select: { email: true, userId: true } },
      },
    });
    /*
     * A GUEST IS NOBODY ON THIS LIST, on either side of a handoff. A guest who cleared something is
     * not credited to an entry that shares their address, and a guest who was waiting makes no entry
     * the one they were waiting on. See a-guest-is-never-somebody-on-the-hosts-list.
     */
    const guests = await theGuestsHere(this.prisma, organizationId);
    /*
     * EMAIL FIRST, HANDLE SECOND, AND BOTH BECAUSE NEITHER IS RELIABLE ALONE.
     *
     * A participant carries an email; a Person carries an email that may be null and a `userName`
     * that SCIM requires but which the schema is careful to call a directory handle - "usually an
     * email or a directory login". Keying on `userName` alone silently loses everyone whose IdP
     * hands us a login, and they would simply never be credited for unblocking anybody, with
     * nothing anywhere saying why.
     */
    const byEmail = new Map<string, string>();
    for (const person of people) {
      for (const handle of [person.email, person.userName]) {
        const k = handle?.toLowerCase();
        if (k && !byEmail.has(k)) byEmail.set(k, person.externalId);
      }
    }
    const cleared: ClearedHandoff[] = [];
    for (const r of clearedRows) {
      if (!r.fromParticipant || isAGuestHere(guests, r.fromParticipant)) continue;
      const from = byEmail.get(r.fromParticipant.email?.toLowerCase() ?? '');
      if (!from) continue;
      const on = r.onParticipant && !isAGuestHere(guests, r.onParticipant)
        ? byEmail.get(r.onParticipant.email?.toLowerCase() ?? '') ?? null
        : null;
      cleared.push({ what: r.what, fromPersonKey: from, onPersonKey: on });
    }
    for (const c of unblockingCredits(cleared, subjects)) {
      rows.push({ ...c, kind: 'UNBLOCKING' });
    }

    for (const [k, speakers] of referencedBy) {
      const [personExternalId, subjectExternalId] = k.split('::');
      /* The size, and nothing that could name them. */
      rows.push({ personExternalId, subjectExternalId, kind: 'REFERENCED', weight: speakers.size });
    }

    for (const r of rows) {
      await this.prisma.contribution.upsert({
        where: {
          organizationId_personExternalId_subjectExternalId_kind: {
            organizationId, personExternalId: r.personExternalId,
            subjectExternalId: r.subjectExternalId, kind: r.kind as any,
          },
        },
        create: { organizationId, ...r, kind: r.kind as any },
        update: { weight: r.weight, lastSeenAt: new Date() },
      });
    }

    const nameOf = (id: string) => people.find((p) => p.externalId === id)?.displayName
      ?? people.find((p) => p.externalId === id)?.userName ?? id;
    const titleOf = (id: string) => subjects.find((s) => s.externalId === id)?.title ?? id;

    let n = 0;
    for (const u of findUnrecognisedContributors(rows)) {
      n += await this.record(organizationId, 'unrecognised_contributor', 'medium', u.personExternalId, u.subjectExternalId, {
        statedTimes: u.statedTimes, referencedBy: u.referencedBy,
        says: sayUnrecognised(u, nameOf(u.personExternalId), titleOf(u.subjectExternalId)),
      });
    }
    for (const nm of findNominalOnly(rows)) {
      n += await this.record(organizationId, 'nominal_only', 'low', nm.personExternalId, null, {
        subjectExternalIds: nm.subjectExternalIds,
        says: sayNominal(nm, nameOf(nm.personExternalId), nm.subjectExternalIds.map(titleOf)),
      });
    }
    return n;
  }

  /**
   * WHAT EACH OBJECTIVE IS MISSING, PROPOSED AND NEVER CREATED.
   *
   * Nothing here makes work on somebody's behalf. A recommendation is a suggestion with the gap it
   * closes attached, and a person accepting it is what turns it into anything - which is the same
   * propose-confirm discipline as capturing a commitment, for the same reason: a system that
   * quietly adds to people's plates is one they stop trusting and then stop reading.
   */
  private async recommend(organizationId: string, subjects: SubjectRef[]): Promise<number> {
    if (!subjects.length) return 0;

    const commitments = await this.prisma.commitment.findMany({
      where: { organizationId, state: 'OPEN', subjectExternalId: { not: null } },
      select: { personExternalId: true, subjectExternalId: true },
    });
    const findings = await this.prisma.detectorResult.findMany({
      where: { organizationId, resolvedAt: null, subjectExternalId: { not: null } },
      select: { id: true, key: true, subjectExternalId: true },
    });

    const facts: SubjectFacts[] = subjects.map((s) => ({
      externalId: s.externalId,
      title: s.title,
      ownerExternalId: s.ownerExternalId,
      contributorExternalIds: s.contributorExternalIds,
      committedBy: commitments.filter((c) => c.subjectExternalId === s.externalId).map((c) => c.personExternalId),
      findingKeys: findings.filter((f) => f.subjectExternalId === s.externalId).map((f) => f.key),
      findingIds: findings.filter((f) => f.subjectExternalId === s.externalId).map((f) => f.id),
    }));

    /* `unowned_gap` as a finding, alongside the recommendation that says what to do about it. */
    for (const gap of unownedGaps(facts)) {
      await this.record(organizationId, 'unowned_gap', 'medium', null, gap.externalId, {
        says: `${gap.title} has nobody named as its owner, so there is nobody to ask about it.`,
      });
    }

    let n = 0;
    for (const f of facts) {
      for (const p of whatIsMissing(f)) {
        /*
         * One live proposal per gap. Re-proposing something somebody already declined would be the
         * product asking again until it gets the answer it wants, which is how a suggestion becomes
         * nagging.
         */
        const existing = await this.prisma.recommendation.findFirst({
          where: {
            organizationId, kind: p.kind, subjectExternalId: p.subjectExternalId,
            state: { in: ['PROPOSED', 'ACCEPTED', 'DECLINED'] },
          },
        });
        if (existing) continue;

        await this.prisma.recommendation.create({
          data: {
            organizationId, kind: p.kind,
            subjectExternalId: p.subjectExternalId,
            personExternalId: p.personExternalId,
            body: p.body, rationale: p.rationale as any,
            sourceDetectorIds: p.sourceDetectorIds,
          },
        });
        n += 1;
      }
    }
    return n;
  }

  /** One finding per person-and-subject, updated rather than repeated. */
  private async record(
    organizationId: string, key: string, severity: string,
    personExternalId: string | null, subjectExternalId: string | null, evidence: any,
  ): Promise<number> {
    const existing = await this.prisma.detectorResult.findFirst({
      where: { organizationId, key, resolvedAt: null, personExternalId, subjectExternalId },
    });
    if (existing) {
      await this.prisma.detectorResult.update({ where: { id: existing.id }, data: { evidence, lastSeenAt: new Date() } });
      return 0;
    }
    await this.prisma.detectorResult.create({
      data: { organizationId, key, severity, personExternalId, subjectExternalId, evidence },
    });
    return 1;
  }

  /**
   * Run and record. Returns what it found so a caller can report it without a second query.
   *
   * HOLDS ITS TONGUE DURING A QUIET PERIOD, which is the whole reason that window is stamped at
   * import time. A first sync produces exactly the conditions this detector fires on - lots of
   * objectives, no conversations, nothing linked - and a wall of dependency findings on day one is
   * how a customer decides the tool is broken.
   */

  /**
   * THE THREE THAT READ THE DIRECTORY RATHER THAN THE CONVERSATIONS.
   *
   * `unattached_work` needs both; the other two need only `Person`, which is why they could have
   * been built the day SCIM landed. They were reported as blocked on role benchmarks and an
   * onboarding window, and neither was true of `no_lead`.
   *
   * All three are keyed on the person with no subject, because none of them is about a piece of
   * work - they are about somebody having no manager, no account of themselves, or work attached
   * to nothing at all.
   */
  private async aboutPeople(organizationId: string, subjects: SubjectRef[], turns: Turn[]): Promise<number> {
    const people = await this.prisma.person.findMany({
      where: { organizationId },
      select: { externalId: true, managerExternalId: true, active: true, createdAt: true, email: true },
    });
    if (!people.length) return 0;

    /*
     * Who has ever given their own account, matched by email - the only identifier a participant
     * row and a Person reliably share. Somebody unmatchable is treated as HAVING checked in rather
     * than as having not: the failure of a join must never become an accusation about a person.
     */
    const guests = await theGuestsHere(this.prisma, organizationId);
    const emails = new Set(
      (await this.prisma.groundParticipant.findMany({
        where: { ground: { organizationId }, checkIns: { some: { status: CheckInStatus.COMPLETED } } },
        select: { email: true, userId: true },
      })).filter((p) => !isAGuestHere(guests, p)).map((p) => p.email?.toLowerCase()).filter(Boolean) as string[],
    );
    /*
     * An entry that carries a guest's address is neither credited with the guest's check-in nor
     * told it never checked in: it is unmatchable, and the rule above holds. See
     * a-guest-is-never-somebody-on-the-hosts-list.
     */
    const checkedIn = new Set(
      people.filter((p) => !p.email || guests.emails.has(p.email.toLowerCase()) || emails.has(p.email.toLowerCase())).map((p) => p.externalId),
    );

    /*
     * THE REAL ONBOARDING WINDOW, NOW THAT ONE EXISTS.
     *
     * `no_checkin` used how long somebody had been in the DIRECTORY, which was a stand-in named as
     * such: it says nothing about when they started the job. Somebody moved into a new role after
     * three years at the company was, by that measure, three years overdue on their first day in it.
     *
     * `RoleAssignment.startedAt` is the real thing. Falls back to the directory date where no
     * assignment exists, because most organisations will not populate this on day one and the
     * weaker test is better than none.
     */
    const assignments = await this.prisma.roleAssignment.findMany({
      where: { organizationId, endedAt: null },
      select: { personExternalId: true, startedAt: true },
      orderBy: { startedAt: 'desc' },
    });
    const startedInRole = new Map<string, Date>();
    for (const a of assignments) {
      if (!startedInRole.has(a.personExternalId)) startedInRole.set(a.personExternalId, a.startedAt);
    }

    const now = new Date();
    let n = 0;

    const write = async (key: string, personExternalId: string, severity: string, says: string, extra: any = {}) => {
      const existing = await this.prisma.detectorResult.findFirst({
        where: { organizationId, key, personExternalId, resolvedAt: null },
      });
      const evidence = { says, ...extra } as any;
      if (existing) {
        await this.prisma.detectorResult.update({ where: { id: existing.id }, data: { evidence, lastSeenAt: now } });
      } else {
        await this.prisma.detectorResult.create({
          data: { organizationId, personExternalId, key, severity, evidence, firstSeenAt: now, lastSeenAt: now },
        });
      }
      n += 1;
    };

    for (const u of findUnattachedWork(subjects, turns)) {
      await write('unattached_work', u.personExternalId, 'medium', sayUnattached(u), { mentions: u.mentions });
    }
    for (const u of findNoLead(people)) {
      await write('no_lead', u.personExternalId, 'medium', sayNoLead(u));
    }

    /*
     * THE ONE ACTION THE ROLE TURNS ON. §6.3, and the last detector in the spec that was blocked on
     * machinery rather than on effort - it needed a role to be a record carrying an action and a
     * clock, which nothing was until now.
     *
     * ACTIVE MEANS SEEN, and it is computed from the same material the rest of this method already
     * holds rather than from a new query: somebody who has contributed or spoken is present, and
     * somebody who has done neither is a case for `no_checkin` rather than for a coaching nudge
     * about their hardest action.
     */
    const roles = await this.prisma.role.findMany({
      where: { organizationId },
      select: { key: true, name: true, primaryActionKey: true, primaryActionName: true, primaryActionCadence: true },
    });
    if (roles.some((r) => r.primaryActionKey && r.primaryActionCadence)) {
      const openAssignments = await this.prisma.roleAssignment.findMany({
        where: { organizationId, endedAt: null },
        select: { personExternalId: true, roleName: true, startedAt: true },
      });
      const actionEvents = await this.prisma.primaryActionEvent.findMany({
        where: { organizationId },
        select: { personExternalId: true, actionKey: true, occurredAt: true },
      });
      /*
       * Seen at all: they have spoken in a check-in, or they have completed one. Both sets are
       * already computed above for the other detectors in this pass, so this adds no query and,
       * more importantly, uses the same definition of "present" the neighbouring findings use.
       */
      const active = new Set<string>([...checkedIn, ...turns.map((t) => t.personExternalId)]);

      for (const g of findNeglectedPrimary({
        roles: roles.map((r: typeof roles[number]) => ({ ...r, primaryActionCadence: r.primaryActionCadence as ActionCadenceValue | null })),
        assignments: openAssignments,
        events: actionEvents,
        activePeople: active,
        now,
      })) {
        await write('neglected_primary', g.personExternalId, 'medium', sayNeglectedPrimary(g), {
          role: g.roleName,
          actionKey: g.actionKey,
          cadence: g.cadence,
          periodStartedAt: g.periodStartedAt.toISOString(),
          lastDoneAt: g.lastDoneAt?.toISOString() ?? null,
          daysIntoPeriod: g.daysIntoPeriod,
        });
      }
    }
    /*
     * THE REASON THE SPEC ASKS FOR GATES AT ALL.
     *
     * §11.1: detectors like `no_checkin` must not fire against somebody still inside their
     * onboarding window. Time in role was the blunt version - it says nothing about whether anybody
     * has actually shown them what to do. Somebody three weeks in who has not been given a brief,
     * an account or an introduction has not failed to check in; nobody has got to them yet.
     *
     * Treated as HAVING checked in rather than filtered out separately, so one rule decides who is
     * exempt and there is no second place for the two to disagree.
     */
    for (const id of await this.onboarding.whoIsStillOnboarding(organizationId)) checkedIn.add(id);

    const withWindow = people.map((p) => ({
      ...p,
      createdAt: startedInRole.get(p.externalId) ?? p.createdAt,
    }));
    for (const u of findNoCheckIn(withWindow, checkedIn, now)) {
      await write('no_checkin', u.personExternalId, 'low', sayNoCheckIn(u), { knownForDays: u.knownForDays });
    }
    return n;
  }

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
    /*
     * WHAT PEOPLE SAID IN THEIR CHECK-INS IS THE ONLY INPUT. Questions to Ask Groundwork are private,
     * always, so no detector reads them (Hafsah, 15 November 2026; see a-persons-own-ask-turns).
     * This used to read every person's Ask questions in the organisation as well, to work out who
     * was mentioned in which work.
     *
     * Check-ins are where people talk about their work anyway. Measured on a firm of eleven with
     * twenty-eight conversations about three named projects, reading Ask alone gave 27 ASSIGNED rows,
     * zero STATED, zero REFERENCED, and six people told their leads they had "not been mentioned in
     * any" of the work they had spent the quarter on. See a-check-in-is-where-people-talk.
     */
    const spoken = await this.prisma.conversationTurn.findMany({
      where: { role: 'PERSON', checkIn: { ground: { organizationId } } },
      select: {
        content: true, createdAt: true,
        checkIn: { select: { participant: { select: { email: true, userId: true, user: { select: { email: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 4_000,
    }).catch(() => [] as any[]);
    /*
     * NEVER A GUEST'S WORDS. A guest is from another organisation and is on nobody's row here, so
     * what they said is read as nobody's rather than as the words of an entry that happens to share
     * their address. See a-guest-is-never-somebody-on-the-hosts-list.
     */
    const guests = await theGuestsHere(this.prisma, organizationId);
    const notAGuest = (spoken as any[]).filter((t) => !isAGuestHere(guests, {
      userId: t.checkIn?.participant?.userId ?? null,
      email: t.checkIn?.participant?.email ?? null,
      userEmail: t.checkIn?.participant?.user?.email ?? null,
    }));
    const directory = await this.prisma.person.findMany({
      where: { organizationId },
      select: { externalId: true, email: true },
    }).catch(() => [] as any[]);
    const fromCheckIns = turnsFromCheckIns(
      notAGuest.map((t) => ({
        email: t.checkIn?.participant?.email ?? null,
        userEmail: t.checkIn?.participant?.user?.email ?? null,
        content: t.content,
        createdAt: t.createdAt,
      })),
      directory as any[],
    );
    if (notAGuest.length < (spoken as any[]).length) {
      this.logger.log(`Org ${organizationId}: ${(spoken as any[]).length - notAGuest.length} check-in turn(s) are a guest's, so they are not read here.`);
    }
    if (fromCheckIns.unmatched) {
      this.logger.log(`Org ${organizationId}: ${fromCheckIns.unmatched} check-in turn(s) belong to somebody who is not in the directory, so they are not read here.`);
    }
    const turns = fromCheckIns.turns;
    this.logger.log(`Org ${organizationId}: reading ${turns.length} check-in turn(s).`);

    /*
     * TWO OF THE PEOPLE DETECTORS DO NOT NEED A SINGLE SUBJECT, so they run before the early exit
     * rather than after it. `no_lead` and `no_checkin` read the directory; an organisation that has
     * connected its identity provider but not yet imported any objectives is exactly the one that
     * most wants to hear its reporting lines are broken, and it would have heard nothing.
     *
     * This early return used to sit above everything, which is the same shape as the bug found in
     * `findNoLead` an hour earlier: a guard clause for one thing quietly gating another.
     */
    /* Judgements of a person off for this organisation: no finding about a person is made (organisation/person-judgements.ts). */
    const judged = await thePersonJudgementsAreOn(this.prisma, organizationId);
    const aboutPeople = judged ? await this.aboutPeople(organizationId, subjects, turns) : 0;
    if (!subjects.length) {
      this.logger.log(`Org ${organizationId}: no subjects imported; ${aboutPeople} people findings.`);
      return { ran: true, found: aboutPeople };
    }

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
    /* Its opposite: talked about repeatedly, never by the number on it. */
    const measureGaps = await this.measureUnmentioned(organizationId, subjects, turns);
    const diverging = await this.goalDivergence(organizationId, subjects);
    const contribution = judged ? await this.contribution(organizationId, subjects, turns) : 0;
    const proposed = await this.recommend(organizationId, subjects);

    this.logger.log(`Org ${organizationId}: ${found.length} undeclared dependencies, ${unmentioned} unmentioned, ${measureGaps} with a measure nobody mentions, ${diverging} diverging, ${contribution} contribution findings, ${aboutPeople} about people, ${proposed} recommendations.`);
    return { ran: true, found: found.length + unmentioned + measureGaps + diverging + contribution + aboutPeople, recommended: proposed };
  }
}
