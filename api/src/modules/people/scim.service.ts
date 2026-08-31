import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/** The SCIM 2.0 user shape, as much of it as we take in. */
export interface ScimUser {
  externalId?: string;
  userName?: string;
  displayName?: string;
  name?: { givenName?: string; familyName?: string };
  emails?: { value?: string; primary?: boolean }[];
  title?: string;
  timezone?: string;
  active?: boolean;
  [key: string]: any;
}

/** The enterprise extension, which is where the reporting line lives. */
const ENTERPRISE = 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User';

/**
 * SCIM RATHER THAN A PEOPLE ENDPOINT OF OUR OWN.
 *
 * Every HRIS and identity provider already speaks it, so a customer connects one they already have
 * instead of us writing a connector per customer - and joiners and movers arrive as pushes rather
 * than as something we have to remember to go and ask about.
 *
 * THE THREE CASES, AND ONLY THE FIRST IS EASY.
 *
 * A joiner is a create. A mover is the one that quietly breaks: a promotion changes the reporting
 * line and nothing else, and the failure mode is treating it as a new person - which orphans
 * everything attached to the old record and shows the same human twice. Identity here is
 * (org, source system, externalId) and NOTHING else, so a changed name, email, title or manager is
 * always the same person.
 *
 * A leaver is `active: false`. It is never a delete, because their check-ins are the substrate for
 * every finding about the objectives they touched - hard deleting guts the record and leaves a set
 * of conclusions about nobody.
 */
