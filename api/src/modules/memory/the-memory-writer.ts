import { Injectable, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentReadyEvent, GroundworkEvents } from '../../common';
import { theAssessmentIn } from '../conversation/the-assessment';
import { theRecordAcrossTimeIn } from '../patterns/patterns-across-the-assessments';
import { thePersonJudgementsAreOn } from '../organisation/person-judgements';
import { theOrganisationsOwnFindings } from '../learning/what-this-organisation-has-found';
import {
  buildOrgFile, buildPersonFile, buildProjectFile, buildTeamFile, retiredPersonFile,
  type AboutAPerson, type AnAssessmentOf,
} from './build-the-files';
import { checkTheFile, fingerprintOf, theDay, type AFileToWrite, type AMemoryFile } from './the-memory-format';

/**
 * THE ONE WRITER OF MEMORY FILES (docs/groundwork-memory-system.md, steps 2, sections 3, 6 and 8).
 *
 * WHAT IT DOES. Reads the assessments and the record, builds each file from scratch (never from the file's own previous version, because a
 * summary of a summary drifts), and writes a new version only when what it was built from has changed. Every version is kept.
 *
 * THE RULES IT KEEPS, in one place:
 *  - one writer: nothing else writes `memory_files`;
 *  - a file that cites nothing, or whose header does not fit, is refused (`checkTheFile`);
 *  - compare-and-swap: a write states the version it was based on and is refused if another has landed since, then retried from the latest;
 *  - one queue per file, so one file is written one change at a time;
 *  - the same record again writes nothing (the fingerprint), so a retried or repeated write never applies twice.
 *
 * WHEN. After an assessment is ready (its person and team), and by the weekly rebuild of everything, which is also the comparison: the
 * rebuilt file is the one written, so the incremental one and the rebuilt one cannot disagree for long. Opening a file never rebuilds it.
 */

/** The newest few assessments of each person are enough to keep a file short; the detail lives in the assessments. */
const NEWEST_PER_PERSON = 6;

export type TheOutcome = 'written' | 'unchanged' | 'refused';

const nameOf = (p: any): string => {
  const given = typeof p.nameGiven === 'string' ? p.nameGiven.trim() : '';
  if (given) return given;
  const u = p.user;
  const full = u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '';
  return full || (typeof p.email === 'string' ? p.email.split('@')[0] : 'This person');
};

@Injectable()
export class MemoryWriter {
  private readonly logger = new Logger(MemoryWriter.name);
  /** One queue per file. */
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(@Optional() private readonly prisma: PrismaService) {}

  @OnEvent(GroundworkEvents.ASSESSMENT_READY)
  async onAssessmentReady(e: AssessmentReadyEvent) {
    if (!e?.groundId) return;
    const g = await (this.prisma as any).ground.findUnique({ where: { id: e.groundId }, select: { organizationId: true } }).catch(() => null);
    if (!g?.organizationId) return;
    await this.rebuildGround(g.organizationId, e.groundId).catch((err: Error) => this.logger.warn(`Memory rebuild for a check-in failed: ${err.message}`));
  }

  /** Everything for one organisation, from scratch. The weekly job calls this. */
  async rebuildOrganisation(organizationId: string, now = new Date()): Promise<Record<TheOutcome, number>> {
    const tally: Record<TheOutcome, number> = { written: 0, unchanged: 0, refused: 0 };
    const add = (o: TheOutcome[]) => o.forEach((x) => { tally[x] += 1; });
    add(await this.rebuildTheOrganisationFile(organizationId, now));
    const grounds: { id: string }[] = await (this.prisma as any).ground.findMany({ where: { organizationId, closedAt: null }, select: { id: true } });
    for (const g of grounds) add(await this.rebuildGround(organizationId, g.id, now));
    return tally;
  }

