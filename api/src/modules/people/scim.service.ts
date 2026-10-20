import { whoExistsTwice, howItReads } from './whose-roster-is-this';
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { tidyANumberFor } from '../whatsapp/the-organisations-country';
import { aSignInsNumberChanged, aRosterNumberChanged, refuseANumberOnSomebodyElse, aSignInWithNoNumberTakesTheRosters, theSignInOf } from '../whatsapp/one-number-for-a-person';
import { Prisma } from '@prisma/client';

/** The SCIM 2.0 user shape, as much of it as we take in. */
export interface ScimUser {
  externalId?: string;
  userName?: string;
  displayName?: string;
  name?: { givenName?: string; familyName?: string };
  emails?: { value?: string; primary?: boolean }[];
  /** SCIM core. The first one, or the one marked primary, becomes the number they message from. */
  phoneNumbers?: { value?: string; type?: string; primary?: boolean }[];
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
    if (has('phoneNumbers')) {
      const raw = dto.phoneNumbers?.find((p) => p.primary)?.value ?? dto.phoneNumbers?.[0]?.value ?? null;
      const digits = raw ? raw.trim().replace(/[^\d+]/g, '') : '';
      out.phone = digits ? (digits.startsWith('+') ? digits : `+${digits}`) : null;
    }
    if (has(ENTERPRISE)) {
      out.department = dto[ENTERPRISE]?.department?.trim() || null;
      out.managerExternalId = dto[ENTERPRISE]?.manager?.value?.trim() || null;
    }
    return out;
  }

  /**
   * Whether a userName is an email address.
   *
   * Deliberately loose. The job is not to validate an address, it is to tell
   * `sahar@groundwork.test` from `sahar` - and a stricter test that rejected an
   * unusual but real address would put us back where we started, with a person
   * who has no email and a failure three calls later.
   */
  private looksLikeAnEmail(value: string | undefined): boolean {
    return typeof value === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
  }

  async upsert(organizationId: string, sourceSystem: string, dto: ScimUser) {
    if (!dto?.externalId?.trim()) {
      throw new BadRequestException('externalId is required - it is how a person stays the same person across pushes.');
    }
    if (!dto?.userName?.trim()) throw new BadRequestException('userName is required.');

    const externalId = dto.externalId.trim();
    const prior = await this.prisma.person.findFirst({
      where: { organizationId, sourceSystem, externalId },
      /* `email` joins the others so the fill below needs no second query - and
         so five specs whose stubs know about one lookup keep working. */
      select: { id: true, active: true, deactivatedAt: true, managerExternalId: true, email: true, phone: true, linkedUserId: true },
    });

    const active = dto.active ?? true;

    /**
     * A userName that is an email BECOMES the email, when we have none.
     *
     * The SCIM shape puts addresses in `emails[]`, and a caller who sends only
     * `{ externalId, userName: "sahar@example.com", displayName }` got a 201 and
     * a person with NO EMAIL AT ALL. Nothing went wrong until three calls later,
     * opening a check-in, which refused with "that person has no email address
     * here" - a true sentence about a call made three steps earlier, with
     * nothing pointing back at it. An integrator's first instinct is that the
     * check-in endpoint is broken.
     *
     * Found by walking the whole path as a customer for the first time.
     *
     * FILLED, NEVER OVERWRITTEN. Only when there is no email on the record, so a
     * later minimal push - the deprovisioning `{ externalId, userName, active:
     * false }` that every identity provider sends - cannot replace a good
     * address with a login handle. That is the same class of destruction the
     * absent-is-not-null rule above exists to prevent, and this must not
     * reintroduce it.
     */

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
    /*
     * THE NUMBER IN THE ONE FORM WHATSAPP SENDS (decision 82, item 8). `fields` took out spaces and
     * dashes only, so a local "0801 234 5678" was kept as "+08012345678" and never matched the
     * number WhatsApp sends. The same function Settings and an admin's roster entry use: a local
     * number takes the organisation's country, or the push is refused with a sentence saying what to send.
     */
    if (typeof data.phone === 'string' && data.phone) {
      const raw = dto.phoneNumbers?.find((p) => p.primary)?.value ?? dto.phoneNumbers?.[0]?.value ?? data.phone;
      data.phone = await tidyANumberFor(this.prisma as any, organizationId, raw);
    }

    /* See the note on the push above. A fill, only into an empty field. */
    const haveNoEmail = data.email == null && prior?.email == null;
    if (haveNoEmail && this.looksLikeAnEmail(dto.userName)) {
      data.email = dto.userName!.trim().toLowerCase();
    }

    /*
     * ONE NUMBER FOR ONE PERSON (decision 106 item 3). A number already on somebody else's sign-in is
     * refused with a sentence before anything is written; otherwise the sign-in follows the roster below.
     */
    const phoneChanged = 'phone' in data && (data.phone ?? null) !== (prior?.phone ?? null);
    /* The "last wrote" stamp was about the old number (Drop Access, 21 October; findings 1.4 D). */
    if (phoneChanged && prior) data.whatsappLastInboundAt = null;
    if (phoneChanged && data.phone) {
      const own = await theSignInOf(this.prisma, { organizationId, linkedUserId: prior?.linkedUserId ?? null, email: data.email ?? prior?.email ?? null });
      await refuseANumberOnSomebodyElse(this.prisma, data.phone, own?.id ?? null, organizationId);
    }

    const row = prior
      ? await this.prisma.person.update({ where: { id: prior.id }, data })
      : await this.prisma.person.create({
          /* On create there is nothing to preserve, so an omitted field is genuinely absent. */
          data: { organizationId, sourceSystem, externalId, userName: dto.userName!.trim(), ...data },
        });

    if (phoneChanged) await aRosterNumberChanged(this.prisma, row.id, row.phone ?? null);

    if (prior && 'managerExternalId' in data && prior.managerExternalId !== data.managerExternalId) {
      this.logger.log(`Person ${externalId} moved: manager ${prior.managerExternalId ?? 'none'} -> ${(data as any).managerExternalId ?? 'none'}`);
    }
    if (prior?.active && !active) {
      this.logger.log(`Person ${externalId} deactivated in org ${organizationId}`);
    }
    return { row, created: !prior };
  }

  /**
   * WHO EXISTS TWICE, AND UNDER WHICH SYSTEMS.
   *
   * The duplicate roster this whole file was keyed wrongly for is invisible from every read that
   * matters — `list` and `resolve` are organisation-wide, so they simply return both copies and
   * nothing looks wrong. This is the one read that looks for it on purpose.
   *
   * It reports and does not merge. Merging decides which record keeps somebody's objectives and
   * which account is theirs, and that is not a decision to make from a shape in the data.
   */
  async whoExistsTwice(organizationId: string) {
    const rows = await this.prisma.person.findMany({
      where: { organizationId },
      select: { externalId: true, sourceSystem: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const duplicates = whoExistsTwice(rows);
    return { duplicates, says: howItReads(duplicates) };
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
