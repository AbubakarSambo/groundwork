import { attachToASpendRequest } from './what-was-attached-to-a-spend-request';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveBoardService } from './the-leave-board.service';
import { SpendingService } from './the-spending.service';
import { SpendSaid, spendingSent, aReasonInASentence } from './spend-said-in-chat';
import { theLeaveRequestSent } from './leave-said-in-chat';

/**
 * A PERSON FILES THEIR OWN REQUEST FROM THE SUITE'S FORM (request 165; anchor pieces 26 and 27).
 *
 * When Groundwork offers a request inside a check-in and the person says yes, the button opens the suite's own form,
 * filled in with what they said. These are the two routes that form sends to, for the signed-in person only.
 *
 * NOTHING NEW IS DECIDED HERE. A form is another way of asking, so it goes through the same two writers the chat
 * uses (`LeaveBoardService.ask`, `SpendingService.ask`): the same checks, the same approver, the same refusals in the same
 * sentences, the same record of who did what, and the same message to whoever decides. The sentence the person reads
 * afterwards is the chat's own sentence, built by the same function.
 */
/** Said when the request was recorded and sent but the longer sentence about it could not be put together. It is true, and it says where to look. */
export const THE_REQUEST_WAS_SENT = 'Your request has been sent. You can see where it is under your requests.';

@Injectable()
export class ARequestFiledFromItsForm {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leave: LeaveBoardService,
    private readonly spend: SpendingService,
  ) {}

  async leaveRequest(reader: { userId: string; organizationId: string }, input: { startsOn: string; endsOn: string; kind?: string | null; standInUserId?: string | null }): Promise<{ id: string; says: string }> {
    const asked = {
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      ...(input.kind ? { kind: input.kind } : {}),
      ...(input.standInUserId ? { standInUserId: input.standInUserId } : {}),
    };
    const created = await this.leave.ask(reader.organizationId, reader.userId, asked);
    /* The request is on the approver's board by now. Failing to word it must not turn a sent request into a server fault the person would send again. */
    const says = await theLeaveRequestSent(this.prisma, reader, asked).catch(() => THE_REQUEST_WAS_SENT);
    return { id: (created as { id: string }).id, says };
  }

  /** A receipt or a proforma, attached by the person who asked, while the request waits (what-was-attached-to-a-spend-request.ts). */
  attachToSpending(reader: { userId: string; organizationId: string }, id: string, kind: unknown, file: any) {
    return attachToASpendRequest(this.prisma, reader, id, kind, file);
  }

  async spendingRequest(reader: { userId: string; organizationId: string }, input: { amount: number; what: string; category?: string | null }): Promise<{ id: string; says: string }> {
    /* The same read the chat makes before it says anything: the suite is on, the person is in it, and who would approve. */
    const facts = await this.spend.checkForChat(reader.organizationId, reader.userId, input.amount, new Date(), input.category ?? null);
    const created = await this.spend.ask(reader.organizationId, reader.userId, {
      amount: input.amount,
      what: input.what,
      ...(input.category ? { category: input.category } : {}),
    });
    let says = THE_REQUEST_WAS_SENT;
    try {
      const said: SpendSaid = { amount: input.amount, what: aReasonInASentence(input.what.trim()), currency: facts.currency };
      says = spendingSent(said, facts.currency, facts.approverFirstName);
    } catch { /* the request is sent; the plain sentence stands */ }
    return { id: (created as { id: string }).id, says };
  }
}
