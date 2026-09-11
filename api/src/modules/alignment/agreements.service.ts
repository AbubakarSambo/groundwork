import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { theGroundIsHere } from './the-ground-is-here';
import {
  AgreementVersion,
  whatWasInForce,
  whyThisCannotStart,
  theDayBefore,
} from './an-agreement-is-versioned-never-edited';
import {
  Term,
  TermState,
  WhatFor,
  howItReads,
  mayBe,
  whyItCannotBeUsedYet,
} from './a-term-is-not-true-because-a-model-read-it';
import {
  whereItStands,
  howItStands,
  mayBeJudgedAgainst,
  whyThisCannotGovern,
} from './an-amendment-is-not-a-conversation';
import { whyThisIsNotYoursToSay } from './who-may-speak-for-a-side';

/**
 * AN AGREEMENT, ITS VERSIONS, AND THE TERMS READ OUT OF THEM.
 *
 * The reasoning is in the two files beside this. This holds it against a database,
 * and its job is mostly to REFUSE things:
 *
 *   A version is never updated in place. There is no method here that changes what
 *   a version says, because the moment one exists, "what did the agreement say in
 *   July" stops having an answer.
 *
 *   A term read by a model is stored as a reading, and cannot be used to judge
 *   anything until both sides say that is what the clause says. `mayThisBeUsedTo`
 *   is how anything else asks, and it answers with a sentence rather than a
 *   silence.
 */
/*
 * EVERY METHOD TAKES THE GROUND, AND EVERY QUERY IS SCOPED BY IT.
 *
 * They were scoped by organisation alone while the routes all carried a `:groundId` — so the path
 * said one check-in and the query meant "any of them here", and a URL under check-in A could amend
 * an agreement belonging to check-in B. Nothing leaked across a tenant; what leaked was the shape
 * the URL promised. Mine, found auditing my own work.
 */
@Injectable()
export class AgreementsService {
  constructor(private readonly prisma: PrismaService) {}

  async start(organizationId: string, groundId: string, says: string, inForceFrom: Date) {
    await theGroundIsHere(this.prisma, groundId, organizationId);
    const agreement = await this.prisma.agreement.create({
      data: { organizationId, groundId, says },
    });
    const version = await this.prisma.agreementVersion.create({
      data: { agreementId: agreement.id, number: 1, inForceFrom, agreedBy: [] },
    });
    return { id: agreement.id, says, version: { id: version.id, number: 1, state: version.state } };
  }

