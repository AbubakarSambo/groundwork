import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeService } from './knowledge.service';
import { mayPropose, mayDecide, keyFor } from './who-may-say-how-we-do-it';

/**
 * MAKING A DOCUMENT INTO "HOW WE DO IT HERE".
 *
 * The last gap in reading somebody's account against the company's own process: the process had to
 * exist as a `KnowledgeCard`, and the only way to make one was the machine API. So the whole thing
 * worked for a customer who had pushed their handbook in programmatically and for nobody else.
 *
 * A document uploaded to a check-in can now be proposed, an admin decides, and approving it puts it
 * where the check-in can see it - through the same `put` the machine API uses, so a card made this
 * way is versioned and effective-dated exactly like any other.
 */
@Injectable()
export class HowWeDoItService {
  private readonly logger = new Logger(HowWeDoItService.name);

  constructor(private prisma: PrismaService, private knowledge: KnowledgeService) {}

  /**
   * Ask that a document become how the company does something.
   *
   * The document has to be one on a check-in this person is actually in - proposing somebody
   * else's file would be a way to read a document you were never shown.
   */
  async propose(organizationId: string, userId: string, role: string, documentId: string) {
    const allowed = mayPropose(role);
    if (!allowed.may) throw new ForbiddenException(allowed.because);

    const doc = await this.prisma.groundDocument.findFirst({
      where: { id: documentId, ground: { organizationId } },
      select: { id: true, fileName: true, content: true, ground: { select: { id: true, initiatorId: true, participants: { select: { userId: true } } } } },
    });
    if (!doc) throw new NotFoundException('That document is not on a check-in here.');

    const inIt = doc.ground.initiatorId === userId || doc.ground.participants.some((p) => p.userId === userId);
    if (!inIt) throw new ForbiddenException('That document is on a check-in you are not part of.');
    /* Empty, not missing: `content` is non-nullable, so a document with nothing in it is a blank
       string. The audit spec catches the optional chain that would imply otherwise. */
    if (!doc.content.trim()) throw new BadRequestException('There is nothing readable in that document yet.');

    /* Asking twice is somebody wondering whether the first time worked. */
    const open = await this.prisma.knowledgeProposal.findFirst({
      where: { documentId, status: 'PENDING' },
      select: { id: true, createdAt: true },
    });
    if (open) return { proposed: true, at: open.createdAt, alreadyOpen: true };

    const row = await this.prisma.knowledgeProposal.create({
      data: { organizationId, documentId, proposedById: userId },
      select: { id: true, createdAt: true },
    });
    this.logger.log(`Document ${documentId} proposed as how-we-do-it for org ${organizationId}.`);
    return { proposed: true, at: row.createdAt, alreadyOpen: false, id: row.id };
  }

  /**
   * WHAT AN ADMIN HAS TO DECIDE, AND WHAT EVERYBODY CAN READ.
   *
   * Two lists in one answer on purpose. The approved cards are readable by anybody in the
   * organisation - a process people are held up against but cannot read is the same failure as a
   * hidden file, moved from the person to the document.
   */
  async list(organizationId: string, role: string) {
    const cards = await this.prisma.knowledgeCard.findMany({
      where: { organizationId, effectiveTo: null },
      orderBy: { title: 'asc' },
      select: { key: true, title: true, body: true, kind: true, effectiveFrom: true },
    });

    if (!mayDecide(role).may) return { cards, waiting: [] };

    const waiting = await this.prisma.knowledgeProposal.findMany({
      where: { organizationId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        createdAt: true,
        document: { select: { fileName: true, content: true } },
      },
    });

    return {
      cards,
      waiting: waiting.map((w) => ({
        id: w.id,
        fileName: w.document.fileName,
        /* Enough to decide on without opening it, and never the whole document in a list. */
        preview: w.document.content.trim().slice(0, 400),
        proposedAt: w.createdAt,
      })),
    };
  }

  /**
   * Approve one.
   *
   * Through `KnowledgeService.put`, which is the same door the machine API uses - so a card made
   * here supersedes an earlier version of itself, carries its effective dates, and behaves exactly
   * like one pushed by an integration. Two ways to make a card that behaved differently would be
   * the drift this product keeps fixing elsewhere.
   */
  async approve(organizationId: string, userId: string, role: string, proposalId: string) {
    const allowed = mayDecide(role);
    if (!allowed.may) throw new ForbiddenException(allowed.because);

    const p = await this.prisma.knowledgeProposal.findFirst({
      where: { id: proposalId, organizationId, status: 'PENDING' },
      select: { id: true, document: { select: { fileName: true, content: true } } },
    });
    if (!p) throw new NotFoundException('That is not waiting for a decision.');

    /* Through `ingestDocument`, the one way a document is read (S7): split into parts, summarised once and put on the
       Desk, like a document added there or through Ask. It used to be one whole card with no summary. */
    const key = keyFor(p.document.fileName);
    await this.knowledge.ingestDocument(organizationId, {
      key,
      kind: 'handbook',
      title: p.document.fileName.replace(/\.[a-z0-9]+$/i, ''),
      text: p.document.content,
      addedByUserId: userId,
    });

    await this.prisma.knowledgeProposal.update({
      where: { id: proposalId },
      data: { status: 'APPROVED', decidedById: userId, decidedAt: new Date(), cardKey: key },
    });
    return { approved: true, key };
  }

  /** Decline one, with a reason, because a decision with no reason reads as the product losing it. */
  async decline(organizationId: string, userId: string, role: string, proposalId: string, reason?: string) {
    const allowed = mayDecide(role);
    if (!allowed.may) throw new ForbiddenException(allowed.because);

    const { count } = await this.prisma.knowledgeProposal.updateMany({
      where: { id: proposalId, organizationId, status: 'PENDING' },
      data: {
        status: 'DECLINED',
        decidedById: userId,
        decidedAt: new Date(),
        declineReason: reason?.trim()?.slice(0, 500) || null,
      },
    });
    if (!count) throw new NotFoundException('That is not waiting for a decision.');
    return { declined: true };
  }
}
