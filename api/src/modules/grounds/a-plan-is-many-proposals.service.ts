import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { withoutBankDetails } from '../documents/bank-details-are-never-kept';
import { canSeeDocument } from '../documents/who-can-see-a-document';
import { whoThisNameIs, theNameWeUseFor } from '../documents/what-a-document-holds';
import { whyItRefuses } from './a-ground-that-has-ended';
import { BoardService } from '../board/board.service';
import { A_PLAN_PROMPT, A_PLAN_SCHEMA, proposalsFromAPlan, type PlanProposal, type PlanRead } from './a-plan-is-many-proposals';

export const ONLY_THE_LEAD_READS_A_PLAN = 'Only the person who runs this check-in can turn a plan into proposals.';
export const ONLY_THE_LEAD_CONFIRMS = 'Only the person who runs this check-in can confirm what goes into it.';

/**
 * A PLAN, READ INTO PROPOSALS, AND ONE PROPOSAL CONFIRMED AT A TIME. See a-plan-is-many-proposals.
 *
 * `read` writes nothing, anywhere. `confirm` writes exactly one thing, and only after it has checked
 * the proposal again against the plan's own words - the screen sends the proposal back, and a value
 * that is not in the plan is refused rather than trusted. Storage for proposals waiting to be
 * confirmed is the screens workspace's (request 6).
 */
@Injectable()
export class APlanIsManyProposalsService {
  private readonly logger = new Logger(APlanIsManyProposalsService.name);

  constructor(
    private prisma: PrismaService,
    private anthropic: AnthropicService,
    private config: ConfigService,
    @Optional() private readonly moduleRef?: ModuleRef,
  ) {}

