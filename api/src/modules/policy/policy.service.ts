import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { SuitesService } from '../suites/suites.service';
import { askName } from '../assistant/ask-name';
import { onlyTheRecordsThatHold, theRecordAreas, RECORD_AREAS, aDirectoryKey, aRoleKey, type ARecordArea, type ARecordKept } from './the-setup-records';
import { DUTIES_ROW, dutiesFrom } from '../suites/who-holds-each-duty';
import {
  RULES_FROM_A_DOCUMENT_PROMPT, RULES_FROM_A_DOCUMENT_SCHEMA, onlyTheRulesThatHold, thePolicyBoard, theSetupFromDocuments,
  whereTheyDisagree, whatApprovingWrites, thePolicyAsADocument, THE_AREAS, type ARule, type APolicyArea,
} from './the-policy';

/** Whether Release 9 is switched on for this organisation. Off for every organisation by default. */
export async function theRelease9PolicyIsOn(prisma: any, organizationId: string | null | undefined): Promise<boolean> {
  if (!organizationId) return false;
  const o = await Promise.resolve(prisma?.organization?.findUnique?.({ where: { id: organizationId }, select: { release9PolicyOn: true } })).catch(() => null);
  return o?.release9PolicyOn === true;
}

type Reader = { userId: string; organizationId: string; role: string };

/* Off for this organisation: nothing says a switch exists (switches are Groundwork's own, 25 October). */
const OFF = 'That could not be found.';
const ONLY_AN_ADMIN = 'Only an admin can set up from documents or approve a rule.';
const MOST_WORDS = 200_000;
/** The key the approved rules are kept under in what Ask answers from, so each approval replaces the last version. */
const THE_POLICY_KEY = 'policy-board';

const asRule = (r: any): ARule => ({
  id: r.id, area: r.area, says: r.says, document: r.document, where: r.where ?? null, exceptionsBy: r.exceptionsBy ?? null,
  appliesTo: r.appliesTo ?? null, measure: r.measure ?? null, value: r.value ?? null, state: r.state, changedOn: r.changedOn ?? null,
});

/**
 * RELEASE 9: the policy board, and setting up from documents. Every read and write is the organisation's own: an admin adds
 * documents, decides where two disagree and approves each area; everyone in the organisation reads the board.
 */
