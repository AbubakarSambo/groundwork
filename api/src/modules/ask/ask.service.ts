import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssistantService } from '../assistant/assistant.service';
import { A_GROUND_IS_OVER } from '../grounds/a-ground-that-has-ended';
import { ReportsService } from '../reports/reports.service';
import { GroundsService } from '../grounds/grounds.service';
import { aGuestsOwnKey, isAGuestsKey } from '../assistant/a-guests-questions-are-kept-apart';
import { withoutBankDetails } from '../documents/bank-details-are-never-kept';
import { runsIt } from '../grounds/who-may-read-this-check-in';
import {
  A_GUEST_IN_MORE_THAN_ONE, A_GUEST_WITH_NO_CHECK_IN, NEEDS_THE_REPORT, TheReportAsServed,
  answerAGuest, fromTheServedReport, whichQuestion,
} from './a-guest-asks-only-about-their-own-check-in';

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
 *      list of people: the one linked to them, or one with their confirmed address that nobody has
 *      claimed, or a new one made for them on their first question. No route here takes anybody
 *      else's id to act for, and naming anybody else is refused before anything is read.
 *   2. WHO MAY READ THE QUESTIONS. Only the person who asked them. Not a lead, not an admin, not
 *      Groundwork's own staff. The questions and answers are never part of a check-in or a report.
 *   3. WHAT A YES MAY CONFIRM. The assistant already says a request back and waits for a yes before
 *      it does anything. A yes sent through `answer` is taken only for the one request that is still
 *      waiting, that belongs to the person answering. A stale yes, or somebody else's, does nothing.
 *   4. WHICH CHECK-IN IT IS ABOUT. Only one the person runs or takes part in, and not one that has
 *      ended. The assistant answers with the whole organisation in view (backend map, disagreement
 *      5); the check-in chosen is checked here, and is not yet read by the assistant (request 16).
 *   5. A GUEST FROM ANOTHER ORGANISATION (decision 36). Never handed to the assistant, never put on
 *      the list, and answered only about their own check-in, from the reads that check-in already
 *      serves them. See a-guest-asks-only-about-their-own-check-in.
 */

export const ONLY_YOURS = 'Only the person who asked these questions can read them.';
export const NOT_IN_IT = 'You are not part of this check-in.';
export const NOTHING_WAITING = 'There is nothing waiting for your yes. Ask again if you still want it done.';
export const SWITCHED_OFF =
  'Your organisation has switched off your place on its list of people, so Ask Groundwork cannot answer you. Ask an admin in your organisation to switch it back on.';
/* Only ever thrown now if the member path is reached by a guest, which the guest path stops first. */
export const A_GUEST_ASKS_IN_THEIR_CHECK_IN =
  'You are a guest here from another organisation, so Ask Groundwork answers you only about your own check-in.';
export const CONFIRM_YOUR_EMAIL =
  'Confirm your email address first, and then Ask Groundwork can answer you. Groundwork sent you a link to confirm it when you signed up.';

