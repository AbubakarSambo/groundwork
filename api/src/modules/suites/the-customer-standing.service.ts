import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { PromptsService } from '../prompts';
import { AnthropicService } from '../conversation/anthropic.service';
import { GroundworkEvents, type CheckInCompletedEvent } from '../../common/events';
import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';
import { isAGuestIn } from '../participants/a-guest-is-never-somebody-on-the-hosts-list';
import {
  CUSTOMER_STANDING_PROMPT,
  CUSTOMER_STANDING_PROMPT_KEY,
  CUSTOMER_STANDING_SCHEMA,
  theOneCustomer,
  whatMayBeKept,
} from './the-customer-standing';

/** The kind of work a sales check-in is, exactly as `Ground.kindOfWork` stores it. */
export const A_SALES_CHECK_IN = 'sales org';

/**
 * WRITES WHERE A CUSTOMER STANDS, ONCE, WHEN A SALES CHECK-IN COMPLETES (request 28, part a).
 *
 * WHAT COUNTS AS A SALES CHECK-IN: the ground's kind of work is "sales org" (the kind the lead's own words
 * and the brief gave it at setup, which the lead can change), and it is not an evaluation check-in (a
 * performance plan, a promotion or a renewal). Nothing else is read. A check-in with no kind of work is
 * not read, because guessing it is sales would put a customer's standing on a board out of a check-in
 * about something else.
 *
 * ONE MODEL STEP AT MOST, through the stored prompt (`customer_standing`; the stored version is the one
 * that runs and its id is written on the row), only on completion and never on opening a board. It reads
 * only the person's own words in their own check-in: never a report, never a question to Ask Groundwork,
 * never a lead's private note.
 *
 * Best effort, always: a failure here is never why a check-in did not complete.
 */
@Injectable()
export class CustomerStandingService {
  private readonly logger = new Logger(CustomerStandingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly prompts: PromptsService,
    private readonly anthropic: AnthropicService,
  ) {}

  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(e: CheckInCompletedEvent) {
    try {
      await this.write(e);
    } catch (err: any) {
      this.logger.warn(`Could not write where customers stand for check-in ${e?.checkInId}: ${err?.message ?? err}`);
    }
  }

  /** Returns how many rows it wrote. */
  async write(e: Pick<CheckInCompletedEvent, 'checkInId' | 'groundId' | 'participantId'>): Promise<number> {
    if (!e?.checkInId || !e.groundId || !e.participantId) return 0;
    const ground = await this.prisma.ground.findUnique({
      where: { id: e.groundId },
      select: { organizationId: true, scenario: true, kindOfWork: true },
    });
    if (!ground || ground.kindOfWork?.trim().toLowerCase() !== A_SALES_CHECK_IN || isEvaluationCheckIn(ground.scenario)) return 0;
    const org = ground.organizationId;

    const known = await this.prisma.subject.findMany({
      where: { organizationId: org, type: 'COUNTERPARTY' as any, sourceDeletedAt: null },
      select: { externalId: true, title: true },
    });
    const customers = known.filter((k) => k.title?.trim());
    if (!customers.length) return 0;

    const me = await this.prisma.groundParticipant.findUnique({
      where: { id: e.participantId },
      select: { userId: true, email: true, user: { select: { email: true } } },
    });
    /* A guest's words are never filed into the host's own record. */
    if (me?.user?.email && await isAGuestIn(this.prisma, org, { userId: me.userId, email: me.email, userEmail: me.user.email })) return 0;

    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId: e.checkInId, role: 'PERSON' as any },
      orderBy: { createdAt: 'asc' },
      select: { content: true },
    });
    const said = turns.map((t) => t.content).join('\n').trim();
    if (said.length < 40) return 0;

    const version = await this.prompts.getActive(CUSTOMER_STANDING_PROMPT_KEY).catch(() => null);
    const result = await this.anthropic.extract<{ customers: { customer: string; says: string }[] }>(
      version?.content ?? CUSTOMER_STANDING_PROMPT,
      [{ role: 'user', content: `THE CUSTOMERS WE KNOW:\n${customers.map((c) => `- ${c.title.trim()}`).join('\n')}\n\nTHEIR CHECK-IN:\n${said}` }],
      CUSTOMER_STANDING_SCHEMA,
    ).catch(() => null);
    if (!result?.customers?.length) return 0;

    const people = await this.prisma.person.findMany({
      where: { organizationId: org },
      select: { displayName: true, givenName: true, familyName: true },
    });
    const names = people.flatMap((p: any) => [p.displayName, p.givenName, p.familyName]).filter(Boolean) as string[];

    let written = 0;
    const done = new Set<string>();
    for (const item of result.customers) {
      const hit = theOneCustomer(item?.customer, customers);
      if (!hit || done.has(hit.externalId)) continue;
      const says = whatMayBeKept(item.says, said, names, hit.title);
      if (!says) continue;
      done.add(hit.externalId);

      /* The same words again (a retry of the same completion) are not a second row. */
      const latest = await this.prisma.customerStanding.findFirst({
        where: { organizationId: org, counterpartyExternalId: hit.externalId },
        orderBy: { createdAt: 'desc' },
        select: { says: true },
      });
      if (latest?.says === says) continue;

      await this.prisma.customerStanding.create({
        data: { organizationId: org, counterpartyExternalId: hit.externalId, says, promptVersionId: version?.id ?? null },
      });
      written++;
    }
    return written;
  }
}
