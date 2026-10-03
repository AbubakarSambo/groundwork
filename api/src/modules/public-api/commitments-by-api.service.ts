import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hasSlipped } from '../assistant/what-somebody-said-they-would-do';
import { addACommitment, markACommitmentDone } from '../assistant/a-commitment-has-one-writer';
import { withoutCommitmentsFromGoalsNotToldYet } from '../grounds/a-commitment-from-a-goal-not-told-is-not-read-by-its-person';
import { Fence, mayTouch, OUTSIDE_THE_FENCE } from './a-fence-around-a-credential';

/**
 * COMMITMENTS THROUGH THE API.
 *
 * The same `Commitment` row the chat writes when somebody says "I'll send it Friday" and confirms.
 * Nothing here is a second store: a commitment recorded by this route shows up in "what did I
 * commit to", follows the person into their next check-in, and slips on the same rule. The only
 * difference is `source`, so a promise typed into a form can be told from one caught in passing.
 *
 * The panel routes act as the signed-in person and nobody else. The machine route reads for a named
 * person and writes nothing: a customer's server recording a promise in somebody's name is the one
 * thing a commitment must never be.
 */
@Injectable()
export class CommitmentsByApiService {
  constructor(private readonly prisma: PrismaService) {}

  private async me(organizationId: string, personId: string) {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { externalId: true },
    });
    if (!person) throw new NotFoundException('We cannot see that person in your organisation.');
    return person.externalId;
  }

  private shape(c: { id: string; text: string; dueSaid: string | null; dueAt: Date | null; state: string; source: string; statedAt: Date; resolvedAt: Date | null; subjectExternalId: string | null }, now: Date) {
    return {
      id: c.id,
      text: c.text,
      dueSaid: c.dueSaid,
      dueAt: c.dueAt,
      state: c.state,
      source: c.source,
      subjectExternalId: c.subjectExternalId,
      statedAt: c.statedAt,
      resolvedAt: c.resolvedAt,
      slipped: c.state === 'OPEN' && hasSlipped(c as any, now),
    };
  }

  async mine(organizationId: string, personId: string) {
    const who = await this.me(organizationId, personId);
    return this.listFor(organizationId, who);
  }

  async forPerson(organizationId: string, personExternalId: string, fence: Fence = { boundToPersonExternalIds: [] }) {
    if (!mayTouch(fence, personExternalId)) throw new ForbiddenException(OUTSIDE_THE_FENCE);
    const person = await this.prisma.person.findFirst({ where: { organizationId, externalId: personExternalId }, select: { id: true } });
    if (!person) throw new NotFoundException(`No person with externalId "${personExternalId}".`);
    return this.listFor(organizationId, personExternalId);
  }

  private async listFor(organizationId: string, personExternalId: string) {
    const now = new Date();
    /* A copy of a goal the lead has not told this person about is not listed, including rows copied before that rule (decisions 48 and 56). */
    const rows = await withoutCommitmentsFromGoalsNotToldYet(this.prisma, await this.prisma.commitment.findMany({
      where: { organizationId, personExternalId },
      orderBy: [{ state: 'asc' }, { dueAt: 'asc' }, { statedAt: 'desc' }],
      take: 100,
    }));
    const open = rows.filter((r) => r.state === 'OPEN');
    return {
      open: open.map((c) => this.shape(c, now)),
      done: rows.filter((r) => r.state !== 'OPEN').map((c) => this.shape(c, now)),
      slipped: open.filter((c) => hasSlipped(c as any, now)).length,
    };
  }

  async add(organizationId: string, personId: string, dto: { text?: string; dueSaid?: string; dueAt?: string; subjectExternalId?: string }) {
    const who = await this.me(organizationId, personId);
    const text = (dto.text ?? '').trim();
    if (!text) throw new BadRequestException('text is required: what you will do, in your words.');
    if (text.length > 500) throw new BadRequestException('text is too long. A commitment is a sentence, not a plan.');
    /* A date only where one was given. Their words for it are always kept beside it. */
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) throw new BadRequestException('dueAt is not a date. Send an ISO date, or leave it out and send dueSaid.');
    if (dto.subjectExternalId) {
      const subject = await this.prisma.subject.findFirst({
        where: { organizationId, externalId: dto.subjectExternalId, sourceDeletedAt: null },
        select: { id: true },
      });
      if (!subject) throw new NotFoundException(`No subject with externalId "${dto.subjectExternalId}".`);
    }
    const created = await addACommitment(this.prisma, {
      organizationId,
      personExternalId: who,
      subjectExternalId: dto.subjectExternalId?.trim() || null,
      text,
      dueSaid: dto.dueSaid?.trim() || (dueAt ? dueAt.toISOString().slice(0, 10) : null),
      dueAt,
      source: 'api',
    });
    return { ...this.shape(created, new Date()), says: `Noted: ${text}. It will come back to you in your next check-in.` };
  }

  async done(organizationId: string, personId: string, id: string) {
    const who = await this.me(organizationId, personId);
    const row = await this.prisma.commitment.findFirst({ where: { id, organizationId, personExternalId: who } });
    /* The same answer whether it is not there or not theirs. */
    if (!row) throw new NotFoundException('No such commitment of yours.');
    if (row.state !== 'OPEN') return { ...this.shape(row, new Date()), says: 'That one was already closed.' };
    const updated = await markACommitmentDone(this.prisma, id);
    return { ...this.shape(updated, new Date()), says: `Done: ${row.text}.` };
  }
}
