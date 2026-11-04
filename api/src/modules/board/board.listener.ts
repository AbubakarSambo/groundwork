import { fileProofThatWasFiledOnNothing } from '../documents/proof-filed-on-its-item';
import { Injectable, Logger } from '@nestjs/common';
import { aMilestoneAcceptedIsAnInvoiceToRaise } from './release-5-projects';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { AnthropicService } from '../conversation/anthropic.service';
import { GroundworkEvents, type RoundCompletedEvent, type CheckInCompletedEvent, type KindOfWorkReadEvent, type AssessmentReadyEvent } from '../../common/events';
import { theReleaseOneSalesBoardIsOn } from './release-one-sales-board';
import { theBuyingDateTheySaid, BUYING_DATE } from './a-deals-value-and-buying-date';
import { withTheCriteriaSaid, thePriceRangeAnswer, theLeadsRangeAnswerIn, THE_RANGE_QUESTION } from './a-deals-four-criteria';
import { theAnswerAsALine } from './what-needs-you-and-what-to-do';
import { oneOfTheKinds, isASalesKind, theRecordsPrompt, THE_RECORDS_SCHEMA, onlyRecordsTheLinesSay, type AnOfferedRecord, type APersonALineMayName , KINDS_THAT_ARE_NOT_WORK } from './the-kind-of-work';
import { theRoomsLabelFor } from './the-room-is-stored-with-labels';
import { fileTheBillsSaid } from './the-collections-record';
import { fileTheFeeNotesDueOnAnEvent } from './a-fee-note-due-on-an-event';
import { aSaleWonIsAnInvoiceToRaise } from './raising-invoices-on-time';
import { withAClaim } from './a-claim-on-a-record-is-checked-first';
import { withTheStageKept, theStagesToKeep } from './a-deals-stages-are-kept';
import { aDealTheLeadNamedBecomesTheReps } from './one-deal-per-customer';
import { aDealNamedAsAPerson, theDealThePersonIsAt, thePersonsDetailsOnTheDeal, theQuestionBefore } from './a-deals-contact-is-never-a-deal';
import { theAimsCountedNow } from './an-aim-is-counted-now';
import { whatTheOwnerSaidOfEachDeal } from './what-the-owner-said-of-each-deal';
import {
  WHAT_THE_RECORD_SAYS_PROMPT,
  WHAT_THE_RECORD_SAYS_SCHEMA,
  theQuestion,
  onlyWhatIsWorthOffering,
  oneNumberLandsOnce,
  type AReadNumber,
  whatToDoWithTheRead,
  theNumberItProves,
  theLineWasSaid,
  howMuchIsProven,
} from './what-the-record-says-a-number-is';
import {
  WHAT_THE_ROOM_IS_ABOUT_PROMPT,
  WHAT_THE_ROOM_IS_ABOUT_SCHEMA,
  theLines,
  onlyWhatHolds,
  type WhatTheRoomIsAbout,
} from './what-the-room-is-about';

/**
 * WHEN A ROUND CLOSES, READ WHAT THE RECORD SAYS THE NUMBERS ARE AT.
 *
 * ONCE PER ROUND, AND NOT ON A BOARD READ. The board is opened many times a round by everybody on
 * it; a model call there would be paid for on every one of them, and slowly. A round closes once,
 * with both the targets and the round's lines in hand, which is the only moment this needs.
 *
 * BEST EFFORT, ALWAYS. A round closing is the record of what people said; a suggestion beside a
 * number is a convenience. If this throws, the round is still closed and the board still shows the
 * lead's own number - which is what it showed before this existed.
 */
@Injectable()
export class BoardListener {
  private readonly logger = new Logger(BoardListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
  ) {}

