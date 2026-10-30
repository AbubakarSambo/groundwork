import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { theDirectionAsRead, theTeamsBriefAsRead, type ADirectionVersion, type ATeamsPart, type ABriefItem, type ALiveGoal } from './the-direction';

/** RELEASE 6: the switch, read once per call; off, every route answers that direction is not switched on and writes nothing. */
export async function theRelease6DirectionIsOn(prisma: any, organizationId: string | null | undefined): Promise<boolean> {
  if (!organizationId) return false;
  try {
    const o = await prisma?.organization?.findUnique?.({ where: { id: organizationId }, select: { release6DirectionOn: true } });
    return o?.release6DirectionOn === true;
  } catch { return false; }
}

/** The organisation's current direction, as stored, or null. */
export async function theCurrentDirection(prisma: any, organizationId: string): Promise<ADirectionVersion | null> {
  const row = await prisma.directionVersion?.findFirst?.({ where: { organizationId }, orderBy: { version: 'desc' } }).catch(() => null);
  return row ? { version: row.version, setAt: new Date(row.setAt).toISOString(), setBy: row.setByUserId, now: row.now ?? {}, whatChanged: row.whatChanged ?? {}, teams: (row.teams ?? []) as ATeamsPart[] } : null;
}

type Reader = { userId: string; organizationId: string; role: string };
/* Off for this organisation: nothing says a switch exists (switches are Groundwork's own, 25 October). */
const OFF = 'That could not be found.';

@Injectable()
export class DirectionService {
  constructor(private prisma: PrismaService) {}

