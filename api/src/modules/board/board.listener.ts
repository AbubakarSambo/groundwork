import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { AnthropicService } from '../conversation/anthropic.service';
import { GroundworkEvents, type RoundCompletedEvent, type CheckInCompletedEvent } from '../../common/events';
import { oneOfTheKinds, theRecordsPrompt, THE_RECORDS_SCHEMA, onlyRecordsTheLinesSay, theSameName, type AnOfferedRecord, type APersonALineMayName , KINDS_THAT_ARE_NOT_WORK } from './the-kind-of-work';
import { theRoomsLabelFor } from './the-room-is-stored-with-labels';
import { withAClaim } from './a-claim-on-a-record-is-checked-first';
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
   */
  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(e: CheckInCompletedEvent) {
    try {
      const ground = await this.prisma.ground.findUnique({
        where: { id: e.groundId },
        select: {
          kindOfWork: true, workStages: true,
          /* Who is in the check-in, so a record the speaker says is somebody else's is theirs (item 21). */
          participants: { select: { id: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } },
        },
      }) as any;
      const kind = oneOfTheKinds(ground?.kindOfWork);
      if (!kind) return;
      const said = await this.prisma.recordEntry.findMany({
        where: { checkInId: e.checkInId, disputedAt: null },
        select: { id: true, text: true, participantId: true },
      });
      const lines = said.map((l: any) => ({ id: l.id, text: cleanText(l.text), participantId: l.participantId })).filter((l: any) => l.text);
      if (!lines.length) return;
      const people: APersonALineMayName[] = ((ground?.participants ?? []) as any[]).map((p) => ({
        id: p.id, firstName: p.user?.firstName ?? null, lastName: p.user?.lastName ?? null, nameGiven: p.nameGiven ?? null,
      }));
      const nameOf = (pid: string) => {
        const p = people.find((x) => x.id === pid);
        return (p ? [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || (p.nameGiven ?? '').trim() : '') || 'Somebody';
      };
      const everybody = people.map((p) => nameOf(p.id)).filter((n) => n !== 'Somebody');
      const answer = await this.anthropic.extract<{ records?: AnOfferedRecord[] }>(
        theRecordsPrompt(kind),
        [{
          role: 'user',
          content: [
            ...(everybody.length ? [`People in this check-in: ${everybody.join(', ')}.`, ''] : []),
            ...lines.map((l: any) => `[${l.id}] ${nameOf(l.participantId)} said: ${l.text}`),
          ].join('\n'),
        }],
        THE_RECORDS_SCHEMA,
      );
      const kept = onlyRecordsTheLinesSay(kind, answer?.records ?? [], lines, ground?.workStages, people);
      const speakerOf = new Map(lines.map((l: any) => [l.id, l.participantId]));
      if (!kept.length) return;
      const already = await (this.prisma as any).workItem.findMany({ where: { groundId: e.groundId, kind: { notIn: KINDS_THAT_ARE_NOT_WORK } }, select: { id: true, kind: true, name: true, fields: true, ownerParticipantId: true } });
      for (const r of kept) {
        /* "a four-hour acknowledgement" and "the four-hour acknowledgement" are one record (item 21). */
        const same = (already as any[]).find((a) => a.kind === r.kind && (a.name.trim().toLowerCase() === r.name.trim().toLowerCase()
          || (theSameName(a.name) === theSameName(r.name) && (a.ownerParticipantId ?? null) === (r.ownerParticipantId ?? null))));
        if (same) {
          await (this.prisma as any).workItem.update({
            where: { id: same.id },
            data: {
              ...(r.stage ? { stage: r.stage } : {}),
              ...(r.dueAt ? { dueAt: r.dueAt } : {}),
              /*
               * A record added on the board with nobody's name on it does not become the deal of whoever then
               * says it is theirs ("I have signed Tuskys Westgate already"). That is a claim, and a claim is
               * checked first: it is put to the lead, and only her yes sets the owner (decision 76, item 3,
               * a-claim-on-a-record-is-checked-first). One with a name keeps it.
               */
              /* Only the speaker's own claim. A record somebody says is a colleague's is not that colleague's claim. */
              fields: !same.ownerParticipantId && r.ownerParticipantId && r.ownerParticipantId === speakerOf.get(r.sourceEntryId)
                ? withAClaim({ ...((same.fields as any) ?? {}), ...r.fields }, r.ownerParticipantId, r.sourceEntryId ?? null, new Date())
                : { ...((same.fields as any) ?? {}), ...r.fields },
              sourceEntryId: r.sourceEntryId,
            },
          });
        } else {
          const made = await (this.prisma as any).workItem.create({ data: { groundId: e.groundId, ...r } });
          (already as any[]).push({ id: made?.id, kind: r.kind, name: r.name, fields: r.fields, ownerParticipantId: r.ownerParticipantId ?? null });
        }
      }
      this.logger.log(`Kept ${kept.length} record(s) of ${kind} from check-in ${e.checkInId}.`);
    } catch (err: any) {
      this.logger.warn(`Reading the records for check-in ${e.checkInId} failed: ${err?.message}`);
    }
  }

  @OnEvent(GroundworkEvents.ROUND_COMPLETED)
  async onRoundCompleted(e: RoundCompletedEvent) {
    await this.readWhatTheRoomIsAbout(e);
    try {
      const targets = await this.prisma.groundObjective.findMany({
        where: { groundId: e.groundId },
        select: { id: true, name: true, target: true, count: true, prevCount: true, ownerParticipantId: true, suggestedCount: true, suggestedSaid: true },
      });
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
  private async readWhatTheRoomIsAbout(e: RoundCompletedEvent) {
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
