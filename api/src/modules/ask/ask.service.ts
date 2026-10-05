import { askName, askNameOf, askFirstWelcome, ASK_CAPTION, ASK_ADD_LINE, askStarters } from '../assistant/ask-name';
import { contextIsInAskGroundwork } from '../admin/what-is-hidden-at-release';
import { whatWasSaid } from '../assistant/what-was-said-is-what-is-kept';
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
  A_GUEST_IN_MORE_THAN_ONE, A_GUEST_WITH_NO_CHECK_IN, NEEDS_THE_REPORT, TheReportAsServed, TheirOwnCommitment,
  NOTHING_OF_THEIRS_TO_CHANGE, answerAGuest, fromTheServedReport, readAGuestsTick, whatTheCheckInIsFor, whatTheySaid,
  whatTheyShouldDoNext, whichQuestion, whoReadsWhatTheySay,
} from './a-guest-asks-only-about-their-own-check-in';
import { whatAParticipantIsToldAboutThis } from '../grounds/what-a-participant-is-told-about-this';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { whichToDo } from '../assistant/a-to-do-is-yours';
import { Reply, rules, text as aTextBlock } from '../assistant/a-reply-is-a-payload-not-a-string';
import {
  AMove, ATick, NOTHING_WAS_CHANGED, moveDone, moveProposal, readAMove, readTheDay, thereIsNoMoveToRead, tickDone, tickProposal,
} from '../assistant/a-change-said-back-first';

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
export const SWITCHED_OFF = (ask: string = askName(null)) =>
  `Your organisation has switched off your place on its list of people, so ${ask} cannot answer you. Ask an admin in your organisation to switch it back on.`;
/* Only ever thrown now if the member path is reached by a guest, which the guest path stops first. */
export const A_GUEST_ASKS_IN_THEIR_CHECK_IN = (ask: string = askName(null)) =>
  `You are a guest here from another organisation, so ${ask} answers you only about your own check-in.`;