  /**
   * THE RECORDS THE KIND OF WORK NEEDS, READ FROM WHAT SOMEBODY JUST SAID (request 76).
   *
   * Once per check-in, when it completes, over that check-in's own lines only: a sales rep's deals,
   * an engineer's releases, a lawyer's deadlines. The model offers records; `onlyRecordsTheLinesSay`
   * keeps a record only when its name is in the words of the line it points at, so nothing is
   * invented. A record already on the board under the same name is moved on (its stage, date and
   * details), never written twice. Best effort: if this fails the check-in is still complete.
   *
   * WHEN THE CONVERSATION'S ASSESSMENT IS READY, NOT WHEN IT COMPLETES (one source, 1 November 2026). The assessment is written
   * after the record, on every path that ends a conversation, so the board never reads a check-in before its lines are there.
   * Setup's commit announced the lead's first check-in before her record was taken out of it, and this read an empty record:
   * her team's deals never reached the board. A decline, which announced nothing, now reaches it too.
   */
  @OnEvent(GroundworkEvents.ASSESSMENT_READY)
  async onCheckInCompleted(e: CheckInCompletedEvent | AssessmentReadyEvent) {
    await this.readTheRecordsFrom(e);
    /*
     * A ROUND THAT CLOSED BEFORE THIS CHECK-IN'S LINES WERE THERE IS READ AGAIN (one source, part 2). A check-in's lines are
     * written from its assessment, after the close, so the round its close completed was read (what the room is about, the
     * numbers on the record against each aim) without them. Read again now, from the whole round.
     */
    if (typeof e.sessionNumber === 'number' && (await this.theRoundIsClosed(e.groundId, e.sessionNumber))) {
      await this.onRoundCompleted({ groundId: e.groundId, sessionNumber: e.sessionNumber });
    }
    /*
     * ON A MATTER CHECK-IN WITH RELEASE 2 ON, A FEE NOTE WAITING FOR AN EVENT THIS CHECK-IN REPORTS FALLS DUE THAT DAY
     * (a-fee-note-due-on-an-event). No model; never a guess: a line that only comes close is kept for the lead to confirm.
     * Anywhere else this returns null at once and writes nothing.
     */
    await fileTheFeeNotesDueOnAnEvent({ prisma: this.prisma, logger: this.logger }, e).catch(() => null);
    /* What the owner said of each deal, read from their own turns with no model (what-the-owner-said-of-each-deal). */
    await this.fileWhatTheOwnerSaid(e.groundId, e.checkInId, typeof e.sessionNumber === 'number' ? e.sessionNumber : null);
    /* The lead's answer on a price range, said in her own check-in, is kept as her Yes or No on the board is (Drop Access run 1, A6). */
    await this.fileTheLeadsRangeAnswer(e.groundId);
    /* The deals may have moved, so the aims they count are counted again (a-sales-aim-is-counted-from-the-deals). */
    await this.countTheAimsFromTheDeals(e.groundId, null);
    /* Release 3: where the organisation invoices after a sale, a deal won becomes an invoice to raise (raising-invoices-on-time). Off, this writes nothing. */
    await aSaleWonIsAnInvoiceToRaise(this.prisma, e.groundId).catch(() => 0);
    /* Release 5: a project's milestone accepted is an invoice to raise (release-5-projects). Off, nothing. */
    await aMilestoneAcceptedIsAnInvoiceToRaise(this.prisma, e.groundId).catch(() => 0);
  }


  private async theRoundIsClosed(groundId: string, sessionNumber: number): Promise<boolean> {
    const row = await Promise.resolve((this.prisma as any).roundCompletion?.findFirst?.({ where: { groundId, sessionNumber }, select: { id: true } })).catch(() => null);
    return !!row;
  }

  /**
   * THE KIND OF WORK ARRIVED AFTER THE SESSION (local test of staging, 15 October). Hafsah set up Drop Access's "Sales
   * check-in" from /start: her first session finished as the check-in was made, while the kind of work was still being
   * read, so the reading above found no kind and kept nothing. Kevin's Kilimani deal for 12 cartons, which she named,
   * never reached "Every deal, day by day". Once the kind is read, each finished session is read for its records, the same
   * way; a record already on the board is moved on, never written twice.
   */
  @OnEvent(GroundworkEvents.KIND_OF_WORK_READ)
  async onKindOfWorkRead(e: KindOfWorkReadEvent) {
    const done = await Promise.resolve((this.prisma as any).checkIn?.findMany?.({
      where: { groundId: e.groundId, status: 'COMPLETED' },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })).catch(() => []);
    for (const c of (done ?? []) as any[]) {
      await this.readTheRecordsFrom({ groundId: e.groundId, checkInId: c.id });
      await this.fileWhatTheOwnerSaid(e.groundId, c.id, null);
    }
    if ((done ?? []).length) await this.countTheAimsFromTheDeals(e.groundId, null);
  }

