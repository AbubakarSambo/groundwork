import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Obligation,
  ObligationState,
  whatThisIsEvidenceOf,
  whyThisCannotFollow,
  whyThisCannotBeAnObligation,
  asItStandsToday,
} from './an-obligation-is-not-evidence-of-itself';

/**
 * OBLIGATIONS, AND EVERY REFUSAL THAT KEEPS A LIST OF THEM FROM BEING A LIST OF
 * ALLEGED FAILURES.
 *
 * Three, and each one is a different way the same accident happens:
 *
 *   AN OBLIGATION ONLY COMES FROM A TERM BOTH SIDES AGREED THE READING OF.
 *   Otherwise it is a duty derived from one side's reading of a clause, and the
 *   side who wrote it would never know that is what they had done.
 *
 *   A STATE ONLY MOVES WHERE THE STATE MACHINE ALLOWS. Nothing may jump to "they
 *   say it was not done" without somebody having been asked, because the only way
 *   this record holds a thing as not done is the responsible side saying so.
 *
 *   EVERY READ CARRIES WHAT IT IS EVIDENCE OF. A list of obligations with nothing
 *   shown against them WILL be read as a list of failures unless each row says, in
 *   the row, that it is not one.
 */
@Injectable()
export class ObligationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** From a term, and only from one both sides agreed the reading of. */
  async from(
    organizationId: string,
    groundId: string,
    termId: string,
    o: { says: string; whose: string; dueOn?: Date },
  ) {
    const term = await this.prisma.agreementTerm.findFirst({
      where: { id: termId, version: { agreement: { organizationId, groundId } } },
      select: { id: true, state: true, says: true },
    });
    if (!term) throw new NotFoundException('No such term on this check-in.');

    const why = whyThisCannotBeAnObligation(term.state);
    if (why) throw new BadRequestException(why);

    const saved = await this.prisma.obligation.create({
      data: {
        organizationId,
        groundId,
        termId,
        says: o.says,
        whose: o.whose,
        dueOn: o.dueOn ?? null,
        /* Due only when its day has come. An obligation created already "due" is
           one nobody has had the chance to do. */
        state: o.dueOn && o.dueOn > new Date() ? 'not due yet' : 'due, nobody has been asked',
        accounts: [],
      },
    });
    return { id: saved.id, state: saved.state, says: whatThisIsEvidenceOf(this.asObligation(saved)) };
  }

  /** Somebody was asked about it, in their own check-in. */
  async asked(organizationId: string, obligationId: string) {
    return this.moveTo(organizationId, obligationId, 'asked, no answer yet');
  }

  /**
   * What somebody said about it, in their words, and where that puts it.
   *
   * `theyDid` comes from the person answering — a claim about whether an
   * obligation was met is theirs to make, and a model reading an answer and
   * deciding is a model deciding whether a company kept its contract.
   */
  async accountOf(
    organizationId: string,
    obligationId: string,
    account: { by: string; said: string; theyDid: boolean | null },
  ) {
    const row = await this.prisma.obligation.findFirst({ where: { id: obligationId, organizationId } });
    if (!row) throw new NotFoundException('No such obligation.');

    const accounts = [...((row.accounts as { by: string; said: string }[]) ?? []), { by: account.by, said: account.said }];
    /* Today's standing, not the column's — "not due yet" is a statement about the
       calendar and calendars move. See `asItStandsToday`. */
    const from = asItStandsToday({ state: row.state as ObligationState, dueOn: row.dueOn });

    /* Both sides having said it was done is the only state that closes anything,
       and it needs two different people to have said so. */
    const said = accounts.filter((a) => a.by !== account.by).length > 0;
    const to: ObligationState =
      account.theyDid === true
        ? said && from === 'they say it was done'
          ? 'both sides say it was done'
          : 'they say it was done'
        : account.theyDid === false
          ? 'they say it was not done'
          : 'nothing has been shown either way';

    const why = whyThisCannotFollow(from, to);
    if (why) throw new BadRequestException(why);

    const saved = await this.prisma.obligation.update({
      where: { id: obligationId },
      data: { state: to, accounts },
    });
    return { id: saved.id, state: saved.state, says: whatThisIsEvidenceOf(this.asObligation(saved)) };
  }

  /** Nobody answered and nothing was shown. Not a claim about anybody. */
  async nothingShown(organizationId: string, obligationId: string) {
    return this.moveTo(organizationId, obligationId, 'nothing has been shown either way');
  }

  /**
   * Everything on this check-in, each row carrying what it is evidence of.
   *
   * The `says` is not decoration and must not be dropped by a caller looking for a
   * tidier payload: a list of obligations without it reads as a list of failures
   * within about a second.
   */
  async whereEverythingStands(organizationId: string, groundId: string) {
    const rows = await this.prisma.obligation.findMany({
      where: { organizationId, groundId },
      orderBy: [{ dueOn: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      whose: r.whose,
      what: r.says,
      dueOn: r.dueOn,
      state: asItStandsToday({ state: r.state as ObligationState, dueOn: r.dueOn }),
      says: whatThisIsEvidenceOf(this.asObligation(r)),
    }));
  }

  private async moveTo(organizationId: string, obligationId: string, to: ObligationState) {
    const row = await this.prisma.obligation.findFirst({ where: { id: obligationId, organizationId } });
    if (!row) throw new NotFoundException('No such obligation.');

    const why = whyThisCannotFollow(asItStandsToday({ state: row.state as ObligationState, dueOn: row.dueOn }), to);
    if (why) throw new BadRequestException(why);

    const saved = await this.prisma.obligation.update({ where: { id: obligationId }, data: { state: to } });
    return { id: saved.id, state: saved.state, says: whatThisIsEvidenceOf(this.asObligation(saved)) };
  }

  private asObligation = (r: {
    says: string; whose: string; termId: string; dueOn: Date | null; state: string; accounts: unknown;
  }): Obligation => ({
    says: r.says,
    whose: r.whose,
    fromTerm: r.termId,
    dueOn: r.dueOn,
    state: asItStandsToday({ state: r.state as ObligationState, dueOn: r.dueOn }),
    accounts: (r.accounts as { by: string; said: string }[]) ?? [],
  });
}