export const CONFIRM_YOUR_EMAIL = (ask: string = askName(null)) =>
  `Confirm your email address first, and then ${ask} can answer you. Groundwork sent you a link to confirm it when you signed up.`;

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
    if (standing.is === 'guest') throw new ForbiddenException(A_GUEST_ASKS_IN_THEIR_CHECK_IN(await askNameOf(this.prisma, asker.organizationId)));
    if (standing.is === 'switchedOff') throw new ForbiddenException(SWITCHED_OFF(await askNameOf(this.prisma, asker.organizationId)));
    if (standing.is === 'unconfirmed') throw new ForbiddenException(CONFIRM_YOUR_EMAIL(await askNameOf(this.prisma, asker.organizationId)));

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
    const shown = await this.forReaderBare(asker, askedFor);
    /* Ask is named for the organisation (decision 100). The first time somebody opens it, with no
       questions kept yet, it says what it can do; once they have asked, it does not say it again. */
    let organisationName: string | null = null;
    try { organisationName = (await this.prisma.organization.findUnique({ where: { id: asker.organizationId }, select: { name: true } }))?.name ?? null; } catch { organisationName = null; }
    const name = askName(organisationName);
    const contextIsHere = await contextIsInAskGroundwork(this.prisma);
    const welcome = shown.canAsk && shown.turns.length === 0 ? askFirstWelcome(organisationName, contextIsHere) : null;
    return { ...shown, askName: name, caption: ASK_CAPTION, addLine: contextIsHere ? ASK_ADD_LINE : null, welcome, starters: askStarters((shown.about ?? []).length > 0, contextIsHere) };
  }

  private async forReaderBare(asker: Asker, askedFor: string | null) {
    this.refuseAnybodyElse(asker, askedFor);
    const [about, standing] = await Promise.all([this.whatItMayBeAbout(asker), this.standingOf(asker)]);
    const ask = await askNameOf(this.prisma, asker.organizationId);
    /* Opening the panel writes nothing. A person with no entry yet can ask, and the entry is made on
       the first question; somebody who could not get one is told why, now, before they type. */
    /* A guest asks, about their own check-ins only, and reads back their own questions only. */
    if (standing.is === 'guest') return { canAsk: true as const, about, turns: await this.turnsKeptUnder(asker.organizationId, aGuestsOwnKey(asker.userId)) };
    if (standing.is === 'switchedOff') return { canAsk: false as const, why: SWITCHED_OFF(ask), about, turns: [] as AskTurn[] };
    if (standing.is === 'unconfirmed') return { canAsk: false as const, why: CONFIRM_YOUR_EMAIL(ask), about, turns: [] as AskTurn[] };
    if (!('person' in standing)) return { canAsk: true as const, about, turns: [] as AskTurn[] };
    const me = standing.person;
    /* An entry whose external id is a guest's key reads nothing under it. See a-guests-questions-are-kept-apart. */
    if (isAGuestsKey(me.externalId)) return { canAsk: true as const, about, turns: [] as AskTurn[] };
    return { canAsk: true as const, about, turns: await this.turnsKeptUnder(asker.organizationId, me.externalId) };
  }

  /**
   * The questions and answers kept under one key, oldest first. The caller decides whose key it is.
   *
   * A QUESTION AND ITS ANSWER OFTEN SHARE A TIMESTAMP, AND THEN THE ORDER WAS LUCK (request 154,
   * item 2: "each answer comes before its question"). Both rows are written in the same moment, so
   * `createdAt` is equal and the database may return them either way round; reversing a descending
   * read then puts the answer first as often as not, and the history reads backwards.
   *
   * There is no sequence column to fall back on - the id is a uuid, which sorts randomly - so the
   * tie is broken on what the rows mean: inside one instant a person's question comes before
   * Groundwork's answer. Sorted in code rather than in SQL, because the rule is about role and not
   * about any column the database can order by.
   */
  private async turnsKeptUnder(organizationId: string, key: string): Promise<AskTurn[]> {
    const rows = await this.prisma.assistantTurn.findMany({
      where: { organizationId, personExternalId: key },
      select: { role: true, content: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: TURNS_SHOWN,
    });
    const askedFirst = (r: { role: string }) => (r.role === 'person' ? 0 : 1);
    return rows
      .filter((r) => (r.content ?? '').trim())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || askedFirst(a) - askedFirst(b))
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
    /* Whatever was waiting for a yes is over once something else is asked: a stale yes can never fire. */
    await this.prisma.assistantProposal.updateMany({
      where: { organizationId: asker.organizationId, personExternalId: aGuestsOwnKey(asker.userId), state: 'PARKED' },
      data: { state: 'DROPPED', resolvedAt: new Date() },
    });

    let reply: any;
    if (!ground) {
      reply = { blocks: [{ type: 'text' as const, body: theirs.length ? A_GUEST_IN_MORE_THAN_ONE : A_GUEST_WITH_NO_CHECK_IN(await askNameOf(this.prisma, asker.organizationId)) }], composedBy: 'rules' as const, lane: 'guest_which_check_in' };
    } else if (['said', 'purpose', 'who_reads', 'next_step', 'done', 'move'].includes(question)) {
      reply = await this.answerWithinTheirOwnWork(asker, ground, question, message);
    } else if (question === 'next') {
      const mine = await this.grounds.getMyCheckinStatus(ground.id, asker.userId).catch(() => null);
      if (!mine) throw new ForbiddenException(NOT_IN_IT);
      reply = answerAGuest(question, ground.label, { checkIns: mine.checkIns as any[] }, new Date(), await askNameOf(this.prisma, asker.organizationId));
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
      reply = answerAGuest(question, ground.label, { report }, new Date(), await askNameOf(this.prisma, asker.organizationId));
    } else {
      reply = answerAGuest(question, ground.label, {}, new Date(), await askNameOf(this.prisma, asker.organizationId));
    }

    const key = aGuestsOwnKey(asker.userId);
    await this.prisma.assistantTurn.createMany({
      data: [
        { organizationId: asker.organizationId, personExternalId: key, role: 'person', content: message },
        { organizationId: asker.organizationId, personExternalId: key, role: 'assistant', content: whatWasSaid(reply), lane: reply.lane, composedBy: reply.composedBy },
      ],
    }).catch(() => undefined);
    return reply;
  }

  /**
   * THE SIX THINGS A GUEST MAY ASK ABOUT THEIR OWN WORK IN THEIR OWN CHECK-IN (week 24).
   *
   * Every read here carries this guest's own participant id, found from their own account by
   * `getMyCheckinStatus`, which refuses anybody who is not a party to the check-in. Nothing is read
   * by the check-in alone: their own record lines, their own commitments, and the check-in's own
   * description as a participant is told it. A change is parked as a question and written only by
   * `answerTheGuestsYes`.
   */
  private async answerWithinTheirOwnWork(asker: Asker, ground: { id: string; label: string }, question: string, message: string): Promise<Reply> {
    const mine = await this.grounds.getMyCheckinStatus(ground.id, asker.userId).catch(() => null);
    if (!mine) throw new ForbiddenException(NOT_IN_IT);
    const participantId: string = mine.participantId;

    if (question === 'said') {
      const ids = (mine.checkIns as any[]).map((c) => c.id).filter(Boolean);
      const rows = ids.length
        ? await this.prisma.recordEntry.findMany({
          where: { participantId, disputedAt: null, checkInId: { in: ids } },
          select: { text: true },
          orderBy: { createdAt: 'asc' },
          take: 12,
        })
        : [];
      /* A line the product only inferred is not something they said. */
      const lines = rows.filter((r) => !/\[INFERRED/i.test(r.text ?? '')).map((r) => cleanText(r.text ?? '').trim()).filter(Boolean);
      return whatTheySaid(ground.label, lines);
    }

    if (question === 'purpose' || question === 'who_reads') {
      const g: any = await this.prisma.ground.findUnique({ where: { id: ground.id }, select: { brief: true, toldToParticipants: true, scenario: true } });
      if (question === 'who_reads') return whoReadsWhatTheySay(ground.label, g?.scenario ?? null, await askNameOf(this.prisma, asker.organizationId));
      return whatTheCheckInIsFor(ground.label, whatAParticipantIsToldAboutThis(g?.brief ?? null, [], { told: g?.toldToParticipants ?? null, readerParticipantId: participantId, scenario: g?.scenario ?? null }));
    }

    const own = await this.theirOwnOpenCommitments(ground.id, participantId);
    if (question === 'next_step') return whatTheyShouldDoNext(ground.label, own);

    /* A change to their own commitment: said back, and nothing written until a yes. */
    const lane = question === 'move' ? 'guest_move' : 'guest_done';
    const said = question === 'move' ? readAMove(message)!.what : readAGuestsTick(message)!;
    if (!own.length) return rules(lane, aTextBlock(NOTHING_OF_THEIRS_TO_CHANGE(ground.label)));
    const which = whichToDo(said, own.map((c) => ({ ...c, id: c.id })));
    if ('none' in which) {
      return rules(lane, aTextBlock(`Nothing you said you would do in ${ground.label} reads like "${said}". Say part of the words of the commitment you mean.`));
    }
    if ('several' in which) {
      return rules(lane, aTextBlock(`More than one of these could be it. Which?\n${which.several.map((t) => `- ${t.text}`).join('\n')}`));
    }
    const one = which.one as TheirOwnCommitment;
    let proposal: AMove | ATick;
    let summary: string;
    let kind: 'guest_move' | 'guest_tick';
    if (question === 'move') {
      const m = readAMove(message)!;
      const day = readTheDay(m.whenSaid, new Date());
      if ('ask' in day) return rules(lane, aTextBlock(day.ask));
      const move: AMove = {
        commitmentId: one.id, text: one.text, ownerExternalId: '', ownerFirstName: null,
        was: { at: one.dueAt ? one.dueAt.toISOString() : null, said: one.dueAt ? null : one.dueSaid },
        toISO: day.date.toISOString(), toSaid: m.whenSaid,
      };
      proposal = move; summary = moveProposal(move); kind = 'guest_move';
    } else {
      const tick: ATick = { kind: 'commitment', id: one.id, text: one.text };
      proposal = tick; summary = tickProposal(tick); kind = 'guest_tick';
    }
    const parked = await this.prisma.assistantProposal.create({
      data: {
        organizationId: asker.organizationId, personExternalId: aGuestsOwnKey(asker.userId), kind, summary,
        payload: { groundId: ground.id, participantId, objectiveId: one.id, change: proposal } as any,
      },
    });
    return { lane, composedBy: 'rules', blocks: [aTextBlock(summary), { type: 'proposal', proposalId: parked.id, summary }] } as Reply;
  }

  /** What this guest said they would do in this check-in, and has not finished. Their own, only. */
  private async theirOwnOpenCommitments(groundId: string, participantId: string): Promise<TheirOwnCommitment[]> {
    const rows: any[] = await this.prisma.personObjective.findMany({
      where: { groundId, participantId, status: 'OPEN', authoredBy: 'self', kind: { in: ['TODO', 'COMMITMENT'] } },
      select: { id: true, text: true, dueSaid: true, dueDate: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({ id: r.id, text: r.text, dueSaid: r.dueSaid ?? null, dueAt: r.dueDate ?? null, statedAt: r.createdAt }));
  }

  /**
   * THE YES, OR THE NO, FROM A GUEST. Taken only for the guest's own newest waiting question, and the
   * write is checked again now: they are still in the check-in, it is still open, and the commitment
   * is still theirs and still open. Otherwise nothing is written, and they are told so.
   */
  private async answerTheGuestsYes(asker: Asker, input: { proposalId: string; answer: 'yes' | 'no' }) {
    const key = aGuestsOwnKey(asker.userId);
    const waiting: any = await this.prisma.assistantProposal.findFirst({
      where: { organizationId: asker.organizationId, personExternalId: key, state: 'PARKED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, kind: true, payload: true },
    });
    if (!waiting || waiting.id !== input.proposalId || !['guest_move', 'guest_tick'].includes(waiting.kind)) {
      throw new ConflictException(NOTHING_WAITING);
    }
    const lane = waiting.kind === 'guest_move' ? 'guest_move' : 'guest_done';
    const settle = (state: 'ACCEPTED' | 'DECLINED' | 'DROPPED') =>
      this.prisma.assistantProposal.update({ where: { id: waiting.id }, data: { state, resolvedAt: new Date() } });
    const keep = async (reply: Reply) => {
      await this.prisma.assistantTurn.createMany({
        data: [
          { organizationId: asker.organizationId, personExternalId: key, role: 'person', content: input.answer === 'yes' ? 'Yes' : 'No' },
          { organizationId: asker.organizationId, personExternalId: key, role: 'assistant', content: whatWasSaid(reply), lane: reply.lane, composedBy: reply.composedBy },
        ],
      }).catch(() => undefined);
      return reply;
    };
    if (input.answer === 'no') {
      await settle('DECLINED');
      return keep(rules(lane, aTextBlock(NOTHING_WAS_CHANGED)));
    }
    const p = waiting.payload as { groundId: string; participantId: string; objectiveId: string; change: AMove | ATick };
    const stillIn = (await this.whatItMayBeAbout(asker)).some((g) => g.id === p.groundId);
    const mine = stillIn ? await this.grounds.getMyCheckinStatus(p.groundId, asker.userId).catch(() => null) : null;
    const row: any = mine && mine.participantId === p.participantId
      ? await this.prisma.personObjective.findFirst({
        where: { id: p.objectiveId, groundId: p.groundId, participantId: p.participantId, status: 'OPEN', authoredBy: 'self' },
        select: { id: true, text: true },
      })
      : null;
    if (!row) {
      await settle('DROPPED');
      return keep(rules(lane, aTextBlock(`"${(p.change as any).text}" is no longer open for you here, so I have changed nothing.`)));
    }
    if (waiting.kind === 'guest_tick') {
      await this.prisma.personObjective.update({ where: { id: row.id }, data: { status: 'MET', statusChangedAt: new Date() } });
      await this.prisma.commitment.updateMany({
        where: { organizationId: asker.organizationId, sourcePersonObjectiveId: row.id, state: 'OPEN' },
        data: { state: 'KEPT', resolvedAt: new Date() },
      });
      await settle('ACCEPTED');
      return keep(rules(lane, aTextBlock(tickDone(p.change as ATick))));
    }
    const m = p.change as AMove;
    await this.prisma.personObjective.update({ where: { id: row.id }, data: { dueDate: new Date(m.toISO), dueSaid: m.toSaid } });
    await this.prisma.commitment.updateMany({
      where: { organizationId: asker.organizationId, sourcePersonObjectiveId: row.id },
      data: { dueAt: new Date(m.toISO), dueSaid: m.toSaid },
    });
    await settle('ACCEPTED');
    return keep(rules(lane, aTextBlock(moveDone(m))));
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
    /* A guest's yes is for the one change to their own commitment that was said back to them, and nothing else. */
    if (await this.isAGuest(asker)) return this.answerTheGuestsYes(asker, input);
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
