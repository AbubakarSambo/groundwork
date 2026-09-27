import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssistantService } from '../assistant/assistant.service';
import { A_GROUND_IS_OVER } from '../grounds/a-ground-that-has-ended';

/**
 * ASK GROUNDWORK, IN THE PRODUCT (D1, U.14).
 *
 * The assistant already exists, and already answers one named person at a time: the developer
 * API's panel reaches it with a session for one person on the organisation's own list of people.
 * This is the same assistant, reached by somebody signed in to Groundwork itself. Nothing here
 * writes a word of what it says; every answer is `AssistantService.respond`'s, unchanged.
 *
 * WHAT THIS FILE DECIDES, AND NOTHING ELSE:
 *
 *   1. WHO IS ASKING. Always the signed-in person, matched to their own entry on the organisation's
 *      list of people. No route here takes anybody else's id to act for, and naming anybody else
 *      is refused before anything is read.
 *   2. WHO MAY READ THE QUESTIONS. Only the person who asked them. Not a lead, not an admin, not
 *      Groundwork's own staff. The questions and answers are never part of a check-in or a report.
 *   3. WHAT A YES MAY CONFIRM. The assistant already says a request back and waits for a yes before
 *      it does anything. A yes sent through `answer` is taken only for the one request that is still
 *      waiting, that belongs to the person answering. A stale yes, or somebody else's, does nothing.
 *   4. WHICH CHECK-IN IT IS ABOUT. Only one the person runs or takes part in, and not one that has
 *      ended. The assistant answers with the whole organisation in view (backend map, disagreement
 *      5); the check-in chosen is checked here, and is not yet read by the assistant (request 16).
 */

export const ONLY_YOURS = 'Only the person who asked these questions can read them.';
export const NOT_IN_IT = 'You are not part of this check-in.';
export const NOT_ON_THE_LIST =
  'Ask Groundwork can answer you once your organisation has connected its list of people to Groundwork.';
export const NOTHING_WAITING = 'There is nothing waiting for your yes. Ask again if you still want it done.';

/** The signed-in reader, as the controller hands them over. */
export interface Asker {
  userId: string;
  email: string;
  organizationId: string;
}

/** One question or answer, as the person who asked reads it back. Nothing else is served. */
export interface AskTurn {
  from: 'you' | 'groundwork';
  says: string;
  at: Date;
}

/** How many earlier questions and answers the panel opens on. */
const TURNS_SHOWN = 40;

@Injectable()
export class AskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assistant: AssistantService,
  ) {}

  /**
   * The asker's own entry on the organisation's list of people, or null.
   *
   * The entry linked to their account first. Failing that, an entry with their email that nobody
   * has claimed yet, the same match sign-in makes when it links them. An entry with their email
   * that is linked to a different account is somebody else's, and is never used.
   */
  private async whoIsAsking(asker: Asker): Promise<{ id: string; externalId: string } | null> {
    const linked = await this.prisma.person.findFirst({
      where: { organizationId: asker.organizationId, active: true, linkedUserId: asker.userId },
      select: { id: true, externalId: true },
    });
    if (linked) return linked;
    if (!asker.email) return null;
    return this.prisma.person.findFirst({
      where: {
        organizationId: asker.organizationId,
        active: true,
        linkedUserId: null,
        email: { equals: asker.email, mode: 'insensitive' },
      },
      select: { id: true, externalId: true },
    });
  }

  /** The check-ins Ask Groundwork may be about for this person: ones they run or take part in. */
  private async whatItMayBeAbout(asker: Asker): Promise<{ id: string; label: string }[]> {
    const grounds = await this.prisma.ground.findMany({
      where: {
        organizationId: asker.organizationId,
        status: { notIn: A_GROUND_IS_OVER },
        OR: [{ initiatorId: asker.userId }, { participants: { some: { userId: asker.userId } } }],
      },
      select: { id: true, label: true },
      orderBy: { createdAt: 'asc' },
    });
    return grounds.map((g) => ({ id: g.id, label: g.label }));
  }

  private refuseAnybodyElse(asker: Asker, askedFor: string | null) {
    if (askedFor && askedFor !== asker.userId) throw new ForbiddenException(ONLY_YOURS);
  }

  /**
   * What the panel opens on: the check-ins it may be about, whether it can answer this person, and
   * their own earlier questions and answers. Only ever the asker's.
   */
  async forReader(asker: Asker, askedFor: string | null) {
    this.refuseAnybodyElse(asker, askedFor);
    const [about, me] = await Promise.all([this.whatItMayBeAbout(asker), this.whoIsAsking(asker)]);
    if (!me) return { canAsk: false as const, about, turns: [] as AskTurn[] };

    const rows = await this.prisma.assistantTurn.findMany({
      where: { organizationId: asker.organizationId, personExternalId: me.externalId },
      select: { role: true, content: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: TURNS_SHOWN,
    });
    const turns: AskTurn[] = rows
      .reverse()
      .filter((r) => (r.content ?? '').trim())
      .map((r) => ({ from: r.role === 'person' ? 'you' : 'groundwork', says: r.content, at: r.createdAt }));
    return { canAsk: true as const, about, turns };
  }

  private async checkTheCheckIn(asker: Asker, groundId: string | undefined) {
    if (!groundId) return;
    const mine = await this.whatItMayBeAbout(asker);
    if (!mine.some((g) => g.id === groundId)) throw new ForbiddenException(NOT_IN_IT);
  }

  /** A question. The answer is the assistant's own, for the asker alone. */
  async ask(asker: Asker, input: { message: string; groundId?: string }) {
    await this.checkTheCheckIn(asker, input.groundId);
    const me = await this.whoIsAsking(asker);
    if (!me) throw new ForbiddenException(NOT_ON_THE_LIST);
    return this.assistant.respond(asker.organizationId, me.id, input.message);
  }

  /**
   * THE YES, OR THE NO, TO ONE REQUEST THAT WAS SAID BACK.
   *
   * Taken only when that request is the asker's own and is the one still waiting: the assistant
   * resolves the newest waiting request, so a yes meant for an older one, or for one that has since
   * been answered or dropped, must not reach it.
   */
  async answer(asker: Asker, input: { proposalId: string; answer: 'yes' | 'no' }) {
    const me = await this.whoIsAsking(asker);
    if (!me) throw new ForbiddenException(NOT_ON_THE_LIST);
    const waiting = await this.prisma.assistantProposal.findFirst({
      where: { organizationId: asker.organizationId, personExternalId: me.externalId, state: 'PARKED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, kind: true },
    });
    /* A document's question is who may read it, not yes or no, so a yes button cannot answer it. */
    if (!waiting || waiting.id !== input.proposalId || waiting.kind === 'document') {
      throw new ConflictException(NOTHING_WAITING);
    }
    return this.assistant.respond(asker.organizationId, me.id, input.answer);
  }
}
