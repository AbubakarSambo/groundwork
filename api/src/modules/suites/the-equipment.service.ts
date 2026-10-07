import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { thisSuiteIsOff } from './a-suite-that-is-off-says-what-to-do';
import { PrismaService } from '../prisma/prisma.service';

/** The words the server says when it refuses, in plain full sentences. */
export const EQUIPMENT_REFUSED = {
  notOn: thisSuiteIsOff('The equipment suite'),
  onlyAnAdmin: 'Only an admin can open this board.',
  /** Said to somebody who may not add to or change the list. Reading and changing are different sentences (request 181 item 5). */
  onlyAnAdminChanges: 'Only an admin can change this list.',
  notInIt: 'Only people in this organisation can update equipment here.',
  notFound: 'That item was not found.',
  badName: 'Give the item a name.',
  alreadyThere: 'There is already an item with that name.',
  badHolder: 'Choose somebody in your staff directory, or nobody.',
};

export interface Reader { userId: string; organizationId: string }

export interface EquipmentBoard {
  items: { id: string; name: string; holderId: string | null; holder: string | null; condition: string | null }[];
  /** Who may have an item: the staff directory, by name only. */
  people: { id: string; name: string }[];
}

type Person = { externalId: string; displayName: string | null; givenName: string | null; familyName: string | null };
type Change = { holderId?: string | null; condition?: string | null };

/**
 * EQUIPMENT (E10, #/suite/equipment, U.17). ADMINS ONLY, decided here: a lead, a member and a guest are
 * refused the board and every change, whatever the screen shows, and nobody reads it while the suite is
 * off. An admin adds an item, and says who has it and how it is. Who has an item is somebody in the
 * staff directory, never a guest, or nobody.
 *
 * People will also update it by telling Groundwork, such as "Laptop 07 is now with Faith.", which is the
 * engine's part (request 29): `record` is for the engine to call once the person has confirmed it. There
 * is no form for that. Nothing here says anything about how anybody works, and nothing reaches a check-in
 * or its report.
 */
@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async board(reader: Reader): Promise<EquipmentBoard> {
    await this.suiteOn(reader.organizationId);
    await this.admitAdmin(reader);
    return this.read(reader.organizationId);
  }

  async add(reader: Reader, input: { name?: unknown } & Change): Promise<EquipmentBoard> {
    await this.suiteOn(reader.organizationId);
    await this.admitAdmin(reader, true);
    const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ').slice(0, 120) : '';
    if (!name) throw new BadRequestException(EQUIPMENT_REFUSED.badName);
    const org = reader.organizationId;
    if (await this.prisma.equipmentItem.findUnique({ where: { organizationId_name: { organizationId: org, name } }, select: { id: true } })) {
      throw new BadRequestException(EQUIPMENT_REFUSED.alreadyThere);
    }
    const data = await this.checked(org, input);
    await this.prisma.equipmentItem.create({ data: { organizationId: org, name, holderExternalId: data.holderExternalId ?? null, condition: data.condition ?? null, updatedById: reader.userId } });
    return this.read(org);
  }

  async change(reader: Reader, id: string, input: Change): Promise<EquipmentBoard> {
    await this.suiteOn(reader.organizationId);
    await this.admitAdmin(reader, true);
    const item = await this.prisma.equipmentItem.findUnique({ where: { id }, select: { id: true, organizationId: true } });
    if (!item || item.organizationId !== reader.organizationId) throw new NotFoundException(EQUIPMENT_REFUSED.notFound);
    const data = await this.checked(reader.organizationId, input);
    await this.prisma.equipmentItem.update({ where: { id }, data: { ...data, updatedById: reader.userId } });
    return this.read(reader.organizationId);
  }

  /**
   * An update somebody told Groundwork, once they have confirmed it (request 29). Any person in the
   * organisation, never a guest; only an item that exists, found by its name. Returns who has it now,
   * so the engine can say "Updated: Laptop 07 is with Faith Kerubo."
   */
  async record(organizationId: string, userId: string, input: { item: string } & Change) {
    await this.suiteOn(organizationId);
    const m = await this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId, organizationId } }, select: { role: true } });
    if (!m?.role || m.role === 'GUEST') throw new ForbiddenException(EQUIPMENT_REFUSED.notInIt);
    const name = (input.item ?? '').trim().replace(/\s+/g, ' ');
    const item = await this.prisma.equipmentItem.findFirst({ where: { organizationId, name: { equals: name, mode: 'insensitive' } }, select: { id: true, name: true } });
    if (!item) throw new NotFoundException(EQUIPMENT_REFUSED.notFound);
    const data = await this.checked(organizationId, input);
    await this.prisma.equipmentItem.update({ where: { id: item.id }, data: { ...data, updatedById: userId } });
    const board = await this.read(organizationId);
    const now = board.items.find((i) => i.id === item.id)!;
    return { item: now.name, holder: now.holder, condition: now.condition };
  }

  // ---------------------------------------------------------------------------------------------

  private async checked(organizationId: string, input: Change): Promise<{ holderExternalId?: string | null; condition?: string | null }> {
    const out: { holderExternalId?: string | null; condition?: string | null } = {};
    if (input.holderId !== undefined) {
      if (input.holderId !== null) {
        const p = typeof input.holderId === 'string'
          ? await this.prisma.person.findFirst({ where: { organizationId, externalId: input.holderId, active: true }, select: { externalId: true } })
          : null;
        if (!p) throw new BadRequestException(EQUIPMENT_REFUSED.badHolder);
      }
      out.holderExternalId = input.holderId;
    }
    if (input.condition !== undefined) {
      out.condition = typeof input.condition === 'string' ? input.condition.trim().slice(0, 300) || null : null;
    }
    return out;
  }

  private async read(organizationId: string): Promise<EquipmentBoard> {
    const [items, people] = await Promise.all([
      this.prisma.equipmentItem.findMany({ where: { organizationId }, select: { id: true, name: true, holderExternalId: true, condition: true }, orderBy: { name: 'asc' } }),
      this.prisma.person.findMany({ where: { organizationId, active: true }, select: { externalId: true, displayName: true, givenName: true, familyName: true } }) as Promise<Person[]>,
    ]);
    const nameOf = new Map(people.map((p) => [p.externalId, this.nameOf(p)]));
    return {
      items: items.map((i) => ({
        id: i.id, name: i.name,
        holderId: i.holderExternalId && nameOf.get(i.holderExternalId) ? i.holderExternalId : null,
        holder: (i.holderExternalId && nameOf.get(i.holderExternalId)) || null,
        condition: i.condition?.trim() || null,
      })),
      people: people.map((p) => ({ id: p.externalId, name: this.nameOf(p) })).filter((p) => p.name).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  private async suiteOn(organizationId: string): Promise<void> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId, suite: 'equipment' } },
      select: { isOn: true },
    });
    if (!suite?.isOn) throw new NotFoundException(EQUIPMENT_REFUSED.notOn);
  }

  private async admitAdmin(reader: Reader, toChange = false): Promise<void> {
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: reader.userId, organizationId: reader.organizationId } },
      select: { role: true },
    });
    if (m?.role !== 'ADMIN') throw new ForbiddenException(toChange ? EQUIPMENT_REFUSED.onlyAnAdminChanges : EQUIPMENT_REFUSED.onlyAnAdmin);
  }

  private nameOf(p: Person): string {
    return p.displayName?.trim() || [p.givenName, p.familyName].filter(Boolean).join(' ').trim();
  }
}