@Injectable()
export class ScimService {
  private readonly logger = new Logger(ScimService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * ABSENT IS NOT NULL, AND CONFLATING THEM DESTROYS DATA SILENTLY.
   *
   * The first version wrote every field from the payload, so a field the sender omitted became
   * null. An identity provider sending a minimal record - `{ externalId, userName, active: false }`
   * on deprovisioning, which is a completely ordinary thing to send - therefore wiped the display
   * name, the email, the title, the department, the timezone and the MANAGER.
   *
   * That last one is the whole of the mover case, destroyed at exactly the moment it matters most:
   * a departure is when the reporting line is needed, because the handover brief is built from it.
   * A 200 came back, the person still existed, and their record had been quietly emptied.
   *
   * So only keys actually present in the payload are written. An explicit `null` or `""` still
   * clears the field - the sender said so - but silence changes nothing. Found by reading the
   * record back after a resync rather than by the resync failing, because it did not fail.
   */
  private fields(dto: ScimUser) {
    const out: Record<string, unknown> = {};
    const put = (key: string, present: boolean, value: unknown) => {
      if (present) out[key] = value;
    };
    const has = (k: string) => Object.prototype.hasOwnProperty.call(dto, k);

    put('userName', has('userName'), dto.userName!.trim());
    put('displayName', has('displayName'), dto.displayName?.trim() || null);
    put('givenName', has('name'), dto.name?.givenName?.trim() || null);
    put('familyName', has('name'), dto.name?.familyName?.trim() || null);
    put('title', has('title'), dto.title?.trim() || null);
    put('timezone', has('timezone'), dto.timezone?.trim() || null);

    if (has('emails')) {
      const primary = dto.emails?.find((e) => e.primary)?.value ?? dto.emails?.[0]?.value ?? null;
      out.email = primary?.trim().toLowerCase() || null;
    }
    /* The enterprise extension is one object; if it was not sent, neither of its fields was. */
    if (has(ENTERPRISE)) {
      out.department = dto[ENTERPRISE]?.department?.trim() || null;
      out.managerExternalId = dto[ENTERPRISE]?.manager?.value?.trim() || null;
    }
    return out;
  }

  async upsert(organizationId: string, sourceSystem: string, dto: ScimUser) {
    if (!dto?.externalId?.trim()) {
      throw new BadRequestException('externalId is required - it is how a person stays the same person across pushes.');
    }
    if (!dto?.userName?.trim()) throw new BadRequestException('userName is required.');

    const externalId = dto.externalId.trim();
    const prior = await this.prisma.person.findFirst({
      where: { organizationId, sourceSystem, externalId },
      select: { id: true, active: true, deactivatedAt: true, managerExternalId: true },
    });

    const active = dto.active ?? true;
    /*
     * DEACTIVATION IS STAMPED ONCE, AT THE MOMENT IT FIRST BECAME TRUE.
     *
     * An identity provider re-sends a full user record on every sync, so a person deactivated in
     * March arrives as `active: false` again in April and again in May. Restamping would move the
     * departure date forward every time - and the retention window and the handover brief are both
     * measured from it, so a leaver would never age out and their handover would keep regenerating.
     */
    const deactivatedAt = active ? null : (prior?.deactivatedAt ?? new Date());

    const data: any = { ...this.fields(dto), active, deactivatedAt, syncedAt: new Date() };

    const row = prior
      ? await this.prisma.person.update({ where: { id: prior.id }, data })
      : await this.prisma.person.create({
          /* On create there is nothing to preserve, so an omitted field is genuinely absent. */
          data: { organizationId, sourceSystem, externalId, userName: dto.userName!.trim(), ...data },
        });

    if (prior && 'managerExternalId' in data && prior.managerExternalId !== data.managerExternalId) {
      this.logger.log(`Person ${externalId} moved: manager ${prior.managerExternalId ?? 'none'} -> ${(data as any).managerExternalId ?? 'none'}`);
    }
    if (prior?.active && !active) {
      this.logger.log(`Person ${externalId} deactivated in org ${organizationId}`);
    }
    return { row, created: !prior };
  }

  /**
   * SCIM PATCH, narrowed to the operations that matter and refusing the rest.
   *
   * The full PATCH grammar has paths, filters and multi-valued selectors, and implementing a
   * half-understood subset of it is worse than implementing none: an IdP would send a valid
   * operation, get a 200, and silently have nothing happen. So the supported paths are named, and
   * anything else is refused loudly enough for a customer to tell us what their IdP sends.
   */
  async patch(organizationId: string, sourceSystem: string, externalId: string, body: any) {
    const person = await this.prisma.person.findFirst({
      where: { organizationId, sourceSystem, externalId },
    });
    if (!person) throw new NotFoundException('No such person.');

    const ops: any[] = body?.Operations ?? body?.operations ?? [];
    if (!ops.length) throw new BadRequestException('A PATCH needs at least one operation.');

    const data: Prisma.PersonUpdateInput = { syncedAt: new Date() };
    for (const op of ops) {
      const verb = String(op.op ?? '').toLowerCase();
      if (verb !== 'replace' && verb !== 'add') {
        throw new BadRequestException(`Unsupported PATCH op "${op.op}". Only add and replace are handled.`);
      }
      const path = String(op.path ?? '').trim();

      /* The deprovisioning operation almost every IdP sends, in both shapes. */
      if (path === 'active' || (!path && typeof op.value?.active === 'boolean')) {
        const active = path === 'active' ? Boolean(op.value) : Boolean(op.value.active);
        data.active = active;
        data.deactivatedAt = active ? null : (person.deactivatedAt ?? new Date());
        continue;
      }
      if (path === `${ENTERPRISE}:manager` || path === 'manager') {
        data.managerExternalId = (op.value?.value ?? op.value ?? null) || null;
        continue;
      }
      if (path === 'displayName') { data.displayName = String(op.value ?? '') || null; continue; }
      if (path === 'title') { data.title = String(op.value ?? '') || null; continue; }
      if (path === 'timezone') { data.timezone = String(op.value ?? '') || null; continue; }

      throw new BadRequestException(`Unsupported PATCH path "${path}".`);
    }

    return this.prisma.person.update({ where: { id: person.id }, data });
  }

  async find(organizationId: string, sourceSystem: string, externalId: string) {
    return this.prisma.person.findFirst({ where: { organizationId, sourceSystem, externalId } });
  }

  async list(organizationId: string, opts: { includeInactive?: boolean } = {}) {
    return this.prisma.person.findMany({
      where: { organizationId, ...(opts.includeInactive ? {} : { active: true }) },
      orderBy: { userName: 'asc' },
    });
  }

  /**
   * Resolve a set of their ids to people we hold, and say plainly which ones we do not.
   *
   * Used by the subject reads. The unresolved half is the point: see
   * a-reference-we-cannot-resolve-is-not-a-reference-we-drop.spec.ts.
   */
  async resolve(organizationId: string, externalIds: string[]) {
    /*
     * ORG-WIDE, AND DELIBERATELY NOT SCOPED BY SOURCE SYSTEM.
     *
     * People arrive from the identity provider; objectives arrive from the OKR tool. The id an
     * objective uses for its owner is the IDENTITY system's id - that is the whole point of
     * `ownerExternalId` - so filtering people by the objective's source system would compare an
     * OKR tool's name against an IdP's and resolve nothing, ever. The first version did exactly
     * that and would have reported every owner in the customer's entire estate as unresolved.
     *
     * Storage stays keyed by source system so two identity systems can coexist; only the lookup is
     * org-wide. A collision there means two systems using one id for different humans, which is a
     * real problem but a different one, and it is not solved by never resolving anybody.
     */
    const wanted = [...new Set(externalIds.filter(Boolean))];
    if (!wanted.length) return { found: new Map<string, any>(), unresolved: [] as string[] };
    const rows = await this.prisma.person.findMany({
      where: { organizationId, externalId: { in: wanted } },
      select: { externalId: true, userName: true, displayName: true, email: true, active: true },
    });
    const found = new Map(rows.map((r) => [r.externalId, r]));
    return { found, unresolved: wanted.filter((id) => !found.has(id)) };
  }
}
