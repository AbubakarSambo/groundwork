import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { withoutBankDetails } from '../documents/bank-details-are-never-kept';
import { canSeeDocument } from '../documents/who-can-see-a-document';
import { whoThisNameIs, theNameWeUseFor } from '../documents/what-a-document-holds';
import { ONLY_WHO_ADDED_IT_CAN_SHARE_IT } from '../documents/write-a-documents-numbers';
import { whyItRefuses } from './a-ground-that-has-ended';
import { BoardService } from '../board/board.service';
import { asADirection, type TargetDirection } from '../board/an-aim-or-a-limit';
import { A_PLAN_PROMPT, A_PLAN_SCHEMA, proposalsFromAPlan, type PlanProposal, type PlanProposalFields, type PlanRead } from './a-plan-is-many-proposals';

interface StoredProposal {
  id: string; groundId: string; kind: string; says: string; fields: unknown; fromThePlan: string;
  fromDocument: string | null; status: string; editedAt: Date | null;
}

export type ServedProposal = PlanProposal & { status: string; editedAt: Date | null };

export const ONLY_THE_LEAD_READS_A_PLAN = 'Only the person who runs this check-in can turn a plan into proposals.';
export const ONLY_THE_LEAD_CONFIRMS = 'Only the person who runs this check-in can confirm what goes into it.';

