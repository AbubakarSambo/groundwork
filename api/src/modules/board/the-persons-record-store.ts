import { A_SESSION_OF_THEIRS } from '../grounds/the-sessions-done';
import { createHash } from 'crypto';
import { theOrganisationsZone } from '../../common/the-organisations-own-day';
import { theDealsOnRecord } from './a-sales-aim-is-counted-from-the-deals';
import { isASalesKind, oneOfTheKinds } from './the-kind-of-work';
import { theMarkOf, whoAddedEachBackingDocument, WHAT_A_MARK_READS } from '../reports/how-a-line-is-known';
import { theRecordForPromises, thePromisesSaidDone } from '../conversation/a-promise-said-done-is-kept';
import { theMPesaCodesSaid } from '../conversation/an-mpesa-code-is-asked-about-once';
import { withTheSaleEachCodeAnswered } from './a-deals-proof-is-about-that-deal';
import { fallsInLeave, leaveOfThePeopleOn } from '../suites/who-is-away';
import { aRoundIsCounted, whenACheckInBegan } from '../grounds/a-round-that-could-be-answered';
import { whenTheseOrganisationsPaused, thePausesThatAreOver } from '../billing/the-trial-grace';
import { thePersonJudgementsAreOn } from '../organisation/person-judgements';
import { thePersonsRecord, theCoachingFollowedUp, theCoachingTheRecordStillHolds, theRecordForOneSession, type ThePersonsInputs, type ThePersonsRecord, type ACoaching, type AnItemOfTheirs } from './the-persons-record';
import { theRecordInWords, type TheRecordInWords } from './the-persons-record-in-words';
import { thePraiseFromYourLead } from './the-praise-from-your-lead';

/**
 * WHERE EACH PERSON'S RECORD IS KEPT, AND WHEN IT IS REBUILT (Groundwork does the managing, part 1).
 *
 * KEPT in `PersonRecord`, one row for each person in each check-in (their place in it), beside the other rows derived about a person
 * (`CoachingState`, `PatternDetection`), with the record's entries and their evidence (`record`), the coaching Groundwork gave and what
 * became of it (`coaching`), and a fingerprint of what it was built from. A row of its own, not a column on CoachingState: five readers
 * list or count CoachingState rows (the admin's coaching page, the You board, the developer API, the learning counts and Ask), and a row
 * written for every person would change what each of them reads.
 *
 * REBUILT ONLY WHEN SOMETHING NEW COMES IN: when a check-in in it finishes (CHECK_IN_COMPLETED) and when promises are settled after it
 * (COMMITMENTS_SETTLED, which lands after the check-in event). Every person in the check-in is rebuilt, because a colleague's check-in
 * can confirm somebody's line. Opening My work, a report or a check-in only reads the row (`readThePersonsRecord`). A rebuild that
 * finds the same record writes nothing, and the coaching is read again only when a new check-in of theirs has finished.
 *
 * THE WRITER RUNS FOR EVERY ORGANISATION, and what reads it is behind the direct morning (organisation/the-direct-morning-switch.ts):
 * with it off, nobody is served any of this, and every reader reads exactly what they read before. Where an organisation keeps
 * judgements of a person off (organisation/person-judgements.ts), nothing is built for its people at all.
 */

export interface AStoredPersonsRecord {
  groundId: string;
  participantId: string;
  record: ThePersonsRecord;
  coaching: ACoaching[];
  lastSession: number | null;
  builtAt: Date;
}