  /** The organisation's book, its projects, and nothing else. */
  async rebuildTheOrganisationFile(organizationId: string, now = new Date()): Promise<TheOutcome[]> {
    const p = this.prisma as any;
    const [organization, direction, kept, roles, policies, teams, subjects] = await Promise.all([
      p.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true } }),
      p.directionVersion?.findFirst?.({ where: { organizationId }, orderBy: { version: 'desc' } }) ?? null,
      p.organizationMemory.findMany({ where: { organizationId, status: 'KEPT' }, orderBy: { keptAt: 'desc' }, take: 12, select: { id: true, kind: true, text: true, keptAt: true } }),
      p.role.findMany({ where: { organizationId }, select: { id: true, name: true, description: true }, take: 12 }),
      p.policyDocument.findMany({ where: { organizationId }, select: { id: true, name: true }, take: 12 }),
      p.ground.findMany({ where: { organizationId, closedAt: null }, select: { id: true, label: true }, take: 50 }),
      p.subject.findMany({ where: { organizationId, type: 'PROJECT' }, take: 50 }),
    ]);
    if (!organization) return [];
    const out: TheOutcome[] = [];
    out.push(await this.write(organizationId, buildOrgFile({
      organization,
      direction: direction ? { id: direction.id, version: direction.version, setAt: direction.setAt, now: direction.now ?? {}, whatChanged: direction.whatChanged ?? {} } : null,
      kept, roles, policies, teams, now,
      learned: await theOrganisationsOwnFindings(p, organizationId),
    }), now, 'The organisation was read again.'));
    for (const s of subjects as any[]) {
      const ids = [s.ownerExternalId, ...(Array.isArray(s.contributorExternalIds) ? s.contributorExternalIds : [])].filter((x) => typeof x === 'string');
      const people: any[] = ids.length ? await p.person.findMany({ where: { organizationId, externalId: { in: ids } }, select: { externalId: true, displayName: true, linkedUserId: true } }) : [];
      const owner = people.find((x) => x.externalId === s.ownerExternalId);
      out.push(await this.write(organizationId, buildProjectFile({
        subject: { id: s.id, title: s.title, measure: s.measure, target: s.target, justification: s.justification, approach: s.approach, ownerName: owner?.displayName ?? null },
        userIds: people.map((x) => x.linkedUserId).filter(Boolean), now,
      }), now, 'The project was read again.'));
    }
    return out;
  }

  /** A team's book and the book of everyone on it. */
  async rebuildGround(organizationId: string, groundId: string, now = new Date()): Promise<TheOutcome[]> {
    const p = this.prisma as any;
    const ground = await p.ground.findUnique({ where: { id: groundId }, select: { id: true, organizationId: true, label: true, initiatorId: true, toldToParticipants: true, brief: true, kindOfWork: true, workStages: true } });
    if (!ground || ground.organizationId !== organizationId) return [];
    const [participants, objectives, rows, judgementsOn] = await Promise.all([
      p.groundParticipant.findMany({ where: { groundId }, select: { id: true, groundId: true, userId: true, nameGiven: true, email: true, leftAt: true, user: { select: { firstName: true, lastName: true } } } }),
      p.groundObjective.findMany({ where: { groundId }, select: { id: true, name: true, target: true } }),
      p.checkIn.findMany({ where: { groundId }, orderBy: { sessionNumber: 'desc' }, take: 80, select: { id: true, groundId: true, participantId: true, sessionNumber: true, startedAt: true, completedAt: true, sessionReport: true } }),
      thePersonJudgementsAreOn(p, organizationId),
    ]);
    const people: AboutAPerson[] = (participants as any[]).map((x) => ({ participantId: x.id, groundId, userId: x.userId ?? null, name: nameOf(x), leftAt: x.leftAt ?? null }));
    const seen = new Map<string, AnAssessmentOf[]>();
    for (const r of rows as any[]) {
      const a = theAssessmentIn(r.sessionReport);
      if (!a) continue;
      const list = seen.get(r.participantId) ?? [];
      if (list.length >= NEWEST_PER_PERSON) continue;
      const on = String(a.about?.endedAt ?? a.about?.startedAt ?? '').slice(0, 10) || theDay(r.completedAt ?? r.startedAt ?? now);
      list.push({ checkInId: r.id, groundId, participantId: r.participantId, sessionNumber: r.sessionNumber, on, assessment: a });
      seen.set(r.participantId, list);
    }
    const leadParticipant = (participants as any[]).find((x) => x.userId && x.userId === ground.initiatorId);
    const leadsAssessments = leadParticipant ? seen.get(leadParticipant.id) ?? [] : [];
    const current = people.filter((x) => !x.leftAt);
    const out: TheOutcome[] = [];

    out.push(await this.write(organizationId, buildTeamFile({
      ground, objectives,
      setup: leadsAssessments.find((x) => !!x.assessment.setup) ?? null,
      newest: current.flatMap((x) => (seen.get(x.participantId)?.[0] ? [{ ...seen.get(x.participantId)![0], name: x.name }] : [])),
      now,
    }), now, 'A check-in was assessed.'));

    for (const person of people) {
      if (person.leftAt) { out.push(await this.write(organizationId, retiredPersonFile(person), now, 'The person has left.')); continue; }
      const theirs = seen.get(person.participantId) ?? [];
      const newest = theirs[0] ?? null;
      const record = judgementsOn ? theRecordAcrossTimeIn(newest?.assessment) : null;
      const coachingRow = judgementsOn ? await p.coachingState.findUnique({ where: { participantId: person.participantId }, select: { currentStep: true, history: true } }).catch(() => null) : null;
      const notes = await p.leadContextNote.findMany({ where: { groundId, participantId: person.participantId, audience: 'LEAD_ONLY' }, orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, text: true, createdAt: true } }).catch(() => []);
      out.push(await this.write(organizationId, buildPersonFile({
        person, theirs, saidAboutThem: leadsAssessments, record, recordFrom: record ? newest : null,
        coaching: coachingRow ? { currentStep: coachingRow.currentStep ?? null, history: (Array.isArray(coachingRow.history) ? coachingRow.history : []).map((h: any) => ({ step: typeof h?.step === 'string' ? h.step : '', outcome: typeof h?.outcome === 'string' ? h.outcome : null })) } : null,
        leadNotes: notes, now,
      }), now, 'A check-in was assessed.'));
    }
    return out;
  }

  /**
   * THE ONLY WRITE. Refused when the file does not fit or cites nothing; unchanged when it was built from the same record; otherwise the next
   * version, based on the one this read, and retried from the latest when another version lands first.
   */
  async write(organizationId: string, file: AFileToWrite, now: Date, why: string): Promise<TheOutcome> {
    const wrong = checkTheFile(file);
    if (wrong.length) { this.logger.warn(`A memory file was refused (${file.path}): ${wrong[0]}`); return 'refused'; }
    const key = `${organizationId}\u0000${file.path}`;
    const run = (this.queues.get(key) ?? Promise.resolve()).then(() => this.writeOnce(organizationId, file, now, why));
    this.queues.set(key, run.catch(() => undefined));
    return run;
  }

  private async writeOnce(organizationId: string, file: AFileToWrite, now: Date, why: string): Promise<TheOutcome> {
    const p = this.prisma as any;
    const fingerprint = fingerprintOf(file);
    for (let attempt = 0; attempt < 3; attempt++) {
      const latest = await p.memoryFile.findFirst({ where: { organizationId, path: file.path }, orderBy: { version: 'desc' }, select: { version: true, builtFrom: true, header: true } });
      /* Nothing new, and not yet due for its check: nothing is written. Due for its check with nothing new: a fresh version says it was checked. */
      const due = !!latest && String(latest.header?.reviewBy ?? '') <= theDay(now);
      if (latest?.builtFrom === fingerprint && !due) return 'unchanged';
      const version = (latest?.version ?? 0) + 1;
      const reviewBy = theDay(new Date(now.getTime() + 7 * 86_400_000));
      try {
        await p.memoryFile.create({
          data: {
            organizationId, path: file.path, kind: file.kind, version,
            header: { ...file.header, version, updatedAt: now.toISOString(), reviewBy },
            sections: file.sections as any, builtFrom: fingerprint, basedOnVersion: latest?.version ?? null,
            why: latest?.builtFrom === fingerprint ? 'It was checked again and nothing had changed.' : why,
          },
        });
        return 'written';
      } catch (err: any) {
        /* Another version landed first (the unique version): read the latest again and decide again. */
        if (err?.code !== 'P2002') throw err;
      }
    }
    return 'refused';
  }
}