@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly knowledge: KnowledgeService,
    private readonly suites: SuitesService,
  ) {}

  private async on(r: Reader) { if (!(await theRelease9PolicyIsOn(this.prisma, r.organizationId))) throw new BadRequestException(OFF); }
  private admin(r: Reader) { if (r.role !== 'ADMIN') throw new ForbiddenException(ONLY_AN_ADMIN); }
  private async orgName(id: string) { return (await (this.prisma as any).organization.findUnique({ where: { id }, select: { name: true } }))?.name ?? 'your organisation'; }
  private async rules(orgId: string): Promise<ARule[]> {
    return ((await (this.prisma as any).policyRule.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'asc' } })) as any[]).map(asRule);
  }

  /** The policy board, for anyone in the organisation. */
  async board(r: Reader) {
    if (!(await theRelease9PolicyIsOn(this.prisma, r.organizationId))) return { on: false };
    const name = await this.orgName(r.organizationId);
    return { on: true, mayChange: r.role === 'ADMIN', board: thePolicyBoard(name, askName(name), await this.rules(r.organizationId)) };
  }

  private async records(orgId: string): Promise<ARecordKept[]> {
    return ((await Promise.resolve((this.prisma as any).setupItem?.findMany?.({ where: { organizationId: orgId }, orderBy: { createdAt: 'asc' } })).catch(() => [])) ?? []) as ARecordKept[];
  }

  /**
   * Approving a record area writes it into the product's own store. Nobody is invited or written to. People go into the staff directory,
   * with their team and manager; an org chart sets each team's manager on its people; clients go on the clients list with their owner;
   * goals become the direction's "What we currently believe", only where no direction is set yet; roles go on the role map.
   */
  private async approveRecords(r: Reader, area: ARecordArea) {
    const db = this.prisma as any;
    const all = await this.records(r.organizationId);
    const here = all.filter((x) => x.area === area && x.state !== 'applied');
    if (!here.length) throw new BadRequestException('Nothing in your documents is about this area yet.');
    const now = new Date();
    const people = all.filter((x) => x.area === 'people').map((x) => x.data);
    const keyOfName = (name: string | null) => {
      if (!name) return null;
      const p = people.find((x: any) => String(x.name).toLowerCase() === name.toLowerCase() || String(x.name).split(' ')[0].toLowerCase() === name.toLowerCase());
      return p ? aDirectoryKey(p) : null;
    };
    if (area === 'people') {
      for (const { data: p } of here) {
        const [givenName, ...rest] = String(p.name).split(' ');
        const row = { userName: p.email ?? p.name, displayName: p.name, givenName, familyName: rest.join(' ') || null, email: p.email, title: p.title, department: p.team, managerExternalId: keyOfName(p.manager), active: true, syncedAt: now };
        await db.person.upsert({ where: { organizationId_sourceSystem_externalId: { organizationId: r.organizationId, sourceSystem: 'setup', externalId: aDirectoryKey(p) } }, create: { organizationId: r.organizationId, sourceSystem: 'setup', externalId: aDirectoryKey(p), ...row }, update: row });
      }
    } else if (area === 'teams') {
      for (const { data: t } of here) {
        const manager = keyOfName(t.manager);
        if (manager) await db.person.updateMany({ where: { organizationId: r.organizationId, sourceSystem: 'setup', department: t.team, NOT: { externalId: manager } }, data: { managerExternalId: manager } });
      }
    } else if (area === 'clients') {
      for (const { data: c } of here) {
        const externalId = `setup:client:${aRoleKey(c.name)}`;
        const row = { type: 'COUNTERPARTY', title: c.name, ownerExternalId: keyOfName(c.owner), authoredBy: 'setup', syncedAt: now };
        await db.subject.upsert({ where: { organizationId_sourceSystem_externalId: { organizationId: r.organizationId, sourceSystem: 'setup', externalId } }, create: { organizationId: r.organizationId, sourceSystem: 'setup', externalId, ...row }, update: row });
      }
    } else if (area === 'direction') {
      const on = (await Promise.resolve(db.organization?.findUnique?.({ where: { id: r.organizationId }, select: { release6DirectionOn: true } })).catch(() => null))?.release6DirectionOn === true;
      if (!on) throw new BadRequestException('That could not be found.');
      const any = await Promise.resolve(db.directionVersion?.findFirst?.({ where: { organizationId: r.organizationId } })).catch(() => null);
      if (any) throw new BadRequestException('A direction is already set. Change it on the Direction page.');
      await db.directionVersion.create({ data: { organizationId: r.organizationId, version: 1, setByUserId: r.userId, now: { believe: here.map((x) => x.data.goal).join(' ') }, whatChanged: {}, teams: [] } });
    } else if (area === 'roles') {
      for (const { data: x } of here) {
        await db.role.upsert({ where: { organizationId_key: { organizationId: r.organizationId, key: aRoleKey(x.role) } }, create: { organizationId: r.organizationId, key: aRoleKey(x.role), name: x.role, description: x.owns }, update: { name: x.role, description: x.owns } });
      }
    }
    await db.setupItem.updateMany({ where: { organizationId: r.organizationId, id: { in: here.map((x) => x.id) } }, data: { state: 'applied' } });
    return this.setup(r);
  }

  /** Each name, as the organisation-wide role that person holds (finance, HR, chief executive), or null where they hold none. */
  private async theRolesOf(organizationId: string, names: string[]): Promise<{ name: string; role: 'finance' | 'hr' | 'chiefExecutive' | null }[]> {
    const db = this.prisma as any;
    const row = await Promise.resolve(db.organizationSuite?.findUnique?.({ where: { organizationId_suite: { organizationId, suite: DUTIES_ROW } }, select: { answers: true } })).catch(() => null);
    const duties = dutiesFrom(row?.answers) as Record<string, any>;
    const members = ((await Promise.resolve(db.organizationMembership?.findMany?.({ where: { organizationId }, select: { userId: true, user: { select: { firstName: true } } } })).catch(() => [])) ?? []) as any[];
    return names.map((name) => {
      const ids = members.filter((m) => String(m.user?.firstName ?? '').trim().split(/\s+/)[0]?.toLowerCase() === name.toLowerCase()).map((m) => m.userId);
      const role = (['finance', 'hr', 'chiefExecutive'] as const).find((k) => typeof duties[k] === 'string' && ids.includes(duties[k])) ?? null;
      return { name, role };
    });
  }

  /** What approving cannot set yet, because a name in a rule holds no role on record: said on the setup page. */
  private async whatCannotBeSet(r: Reader, rules: ARule[]): Promise<string[]> {
    const out: string[] = [];
    for (const rule of rules.filter((x) => x.measure === 'spend.approvalAbove' && x.state !== 'set aside')) {
      const w = whatApprovingWrites([rule]).approvalAbove;
      if (!w) continue;
      const missing = (await this.theRolesOf(r.organizationId, w.names)).filter((x) => !x.role).map((x) => x.name);
      if (missing.length) out.push(`${missing.join(' and ')} ${missing.length === 1 ? 'holds' : 'hold'} no role on record, so “${rule.says.replace(/\.$/, '')}” is not a setting yet. Give ${missing.length === 1 ? 'them' : 'each'} the finance, HR or chief executive role under Suites, then approve again.`);
    }
    return out;
  }

  /** The setup page, for an admin. */
  async setup(r: Reader) {
    await this.on(r); this.admin(r);
    const name = await this.orgName(r.organizationId);
    const docs = ((await (this.prisma as any).policyDocument.findMany({ where: { organizationId: r.organizationId }, orderBy: { createdAt: 'asc' }, select: { name: true } })) as any[]).map((d) => d.name);
    const all = await this.rules(r.organizationId);
    const page = theSetupFromDocuments(askName(name), docs, all);
    const records = theRecordAreas(await this.records(r.organizationId));
    /* In the prototype's order: people, teams, then the rule areas, then clients, direction and the role map. */
    const pick = (k: string) => records.filter((x) => x.area === k);
    const areas = [...pick('people'), ...pick('teams'), ...page.areas, ...pick('clients'), ...pick('direction'), ...pick('roles')];
    return { on: true, setup: { ...page, areas, cannotBeSetYet: await this.whatCannotBeSet(r, all) } };
  }

  /**
   * An admin hands over a document. Its rules are read by the model (the same seam every other reading uses), kept as
   * proposed, and nothing is applied until the admin approves the area.
   */
  async addDocument(r: Reader, input: { name?: unknown; text?: unknown }) {
    await this.on(r); this.admin(r);
    const name = typeof input.name === 'string' ? input.name.replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
    const text = typeof input.text === 'string' ? input.text.trim() : '';
    if (!name || name.length > 120) throw new BadRequestException('Give the document a name of up to 120 letters, such as "Leave policy".');
    if (!text) throw new BadRequestException(`I could not find any words in ${name}. If it is a scan, try a copy that has the text in it.`);
    if (text.length > MOST_WORDS) throw new BadRequestException(`${name} is too long to read in one go. Add it in parts, such as one section at a time.`);
    const doc = await (this.prisma as any).policyDocument.create({ data: { organizationId: r.organizationId, name, text, addedById: r.userId } });
    const answer = await this.anthropic.extract<unknown>(RULES_FROM_A_DOCUMENT_PROMPT, [{ role: 'user', content: `${name}\n\n${text}` }], RULES_FROM_A_DOCUMENT_SCHEMA)
      .catch((err: any) => { this.logger.warn(`The rules could not be read from ${doc.id}: ${err?.message ?? err}`); return null; });
    const read = onlyTheRulesThatHold(answer, name);
    for (const x of read) await (this.prisma as any).policyRule.create({ data: { organizationId: r.organizationId, documentId: doc.id, ...x, state: 'proposed' } });
    /* And the records it holds (people, teams, clients, goals, roles), each proposed until its area is approved. */
    for (const x of onlyTheRecordsThatHold(answer)) await (this.prisma as any).setupItem?.create?.({ data: { organizationId: r.organizationId, documentId: doc.id, area: x.area, data: x.data, document: name, where: null, state: 'proposed' } });
    return this.setup(r);
  }

  /** Where two documents disagree, the admin keeps one rule; the others setting the same thing are set aside. */
  async decide(r: Reader, input: { ruleId?: unknown }) {
    await this.on(r); this.admin(r);
    const all = await this.rules(r.organizationId);
    const kept = all.find((x) => x.id === input.ruleId);
    if (!kept || !kept.measure) throw new NotFoundException('That rule is not one of the choices.');
    const d = whereTheyDisagree(all).find((x) => x.measure === kept.measure);
    if (!d) throw new BadRequestException('Nothing disagrees with that rule any more.');
    const others = all.filter((x) => x.measure === kept.measure && x.id !== kept.id && x.value !== kept.value && x.state !== 'set aside').map((x) => x.id);
    await (this.prisma as any).policyRule.updateMany({ where: { organizationId: r.organizationId, id: { in: others } }, data: { state: 'set aside' } });
    /* An area already applied takes the decision now: the kept rule is applied, and the suites follow it. */
    if (all.some((x) => x.area === kept.area && x.state === 'applied')) return this.approve(r, { area: kept.area });
    return this.setup(r);
  }

  /**
   * An admin approves an area: its rules are applied, the exact-fit ones are written into the suites through their own
   * setters (so their own checks and history apply), and the board is given to Ask as one document to answer from.
   */
  async approve(r: Reader, input: { area?: unknown }) {
    await this.on(r); this.admin(r);
    if (RECORD_AREAS.includes(input.area as ARecordArea)) return this.approveRecords(r, input.area as ARecordArea);
    const area = input.area as APolicyArea;
    if (!THE_AREAS.includes(area)) throw new BadRequestException('Say which area to approve.');
    const all = await this.rules(r.organizationId);
    if (whereTheyDisagree(all).some((d) => d.area === area)) throw new BadRequestException('Two documents disagree in this area. Decide that first, then approve it.');
    const here = all.filter((x) => x.area === area && x.state !== 'set aside');
    if (!here.length) throw new BadRequestException('Nothing in your documents is about this area yet.');
    /* A rule applied before keeps the day it was first applied; one applied now is unchanged from the document. */
    await (this.prisma as any).policyRule.updateMany({ where: { organizationId: r.organizationId, id: { in: here.filter((x) => x.state === 'proposed').map((x) => x.id) } }, data: { state: 'applied' } });
    const writes = whatApprovingWrites(here);
    const reader = { userId: r.userId, organizationId: r.organizationId };
    if (writes.leaveDays !== undefined) await this.suites.setLeaveDaysFromPolicy(reader, writes.leaveDays);
    if (writes.noticeDays !== undefined) await this.suites.setLeaveRules(reader, { noticeDays: writes.noticeDays });
    if (writes.quoteAbove !== undefined) await this.suites.setSpendRules(reader, { evidence: { what: 'quote', above: writes.quoteAbove } });
    if (writes.mostHoursADay !== undefined || writes.weekLocksOn !== undefined) {
      await this.suites.setTimeRules(reader, { ...(writes.mostHoursADay !== undefined ? { mostHoursADay: writes.mostHoursADay } : {}), ...(writes.weekLocksOn ? { weekLocksOn: writes.weekLocksOn } : {}) });
    }
    /* "Grace, then Amani": each name as the role that person holds, so the steps survive people changing jobs. A name with no role stays
       on the setup page to decide, and nothing is written for that rule. */
    if (writes.approvalAbove) {
      const steps = await this.theRolesOf(r.organizationId, writes.approvalAbove.names);
      if (steps.every((x) => x.role)) {
        const now = (await this.suites.spendRules(reader).catch(() => null))?.rules?.thresholds ?? [];
        const thresholds = [...now.filter((t: any) => t.above !== writes.approvalAbove!.amount), { above: writes.approvalAbove.amount, steps: steps.map((x) => [x.role]) }].sort((a: any, b: any) => a.above - b.above);
        await this.suites.setSpendRules(reader, { thresholds });
      }
    }
    const name = await this.orgName(r.organizationId);
    const after = await this.rules(r.organizationId);
    await this.knowledge.ingestDocument(r.organizationId, { key: THE_POLICY_KEY, title: `${name}${/s$/i.test(name) ? '’' : '’s'} policy board`, text: thePolicyAsADocument(name, after), kind: 'handbook', sourceRef: null, sourceSystem: 'policy' } as any)
      .catch((err: any) => this.logger.warn(`The policy board could not be given to Ask for ${r.organizationId}: ${err?.message ?? err}`));
    return this.setup(r);
  }
}