  private async on(r: Reader) { if (!(await theRelease6DirectionIsOn(this.prisma, r.organizationId))) throw new BadRequestException(OFF); }
  private nameOfUser = async (userId: string | null | undefined) => {
    if (!userId) return null;
    const u = await (this.prisma as any).user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } }).catch(() => null);
    return u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : null;
  };

  /** The live goals in the direction's teams, each person's own, and which have been looked at since this version. */
  private async theGoals(d: ADirectionVersion, organizationId: string): Promise<{ live: ALiveGoal[]; lookedAt: Set<string> }> {
    const groundIds = d.teams.map((t) => t.groundId);
    if (!groundIds.length) return { live: [], lookedAt: new Set() };
    const rows = await (this.prisma as any).groundObjective.findMany({ where: { groundId: { in: groundIds } }, select: { id: true, groundId: true, name: true, ownerParticipantId: true, target: true, owner: { select: { nameGiven: true, user: { select: { firstName: true, lastName: true } } } } } });
    const live: ALiveGoal[] = rows.map((o: any) => ({ id: o.id, groundId: o.groundId, name: o.name, ownerParticipantId: o.ownerParticipantId, target: o.target, ownerName: o.owner ? ([o.owner.user?.firstName, o.owner.user?.lastName].filter(Boolean).join(' ') || o.owner.nameGiven || null) : null }));
    const decided = await (this.prisma as any).goalVersion.findMany({ where: { organizationId, directionVersion: d.version }, select: { objectiveId: true } });
    return { live, lookedAt: new Set(decided.map((x: any) => x.objectiveId).filter(Boolean)) };
  }

  /** GET /direction: the company's direction, what it means for each team, whether the organisation has realigned, and the revisions. */
  async read(r: Reader) {
    if (!(await theRelease6DirectionIsOn(this.prisma, r.organizationId))) return { on: false };
    const d = await theCurrentDirection(this.prisma, r.organizationId);
    if (!d) return { on: true, direction: null, mayChange: r.role === 'ADMIN' };
    const earlier = await (this.prisma as any).directionVersion.findMany({ where: { organizationId: r.organizationId, version: { lt: d.version } }, orderBy: { version: 'desc' } });
    const { live: allGoals, lookedAt } = await this.theGoals(d, r.organizationId);
    const setBy = await this.nameOfUser(d.setBy);
    const myGrounds = new Set(((await (this.prisma as any).ground.findMany({ where: { id: { in: d.teams.map((t) => t.groundId) }, initiatorId: r.userId }, select: { id: true } })) as any[]).map((g) => g.id));
    /* A person's goal, by name and with its number, is read only by an admin and by the lead of that goal's team; everybody else reads the
       direction without anybody's goals in it. Enforced here, never only hidden on screen. */
    const live = r.role === 'ADMIN' ? allGoals : allGoals.filter((g) => myGrounds.has(g.groundId));
    const read = theDirectionAsRead({ ...d, setBy }, { live, lookedAt, earlier: earlier.map((e: any) => ({ version: e.version, setAt: new Date(e.setAt).toISOString(), now: e.now, whatChanged: e.whatChanged, teams: e.teams })) });
    return { on: true, mayChange: r.role === 'ADMIN', direction: { ...read, teams: read.teams.map((t) => ({ ...t, youLeadIt: myGrounds.has(t.groundId) })) } };
  }

  /** PUT /direction: an admin sets a new direction; the earlier one stays as a revision. Each team starts not approved. */
  async setNew(r: Reader, body: { now?: any; whatChanged?: any; teams?: { groundId: string; means?: string }[] }) {
    await this.on(r);
    if (r.role !== 'ADMIN') throw new ForbiddenException('Only an admin can set the company’s direction.');
    const clean = (o: any, keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(o?.[k] ?? '').trim().slice(0, 600)]).filter(([, v]) => v));
    const now = clean(body.now, ['achieve', 'why', 'believe', 'learned', 'mattersMost', 'whoOwns']);
    const whatChanged = clean(body.whatChanged, ['assumed', 'showedNotTrue', 'learned', 'decided', 'newDirection']);
    if (!now.achieve && !whatChanged.newDirection) throw new BadRequestException('Say what you are trying to achieve, or what the new direction is.');
    const grounds = await (this.prisma as any).ground.findMany({ where: { organizationId: r.organizationId, id: { in: (body.teams ?? []).map((t) => t.groundId) } }, select: { id: true, label: true, initiatorId: true } });
    const teams: ATeamsPart[] = [];
    for (const g of grounds) teams.push({ groundId: g.id, team: g.label, means: String((body.teams ?? []).find((t) => t.groundId === g.id)?.means ?? '').trim().slice(0, 600) || null, leadUserId: g.initiatorId, leadName: await this.nameOfUser(g.initiatorId), approvedAt: null, brief: null });
    const last = await theCurrentDirection(this.prisma, r.organizationId);
    await (this.prisma as any).directionVersion.create({ data: { organizationId: r.organizationId, version: (last?.version ?? 0) + 1, setByUserId: r.userId, now, whatChanged, teams } });
    return this.read(r);
  }

  private async theTeam(r: Reader, groundId: string) {
    await this.on(r);
    const d = await theCurrentDirection(this.prisma, r.organizationId);
    if (!d) throw new NotFoundException('There is no direction yet.');
    const t = d.teams.find((x) => x.groundId === groundId);
    if (!t) throw new NotFoundException('That team is not in the direction.');
    const g = await (this.prisma as any).ground.findUnique({ where: { id: groundId }, select: { initiatorId: true, organizationId: true } });
    const isLead = g?.initiatorId === r.userId;
    return { d, t, isLead };
  }
  private async save(r: Reader, d: ADirectionVersion) {
    await (this.prisma as any).directionVersion.update({ where: { organizationId_version: { organizationId: r.organizationId, version: d.version } }, data: { teams: d.teams } });
  }

  /** POST /direction/teams/:groundId/approve: the team's lead approves what it means for them, in their own words if they change it. */
  async approve(r: Reader, groundId: string, body: { means?: string }) {
    const { d, t, isLead } = await this.theTeam(r, groundId);
    if (!isLead) throw new ForbiddenException('Only the lead of this team can approve what it means for them.');
    if (body.means !== undefined) t.means = String(body.means).trim().slice(0, 600) || t.means;
    t.approvedAt = new Date().toISOString();
    await this.save(r, d);
    return this.read(r);
  }

  /** GET /direction/teams/:groundId: the team's brief, read by the lead and the team. */
  async brief(r: Reader, groundId: string) {
    const { d, t, isLead } = await this.theTeam(r, groundId);
    const inIt = isLead || r.role === 'ADMIN' || !!(await (this.prisma as any).groundParticipant.findFirst({ where: { groundId, userId: r.userId }, select: { id: true } }));
    if (!inIt) throw new ForbiddenException('Only the people in this team can read its brief.');
    return { ...theTeamsBriefAsRead(d, t), mayChange: isLead, raw: isLead ? t.brief ?? null : undefined };
  }

  /** PUT /direction/teams/:groundId/brief: the lead writes the team's brief (stop, continue, changed, start, reassign), what was unclear, and the check-in's questions now. */
  async setBrief(r: Reader, groundId: string, body: { items?: ABriefItem[]; unclear?: string; questionsNow?: { asks: string; replaces?: string }[] }) {
    const { d, t, isLead } = await this.theTeam(r, groundId);
    if (!isLead) throw new ForbiddenException('Only the lead of this team can write its brief.');
    const verbs = ['Stop', 'Continue', 'Continue, changed', 'Start', 'Reassign'];
    const people = await (this.prisma as any).groundParticipant.findMany({ where: { groundId }, select: { id: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } });
    const nameOf = (id: string | null | undefined) => { const p = people.find((x: any) => x.id === id); return p ? ([p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ') || p.nameGiven || null) : null; };
    t.brief = {
      items: (body.items ?? []).filter((i) => verbs.includes(i.verb) && String(i.what ?? '').trim()).slice(0, 20).map((i) => ({ verb: i.verb, what: String(i.what).trim().slice(0, 200), whoParticipantId: i.whoParticipantId ?? null, who: nameOf(i.whoParticipantId) })),
      unclear: String(body.unclear ?? '').trim().slice(0, 400) || null,
      questionsNow: (body.questionsNow ?? []).filter((q) => String(q.asks ?? '').trim()).slice(0, 6).map((q) => ({ asks: String(q.asks).trim().slice(0, 300), replaces: String(q.replaces ?? '').trim().slice(0, 300) || null })),
      approvedAt: new Date().toISOString(),
    };
    await this.save(r, d);
    return this.brief(r, groundId);
  }

  /** GET /direction/mine: this reader's own goals in the direction's teams, and whether each is continued, changed or stopped yet. */
  async mine(r: Reader) {
    await this.on(r);
    const d = await theCurrentDirection(this.prisma, r.organizationId);
    if (!d) return { goals: [] };
    const mine = await (this.prisma as any).groundParticipant.findMany({ where: { userId: r.userId, groundId: { in: d.teams.map((t) => t.groundId) } }, select: { id: true, groundId: true } });
    const ids = mine.map((p: any) => p.id);
    /*
     * WHOSE GOAL IT IS (polish round 1, 25 October): the person named for it, or, where the lead named nobody, whoever runs the check-in.
     * Kevin had nothing to recommit because no goal had an owner and no screen set one.
     */
    const runs = await Promise.resolve((this.prisma as any).ground?.findMany?.({ where: { initiatorId: r.userId, id: { in: d.teams.map((t) => t.groundId) } }, select: { id: true } })).catch(() => []) ?? [];
    const runIds = (runs as any[]).map((g) => g.id);
    const owned = [...(ids.length ? [{ ownerParticipantId: { in: ids } }] : []), ...(runIds.length ? [{ ownerParticipantId: null, groundId: { in: runIds } }] : [])];
    const goals = owned.length ? await (this.prisma as any).groundObjective.findMany({ where: { OR: owned }, select: { id: true, groundId: true, name: true, target: true } }) : [];
    const decided = await (this.prisma as any).goalVersion.findMany({ where: { organizationId: r.organizationId, directionVersion: d.version, ownerParticipantId: { in: ids } } });
    return {
      goals: goals.map((g: any) => ({ ...g, team: d.teams.find((t) => t.groundId === g.groundId)?.team ?? null, decided: decided.find((x: any) => x.objectiveId === g.id)?.outcome ?? null })),
      stopped: decided.filter((x: any) => x.outcome === 'stopped' || x.outcome === 'replaced').map((x: any) => ({ name: x.name, outcome: x.outcome })),
    };
  }

  /**
   * POST /direction/recommit: the person (or their lead) continues, changes or stops a goal under the new direction. The goal as it stood
   * is kept as a version; a goal stopped leaves the live targets, and one changed is the same goal with its new words and number, so
   * nobody is judged against the old plan.
   */
  async recommit(r: Reader, body: { objectiveId: string; outcome: 'continue' | 'change' | 'stop'; newName?: string; newTarget?: number | null }) {
    await this.on(r);
    const d = await theCurrentDirection(this.prisma, r.organizationId);
    if (!d) throw new NotFoundException('There is no direction yet.');
    const o = await (this.prisma as any).groundObjective.findUnique({ where: { id: body.objectiveId }, include: { owner: { select: { userId: true } }, ground: { select: { initiatorId: true, organizationId: true } } } });
    if (!o || o.ground?.organizationId !== r.organizationId) throw new NotFoundException('That goal could not be found.');
    const byTheOwner = o.owner?.userId === r.userId; const byTheLead = o.ground?.initiatorId === r.userId;
    if (!byTheOwner && !byTheLead) throw new ForbiddenException('Only the person whose goal it is, or their lead, can decide what becomes of it.');
    if (!['continue', 'change', 'stop'].includes(body.outcome)) throw new BadRequestException('Choose to continue it, change it or stop it.');
    const newName = String(body.newName ?? '').trim().slice(0, 160);
    if (body.outcome === 'change' && !newName && body.newTarget == null) throw new BadRequestException('Say what it becomes: its new words, its new number, or both.');
    const outcome = body.outcome === 'continue' ? 'continued' : body.outcome === 'stop' ? 'stopped' : 'modified';
    await (this.prisma as any).goalVersion.create({ data: { organizationId: r.organizationId, groundId: o.groundId, objectiveId: o.id, ownerParticipantId: o.ownerParticipantId, directionVersion: d.version, name: o.name, target: o.target, count: o.count, unit: o.unit ?? null, outcome, newName: newName || null, newTarget: body.newTarget ?? null, decidedBy: byTheOwner ? 'person' : 'lead' } });
    if (outcome === 'stopped') await (this.prisma as any).groundObjective.delete({ where: { id: o.id } });
    if (outcome === 'modified') await (this.prisma as any).groundObjective.update({ where: { id: o.id }, data: { ...(newName ? { name: newName } : {}), ...(body.newTarget != null ? { target: Math.round(Number(body.newTarget)) } : {}), count: 0 } });
    return { outcome, says: outcome === 'stopped' ? 'Stopped. It will not be counted as missed.' : outcome === 'modified' ? 'Changed. This is your new starting point; the old one will not be counted as missed.' : 'Continued.' };
  }
}