/** Everything one person's record is read from, for every person in one check-in. */
export async function readTheInputs(prisma: any, groundId: string, now: Date = new Date()): Promise<{ ground: any; inputs: ThePersonsInputs[] } | null> {
  const ground: any = await prisma.ground.findUnique({
    where: { id: groundId },
    select: {
      id: true, organizationId: true, kindOfWork: true, initiatorId: true, cadence: true, cadenceDays: true, workingDays: true,
      organization: { select: { timeZone: true } },
      participants: { select: { id: true, userId: true, managingOnly: true, joinedAt: true, user: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!ground) return null;
  const zone = ground.organization?.timeZone || (await theOrganisationsZone(prisma, ground.organizationId).catch(() => null)) || 'Africa/Lagos';
  const sales = isASalesKind(oneOfTheKinds(ground.kindOfWork));
  const people = ((ground.participants ?? []) as any[]).filter((p) => !p.managingOnly);
  if (!people.length) return { ground, inputs: [] };
  const ids = people.map((p) => p.id);
  const safe = async <T>(p: any, fallback: T): Promise<T> => { try { const v = await p; return (v ?? fallback) as T; } catch { return fallback; } };

  const [checkIns, rows, commitments, deps, turns, workItems, evidence] = await Promise.all([
    safe<any[]>(prisma.checkIn?.findMany?.({
      where: { groundId, participantId: { in: ids }, ...A_SESSION_OF_THEIRS },
      select: { id: true, participantId: true, sessionNumber: true, status: true, closedReason: true, availableFrom: true, createdAt: true, completedAt: true, specificityLevel: true, specificityDimensions: true, _count: { select: { turns: { where: { role: 'PERSON' } } } } },
    }), []),
    safe<any[]>(prisma.recordEntry?.findMany?.({
      where: { participantId: { in: ids }, disputedAt: null },
      select: { id: true, participantId: true, checkInId: true, type: true, text: true, createdAt: true, ...WHAT_A_MARK_READS },
      orderBy: { createdAt: 'asc' },
    }), []),
    safe<any[]>(prisma.groundCommitment?.findMany?.({ where: { groundId, participantId: { in: ids } }, orderBy: { createdAt: 'asc' } }), []),
    safe<any[]>(prisma.groundDependency?.findMany?.({ where: { groundId }, orderBy: { createdAt: 'asc' } }), []),
    safe<any[]>(prisma.conversationTurn?.findMany?.({ where: { checkIn: { groundId } }, select: { role: true, content: true, createdAt: true, checkInId: true }, orderBy: { createdAt: 'asc' }, take: 5000 }), []),
    sales ? Promise.resolve([] as any[]) : safe<any[]>(prisma.workItem?.findMany?.({ where: { groundId }, orderBy: { createdAt: 'asc' } }), []),
    safe<any[]>(prisma.itemEvidence?.findMany?.({ where: { groundId }, select: { id: true, workItemId: true, readAs: true, countsAsProof: true } }), []),
  ]);
  const whoAdded = await safe(whoAddedEachBackingDocument(prisma, rows), new Map<string, string | null>());
  const items: AnItemOfTheirs[] = sales
    ? (await safe(theDealsOnRecord(prisma, groundId, { paymentRecord: true }), [] as any[])).map((d: any) => ({
        id: d.id, name: d.name, stage: d.stage ?? null, ownerParticipantId: d.ownerParticipantId ?? null, dropped: !!d.dropped,
        paid: !!d.paid, signed: !!d.signed, proven: !!d.proven, mpesaCode: d.mpesaCode ?? null, fields: d.fields ?? null,
        evidence: (evidence as any[]).filter((e) => e.workItemId === d.id).map((e) => ({ id: e.id, readAs: String(e.readAs ?? ''), countsAsProof: !!e.countsAsProof })),
      }))
    : (workItems as any[]).map((i) => {
        const f = (i.fields ?? {}) as Record<string, unknown>;
        return {
          id: i.id, name: String(i.name ?? ''), stage: i.stage ?? null, ownerParticipantId: i.ownerParticipantId ?? null, dropped: false,
          fields: Object.fromEntries(Object.entries(f).filter(([k, v]) => !k.startsWith('_') && typeof v === 'string')) as Record<string, string>,
          alsoCalled: [f['Client'], f['Number']].filter((x): x is string => typeof x === 'string' && x.trim().length > 1 && x !== i.name),
          evidence: (evidence as any[]).filter((e) => e.workItemId === i.id).map((e) => ({ id: e.id, readAs: String(e.readAs ?? ''), countsAsProof: !!e.countsAsProof })),
        };
      });

  /* The open promises the record says are done, the same reading the lead's morning summary uses. */
  const open = (commitments as any[]).filter((c) => c.status === 'UNKNOWN' && c.participantId);
  const forPromises = open.length ? await safe(theRecordForPromises(prisma, [groundId]), { lines: [], waits: [], people: [], answers: [] } as any) : { lines: [], waits: [], people: [], answers: [] };
  const saidDone = open.length
    ? thePromisesSaidDone(
        open.map((c) => ({ id: c.id, participantId: c.participantId, text: c.text, createdAt: c.createdAt })),
        forPromises.lines, forPromises.waits, (id: string) => forPromises.people.find((p: any) => p.id === id)?.names ?? [], forPromises.people.map((p: any) => p.id), forPromises.answers,
      )
    : [];
  const checkInOf = new Map((checkIns as any[]).map((c) => [c.id, c]));

  /* A ROUND THAT COULD NOT HAVE BEEN ANSWERED IS NOT A ROUND THEY DID NOT DO (run 7, 22 November): the person's page, the board and the lead's lines all
     read "did 2 of 11" from here, and rounds that opened in a pause counted. The one owner of when a round could be answered is asked once, here. */
  const pausedFrom = (await whenTheseOrganisationsPaused(prisma, [ground.organizationId], now).catch(() => new Map<string, Date>())).get(ground.organizationId) ?? null;
  const pausesOver = (await thePausesThatAreOver(prisma, [ground.organizationId]).catch(() => new Map<string, { from: Date; until: Date }[]>())).get(ground.organizationId) ?? null;
  const checkInBeganAt = whenACheckInBegan((checkIns as any[]).map((c) => ({ turns: (turns as any[]).filter((x) => x.checkInId === c.id && x.role === 'PERSON').slice(0, 1) })));
  /* A round that opened on approved leave is no round they did not do, as in every other count of misses (N49). One they answered anyway still counts. */
  const leave = await leaveOfThePeopleOn(prisma, [groundId]).catch(() => new Map<string, { from: Date; to: Date }[]>());
  const inputs = people.map((p): ThePersonsInputs => {
    const theirCheckIns = (checkIns as any[]).filter((c) => c.participantId === p.id
      && aRoundIsCounted({ ...c, personTurns: c._count?.turns ?? null }, { pausedFrom, pausesOver, joinedAt: p.joinedAt ?? null, checkInBeganAt }, true)
      && (String(c.status ?? '').toUpperCase() === 'COMPLETED' || !(c.availableFrom ?? c.createdAt) || !fallsInLeave(new Date(c.availableFrom ?? c.createdAt), leave.get(p.id) ?? [])));
    const theirIds = new Set(theirCheckIns.map((c) => c.id));
    const theirTurns = (turns as any[]).filter((x) => x.checkInId && (theirIds.has(x.checkInId) || checkInOf.get(x.checkInId)?.participantId === p.id));
    return {
      participantId: p.id,
      now,
      zone,
      sales,
      daily: String(ground.cadence ?? '').toUpperCase() === 'DAILY' ? { workingDays: ground.workingDays ?? null } : null,
      namesHere: ((ground.participants ?? []) as any[]).map((x) => [x.user?.firstName ?? '', x.user?.lastName ?? ''].filter(Boolean)),
      runsIt: !!p.userId && p.userId === ground.initiatorId,
      checkIns: theirCheckIns,
      lines: (rows as any[]).filter((l) => l.participantId === p.id).map((l) => ({
        id: l.id, checkInId: l.checkInId ?? null, sessionNumber: l.checkInId ? checkInOf.get(l.checkInId)?.sessionNumber ?? null : null,
        type: String(l.type ?? ''), text: String(l.text ?? ''), createdAt: l.createdAt,
        mark: theMarkOf({ ...l, text: String(l.text ?? '') }, whoAdded) as any, anchoredDocumentId: l.anchoredDocumentId ?? null,
      })),
      items,
      commitments: (commitments as any[]).filter((c) => c.participantId === p.id),
      saidDone: Object.fromEntries(saidDone.filter((s) => open.find((c) => c.id === s.id)?.participantId === p.id).map((s) => [s.id, s.keptAt])),
      blockers: (deps as any[]).filter((d) => d.fromParticipantId === p.id),
      othersChase: [
        ...(deps as any[]).filter((d) => d.fromParticipantId !== p.id).map((d) => String(d.what ?? '')),
        ...(commitments as any[]).filter((c) => c.participantId !== p.id).map((c) => String(c.text ?? '')),
      ].filter((x) => x.trim()),
      /*
       * A code typed as the answer to a question about one sale is given for that sale (polish round 15, U14): "M-Pesa code TGH5K2M9QX."
       * answered "What shows the sale of those two units?" about Juja Hardware, so it is read with Joseph's own line about that sale.
       */
      codes: theMPesaCodesSaid(withTheSaleEachCodeAnswered(
        [
          ...(rows as any[]).filter((l) => l.participantId === p.id).map((l) => ({ text: String(l.text ?? ''), participantId: p.id, checkInId: l.checkInId ?? null, createdAt: l.createdAt, anchoredDocumentId: l.anchoredDocumentId ?? null, turn: false })),
          ...theirTurns.filter((x) => x.role === 'PERSON').map((x) => ({ text: String(x.content ?? ''), participantId: p.id, checkInId: x.checkInId ?? null, createdAt: x.createdAt, anchoredDocumentId: null, turn: true })),
        ],
        theirTurns.map((x) => ({ checkInId: x.checkInId, role: String(x.role), content: String(x.content ?? ''), createdAt: x.createdAt })),
        items.map((i) => ({ name: i.name, fields: i.fields ?? null, ownerParticipantId: i.ownerParticipantId ?? null })),
      ).filter((x) => x.turn).map((x) => ({ text: x.text, at: x.createdAt }))),
      ourTurns: theirTurns.filter((x) => x.role === 'AI').map((x) => ({ content: String(x.content ?? ''), at: x.createdAt, checkInId: x.checkInId ?? null })),
      theirTurns: theirTurns.filter((x) => x.role === 'PERSON').map((x) => ({ content: String(x.content ?? ''), at: x.createdAt, checkInId: x.checkInId ?? null })),
    };
  });
  return { ground, inputs };
}

const fingerprint = (r: ThePersonsRecord) => createHash('sha256').update(JSON.stringify(r)).digest('hex').slice(0, 32);

/** Rebuilds every person's record in one check-in, from the record. Returns how many rows were written. Never called on opening a page. */
export async function rebuildThePersonsRecords(prisma: any, groundId: string, now: Date = new Date()): Promise<number> {
  if (!prisma?.personRecord?.upsert) return 0;
  const read = await readTheInputs(prisma, groundId, now);
  if (!read || !read.inputs.length) return 0;
  if (!(await thePersonJudgementsAreOn(prisma, read.ground.organizationId))) return 0;
  const zone = read.ground.organization?.timeZone || (await theOrganisationsZone(prisma, read.ground.organizationId).catch(() => null)) || 'Africa/Lagos';
  let wrote = 0;
  for (const input of read.inputs) {
    const record = thePersonsRecord(input);
    const builtFrom = fingerprint(record);
    const before = await prisma.personRecord.findUnique({ where: { participantId: input.participantId } }).catch(() => null);
    if (before?.builtFrom === builtFrom) continue;
    const done = input.checkIns.filter((c) => c.status === 'COMPLETED').map((c) => c.sessionNumber);
    const lastSession = done.length ? Math.max(...done) : null;
    const coachedBefore: ACoaching[] = Array.isArray(before?.coaching) ? (before.coaching as any[]) : [];
    /* The coaching is read again, and a new one chosen, only when a new check-in of theirs has finished. */
    const newSession = lastSession !== null && lastSession !== (before?.lastSession ?? null);
    const coaching = newSession ? theCoachingFollowedUp(coachedBefore, record, lastSession, now, zone, input.sales) : theCoachingTheRecordStillHolds(coachedBefore, record);
    const p = (read.ground.participants as any[]).find((x) => x.id === input.participantId);
    const data = {
      groundId, organizationId: read.ground.organizationId ?? null, userId: p?.userId ?? null,
      record: record as any, coaching: coaching as any, lastSession, builtFrom, builtAt: now,
    };
    await prisma.personRecord.upsert({ where: { participantId: input.participantId }, create: { participantId: input.participantId, ...data }, update: data });
    wrote++;
  }
  return wrote;
}

/** One person's stored record in one check-in, as it was last built. Reads only. */
export async function readThePersonsRecord(prisma: any, participantId: string | null | undefined): Promise<AStoredPersonsRecord | null> {
  if (!participantId || !prisma?.personRecord?.findUnique) return null;
  try {
    const row = await prisma.personRecord.findUnique({ where: { participantId } });
    if (!row?.record) return null;
    return { groundId: row.groundId, participantId: row.participantId, record: row.record as ThePersonsRecord, coaching: (Array.isArray(row.coaching) ? row.coaching : []) as ACoaching[], lastSession: row.lastSession ?? null, builtAt: new Date(row.builtAt) };
  } catch {
    return null;
  }
}

/**
 * The same person's stored records in their other check-ins in the same organisation, with each check-in's name. For the person alone:
 * each person's load across check-ins is private, always, so this is never read for anybody else.
 */
export async function readTheirOtherRecords(prisma: any, userId: string | null | undefined, organizationId: string | null | undefined, notGroundId: string): Promise<{ label: string; stored: AStoredPersonsRecord }[]> {
  if (!userId || !organizationId || !prisma?.personRecord?.findMany) return [];
  try {
    const rows: any[] = await prisma.personRecord.findMany({ where: { userId, organizationId, groundId: { not: notGroundId } }, orderBy: { builtAt: 'desc' } });
    if (!rows?.length) return [];
    const grounds: any[] = await (prisma.ground?.findMany?.({ where: { id: { in: rows.map((r) => r.groundId) } }, select: { id: true, label: true } }) ?? Promise.resolve([])).catch(() => []);
    return rows.map((row) => ({
      label: String(grounds.find((g) => g.id === row.groundId)?.label ?? 'Another check-in'),
      stored: { groundId: row.groundId, participantId: row.participantId, record: row.record, coaching: Array.isArray(row.coaching) ? row.coaching : [], lastSession: row.lastSession ?? null, builtAt: new Date(row.builtAt) },
    }));
  } catch {
    return [];
  }
}

/**
 * THE READER'S OWN RECORD FOR ONE SESSION, FOR THEIR OWN REPORT (Groundwork does the managing, part 1). Only the reader's own: their place
 * in the check-in is found from their sign-in, never from a person asked for. Null where judgements of a person are off for the
 * organisation, where nothing is kept for them yet, or where the session holds nothing of it. The caller serves it only where the direct
 * morning is on.
 */
export async function yourRecordInYourReport(prisma: any, groundId: string, sessionNumber: number, userId: string): Promise<(TheRecordInWords) | null> {
  if (!userId) return null;
  const ground = await Promise.resolve(prisma?.ground?.findUnique?.({ where: { id: groundId }, select: { organizationId: true, label: true, initiator: { select: { firstName: true } }, organization: { select: { timeZone: true } } } })).catch(() => null);
  if (!ground || !(await thePersonJudgementsAreOn(prisma, ground.organizationId))) return null;
  const me = await Promise.resolve(prisma?.groundParticipant?.findFirst?.({ where: { groundId, userId }, select: { id: true, user: { select: { firstName: true } } } })).catch(() => null);
  if (!me?.id) return null;
  const stored = await readThePersonsRecord(prisma, me.id);
  if (!stored || stored.groundId !== groundId) return null;
  const words = theRecordInWords(theRecordForOneSession(stored.record, sessionNumber), stored.coaching.filter((c) => c.afterSession <= sessionNumber), { self: true, firstName: String(me.user?.firstName ?? '') }, ground.label || 'this check-in');
  /* What the lead praised them for, from her board (Groundwork does the managing, part 2), in their own report too. */
  const praise = await thePraiseFromYourLead(prisma, me.id, String(ground.initiator?.firstName ?? '').trim(), ground.organization?.timeZone || 'Africa/Nairobi');
  if (!words.parts.length && !words.coaching.length && !praise) return null;
  return { ...words, ...(praise ? { fromYourLead: praise } : {}), heading: 'What Groundwork followed up for you' };
}
