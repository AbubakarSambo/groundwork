import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { onceAcrossCopies, oneOrganisationAtATime, theDay } from '../prisma/once-across-copies';
import { GroundworkEvents } from '../../common/events';
import { EVALUATION_SCENARIOS } from '../reports/is-this-an-evaluation-check-in';
import { labelsForParties } from '../reports/party-labels';
import { notesFrom, theKeyOf, whatWasWaitedFor, type AWaitOnAJobNobodyHolds } from './the-role-gap-notes';

const WEEK = 7 * 86_400_000;
const keyOf = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * WRITES WHY A JOB NOBODY OWNS MATTERS, WHEN THE RECORD CHANGES (request 25, part b).
 *
 * It listens for a check-in completing and a handoff being raised, and looks once a night. The same
 * record again writes nothing. Opening the role map never comes here: it only reads the stored rows.
 * Check-ins on a performance plan, a promotion or a renewal are left out, and so is everything a
 * person said privately. See the-role-gap-notes.ts for what goes into the sentence and what is
 * checked before it is kept.
 */
@Injectable()
export class RoleGapNotesService {
  private readonly logger = new Logger(RoleGapNotesService.name);
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(e: { groundId: string }) { await this.forTheGround(e?.groundId); }

  @OnEvent(GroundworkEvents.BLOCKER_RAISED)
  async onBlockerRaised(e: { groundId?: string }) { await this.forTheGround(e?.groundId); }

  @Cron('45 3 * * *', { timeZone: 'UTC' })
  async nightly() {
    /* Once across every copy of the API, one organisation at a time (decision 74, item 7). */
    await onceAcrossCopies(this.prisma, 'the-role-gap-notes', theDay(), async () => {
      const orgs = await this.prisma.role.findMany({ distinct: ['organizationId'], select: { organizationId: true } }).catch(() => []);
      await oneOrganisationAtATime((orgs as { organizationId: string }[]).map((o) => o.organizationId), (id) => this.rebuild(id));
    });
  }

  private async forTheGround(groundId?: string) {
    if (!groundId) return;
    try {
      const g = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { organizationId: true } });
      if (g) await this.rebuild(g.organizationId);
    } catch (err: any) {
      this.logger.warn(`Could not look at the role gaps: ${err?.message ?? err}`);
    }
  }

  async rebuild(organizationId: string, now = new Date()): Promise<'built' | 'unchanged' | 'nothing'> {
    try {
      const [roles, assignments, people] = await Promise.all([
        this.prisma.role.findMany({ where: { organizationId }, select: { key: true, name: true } }),
        this.prisma.roleAssignment.findMany({ where: { organizationId, endedAt: null }, select: { personExternalId: true, roleName: true } }),
        this.prisma.person.findMany({ where: { organizationId, active: true }, select: { externalId: true, displayName: true, givenName: true, familyName: true, email: true, title: true } }),
      ]);
      const active = new Set((people as any[]).map((p) => p.externalId));
      const held = new Set<string>();
      for (const a of assignments as any[]) if (active.has(a.personExternalId)) held.add(keyOf(a.roleName));
      for (const p of people as any[]) if (p.title?.trim()) held.add(keyOf(p.title));
      /* A role nobody holds: a role the organisation's system names, that no open assignment or title holds. */
      const nobody = new Map<string, string>();
      for (const r of roles as any[]) {
        const names = [keyOf(r.name), keyOf(r.key)];
        if (!names.some((n) => held.has(n))) for (const n of names) nobody.set(n, r.name.trim());
      }
      if (nobody.size === 0) return this.write(organizationId, [], 'nothing');

      const deps = await this.prisma.groundDependency.findMany({
        where: { onLabel: { not: null }, ground: { organizationId, scenario: { notIn: EVALUATION_SCENARIOS } } },
        select: {
          groundId: true, fromParticipantId: true, onLabel: true, what: true, createdAt: true, clearedAt: true,
          ground: { select: { participants: { select: { id: true, partyType: true, roleAsDescribed: true, createdAt: true, email: true, nameGiven: true, organisationGiven: true, user: { select: { firstName: true, lastName: true, email: true } } } } } },
        },
      });

      const names = new Set<string>();
      const add = (t?: string | null) => { for (const part of (t ?? '').split(/\s+/)) if (part.trim().length >= 3) names.add(part.trim().toLowerCase()); };
      for (const p of people as any[]) { add(p.displayName); add(p.givenName); add(p.familyName); if (p.email) { names.add(p.email.toLowerCase()); add(p.email.split('@')[0]); } }
      for (const d of deps as any[]) for (const q of d.ground.participants) { add(q.nameGiven); add(q.user?.firstName); add(q.user?.lastName); }

      const labelsOf = new Map<string, Map<string, string>>();
      const waits: AWaitOnAJobNobodyHolds[] = [];
      for (const d of deps as any[]) {
        const roleName = nobody.get(keyOf(d.onLabel ?? ''));
        if (!roleName) continue;
        const what = whatWasWaitedFor(d.what, [...names]);
        if (!what) continue;
        if (!labelsOf.has(d.groundId)) labelsOf.set(d.groundId, labelsForParties(d.ground.participants));
        const label = labelsOf.get(d.groundId)!.get(d.fromParticipantId);
        if (!label) continue;
        const end = d.clearedAt ? new Date(d.clearedAt) : now;
        waits.push({
          roleName, groundId: d.groundId, label, what, ended: !!d.clearedAt,
          weeks: Math.floor((end.getTime() - new Date(d.createdAt).getTime()) / WEEK),
        });
      }
      return this.write(organizationId, notesFrom(waits, [...names]), 'built');
    } catch (err: any) {
      /* A courtesy on top of the record: it never fails what somebody just said. */
      this.logger.warn(`Could not write why a job nobody owns matters: ${err?.message ?? err}`);
      return 'nothing';
    }
  }

  private async write(organizationId: string, notes: { roleName: string; groundId: string; says: string }[], built: 'built' | 'nothing') {
    const inputKey = theKeyOf(notes);
    const had = await this.prisma.roleGapNote.findMany({ where: { organizationId, groundId: { not: null } }, select: { inputKey: true } });
    if (had.length === notes.length && (had as any[]).every((h) => h.inputKey === inputKey)) return 'unchanged' as const;
    /* Only the notes this writes (they name a check-in) are replaced; any other note is left as it is. */
    await this.prisma.roleGapNote.deleteMany({ where: { organizationId, groundId: { not: null } } });
    if (notes.length) {
      await this.prisma.roleGapNote.createMany({
        data: notes.map((n) => ({ organizationId, roleName: n.roleName, says: n.says, groundId: n.groundId, inputKey, promptVersionId: null })),
      });
    }
    return built;
  }
}
