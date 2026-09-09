import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TO-DOS THROUGH THE PANEL. The same rows the chat writes; only `source` differs. Panel routes only:
 * a to-do is a note to yourself, and a machine credential has no self to note things for.
 */
@Injectable()
export class TodosByApiService {
  constructor(private readonly prisma: PrismaService) {}

  private async me(organizationId: string, personId: string) {
    const person = await this.prisma.person.findFirst({ where: { id: personId, organizationId }, select: { externalId: true } });
    if (!person) throw new NotFoundException('We cannot see that person in your organisation.');
    return person.externalId;
  }

  async mine(organizationId: string, personId: string) {
    const who = await this.me(organizationId, personId);
    const rows = await this.prisma.todo.findMany({
      where: { organizationId, personExternalId: who },
      orderBy: [{ state: 'asc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
      take: 200,
    });
    return { open: rows.filter((r) => r.state === 'OPEN'), done: rows.filter((r) => r.state === 'DONE') };
  }

  async add(organizationId: string, personId: string, dto: { text?: string; dueSaid?: string; dueAt?: string }) {
    const who = await this.me(organizationId, personId);
    const text = (dto.text ?? '').trim();
    if (!text) throw new BadRequestException('text is required.');
    if (text.length > 500) throw new BadRequestException('text is too long for a to-do.');
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) throw new BadRequestException('dueAt is not a date. Send an ISO date, or leave it out and send dueSaid.');
    return this.prisma.todo.create({
      data: { organizationId, personExternalId: who, text, dueSaid: dto.dueSaid?.trim() || (dueAt ? dueAt.toISOString().slice(0, 10) : null), dueAt, source: 'api' },
    });
  }

  async done(organizationId: string, personId: string, id: string) {
    const who = await this.me(organizationId, personId);
    const row = await this.prisma.todo.findFirst({ where: { id, organizationId, personExternalId: who } });
    if (!row) throw new NotFoundException('No such to-do of yours.');
    if (row.state !== 'OPEN') return row;
    return this.prisma.todo.update({ where: { id }, data: { state: 'DONE', doneAt: new Date() } });
  }
}
