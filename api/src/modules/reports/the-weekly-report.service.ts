import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CheckInStatus, PartyType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import { whatTheyMayRead, type Viewer } from '../grounds/who-may-read-this-check-in';
import { labelsForParties, namesVisibleTo, viewerLabelOf, withNames } from './party-labels';
import { peersAreNamedOn } from './peers-are-named';
import { whatEachLabelIsCalled, withoutInternalLabelsIn } from './no-internal-label-reaches-anyone';
import { theSentenceAbout, theSentenceIsSafe, theWeekOf, type AWeeksLine } from './the-weekly-sentence-about-each-person';

export const NOTHING_YET_THIS_WEEK = 'No check-in has come in this week yet, so there is nothing to say yet about what people named.';

export interface TheWeeklySentences {
  weekStart: string | null;
  builtAt: Date | null;
  /** Said when there is nothing to show, so the page never has to guess why. */
  saying?: string;
  /** Each person's sentence, as this reader may read it. A participant reads only their own. */
  eachPerson: { who: string; isYou: boolean; says: string }[];
}

/**
 * THE WEEKLY REPORT'S SENTENCE ABOUT EACH PERSON, BUILT WHEN A CHECK-IN COMES IN AND SERVED AS STORED.
 * See the-weekly-sentence-about-each-person.ts for what it says and never says.
 *
 * Built on the check-in event, never on opening (decision 7). Stored by label, without names.
 * Who reads what goes through the one rule for who may read a check-in: whoever runs it reads every
 * sentence, a person in it reads only their own, and an admin who was not given access to an
 * evaluation check-in reads nothing at all (the check-in is reported as not found, as everywhere else).
 */
@Injectable()
export class TheWeeklyReportService {
  private readonly logger = new Logger(TheWeeklyReportService.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(event: CheckInCompletedEvent) {
    await this.build(event.groundId).catch((err: any) =>
      this.logger.warn(`The weekly sentences for ${event.groundId} could not be built: ${err?.message}`),
    );
  }

  /** Works out this week's sentences from the record and stores them. Safe to run again: it replaces this week's row. */
  async build(groundId: string, at: Date = new Date()) {
    const { start, key } = theWeekOf(at);
    const ground: any = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        participants: { select: { id: true, partyType: true, createdAt: true, email: true, nameGiven: true, organisationGiven: true, roleAsDescribed: true, user: { select: { firstName: true, lastName: true, email: true } } } },
      } as any,
    });
    if (!ground) return null;
    const parties: any[] = ground.participants ?? [];
    const labels = labelsForParties(parties as any);
    const done: any[] = await this.prisma.checkIn.findMany({
      where: { groundId, status: CheckInStatus.COMPLETED, completedAt: { gte: start } },
      select: { participantId: true },
    } as any);
    const checkedIn = new Set(done.map((c) => c.participantId));
    const rows: any[] = await this.prisma.recordEntry.findMany({
      where: { participant: { groundId }, createdAt: { gte: start }, disputedAt: null },
      select: { participantId: true, type: true, text: true, anchoredDocumentId: true },
    } as any);
    if (!checkedIn.size && !rows.length) return null;

    const eachPerson: { participantId: string; says: string }[] = [];
    for (const p of parties) {
      const label = labels.get(p.id);
      if (!label) continue;
      const lines: AWeeksLine[] = rows
        .filter((r) => r.participantId === p.id)
        .map((r) => ({ text: String(r.text ?? ''), type: String(r.type), documented: !!r.anchoredDocumentId }));
      const here = checkedIn.has(p.id);
      /* The lead who ran it and did not check in this week is not someone the week is about. */
      if (p.partyType === PartyType.INITIATOR && !here && !lines.length) continue;
      const says = theSentenceAbout({ label, checkedIn: here, lines });
      if (says && theSentenceIsSafe(says, { label, lines })) eachPerson.push({ participantId: p.id, says });
    }
    return this.prisma.weeklyReport.upsert({
      where: { groundId_weekStart: { groundId, weekStart: key } },
      create: { groundId, weekStart: key, eachPerson: eachPerson as any },
      update: { eachPerson: eachPerson as any, builtAt: new Date() },
    });
  }

  /** Reads what was stored, for this reader. Builds nothing. */
  async read(groundId: string, who: { userId: string; role?: string | null; organizationId?: string | null }): Promise<TheWeeklySentences> {
    const ground: any = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        organizationId: true, initiatorId: true, createdByUserId: true, scenario: true, peersVisibleToEachOther: true,
        participants: { select: { id: true, userId: true, partyType: true, createdAt: true, email: true, nameGiven: true, organisationGiven: true, roleAsDescribed: true, user: { select: { firstName: true, lastName: true, email: true } } } },
      } as any,
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    const viewer: Viewer = { userId: who.userId, role: who.role, organizationId: who.organizationId };
    const level = whatTheyMayRead(who.userId, viewer, ground);
    /* Somebody with no reach, and an admin who was not given access to an evaluation check-in, read nothing. */
    if (!level) throw new NotFoundException('Check-in not found');

    const latest: any = await this.prisma.weeklyReport.findFirst({ where: { groundId }, orderBy: { weekStart: 'desc' } });
    if (!latest) return { weekStart: null, builtAt: null, saying: NOTHING_YET_THIS_WEEK, eachPerson: [] };

    const parties: any[] = ground.participants ?? [];
    const me = parties.find((p) => p.userId === who.userId) ?? null;
    const viewerIsLead = level === 'lead';
    const stored = (latest.eachPerson as { participantId: string; says: string }[]) ?? [];
    /* The door: the lead reads every sentence; anybody else reads only the one about themselves. */
    const mine = viewerIsLead ? stored : stored.filter((s) => !!me && s.participantId === me.id);
    if (!mine.length) return { weekStart: latest.weekStart, builtAt: latest.builtAt, saying: viewerIsLead ? NOTHING_YET_THIS_WEEK : 'Nothing has been written about you this week yet.', eachPerson: [] };

    const peersAreNamed = peersAreNamedOn(ground as any, { participantId: me?.id ?? null });
    const asWhom = viewerIsLead ? (parties.find((p) => p.partyType === PartyType.INITIATOR)?.id ?? me?.id ?? null) : me?.id ?? null;
    const visible = namesVisibleTo(asWhom, parties as any, viewerIsLead ? true : peersAreNamed);
    const called = whatEachLabelIsCalled(parties as any, { viewerIsLead, viewerParticipantId: me?.id ?? null, peersAreNamed });
    const allLabels = [...labelsForParties(parties as any).values()];
    const myLabel = viewerLabelOf(me?.id ?? null, parties as any);
    const labels = labelsForParties(parties as any);

    const eachPerson = mine.map((s) => {
      const isYou = !!me && s.participantId === me.id;
      const says = withoutInternalLabelsIn(
        withNames(s.says, visible, allLabels, { viewerLabel: isYou ? myLabel : null }),
        called,
      ) as string;
      const label = labels.get(s.participantId) ?? '';
      return { who: isYou ? 'You' : (visible.get(label) ?? called.get(label.toLowerCase()) ?? 'A colleague'), isYou, says };
    });
    return { weekStart: latest.weekStart, builtAt: latest.builtAt, eachPerson };
  }
}