/**
 * A PLAN, READ INTO PROPOSALS, AND ONE PROPOSAL CONFIRMED AT A TIME. See a-plan-is-many-proposals.
 *
 * `read` keeps each proposal as waiting (PlanProposal) and writes nothing else. `confirm` writes
 * exactly one thing, once, after checking the stored proposal again against its own quote. The lead's
 * only: every route refuses anybody else, so a participant never reads a proposal.
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
  private async theLeadsCheckIn(groundId: string, userId: string, refusal: string, opts: { evenIfItCannotTakeThings?: boolean } = {}) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        id: true, initiatorId: true, status: true, endState: true, scenario: true,
        participants: { select: { id: true, email: true, nameGiven: true, roleAsDescribed: true, managingOnly: true, userId: true, leftAt: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    if (ground.initiatorId !== userId) throw new ForbiddenException(refusal);
    const refused = opts.evenIfItCannotTakeThings ? null : whyItRefuses(ground.status, ground.endState, 'the lead', ground.scenario);
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
      const contextEnabled = this.config.get<boolean>('app.contextEnabled') === true;
      if (!doc || !canSeeDocument(doc as any, { participantId: mine, isLead: true }, contextEnabled)) {
        throw new NotFoundException('That document is not on this check-in.');
      }
      /* A private document becomes shared notes only by a yes from the person who added it (decision 92). Everyone on the check-in may read an open one. */
      const private_ = !contextEnabled || doc.visibility !== 'OPEN';
      if (private_ && doc.participantId !== mine) throw new ForbiddenException(ONLY_WHO_ADDED_IT_CAN_SHARE_IT);
      return { text: withoutBankDetails(doc.content ?? '') as string, from: doc.fileName, fromDocument: doc.fileName as string | null };
    }
    const text = withoutBankDetails((input.text ?? '').trim()) as string;
    return { text, from: 'the plan you pasted', fromDocument: null as string | null };
  }

  private people(ground: { participants: any[] }) {
    return ground.participants.filter((p) => !p.managingOnly && !p.leftAt);
  }

  private check(text: string, from: string, read: PlanRead[], people: any[], opts: { nameMustBeInThePlan?: boolean } = {}): PlanProposal[] {
    return proposalsFromAPlan(text, read, people.map((p) => ({ id: p.id, name: theNameWeUseFor(p) })), {
      from,
      nameMustBeInThePlan: opts.nameMustBeInThePlan,
      whoIs: (name) => {
        const who = whoThisNameIs(name, people);
        return who ? { id: who.id, name: theNameWeUseFor(who as any) } : null;
      },
    });
  }

  /**
   * A STORED PROPOSAL, CHECKED AGAIN AGAINST ITS OWN QUOTE, WITH THE PERSON FOUND AGAIN NOW.
   * Somebody added to the check-in since the plan was read is found; nothing the row says is taken
   * on trust. Null when it no longer holds.
   */
  private recheck(row: StoredProposal, people: any[], change?: { says?: string; fields?: Partial<PlanProposalFields> }): PlanProposal | null {
    const f = { ...((row.fields ?? {}) as any), ...(change?.fields ?? {}) } as Partial<PlanProposalFields>;
    const [held] = this.check(row.fromThePlan, row.fromDocument ?? '', [{
      kind: String(row.kind).toLowerCase(),
      says: change?.says ?? row.says,
      fromThePlan: row.fromThePlan,
      personName: f.personName ?? null,
      what: f.what ?? null,
      number: f.number ?? null,
      date: f.date ?? null,
    }], people, { nameMustBeInThePlan: false });
    return held ? { ...held, id: row.id } : null;
  }

  private served(row: StoredProposal, people: any[]): ServedProposal {
    const held = this.recheck(row, people);
    const base: PlanProposal = held ?? ({
      id: row.id, kind: String(row.kind).toLowerCase(), says: row.says, fields: row.fields, fromThePlan: row.fromThePlan,
      line: row.says, saidAs: row.fromThePlan, from: row.fromDocument ?? 'the plan you pasted',
    } as unknown as PlanProposal);
    return { ...base, status: row.status, editedAt: row.editedAt ?? null };
  }

  /** The lead's own stored proposal on this check-in, still waiting. */
  private async theWaitingOne(groundId: string, pid: string): Promise<StoredProposal> {
    const row = await this.prisma.planProposal.findFirst({ where: { id: pid, groundId } });
    if (!row) throw new NotFoundException('That proposal is not on this check-in.');
    if (row.status !== 'PENDING') {
      throw new BadRequestException(row.status === 'CONFIRMED' ? 'That one is already confirmed.' : 'You chose not now for that one, so it cannot be changed here.');
    }
    return row as StoredProposal;
  }

  /** Read a plan into proposals and keep each one as waiting. Nothing else is written. */
  async read(groundId: string, userId: string, input: { text?: string; documentId?: string }) {
    const ground = await this.theLeadsCheckIn(groundId, userId, ONLY_THE_LEAD_READS_A_PLAN);
    const { text, from, fromDocument } = await this.thePlanText(groundId, ground, userId, input ?? {});
    if (!text) throw new BadRequestException('Paste the plan, or choose a document, first.');
    if (text.length > 40_000) throw new BadRequestException('That plan is too long to read in one go. Paste one part of it at a time.');
    const got = await this.anthropic.extract<{ proposals?: PlanRead[] }>(A_PLAN_PROMPT, [{ role: 'user' as const, content: text }], A_PLAN_SCHEMA as any)
      .catch((err: any) => { this.logger.warn(`Reading a plan on ${groundId} failed: ${err?.message}`); return null; });
    if (!got) throw new BadRequestException('Groundwork could not read that plan just now. Please try again in a minute.');
    const checked = this.check(text, from, got.proposals ?? [], this.people(ground));
    const proposals: ServedProposal[] = [];
    for (const p of checked) {
      const row = await this.prisma.planProposal.create({
        data: {
          groundId,
          createdByUserId: userId,
          kind: p.kind.toUpperCase(),
          says: p.says,
          fields: p.fields as any,
          fromThePlan: p.fromThePlan,
          fromDocument,
          status: 'PENDING',
        },
      });
      proposals.push({ ...p, id: row.id, status: 'PENDING', editedAt: null });
    }
    return {
      proposals,
      says: proposals.length
        ? `That's ${proposals.length === 1 ? '1 thing' : `${proposals.length} things`} to confirm. Nothing goes into Context until you do.`
        : 'Groundwork found no goals, roles, commitments, rules, questions, decisions or dates in that plan that it could quote back to you.',
    };
  }

  /** "Waiting for you to confirm": the lead's proposals that are still waiting, oldest first. */
  async waiting(groundId: string, userId: string) {
    const ground = await this.theLeadsCheckIn(groundId, userId, ONLY_THE_LEAD_READS_A_PLAN, { evenIfItCannotTakeThings: true });
    const rows = await this.prisma.planProposal.findMany({ where: { groundId, status: 'PENDING' }, orderBy: { createdAt: 'asc' } });
    const people = this.people(ground);
    return { proposals: rows.map((r: any) => this.served(r, people)) };
  }

  /** Not now: kept, and off the waiting list. Nothing is written anywhere else. */
  async notNow(groundId: string, userId: string, pid: string) {
    const ground = await this.theLeadsCheckIn(groundId, userId, ONLY_THE_LEAD_CONFIRMS, { evenIfItCannotTakeThings: true });
    const row = await this.theWaitingOne(groundId, pid);
    const done = await this.prisma.planProposal.update({ where: { id: row.id }, data: { status: 'NOT_NOW', decidedAt: new Date(), decidedByUserId: userId } });
    return this.served(done as any, this.people(ground));
  }

  /**
   * Edit: the lead changes the sentence or the values, and it is checked again the same way. A number
   * or a date must still be in the plan's own words; a sentence the check would have to rewrite is
   * refused rather than silently changed. It stays waiting.
   */
  async edit(groundId: string, userId: string, pid: string, change: { says?: string; fields?: Partial<PlanProposalFields> }) {
    const ground = await this.theLeadsCheckIn(groundId, userId, ONLY_THE_LEAD_CONFIRMS);
    const row = await this.theWaitingOne(groundId, pid);
    const people = this.people(ground);
    const says = change?.says?.trim().replace(/\s+/g, ' ');
    const held = this.recheck(row, people, { says, fields: change?.fields ?? {} });
    if (!held) throw new BadRequestException('The number or the date is not in the plan\'s own words, so it was not changed.');
    if (says && held.says !== says) throw new BadRequestException('Write it as one full sentence, with only the numbers the plan says, and try again.');
    const { participantId, personOnTheCheckIn, ...fields } = held.fields;
    const saved = await this.prisma.planProposal.update({
      where: { id: row.id },
      data: { says: held.says, fields: { ...fields, ...(participantId ? { participantId, personOnTheCheckIn } : {}) } as any, editedAt: new Date() },
    });
    return this.served(saved as any, people);
  }

  /**
   * Confirm ONE stored proposal. It is checked again against its own quote, and the person in it is
   * found again on this side. Exactly one row is written, and the proposal remembers which.
   */
  async confirm(groundId: string, userId: string, pid: string, answer: { direction?: unknown } = {}) {
    const ground = await this.theLeadsCheckIn(groundId, userId, ONLY_THE_LEAD_CONFIRMS);
    const row = await this.theWaitingOne(groundId, pid);
    const held = this.recheck(row, this.people(ground));
    if (!held) throw new BadRequestException('That is not in the plan as written, so nothing was added.');
    const f = held.fields;
    if (f.personName && !f.participantId) {
      throw new BadRequestException(`${f.personName} is not on this check-in yet. Add them first, then confirm this.`);
    }
    /* Claimed before anything is written, so two confirms at once write one row, not two. */
    const claimed = await this.prisma.planProposal.updateMany({
      where: { id: row.id, status: 'PENDING' },
      data: { status: 'CONFIRMED', decidedAt: new Date(), decidedByUserId: userId },
    });
    if (!claimed?.count) throw new BadRequestException('That one is already confirmed.');
    let wrote: { table: string; id: string };
    try {
      wrote = await this.writeTheOne(groundId, userId, held, asADirection(answer?.direction));
    } catch (err) {
      await this.prisma.planProposal.update({ where: { id: row.id }, data: { status: 'PENDING', decidedAt: null, decidedByUserId: null } }).catch(() => undefined);
      throw err;
    }
    await this.prisma.planProposal.update({ where: { id: row.id }, data: { becameId: wrote.id } });
    return { confirmed: { ...held, status: 'CONFIRMED' }, wrote };
  }

  private async writeTheOne(groundId: string, userId: string, held: PlanProposal, direction: TargetDirection | null = null): Promise<{ table: string; id: string }> {
    const f = held.fields;
    switch (held.kind) {
      case 'goal': {
        /* The board's own writer: the lead only, a board that tracks targets, stamped with the round. */
        const board = this.moduleRef?.get(BoardService, { strict: false });
        if (!board) throw new BadRequestException('Targets cannot be added just now. Please try again in a minute.');
        /* Decision 69: the direction only as the lead answered the card's question; otherwise not set. */
        const made = await board.createObjective(groundId, userId, { name: f.what, target: f.number ?? null, ownerParticipantId: f.participantId ?? null, direction: f.number !== undefined ? direction : null });
        return { table: 'GroundObjective', id: made.id };
      }
      case 'role': {
        const made = await this.prisma.groundParticipant.update({ where: { id: f.participantId! }, data: { roleAsDescribed: f.what.slice(0, 300) }, select: { id: true } });
        return { table: 'GroundParticipant', id: made.id };
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
        return { table: 'GroundCommitment', id: made.id };
      }
      case 'question': {
        /* Kept with its exact sentence and NOT confirmed: it is only ever asked once the lead says yes to that sentence (decision of 28 September). */
        const made = await this.prisma.groundContextItem.create({
          select: { id: true },
          data: {
            groundId,
            kind: 'QUESTION_FOR_PERSON' as any,
            text: f.what.slice(0, 400),
            exactQuestion: f.what.slice(0, 400),
            saidAs: held.fromThePlan.slice(0, 600),
            audience: 'LEAD_ONLY' as any,
            aboutParticipantId: f.participantId ?? null,
            source: 'PASTE',
            authorUserId: userId,
          },
        });
        return { table: 'GroundContextItem', id: made.id };
      }
      case 'decision':
      case 'date': {
        const made = await this.prisma.groundContextItem.create({
          select: { id: true },
          data: {
            groundId,
            kind: (held.kind === 'decision' ? 'DECISION' : 'NOTE') as any,
            text: held.says.slice(0, 400),
            saidAs: held.fromThePlan.slice(0, 600),
            audience: 'EVERYONE' as any,
            source: 'PASTE',
            authorUserId: userId,
          },
        });
        return { table: 'GroundContextItem', id: made.id };
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
        return { table: 'GroundContextItem', id: made.id };
      }
    }
  }
}
