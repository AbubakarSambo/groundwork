import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { theGroundIsHere } from './the-ground-is-here';
import {
  Assertion,
  AssertionState,
  howItReads,
  theQuestionLeaks,
  whatTheOtherSideIsAsked,
  whereItStandsNow,
} from './an-assertion-waits-for-the-other-side';

/**
 * A CLAIM THAT IS WAITING ON THE OTHER SIDE.
 *
 * Small, because the asking already exists — the product has interviewed both
 * sides separately since the beginning. What was missing was the row, and the row
 * carries one rule that everything here is built around:
 *
 *   THE CLAIM NEVER LEAVES THE SIDE THAT MADE IT. Not in the question, not as
 *   context, not to be helpful. `whatIsWaitingOn` — the read a session uses to ask
 *   somebody something — cannot return a claim at all, because it does not select
 *   the column. That is the wall, rather than a note asking people to be careful.
 */
@Injectable()
export class AssertionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** One side said something. Nobody has asked the other yet. */
  async said(
    organizationId: string,
    groundId: string,
    a: { claim: string; about: string; by: string; theOtherSide: string },
  ) {
    if (!a?.claim?.trim() || !a?.about?.trim()) {
      throw new BadRequestException('An assertion needs what was said and what it is about.');
    }

    /* THE SUBJECT MUST NOT BE THE CLAIM WEARING A HAT.
       "Delta was approved" as a subject leaks in full the moment it is asked, and
       whoever writes it will not notice, because it reads like a subject. */
    const leaks = theQuestionLeaks(a.claim, a.about);
    if (leaks.length > 2) {
      throw new BadRequestException(
        `What this is about is too close to what was said, because it repeats ${leaks.slice(0, 3).map((w) => `“${w}”`).join(', ')}. `
        + 'The other side has to be asked something they could answer without having heard the claim.',
      );
    }

    await theGroundIsHere(this.prisma, groundId, organizationId);
    return this.prisma.assertion.create({
      data: { organizationId, groundId, ...a },
      select: { id: true, about: true, state: true },
    });
  }

  /**
   * WHAT TO ASK THE OTHER SIDE, AND THE CLAIM IS NOT IN IT.
   *
   * The select is the enforcement: this read cannot return `claim`, so nothing
   * downstream can put it in a question by accident.
   */
  async whatIsWaitingOn(organizationId: string, groundId: string, who: string) {
    const rows = await this.prisma.assertion.findMany({
      where: { organizationId, groundId, theOtherSide: who, state: 'said by one side' },
      select: { id: true, about: true, theOtherSide: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({ id: r.id, ask: whatTheOtherSideIsAsked(r.about) }));
  }

  /** Record that they were asked, with the question, so what it gave away can be checked later. */
  async asked(organizationId: string, groundId: string, assertionId: string, question: string) {
    const a = await this.prisma.assertion.findFirst({ where: { id: assertionId, organizationId, groundId } });
    if (!a) throw new NotFoundException('No such assertion.');

    /* The subject is what the other side is legitimately being asked about, so its
       words are not a leak. Everything in the claim beyond it is. */
    const leaks = theQuestionLeaks(a.claim, question, a.about);
    if (leaks.length) {
      throw new BadRequestException(
        `That question gives the claim away, because it uses ${leaks.slice(0, 3).map((w) => `“${w}”`).join(', ')}. `
        + 'Ask about the subject and let them answer freely; an answer to a leading question is worth nothing to either side.',
      );
    }

    return this.prisma.assertion.update({
      where: { id: assertionId },
      data: { asked: question, askedAt: new Date(), state: 'the other side has been asked' },
      select: { id: true, state: true },
    });
  }

  /**
   * Their own account, and whether it says the same thing.
   *
   * `theyAgree` comes from a PERSON. Deciding whether two accounts of an approval
   * agree is a judgement about meaning, and a model doing it quietly is a model
   * deciding which of two companies is right.
   */
  async answered(
    organizationId: string,
    groundId: string,
    assertionId: string,
    said: { theirAccount: string; theyAgree: boolean },
  ) {
    const row = await this.prisma.assertion.findFirst({ where: { id: assertionId, organizationId, groundId } });
    if (!row) throw new NotFoundException('No such assertion.');

    const updated = whereItStandsNow(this.asAssertion(row), said);
    const saved = await this.prisma.assertion.update({
      where: { id: assertionId },
      data: { theirAccount: said.theirAccount, answeredAt: new Date(), state: updated.state },
    });
    return { id: saved.id, state: saved.state, says: howItReads(this.asAssertion(saved)) };
  }

  /** Everything on this check-in, as it stands, in the words it should be read in. */
  async whereEverythingStands(organizationId: string, groundId: string) {
    const rows = await this.prisma.assertion.findMany({
      where: { organizationId, groundId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      state: r.state,
      says: howItReads(this.asAssertion(r)),
      /* Since when, because a claim nobody has put to the other side in three
         months is a different thing from one made this morning. */
      since: r.createdAt,
    }));
  }

  private asAssertion = (r: {
    claim: string; about: string; by: string; theOtherSide: string; state: string; theirAccount: string | null;
  }): Assertion => ({
    claim: r.claim,
    about: r.about,
    by: r.by,
    theOtherSide: r.theOtherSide,
    state: r.state as AssertionState,
    theirAccount: r.theirAccount,
  });
}