  /** The lead, and only the lead, of a check-in that can still take things. */
  private async theLeadsCheckIn(groundId: string, userId: string, refusal: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        id: true, initiatorId: true, status: true, endState: true,
        participants: { select: { id: true, email: true, nameGiven: true, roleAsDescribed: true, managingOnly: true, userId: true, leftAt: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    if (ground.initiatorId !== userId) throw new ForbiddenException(refusal);
    const refused = whyItRefuses(ground.status, ground.endState, 'the lead');
    if (refused) throw new BadRequestException(refused);
    return ground;
  }

  /** The plan's words: pasted, or a document on this check-in the lead may read. */
  private async thePlanText(groundId: string, ground: { participants: { id: string; userId: string | null }[] }, userId: string, input: { text?: string; documentId?: string }) {
    if (input.documentId) {
      const doc = await this.prisma.groundDocument.findFirst({
        where: { id: input.documentId, groundId },
        select: { content: true, fileName: true, participantId: true, visibility: true },
      });
      const mine = ground.participants.find((p) => p.userId === userId)?.id ?? null;
      if (!doc || !canSeeDocument(doc as any, { participantId: mine, isLead: true }, this.config.get<boolean>('app.contextEnabled') === true)) {
        throw new NotFoundException('That document is not on this check-in.');
      }
      return { text: withoutBankDetails(doc.content ?? '') as string, from: doc.fileName };
    }
    const text = withoutBankDetails((input.text ?? '').trim()) as string;
    return { text, from: 'the plan you pasted' };
  }

  private people(ground: { participants: any[] }) {
    return ground.participants.filter((p) => !p.managingOnly && !p.leftAt);
  }

  private check(text: string, from: string, read: PlanRead[], people: any[]): PlanProposal[] {
    return proposalsFromAPlan(text, read, people.map((p) => ({ id: p.id, name: theNameWeUseFor(p) })), {
      from,
      whoIs: (name) => {
        const who = whoThisNameIs(name, people);
        return who ? { id: who.id, name: theNameWeUseFor(who as any) } : null;
      },
    });
  }

  /** Read a plan into proposals. Writes nothing. */
  async read(groundId: string, userId: string, input: { text?: string; documentId?: string }) {
    const ground = await this.theLeadsCheckIn(groundId, userId, ONLY_THE_LEAD_READS_A_PLAN);
    const { text, from } = await this.thePlanText(groundId, ground, userId, input ?? {});
    if (!text) throw new BadRequestException('Paste the plan, or choose a document, first.');
    if (text.length > 40_000) throw new BadRequestException('That plan is too long to read in one go. Paste one part of it at a time.');
    const got = await this.anthropic.extract<{ proposals?: PlanRead[] }>(A_PLAN_PROMPT, [{ role: 'user' as const, content: text }], A_PLAN_SCHEMA as any)
      .catch((err: any) => { this.logger.warn(`Reading a plan on ${groundId} failed: ${err?.message}`); return null; });
    if (!got) throw new BadRequestException('Groundwork could not read that plan just now. Please try again in a minute.');
    const proposals = this.check(text, from, got.proposals ?? [], this.people(ground));
    return {
      proposals,
      says: proposals.length
        ? `That's ${proposals.length === 1 ? '1 thing' : `${proposals.length} things`} to confirm. Nothing goes into Context until you do.`
        : 'Groundwork found no goals, roles, commitments or rules in that plan that it could quote back to you.',
    };
  }

  /**
   * Confirm ONE proposal. It is checked again against the plan's own words, and the person in it is
   * found again on this side - nothing the screen sends is written unless the plan says it.
   */
  async confirm(groundId: string, userId: string, input: { text?: string; documentId?: string; proposal?: Partial<PlanProposal> }) {
    const ground = await this.theLeadsCheckIn(groundId, userId, ONLY_THE_LEAD_CONFIRMS);
    const { text, from } = await this.thePlanText(groundId, ground, userId, input ?? {});
    const p = input?.proposal;
    if (!text || !p) throw new BadRequestException('Send the plan and the one thing to confirm.');
    const [held] = this.check(text, from, [{
      kind: p.kind, says: p.says, fromThePlan: p.fromThePlan,
      personName: p.fields?.personName, what: p.fields?.what, number: p.fields?.number, date: p.fields?.date,
    }], this.people(ground));
    if (!held) throw new BadRequestException('That is not in the plan as written, so nothing was added.');
    const f = held.fields;
    if (f.personName && !f.participantId) {
      throw new BadRequestException(`${f.personName} is not on this check-in yet. Add them first, then confirm this.`);
    }

    switch (held.kind) {
      case 'goal': {
        /* The board's own writer: the lead only, a board that tracks targets, stamped with the round. */
        const board = this.moduleRef?.get(BoardService, { strict: false });
        if (!board) throw new BadRequestException('Targets cannot be added just now. Please try again in a minute.');
        const made = await board.createObjective(groundId, userId, { name: f.what, target: f.number ?? null, ownerParticipantId: f.participantId ?? null });
        return { confirmed: held, wrote: { table: 'GroundObjective', id: made.id } };
      }
      case 'role': {
        const made = await this.prisma.groundParticipant.update({ where: { id: f.participantId! }, data: { roleAsDescribed: f.what.slice(0, 300) }, select: { id: true } });
        return { confirmed: held, wrote: { table: 'GroundParticipant', id: made.id } };
      }
      case 'commitment': {
        const made = await this.prisma.groundCommitment.create({
          select: { id: true },
          data: {
            groundId,
            participantId: f.participantId ?? null,
            text: f.what,
            whenSaid: f.date ?? null,
            /* The lead's plan, not the person's own word: it is theirs to say in their check-in. */
            explicit: false,
            status: 'UNKNOWN',
            source: 'PASTE',
            authorUserId: userId,
          },
        });
        return { confirmed: held, wrote: { table: 'GroundCommitment', id: made.id } };
      }
      case 'rule':
      default: {
        const made = await this.prisma.groundContextItem.create({
          select: { id: true },
          data: {
            groundId,
            kind: 'WAY_OF_WORKING' as any,
            text: held.says.slice(0, 400),
            saidAs: held.fromThePlan.slice(0, 600),
            audience: 'EVERYONE' as any,
            source: 'PASTE',
            authorUserId: userId,
          },
        });
        return { confirmed: held, wrote: { table: 'GroundContextItem', id: made.id } };
      }
    }
  }
}