  private async readTheRecordsFrom(e: { groundId: string; checkInId: string; sessionNumber?: number | null }) {
    /*
     * ON A "COLLECT WHAT'S OWED" CHECK-IN WITH RELEASE 2 ON, EACH BILL SAID IS ONE ROW (the-collections-record). Its own reading, in
     * place of the kind of work's: a fee notes check-in read as "a law firm matter" keeps fee notes, never deadlines. Null means it is
     * not one, and the reading below runs exactly as before.
     */
    if ((await fileTheBillsSaid({ prisma: this.prisma, anthropic: this.anthropic as any, logger: this.logger }, e, THE_RECORDS_SCHEMA).catch(() => null)) !== null) return;
    try {
      const ground = await this.prisma.ground.findUnique({
        where: { id: e.groundId },
        select: {
          kindOfWork: true, workStages: true,
          /* Who is in the check-in, so a record the speaker says is somebody else's is theirs (item 21). */
          participants: { select: { id: true, nameGiven: true, partyType: true, user: { select: { firstName: true, lastName: true } } } },
        },
      }) as any;
      const kind = oneOfTheKinds(ground?.kindOfWork);
      if (!kind) return;
      const said = await this.prisma.recordEntry.findMany({
        where: { checkInId: e.checkInId, disputedAt: null },
        /* In the order they were said, so a line can go on from the one before it (onlyRecordsTheLinesSay). */
        orderBy: { createdAt: 'asc' },
        select: { id: true, text: true, participantId: true, createdAt: true },
      });
      const lines = said.map((l: any) => ({ id: l.id, text: cleanText(l.text), participantId: l.participantId, createdAt: l.createdAt ? new Date(l.createdAt) : new Date() })).filter((l: any) => l.text);
      if (!lines.length) return;
      const people: APersonALineMayName[] = ((ground?.participants ?? []) as any[]).map((p) => ({
        id: p.id, firstName: p.user?.firstName ?? null, lastName: p.user?.lastName ?? null, nameGiven: p.nameGiven ?? null,
      }));
      const nameOf = (pid: string) => {
        const p = people.find((x) => x.id === pid);
        return (p ? [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || (p.nameGiven ?? '').trim() : '') || 'Somebody';
      };
      const everybody = people.map((p) => nameOf(p.id)).filter((n) => n !== 'Somebody');
      /* The deals on record with the person each is dealt with through, so a line naming only "Rose" is about her deal (point 6). */
      const dealsOnRecord = isASalesKind(kind)
        ? ((await (this.prisma as any).workItem.findMany({ where: { groundId: e.groundId, kind: 'deal' }, select: { name: true, fields: true, ownerParticipantId: true } }).catch(() => [])) as any[])
        : [];
      /* Every item on record, by id, so the model says which one a line is about, however it is named (one owner, one source; 29 October). */
      const onRecord = ((await (this.prisma as any).workItem.findMany({ where: { groundId: e.groundId, kind: { notIn: KINDS_THAT_ARE_NOT_WORK } }, select: { id: true, kind: true, name: true, fields: true, ownerParticipantId: true } }).catch(() => [])) ?? []) as any[];
      const answer = await this.anthropic.extract<{ records?: AnOfferedRecord[] }>(
        theRecordsPrompt(kind),
        [{
          role: 'user',
          content: [
            ...(everybody.length ? [`People in this check-in: ${everybody.join(', ')}.`, ''] : []),
            ...(onRecord.length ? ['Items on record:', ...onRecord.map((d) => `[${d.id}] ${d.kind}: ${d.name}${d.ownerParticipantId ? `, ${nameOf(d.ownerParticipantId)}'s` : ''}${String((d.fields as any)?.Contact ?? '').trim() ? `, through ${String((d.fields as any).Contact).trim()}` : ''}`), ''] : []),
            ...lines.map((l: any) => `[${l.id}] ${nameOf(l.participantId)} said: ${l.text}`),
          ].join('\n'),
        }],
        THE_RECORDS_SCHEMA,
      );
      const kept = onlyRecordsTheLinesSay(kind, answer?.records ?? [], lines, ground?.workStages, people, dealsOnRecord.map((d) => ({ name: String(d.name), fields: d.fields as any, ownerParticipantId: d.ownerParticipantId ?? null })));
      const speakerOf = new Map(lines.map((l: any) => [l.id, l.participantId]));
      const sameAsOf = (r: any): string | null => (answer?.records ?? []).find((x) => x.lineId === r.sourceEntryId && (x.kind ?? r.kind) === r.kind && x.sameAs)?.sameAs ?? null;
      /*
       * WHICH CHECK-IN SAID EACH OF A DEAL'S FOUR CRITERIA (Hafsah's answer to Needs Hafsah 7; a-deals-four-criteria): the need,
       * the budget the customer stated, the decision maker and the buying date are kept on the deal's details, and beside them,
       * never served, the check-in and session that said each one.
       */
      const saidIn = { checkInId: e.checkInId, sessionNumber: typeof e.sessionNumber === 'number' ? e.sessionNumber : null, on: new Date() };
      const stamped = (r: { kind: string }, before: unknown, after: Record<string, unknown>) => (isASalesKind(kind) && r.kind === 'deal' ? withTheCriteriaSaid(before as any, after, saidIn) : after);
      if (!kept.length) {
        if (isASalesKind(kind)) await this.fileTheBuyingDatesSaid(e.groundId, lines, saidIn);
        return;
      }
      const leadIds = new Set<string>(((ground?.participants ?? []) as any[]).filter((p) => p.partyType === 'INITIATOR').map((p) => p.id));
      const already = await (this.prisma as any).workItem.findMany({ where: { groundId: e.groundId, kind: { notIn: KINDS_THAT_ARE_NOT_WORK } }, select: { id: true, kind: true, name: true, fields: true, ownerParticipantId: true, stage: true, sourceEntryId: true, createdAt: true } });
      /*
       * EACH STAGE A DEAL IS PUT AT IS KEPT, WITH ITS DAY (a-deals-stages-are-kept). A deal kept before its stages were is
       * kept first at the stage it stood at, as of the day of the line that stage came from, so the move from it counts.
       */
      const earlierIds = (already as any[]).map((a) => a.sourceEntryId).filter(Boolean);
      const saidOn = new Map<string, Date>(earlierIds.length
        ? (((await (this.prisma as any).recordEntry?.findMany?.({ where: { id: { in: earlierIds } }, select: { id: true, createdAt: true } })?.catch?.(() => [])) ?? []) as any[]).map((l) => [l.id, new Date(l.createdAt)])
        : []);
      const keptAt = new Date();
      const theStageOf = (a: any, stage: string | null | undefined, fields: unknown) => {
        const kept = withTheStageKept(fields, stage, keptAt, 'check-in', { stage: a.stage ?? null, since: (a.sourceEntryId && saidOn.get(a.sourceEntryId)) || (a.createdAt ? new Date(a.createdAt) : null) });
        /* Kept in hand too, so a second line about the same deal in this check-in adds to what the first one wrote. */
        a.fields = kept;
        return kept;
      };
      /* This check-in's turns, read once, only where a deal is named as a person (a-deals-contact-is-never-a-deal). */
      let turnsHere: { role: string; content: string | null }[] | null = null;
      for (let r of kept) {
        /*
         * A PERSON NAMED AS A DEAL'S CONTACT IS NEVER A DEAL (Drop Access short run, item 8): "Mr Kariuki wants five units", said
         * about Juja Hardware, is Juja Hardware's, with Mr Kariuki as its contact. With no deal it is surely about, none is kept.
         */
        if (isASalesKind(kind) && r.kind === 'deal' && aDealNamedAsAPerson(r as any)) {
          const speaker = speakerOf.get(r.sourceEntryId) ?? r.ownerParticipantId ?? null;
          if (turnsHere === null) {
            turnsHere = ((await (this.prisma as any).conversationTurn?.findMany?.({ where: { checkInId: e.checkInId }, orderBy: { createdAt: 'asc' }, select: { role: true, content: true } })?.catch?.(() => [])) ?? []) as any[];
          }
          const lineText = String(lines.find((l: any) => l.id === r.sourceEntryId)?.text ?? '');
          const at = theDealThePersonIsAt(r as any, (already as any[]).filter((a) => a.kind === 'deal' && (a.ownerParticipantId ?? null) === speaker), theQuestionBefore(turnsHere ?? [], lineText));
          if (!at) { this.logger.log(`A deal named as a person ("${r.name}") was not kept: no deal it is surely about.`); continue; }
          r = { ...r, name: at.name, fields: thePersonsDetailsOnTheDeal(at, r as any) as any, ownerParticipantId: at.ownerParticipantId ?? r.ownerParticipantId };
        }
        /* The item on record it is: the one the model named, however it was said ("Mama Rose's kiosk" is Mama Rose), or the same name. */
        const same = (already as any[]).find((a) => a.id === sameAsOf(r) && a.kind === r.kind)
          ?? (already as any[]).find((a) => a.kind === r.kind && a.name.trim().toLowerCase() === r.name.trim().toLowerCase());
        if (same) {
          /*
           * THE DEAL STAYS WITH WHOEVER IT IS. A record is shown as owned by the person who said the line it was
           * written from, so a lead's "Kevin also sold 10 units to Bahari Cafe" moved Kevin's deal under Grace's
           * name. A line by somebody else moves its stage and details on, and the owner's own line stays its source.
           */
          const speaker = speakerOf.get(r.sourceEntryId) ?? null;
          /*
           * A DEAL THE LEAD NAMED IS THE REP'S ONCE THE REP SPEAKS OF IT (Drop Access, 16 October). Grace's setup named the team's
           * deals ("Greenfield Supermarket, 25 units, Mercy"), which made Greenfield a deal under Grace; Mercy's own account of it
           * then only moved its stage, and the board showed Mercy's deal as Grace's. When the record came from the lead's own line
           * and somebody else in the check-in now says it, it becomes theirs, from their line. See aDealTheLeadNamedBecomesTheReps.
           */
          if (aDealTheLeadNamedBecomesTheReps(same.ownerParticipantId, speaker, leadIds, r.kind)) {
            const before = same.fields;
            const fields = stamped(r, before, theStageOf(same, r.stage, { ...r.fields, ...theStagesToKeep(same.fields) }));
            same.fields = fields;
            await (this.prisma as any).workItem.update({
              where: { id: same.id },
              /* From the rep's own account only: the lead's details about somebody else's deal are not carried over. */
              data: { stage: r.stage ?? null, dueAt: r.dueAt ?? null, fields, ownerParticipantId: speaker, sourceEntryId: r.sourceEntryId },
            });
            same.ownerParticipantId = speaker;
            if (r.stage) same.stage = r.stage;
            continue;
          }
          const fromSomebodyElse = !!same.ownerParticipantId && speaker !== same.ownerParticipantId;
          /*
           * A CHECK-IN NEVER MOVES A DEAL BACK A STAGE (the four criteria, Drop Access test bed, 18 October). Juja Hardware was at
           * Pitched; Joseph said the owner "still wants 5 units", which reads as the customer's need, and the deal went back to Need
           * established. On a sales team, a stage earlier than the one on record is not taken from a check-in; the lead can still
           * move it on the board.
           */
          const stage = r.stage && !(isASalesKind(kind) && r.kind === 'deal' && anEarlierStage(r.stage, same.stage, ground?.workStages)) ? r.stage : null;
          const before = same.fields;
          const fields = stamped(r, before, theStageOf(same, stage, !same.ownerParticipantId && r.ownerParticipantId && r.ownerParticipantId === speakerOf.get(r.sourceEntryId)
            ? withAClaim({ ...((same.fields as any) ?? {}), ...r.fields }, r.ownerParticipantId, r.sourceEntryId ?? null, new Date())
            : { ...((same.fields as any) ?? {}), ...r.fields }));
          same.fields = fields;
          await (this.prisma as any).workItem.update({
            where: { id: same.id },
            data: {
              ...(stage ? { stage } : {}),
              ...(r.dueAt ? { dueAt: r.dueAt } : {}),
              /*
               * A record added on the board with nobody's name on it does not become the deal of whoever then
               * says it is theirs ("I have signed Tuskys Westgate already"). That is a claim, and a claim is
               * checked first: it is put to the lead, and only her yes sets the owner (decision 76, item 3,
               * a-claim-on-a-record-is-checked-first). One with a name keeps it.
               */
              /* Only the speaker's own claim. A record somebody says is a colleague's is not that colleague's claim. */
              fields,
              ...(fromSomebodyElse ? {} : { sourceEntryId: r.sourceEntryId }),
            },
          });
          if (stage) same.stage = stage;
        } else {
          const fields = stamped(r, null, r.stage ? withTheStageKept(r.fields, r.stage, keptAt, 'check-in') : r.fields);
          const made = await (this.prisma as any).workItem.create({ data: { groundId: e.groundId, ...r, fields } });
          (already as any[]).push({ id: made?.id, kind: r.kind, name: r.name, fields, ownerParticipantId: r.ownerParticipantId ?? null, stage: r.stage ?? null, sourceEntryId: r.sourceEntryId ?? null, createdAt: keptAt });
        }
      }
      this.logger.log(`Kept ${kept.length} record(s) of ${kind} from check-in ${e.checkInId}.`);
      /* Proof sent before its deal was on record is filed on it now (proof-filed-on-its-item.ts, polish round 1). */
      await fileProofThatWasFiledOnNothing(this.prisma, e.groundId).catch(() => 0);
      if (isASalesKind(kind)) await this.fileTheBuyingDatesSaid(e.groundId, lines, saidIn);
    } catch (err: any) {
      this.logger.warn(`Reading the records for check-in ${e.checkInId} failed: ${err?.message}`);
    }
  }

  /**
   * WHAT A DEAL'S OWNER SAID OF IT, FILED ON THE DEAL (Hafsah's quality pass, 18 October; what-the-owner-said-of-each-deal). After
   * the model's read of a sales check-in, the owner's own turns are read in order, with no model, and what they plainly say of each
   * of their deals is kept: a quote and its amount (and the stage Quoted, never a stage back), the units wanted, the customer's yes
   * to a quote, who decides, the person at the customer, the day a deposit is paid. Also run over the check-ins already on record
   * by scripts/what-the-owner-said-of-each-deal.ts. Returns how many deals it changed.
   */
  async fileWhatTheOwnerSaid(groundId: string, checkInId: string, sessionNumber: number | null, keptAt: Date = new Date()): Promise<number> {
    try {
      const ground = await this.prisma.ground.findUnique({
        where: { id: groundId },
        select: { kindOfWork: true, workStages: true, participants: { select: { id: true, user: { select: { firstName: true } } } } } as any,
      }) as any;
      if (!isASalesKind(oneOfTheKinds(ground?.kindOfWork))) return 0;
      const checkIn = await (this.prisma as any).checkIn.findUnique({ where: { id: checkInId }, select: { participantId: true } });
      if (!checkIn?.participantId) return 0;
      const deals = ((await (this.prisma as any).workItem.findMany({ where: { groundId, kind: 'deal', ownerParticipantId: checkIn.participantId }, select: { id: true, name: true, stage: true, fields: true } })) ?? []) as any[];
      if (!deals.length) return 0;
      const turns = ((await (this.prisma as any).conversationTurn.findMany({ where: { checkInId }, orderBy: { createdAt: 'asc' }, select: { role: true, content: true, createdAt: true } })) ?? []) as any[];
      const ourNames = ((ground?.participants ?? []) as any[]).map((p) => String(p.user?.firstName ?? '')).filter(Boolean);
      const said = whatTheOwnerSaidOfEachDeal(deals.map((d) => ({ id: d.id, name: d.name, stage: d.stage ?? null, fields: d.fields ?? null })), turns, ourNames);
      const saidIn = { checkInId, sessionNumber, on: keptAt };
      for (const [id, w] of said) {
        const d = deals.find((x) => x.id === id);
        const moved = w.stage && !anEarlierStage(w.stage, d.stage, ground?.workStages) ? w.stage : null;
        /* The customer's no, said of it without its name, is kept on it unseen, for the board's lost deals (a-deal-that-was-dropped). */
        const dropped = w.dropped && !(d.fields as any)?._dropped ? { _dropped: w.dropped } : {};
        const after = withTheStageKept({ ...((d.fields as any) ?? {}), ...w.set, ...dropped }, moved, keptAt, 'check-in', { stage: d.stage ?? null, since: null });
        await (this.prisma as any).workItem.update({ where: { id }, data: { ...(moved ? { stage: moved } : {}), fields: withTheCriteriaSaid(d.fields as any, after, saidIn) } });
      }
      return said.size;
    } catch (err: any) {
      this.logger.warn(`Filing what the owner said of each deal for check-in ${checkInId} failed: ${err?.message}`);
      return 0;
    }
  }

  /**
   * A CUSTOMER'S BUYING DATE IS FILED ON THEIR DEAL (Hafsah's point 6, 17 October). "Rose said she will buy the two units at the
   * end of the month, on October 30th." names no customer, only Rose, the Mama Mboga Mart deal's contact. Each line by a deal's
   * owner that is about the deal (its name or its contact) and says when the customer will buy files that day on the deal as its
   * "Buying date": the customer's, never the rep's own commitment. The latest said wins. Nothing else on the deal changes. Also
   * run over a check-in's lines already on record by scripts/the-buying-dates-said.ts.
   */
  async fileTheBuyingDatesSaid(groundId: string, lines: { text: string; participantId: string | null; createdAt: Date | string }[], saidIn?: { checkInId: string | null; sessionNumber: number | null; on: Date }): Promise<number> {
    try {
      const deals = (await (this.prisma as any).workItem.findMany({ where: { groundId, kind: 'deal' }, select: { id: true, name: true, fields: true, ownerParticipantId: true } })) as any[];
      let filed = 0;
      for (const d of deals) {
        const day = theBuyingDateTheySaid({ name: d.name, ownerParticipantId: d.ownerParticipantId, fields: d.fields as any }, lines);
        if (!day || (d.fields as any)?.[BUYING_DATE] === day) continue;
        const after = { ...((d.fields as any) ?? {}), [BUYING_DATE]: day };
        await (this.prisma as any).workItem.update({ where: { id: d.id }, data: { fields: saidIn ? withTheCriteriaSaid(d.fields as any, after, saidIn) : after } });
        filed += 1;
      }
      return filed;
    } catch (err: any) {
      this.logger.warn(`Filing the buying dates said on ${groundId} failed: ${err?.message}`);
      return 0;
    }
  }

  /**
   * THE LEAD'S ANSWER ON A PRICE RANGE, FROM HER OWN CHECK-IN (Drop Access run 1, A6; a-deals-four-criteria, theRangeAnswerSaid).
   * Grace said on day 10 "I decided that Tuskys Westgate's budget range counts, so Mercy's quote is fine." Kept exactly as her Yes
   * or No on the board keeps it (BoardService.answerThePriceRange): one line in how we work, read by everybody, in the same words,
   * written once. Only her own lines are read, only on a sales check-in, and never where an answer is on record already. Also run
   * over the lines already on record by scripts/the-leads-range-answer-said.ts. Returns whether it wrote the line.
   */
  async fileTheLeadsRangeAnswer(groundId: string): Promise<boolean> {
    try {
      const ground = await this.prisma.ground.findUnique({
        where: { id: groundId },
        select: { kindOfWork: true, initiatorId: true, organizationId: true, participants: { select: { id: true, userId: true, partyType: true } } } as any,
      }) as any;
      if (!isASalesKind(oneOfTheKinds(ground?.kindOfWork)) || !ground?.initiatorId) return false;
      /* A line everybody reads in how we work, so only with Release 1's sales board on, where the question itself is asked. */
      if (!(await theReleaseOneSalesBoardIsOn(this.prisma, ground.organizationId))) return false;
      if (await thePriceRangeAnswer(this.prisma, groundId)) return false;
      const leads = ((ground.participants ?? []) as any[]).filter((p) => p.userId === ground.initiatorId || p.partyType === 'INITIATOR').map((p) => p.id);
      if (!leads.length) return false;
      const theirs = (await this.prisma.recordEntry.findMany({
        where: { participantId: { in: leads }, disputedAt: null },
        select: { text: true, createdAt: true },
      })) as any[];
      const answer = theLeadsRangeAnswerIn(theirs.map((l) => ({ text: cleanText(String(l.text ?? '')), createdAt: l.createdAt })));
      if (!answer) return false;
      await (this.prisma as any).groundContextItem.create({
        data: { groundId, kind: 'WAY_OF_WORKING', text: theAnswerAsALine(THE_RANGE_QUESTION, answer === 'yes'), audience: 'EVERYONE', source: 'CHECK_IN', authorUserId: ground.initiatorId },
      });
      this.logger.log(`Kept the lead's answer on a price range from her check-in on ${groundId}.`);
      return true;
    } catch (err: any) {
      this.logger.warn(`Keeping the lead's answer on a price range for ${groundId} failed: ${err?.message}`);
      return false;
    }
  }

  /**
   * A SALES AIM IS COUNTED FROM THE DEALS ON RECORD (Hafsah's answers of 17 October; a-sales-aim-is-counted-from-the-deals).
   * When something new comes in, the count kept on each aim the deals count is brought up to the deals, and, when a round
   * has closed, so is that round's snapshot, which was taken before. Returns the ids it counted, so the read of numbers
   * from what was said leaves them alone. Best effort: if this fails, the board still counts from the deals when it is read.
   */
  async countTheAimsFromTheDeals(groundId: string, sessionNumber: number | null, now: Date = new Date()): Promise<Set<string>> {
    const counted = new Set<string>();
    try {
      const ground = await this.prisma.ground.findUnique({
        where: { id: groundId },
        select: { kindOfWork: true, workStages: true, organizationId: true, objectives: { select: { id: true, name: true, ownerParticipantId: true, count: true } } } as any,
      }) as any;
      if (!(ground?.objectives ?? []).length) return counted;
      /* The one counter every page reads (an-aim-is-counted-now.ts): sales kinds, with Release 1's sales board on, else nothing. */
      const counts = await theAimsCountedNow(this.prisma as any, { id: groundId, organizationId: ground.organizationId, kindOfWork: ground.kindOfWork, workStages: ground.workStages }, ground.objectives, now);
      for (const o of ground.objectives as any[]) {
        const c = counts.get(o.id);
        if (!c) continue;
        counted.add(o.id);
        if (o.count !== c.count) {
          await this.prisma.groundObjective.update({ where: { id: o.id }, data: { count: Math.round(c.count) } }).catch(() => undefined);
        }
        if (sessionNumber != null) {
          await (this.prisma as any).groundObjectiveSnapshot?.updateMany?.({
            where: { groundId, objectiveId: o.id, sessionNumber },
            data: { count: Math.round(c.count) },
          })?.catch?.(() => undefined);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Counting the aims from the deals for ${groundId} failed: ${err?.message}`);
    }
    return counted;
  }

  @OnEvent(GroundworkEvents.ROUND_COMPLETED)
  async onRoundCompleted(e: Pick<RoundCompletedEvent, 'groundId' | 'sessionNumber'>) {
    await this.readWhatTheRoomIsAbout(e);
    /* An aim the deals count is counted from them, never read off what was said (Hafsah's answer of 17 October). */
    const fromTheDeals = await this.countTheAimsFromTheDeals(e.groundId, e.sessionNumber);
    try {
      const targets = (await this.prisma.groundObjective.findMany({
        where: { groundId: e.groundId },
        select: { id: true, name: true, target: true, count: true, prevCount: true, ownerParticipantId: true, suggestedCount: true, suggestedSaid: true },
      })).filter((t) => !fromTheDeals.has(t.id));
      if (!targets.length) return;

      /*
       * WHAT PEOPLE SAID THIS ROUND, and only the kinds that can carry a number somebody reached.
       * PROGRESS is the type this read wanted and did not have until today - a thing that happened,
       * which is what a count is. COMMITMENT stays because a commitment reported as done landed
       * there for as long as there was nowhere else for it to go.
       */
      const said = await this.prisma.recordEntry.findMany({
        where: {
          disputedAt: null,
          participant: { groundId: e.groundId },
          checkIn: { sessionNumber: e.sessionNumber },
          /* And WORRY and TENSION: "arrears are at 14%, it's the market" is a worry, and it is also where the
             number is (run 11, 22 Sep 2026, a board reading "0 so far" beside it). The prompt's own rule -
             only where a line reports the value - is what keeps a worry with no figure out. */
          type: { in: ['PROGRESS', 'COMMITMENT', 'SUCCESS_DEFINITION', 'WORRY', 'TENSION'] as any },
        },
        select: { text: true, type: true, participantId: true, participant: { select: { partyType: true } }, recallBased: true, anchoredDocumentId: true, anchoredOrigin: true, anchoredPassage: true },
      });
      if (!said.length) return;

      /*
       * THE MARKERS COME OFF BEFORE ANYBODY READS THIS - the model, and then the lead.
       *
       * Extraction stores its verifiability marker inside the text column, so every line here
       * arrives as "[VERIFIABILITY:HIGH] All forty migrated by Friday." Fed to the model it is
       * noise in front of every sentence; carried into `suggestedSaid` it is our internal marker
       * printed on the board under "The record shows 40 for this". Caught on a gate run, and it is
       * the fifth time this session that something internal has reached a page by riding inside a
       * text column. `cleanText` is the one that knows how to take it off.
       */
      /* With the kind of line, so a line saying what success looks like is never read as where things stand (request 109 a). */
      const lines = said.map((s: any) => ({ text: cleanText(s.text), who: s.participantId ?? null, saidByTheLead: s.participant?.partyType === 'INITIATOR', kind: s.type ?? null, proven: howMuchIsProven(s) }));
      const answer = await this.anthropic.extract<{ numbers: AReadNumber[] }>(
        WHAT_THE_RECORD_SAYS_PROMPT,
        [{ role: 'user', content: theQuestion(targets, lines) }],
        WHAT_THE_RECORD_SAYS_SCHEMA,
      );

      const worth = oneNumberLandsOnce(onlyWhatIsWorthOffering(answer?.numbers ?? [], targets, lines), targets);
      let landed = 0;
      for (const n of worth) {
        const target = targets.find((t) => t.id === n.objectiveId)!;
        if (whatToDoWithTheRead(n, target, lines) === 'land') {
          landed += 1;
          /* A count proof backs lands as the number the proof holds (three codes, three sales). */
          const proves = theNumberItProves(n, theLineWasSaid(n.said, lines));
          if (proves !== null) n.count = proves;
          await this.prisma.groundObjective.update({
            where: { id: n.objectiveId },
            data: { count: n.count, suggestedCount: null, suggestedSaid: cleanText(n.said), suggestedAtSession: e.sessionNumber },
          }).catch(() => undefined);
          /*
           * AND THE ROUND'S OWN SNAPSHOT, which was taken when the round closed, before this number was
           * read off it. Left as it was, session 2 of re-d (sales) had a snapshot of 0 beside a count of
           * 31 million naira, and the Movement tile said "No target moved this session." while Since the
           * last round said it had. The number said in this round is where this round closed.
           */
          await (this.prisma as any).groundObjectiveSnapshot?.updateMany?.({
            where: { groundId: e.groundId, objectiveId: n.objectiveId, sessionNumber: e.sessionNumber },
            data: { count: n.count },
          })?.catch?.(() => undefined);
        } else {
          await this.prisma.groundObjective.update({
            where: { id: n.objectiveId },
            data: { suggestedCount: n.count, suggestedSaid: cleanText(n.said), suggestedAtSession: e.sessionNumber },
          }).catch(() => undefined);
        }
      }
      if (worth.length) {
        this.logger.log(`Read ${worth.length} number(s) off the record for ground ${e.groundId} round ${e.sessionNumber}; ${landed} landed as the lead's own count.`);
      }
    } catch (err: any) {
      this.logger.warn(`Reading the numbers off the record for ${e.groundId} failed: ${err?.message}`);
    }
  }

  /**
   * WHAT THE ROOM IS ABOUT, READ ONCE A ROUND.
   *
   * Everything anybody has said they are trying to do, everywhere they said they are doing it, and
   * everything they said it about. Read across the WHOLE ground, not one round: an aim somebody
   * stated in round one is still their aim in round four, and a board that dropped it every week
   * would tell a convener the room had changed its mind when nobody had.
   *
   * BEST EFFORT. If this fails the board shows the rest of itself and says this part has not been
   * read yet.
   */
  private async readWhatTheRoomIsAbout(e: Pick<RoundCompletedEvent, 'groundId' | 'sessionNumber'>) {
    try {
      const said = await this.prisma.recordEntry.findMany({
        where: {
          disputedAt: null,
          participant: { groundId: e.groundId },
          type: { in: ['SUCCESS_DEFINITION', 'INTENT', 'WORRY', 'ASK'] as any },
        },
        select: {
          text: true,
          participant: { select: { id: true } },
        },
      });
      const lines = said
        .map((s: any) => ({
          text: cleanText(s.text),
          /* A LABEL, NEVER THEIR NAME AND NEVER THE LEAD'S DESCRIPTION OF THEM (decision 110, P9; request 36): an opaque one made from the person's
             row id, so it does not move when somebody's role or name is changed. A model answer keyed on anything else cannot be matched back,
             and `onlyWhatHolds` drops every row it cannot match. */
          who: s.participant?.id ? theRoomsLabelFor(s.participant.id) : '',
        }))
        .filter((s: { text: string; who: string }) => s.text && s.who);
      if (lines.length < 2) return;

      const answer = await this.anthropic.extract<Partial<WhatTheRoomIsAbout>>(
        WHAT_THE_ROOM_IS_ABOUT_PROMPT,
        [{ role: 'user', content: theLines(lines) }],
        WHAT_THE_ROOM_IS_ABOUT_SCHEMA,
      );
      const held = onlyWhatHolds(answer ?? null, new Set(lines.map((l: { who: string }) => l.who)));
      if (!held.aims.length && !held.places.length && !held.things.length) return;

      await this.prisma.ground.update({
        where: { id: e.groundId },
        data: { whatTheRoomIsAbout: held as any, whatTheRoomIsAboutSession: e.sessionNumber },
      }).catch(() => undefined);
      this.logger.log(
        `Read ${held.aims.length} aim(s), ${held.places.length} place(s) and ${held.things.length} thing(s) for ground ${e.groundId}.`,
      );
    } catch (err: any) {
      this.logger.warn(`Reading what the room is about for ${e.groundId} failed: ${err?.message}`);
    }
  }
}

/** Whether `next` comes before `now` in the check-in's stages (the lead's own, or the kit's six). */
function anEarlierStage(next: string | null | undefined, now: string | null | undefined, leadsStages: unknown): boolean {
  const own = Array.isArray(leadsStages) ? (leadsStages as unknown[]).filter((x): x is string => typeof x === 'string' && !!x.trim()) : [];
  const order = own.length ? own : ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won'];
  const at = (s: string | null | undefined) => order.findIndex((x) => x.trim().toLowerCase() === String(s ?? '').trim().toLowerCase());
  const a = at(next);
  const b = at(now);
  return a >= 0 && b >= 0 && a < b;
}