  /**
   * WHO MAY SAY WHAT THE AGREEMENT IS.
   *
   * Not every write here is the same kind of act — see `who-may-speak-for-a-side.ts`. Recording a
   * figure is work; saying a version is signed binds the organisation to a reading of a contract.
   */
  private async mustBeAbleToSpeakForThisSide(organizationId: string, groundId: string, who: { userId: string; role: string }) {
    /* The initiator of a ground in THIS organisation. Read by id alone, an initiator elsewhere would do. */
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { initiatorId: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');

    const why = whyThisIsNotYoursToSay('speaking for this side', {
      userId: who.userId,
      role: who.role,
      initiatorId: ground.initiatorId,
    });
    if (why) throw new ForbiddenException(why);
  }

  /**
   * An amendment: the next version, starting on a day after the current one began.
   * The version it replaces is closed the day before, so no day has two answers
   * and no day has none.
   */
  async amend(organizationId: string, groundId: string, agreementId: string, inForceFrom: Date) {
    const agreement = await this.prisma.agreement.findFirst({
      where: { id: agreementId, organizationId, groundId },
      include: { versions: true },
    });
    if (!agreement) throw new NotFoundException('No such agreement.');

    const asVersions = agreement.versions.map(this.asVersion);
    const why = whyThisCannotStart(asVersions, inForceFrom);
    if (why) throw new BadRequestException(why);

    const highest = agreement.versions.reduce((a, b) => (b.number > a.number ? b : a));

    return this.prisma.$transaction(async (tx) => {
      const next = await tx.agreementVersion.create({
        data: {
          agreementId,
          number: highest.number + 1,
          inForceFrom,
          agreedBy: [],
        },
      });
      /* The one it replaces is closed, not changed. What it said stands. */
      await tx.agreementVersion.update({
        where: { id: highest.id },
        data: { inForceTo: theDayBefore(inForceFrom), state: highest.state === 'in force' ? 'replaced' : highest.state },
      });
      return { id: next.id, number: next.number, state: next.state };
    });
  }

  /**
   * A side says this is what they want. NOT the same as signed.
   *
   * People collapse these two constantly, and the difference is the whole argument
   * six months later: both sides agreeing to a change is not the change. See
   * `an-amendment-is-not-a-conversation.ts`.
   */
  async agreed(organizationId: string, groundId: string, versionId: string, who: string, by: { userId: string; role: string }) {
    await this.mustBeAbleToSpeakForThisSide(organizationId, groundId, by);

    const version = await this.prisma.agreementVersion.findFirst({
      where: { id: versionId, agreement: { organizationId, groundId } },
    });
    if (!version) throw new NotFoundException('No such version.');

    const agreedBy = [...new Set([...version.agreedBy, who])];
    return this.prisma.agreementVersion.update({
      where: { id: versionId },
      data: {
        agreedBy,
        /* Both sides, and it is agreed — not in force. Signing is its own moment
           and its own method. */
        state: agreedBy.length >= 2 && version.signedAt ? 'in force' : version.state,
      },
      select: { id: true, number: true, state: true, agreedBy: true, signedAt: true },
    });
  }

  /**
   * IT WAS SIGNED. A different moment from agreeing, and from governing anything.
   *
   * Signed is not in force: an amendment signed in October that starts in January
   * governs nothing in November. Where a version stands is worked out from its own
   * facts by `whereItStands`, so a row cannot sit in a standing its dates
   * contradict.
   */
  async signed(organizationId: string, groundId: string, versionId: string, said: string, by: { userId: string; role: string }, on?: Date) {
    await this.mustBeAbleToSpeakForThisSide(organizationId, groundId, by);

    const version = await this.prisma.agreementVersion.findFirst({
      where: { id: versionId, agreement: { organizationId, groundId } },
    });
    if (!version) throw new NotFoundException('No such version.');
    if (version.agreedBy.length < 2) {
      throw new BadRequestException(
        'Both sides have to say this is what they want before it can be recorded as signed.',
      );
    }

    const saved = await this.prisma.agreementVersion.update({
      where: { id: versionId },
      data: { signedAt: on ?? new Date(), signedSaid: said, state: 'in force' },
    });

    const standing = whereItStands(saved);
    return {
      id: saved.id,
      number: saved.number,
      standing,
      says: howItStands(standing, saved.inForceFrom),
    };
  }

  /** Where a version stands today, worked out rather than read off a column. */
  async standing(organizationId: string, groundId: string, versionId: string, on?: Date) {
    const version = await this.prisma.agreementVersion.findFirst({
      where: { id: versionId, agreement: { organizationId, groundId } },
    });
    if (!version) throw new NotFoundException('No such version.');

    const standing = whereItStands(version, on);
    return {
      standing,
      says: howItStands(standing, version.inForceFrom),
      mayBeJudgedAgainst: mayBeJudgedAgainst(standing),
      andWhyNot: whyThisCannotGovern(standing),
    };
  }

  /** What governed a given day, or why nothing did. */
  async inForceOn(organizationId: string, groundId: string, agreementId: string, on: Date) {
    const agreement = await this.prisma.agreement.findFirst({
      where: { id: agreementId, organizationId, groundId },
      include: { versions: { include: { terms: true } } },
    });
    if (!agreement) throw new NotFoundException('No such agreement.');

    const found = whatWasInForce(agreement.versions.map(this.asVersion), on);
    if ('none' in found) return { none: found.none };

    const version = agreement.versions.find((v) => v.id === found.version.id)!;
    return {
      version: { id: version.id, number: version.number, from: version.inForceFrom, to: version.inForceTo },
      terms: version.terms.map((t) => ({
        id: t.id,
        says: howItReads(this.asTerm(t)),
        /* Said out loud, because the whole point is that a reading is not a fact. */
        mayBeUsedToJudge: mayBe(this.asTerm(t), 'used to judge what happened'),
      })),
    };
  }

  /**
   * A term read out of the document. Arrives as a reading and nothing else, whether
   * a model read it or a person typed it — a person typing what they think a clause
   * says is still one side's reading.
   */
  async readTerm(
    organizationId: string,
    groundId: string,
    versionId: string,
    t: { says: string; reads: string; clause?: string },
  ) {
    const version = await this.prisma.agreementVersion.findFirst({
      where: { id: versionId, agreement: { organizationId, groundId } },
    });
    if (!version) throw new NotFoundException('No such version.');

    return this.prisma.agreementTerm.create({
      data: { versionId, says: t.says, reads: t.reads, clause: t.clause ?? null, checkedBy: [] },
      select: { id: true, says: true, state: true },
    });
  }

  /** Somebody who would know says the reading is right. Two sides, and it is agreed. */
  async checked(organizationId: string, groundId: string, termId: string, who: string, by: { userId: string; role: string }) {
    await this.mustBeAbleToSpeakForThisSide(organizationId, groundId, by);

    const term = await this.prisma.agreementTerm.findFirst({
      where: { id: termId, version: { agreement: { organizationId, groundId } } },
    });
    if (!term) throw new NotFoundException('No such term.');
    if (term.state === 'read differently by each side') {
      throw new BadRequestException(
        'The two sides read this clause differently. Settle what it says rather than adding a third reading.',
      );
    }

    const checkedBy = [...new Set([...term.checkedBy, who])];
    return this.prisma.agreementTerm.update({
      where: { id: termId },
      data: { checkedBy, state: checkedBy.length >= 2 ? 'agreed by both' : 'checked by one side' },
      select: { id: true, says: true, state: true, checkedBy: true },
    });
  }

  /**
   * Somebody reads the same clause differently.
   *
   * NOT A FAILURE — the most useful thing this product can find before it becomes
   * an argument about money. Both readings are kept, in both people's words.
   */
  async readsItDifferently(organizationId: string, groundId: string, termId: string, who: string, reads: string, by: { userId: string; role: string }) {
    await this.mustBeAbleToSpeakForThisSide(organizationId, groundId, by);

    const term = await this.prisma.agreementTerm.findFirst({
      where: { id: termId, version: { agreement: { organizationId, groundId } } },
    });
    if (!term) throw new NotFoundException('No such term.');

    const existing = (term.readDifferently as { by: string; reads: string }[] | null) ?? [];
    /* The reading already on the term is one side's, so it is kept as one of the
       two — otherwise the disagreement records only the objection. */
    const both = [
      ...(existing.length ? existing : term.checkedBy.map((by) => ({ by, reads: term.reads }))),
      { by: who, reads },
    ];

    return this.prisma.agreementTerm.update({
      where: { id: termId },
      data: { state: 'read differently by each side', readDifferently: both },
      select: { id: true, says: true, state: true, readDifferently: true },
    });
  }

  /**
   * MAY THIS TERM BE USED FOR THAT.
   *
   * The one door everything else knocks on. It answers with the reason where the
   * answer is no, because a refusal nobody sees is a feature that looks broken —
   * and this one has a fix somebody can carry out in a minute.
   */
  async mayThisBeUsedTo(organizationId: string, groundId: string, termId: string, what: WhatFor) {
    const term = await this.prisma.agreementTerm.findFirst({
      where: { id: termId, version: { agreement: { organizationId, groundId } } },
    });
    if (!term) throw new NotFoundException('No such term.');

    const asTerm = this.asTerm(term);
    const why = whyItCannotBeUsedYet(asTerm, what);
    return why === null ? { may: true as const } : { may: false as const, because: why };
  }

  private asVersion = (v: {
    id: string; number: number; state: string; inForceFrom: Date; inForceTo: Date | null; agreedBy: string[];
  }): AgreementVersion => ({
    id: v.id,
    number: v.number,
    state: v.state as AgreementVersion['state'],
    inForceFrom: v.inForceFrom,
    inForceTo: v.inForceTo,
    agreedBy: v.agreedBy,
  });

  private asTerm = (t: {
    says: string; reads: string; state: string; clause: string | null; checkedBy: string[]; readDifferently: unknown;
  }): Term => ({
    says: t.says,
    reads: t.reads,
    state: t.state as TermState,
    clause: t.clause,
    checkedBy: t.checkedBy,
    readDifferently: (t.readDifferently as Term['readDifferently']) ?? null,
  });
}