/** The source a Person made here is filed under, beside the directory's and the panel's. */
export const MADE_BY_GROUNDWORK = 'groundwork';

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
    /* Only a guest's answers read these, and only as that guest: see answerTheGuest. */
    private readonly reports: ReportsService,
    private readonly grounds: GroundsService,
  ) {}

  /**
   * WHERE THE ASKER STANDS ON THE ORGANISATION'S LIST OF PEOPLE. Read only; nothing is written here.
   *
   * Ask Groundwork answers one person on the organisation's list at a time, and only the directory
   * (SCIM) and the developer API's panel ever put anybody on it, so in an organisation that signed
   * up through the product almost everybody was refused: 64 of 3,162 people in the test database
   * had an entry. `standingOf` says which of five things is true, in this order:
   *
   *   guest       they are a guest here, from another organisation (their membership here is
   *               GUEST). Decision 36: a guest is never added to this organisation's list of people,
   *               so nothing is claimed or made, and nothing on the list is read for them. They are
   *               answered by answerTheGuest, only about their own check-in, and never by the
   *               assistant. Checked first, before any entry is looked at;
   *   linked      an active entry already linked to this account, in this organisation;
   *   switchedOff an entry in this organisation that has been switched off, linked to this account
   *               or carrying this address. Whoever the directory switched off does not get back in
   *               by asking, and no new entry is made for them;
   *   unconfirmed the address on this account has not been confirmed, so it cannot prove it owns an
   *               entry with that address. It never claims one, and nothing is made either: an
   *               entry made from an address nobody confirmed is the same claim by another route;
   *   claimable   an active entry in this organisation with this address that nobody has claimed;
   *   none        nothing yet, and one will be made.
   *
   * ONLY EVER THIS ORGANISATION. Every read carries `organizationId`, so an entry with the same
   * address in another organisation is never read, let alone claimed.
   */
  private async standingOf(asker: Asker): Promise<
    | { is: 'linked' | 'claimable'; person: { id: string; externalId: string } }
    | { is: 'guest' | 'switchedOff' | 'unconfirmed' | 'none' }
  > {
    const here = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: asker.userId, organizationId: asker.organizationId } },
      select: { role: true },
    });
    if (here?.role === 'GUEST') return { is: 'guest' };

    const linked = await this.prisma.person.findFirst({
      where: { organizationId: asker.organizationId, active: true, linkedUserId: asker.userId },
      select: { id: true, externalId: true },
    });
    if (linked) return { is: 'linked', person: linked };

    const byAddress = asker.email ? [{ email: { equals: asker.email, mode: 'insensitive' as const } }] : [];
    const switchedOff = await this.prisma.person.findFirst({
      where: { organizationId: asker.organizationId, active: false, OR: [{ linkedUserId: asker.userId }, ...byAddress] },
      select: { id: true },
    });
    if (switchedOff) return { is: 'switchedOff' };

    const user = await this.prisma.user.findUnique({ where: { id: asker.userId }, select: { isEmailVerified: true } });
    if (!user?.isEmailVerified) return { is: 'unconfirmed' };

    if (asker.email) {
      const unclaimed = await this.prisma.person.findFirst({
        where: { organizationId: asker.organizationId, active: true, linkedUserId: null, ...byAddress[0] },
        select: { id: true, externalId: true },
      });
      if (unclaimed) return { is: 'claimable', person: unclaimed };
    }
    return { is: 'none' };
  }

  /**
   * THE ASKER'S OWN ENTRY, CLAIMED OR MADE IF IT HAS TO BE. Only for a question or an answer; opening
   * the panel never writes (see forReader).
   *
   * A CLAIM IS CONDITIONAL. It links the entry only where it is still unclaimed, in one statement, so
   * two tabs asking at once cannot both take it; the one that loses reads back whichever entry is now
   * linked to this account.
   *
   * A NEW ENTRY is filed under Groundwork's own source with the account's id as its external id, never
   * the address: the embed looks people up by external id, and the panel uses addresses as external
   * ids, so an address here could collide with somebody the panel already knows. It carries the name
   * and address from the account and nothing else - no department, no manager. Two tabs making one at
   * once meet the unique key on (organisation, source, external id), and the second reads back the
   * first's.
   */
  private async whoIsAsking(asker: Asker): Promise<{ id: string; externalId: string }> {
    const standing = await this.standingOf(asker);
    if (standing.is === 'linked') return standing.person;
    if (standing.is === 'guest') throw new ForbiddenException(A_GUEST_ASKS_IN_THEIR_CHECK_IN);
    if (standing.is === 'switchedOff') throw new ForbiddenException(SWITCHED_OFF);
    if (standing.is === 'unconfirmed') throw new ForbiddenException(CONFIRM_YOUR_EMAIL);

    const nowLinked = () => this.prisma.person.findFirst({
      where: { organizationId: asker.organizationId, active: true, linkedUserId: asker.userId },
      select: { id: true, externalId: true },
    });

    if (standing.is === 'claimable') {
      const took = await this.prisma.person.updateMany({
        where: { id: standing.person.id, organizationId: asker.organizationId, active: true, linkedUserId: null },
        data: { linkedUserId: asker.userId },
      });
      if (took.count === 1) return standing.person;
      const mine = await nowLinked();
      if (mine) return mine;
      /* Claimed by somebody else between the read and the write. Theirs now; a new entry is made below. */
    }

    const user = await this.prisma.user.findUnique({
      where: { id: asker.userId },
      select: { firstName: true, lastName: true, email: true },
    });
    const givenName = user?.firstName?.trim() || null;
    const familyName = user?.lastName?.trim() || null;
    const email = user?.email ?? asker.email ?? null;
    try {
      return await this.prisma.person.create({
        data: {
          organizationId: asker.organizationId,
          sourceSystem: MADE_BY_GROUNDWORK,
          externalId: asker.userId,
          userName: email ?? asker.userId,
          displayName: [givenName, familyName].filter(Boolean).join(' ') || null,
          givenName,
          familyName,
          email,
          linkedUserId: asker.userId,
          active: true,
        },
        select: { id: true, externalId: true },
      });
    } catch (err: any) {
      /* P2002: the other tab made it first. Read theirs back rather than make a second. */
      const mine = await nowLinked();
      if (mine) return mine;
      throw err;
    }
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
    const [about, standing] = await Promise.all([this.whatItMayBeAbout(asker), this.standingOf(asker)]);
    /* Opening the panel writes nothing. A person with no entry yet can ask, and the entry is made on
       the first question; somebody who could not get one is told why, now, before they type. */
    /* A guest asks, about their own check-ins only, and reads back their own questions only. */
    if (standing.is === 'guest') return { canAsk: true as const, about, turns: await this.turnsKeptUnder(asker.organizationId, aGuestsOwnKey(asker.userId)) };
    if (standing.is === 'switchedOff') return { canAsk: false as const, why: SWITCHED_OFF, about, turns: [] as AskTurn[] };
    if (standing.is === 'unconfirmed') return { canAsk: false as const, why: CONFIRM_YOUR_EMAIL, about, turns: [] as AskTurn[] };
    if (!('person' in standing)) return { canAsk: true as const, about, turns: [] as AskTurn[] };
    const me = standing.person;
    /* An entry whose external id is a guest's key reads nothing under it. See a-guests-questions-are-kept-apart. */
    if (isAGuestsKey(me.externalId)) return { canAsk: true as const, about, turns: [] as AskTurn[] };
    return { canAsk: true as const, about, turns: await this.turnsKeptUnder(asker.organizationId, me.externalId) };
  }

  /** The questions and answers kept under one key, oldest first. The caller decides whose key it is. */
  private async turnsKeptUnder(organizationId: string, key: string): Promise<AskTurn[]> {
    const rows = await this.prisma.assistantTurn.findMany({
      where: { organizationId, personExternalId: key },
      select: { role: true, content: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: TURNS_SHOWN,
    });
    return rows
      .reverse()
      .filter((r) => (r.content ?? '').trim())
      .map((r) => ({ from: r.role === 'person' ? 'you' : 'groundwork', says: r.content, at: r.createdAt }));
  }

  private async isAGuest(asker: Asker): Promise<boolean> {
    const here = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: asker.userId, organizationId: asker.organizationId } },
      select: { role: true },
    });
    return here?.role === 'GUEST';
  }

  /**
   * A GUEST'S QUESTION, ANSWERED ONLY ABOUT THEIR OWN CHECK-IN (decision 36).
   *
   * Which check-in: the one chosen under About, which checkTheCheckIn has already held to one they
   * are in; or, if none was chosen, the only one they are in. The answer is built from two reads the
   * product already serves this guest, each called as this guest and nobody else: the check-in's
   * report as served to them, and their own check-ins on it. No entry on the list is looked up,
   * claimed or made, nothing is written to the host but the guest's own question and answer, and
   * those are kept under their own key, where only they read them back.
   */
  private async answerTheGuest(asker: Asker, input: { message: string; groundId?: string }) {
    const message = withoutBankDetails(input.message);
    const theirs = await this.whatItMayBeAbout(asker);
    const ground = input.groundId
      ? theirs.find((g) => g.id === input.groundId)
      : theirs.length === 1 ? theirs[0] : undefined;
    const question = whichQuestion(message);

    let reply;
    if (!ground) {
      reply = { blocks: [{ type: 'text' as const, body: theirs.length ? A_GUEST_IN_MORE_THAN_ONE : A_GUEST_WITH_NO_CHECK_IN }], composedBy: 'rules' as const, lane: 'guest_which_check_in' };
    } else if (question === 'next') {
      const mine = await this.grounds.getMyCheckinStatus(ground.id, asker.userId).catch(() => null);
      if (!mine) throw new ForbiddenException(NOT_IN_IT);
      reply = answerAGuest(question, ground.label, { checkIns: mine.checkIns as any[] });
    } else if (NEEDS_THE_REPORT[question]) {
      const mine = await this.grounds.getMyCheckinStatus(ground.id, asker.userId).catch(() => null);
      if (!mine) throw new ForbiddenException(NOT_IN_IT);
      let report: TheReportAsServed | null = null;
      try {
        report = fromTheServedReport(await this.reports.get(ground.id, asker.userId, asker.organizationId), mine.participantId);
      } catch (err) {
        /* No report yet is an answer. Being refused the report is not, and nothing is said around it. */
        if (err instanceof ForbiddenException) throw new ForbiddenException(NOT_IN_IT);
        if (!(err instanceof NotFoundException)) throw err;
      }
      reply = answerAGuest(question, ground.label, { report });
    } else {
      reply = answerAGuest(question, ground.label, {});
    }

    const said = reply.blocks.find((b) => b.type === 'text') as { body?: string } | undefined;
    const key = aGuestsOwnKey(asker.userId);
    await this.prisma.assistantTurn.createMany({
      data: [
        { organizationId: asker.organizationId, personExternalId: key, role: 'person', content: message },
        { organizationId: asker.organizationId, personExternalId: key, role: 'assistant', content: said?.body ?? '', lane: reply.lane, composedBy: reply.composedBy },
      ],
    }).catch(() => undefined);
    return reply;
  }

  /**
   * A ground the asker leads or takes part in, OR one an admin of this organisation runs (decision
   * 50: the same permission the context chat uses, checked with `runsIt`, the shared function behind
   * its own guard - not a second copy of "lead or admin"). An ordinary member reading a board never
   * gets an admin's reach here; `runsIt` is the write gate for setting a check-in up, not a read one.
   */
  private async checkTheCheckIn(asker: Asker, groundId: string | undefined) {
    if (!groundId) return;
    const mine = await this.whatItMayBeAbout(asker);
    if (mine.some((g) => g.id === groundId)) return;
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId: asker.organizationId, status: { notIn: A_GROUND_IS_OVER } },
      select: { organizationId: true, initiatorId: true, scenario: true, createdByUserId: true, participants: { select: { userId: true } } },
    });
    if (ground) {
      const viewer = await this.prisma.user.findUnique({ where: { id: asker.userId }, select: { role: true, organizationId: true } });
      if (runsIt(asker.userId, viewer, ground)) return;
    }
    throw new ForbiddenException(NOT_IN_IT);
  }

  /**
   * A question. The answer is the assistant's own, for the asker alone.
   *
   * `openedFrom: 'check_in_setup'` (decision 65) is the screen telling Ask Groundwork which check-in
   * it was opened from, so the setup conversation can start without the word "context". It only ever
   * does anything together with `groundId`, and only for somebody who may confirm setup on THAT
   * check-in - the same rule decision 63 already gives every other setup door
   * (GroundsService.mayOpenSetupChatFor, which is `mayConfirmSetupOn` asked without throwing). A
   * guest, a participant, or the lead's own message with no `groundId`, is answered exactly as
   * before: `openedFrom` is read, found not to apply, and quietly ignored - never refused.
   */
  async ask(asker: Asker, input: { message: string; groundId?: string; openedFrom?: 'check_in_setup' }) {
    await this.checkTheCheckIn(asker, input.groundId);
    if (await this.isAGuest(asker)) return this.answerTheGuest(asker, input);
    const me = await this.whoIsAsking(asker);
    if (input.openedFrom === 'check_in_setup' && input.groundId) {
      const may = await this.grounds.mayOpenSetupChatFor(input.groundId, asker.userId, asker.organizationId);
      if (may) return this.assistant.respond(asker.organizationId, me.id, input.message, input.groundId, true);
    }
    /* `groundId` is read only by the `add_context` lane - see AssistantService.respond. */
    return this.assistant.respond(asker.organizationId, me.id, input.message, input.groundId);
  }

  /**
   * THE YES, OR THE NO, TO ONE REQUEST THAT WAS SAID BACK.
   *
   * Taken only when that request is the asker's own and is the one still waiting: the assistant
   * resolves the newest waiting request, so a yes meant for an older one, or for one that has since
   * been answered or dropped, must not reach it.
   */
  async answer(asker: Asker, input: { proposalId: string; answer: 'yes' | 'no' }) {
    /* Nothing is ever said back to a guest for a yes, so there is never anything waiting for one. */
    if (await this.isAGuest(asker)) throw new ConflictException(NOTHING_WAITING);
    const me = await this.whoIsAsking(asker);
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
