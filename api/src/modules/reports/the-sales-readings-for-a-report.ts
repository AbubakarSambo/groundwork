import { NOT_A_QUIET_CLOSE } from '../grounds/an-answer-includes-a-refusal';
import { isASalesKind } from '../board/the-kind-of-work';
import { theReleaseOneSalesBoardIsOn } from '../board/release-one-sales-board';
import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { theNamesOnOurSide, theContactOf, notAnsweringSince } from '../board/a-deal-that-has-stalled';
import { thePromisesCarriedOver } from '../board/a-promise-carried-over';
import { theCallsNotAnswered } from '../board/what-needs-you-and-what-to-do';
import { yourOwnReport } from './your-own-report-from-the-record';
import {
  howMuchItCanRelyOn, thePromisesWithNoDay, theQuotesSaidYesTo, aMoveInTheThirdPerson, aPersonsDayInShort, asAWillDo, isTheirOwnPromise,
  whereTheySeeItDifferently, whatWentQuietSince, whatIsNotKnownYet, howSureGroundworkIs, theUnitsOf, type ADayMove, type AWaitOnTheDay,
} from './the-sales-team-report-from-the-record';
import { theDealsOnRecord, theSalesStages, type ADealOnRecord } from '../board/a-sales-aim-is-counted-from-the-deals';
import { thePriceRangeAnswer } from '../board/a-deals-four-criteria';
import { theBuyingDateOf, theBuyingDateTheySaid, aLineIsAbout } from '../board/a-deals-value-and-buying-date';
import { theirLine } from '../board/each-persons-line-today';
import { theyRunThisCheckIn } from '../board/an-untold-goal-is-not-a-board-objective';
import { cleanText } from './what-the-record-actually-holds';
import { theirWordsWithTheName } from '../board/who-him-is-in-their-check-in';
import {
  aDayKey, aDayInWords, aDayWithItsWeekday, theMovesOnTheDays, theFirstMoveOnRecord, inShortFromTheMoves, whyTheNumbersDontMatch,
  oneThingToThinkAbout, theDocumentsDateOverWhatWasSaid, aCustomersPromiseOnTheirDeal, whatAMoveSays,
} from './a-sales-report-read-from-the-deals';

/**
 * THE SALES READINGS, ADDED TO A REPORT AS IT IS SERVED (Hafsah's points 15, 16, 18, 19, 20, 21 and 22, 18 October 2026),
 * behind Release 1's switch, on a sales check-in only. Read from the record; nothing is written. See
 * a-sales-report-read-from-the-deals for each rule.
 *
 * WHO READS WHAT:
 *  - the team's day (the title's day, In short, what moved, why the numbers don't match) and each person's short line: whoever
 *    runs the check-in, as the rest of the team's report before it is shared;
 *  - one thing to think about: the person who checked in, about their own deals only, in their own report;
 *  - their own lines read with a document's date, and a customer's promise said as the customer's: the person alone, in their
 *    own lines.
 * Anybody else is served the report exactly as before.
 */

type Prisma = any;

interface Ground {
  id: string; organizationId: string | null; initiatorId: string | null; createdByUserId?: string | null; kindOfWork: string | null; workStages: unknown;
  participants: { id: string; userId: string | null; partyType?: string | null; nameGiven?: string | null; user?: { firstName?: string | null; lastName?: string | null } | null }[];
}

async function theGround(prisma: Prisma, groundId: string): Promise<Ground | null> {
  return (prisma.ground?.findUnique?.({
    where: { id: groundId },
    select: {
      id: true, organizationId: true, initiatorId: true, createdByUserId: true, kindOfWork: true, workStages: true,
      participants: { select: { id: true, userId: true, partyType: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } },
    },
  }) ?? Promise.resolve(null)).catch(() => null);
}

/** Release 1's switch is on for this check-in's organisation, and it is a sales check-in. */
export async function aReleaseOneSalesCheckIn(prisma: Prisma, ground: Pick<Ground, 'organizationId' | 'kindOfWork'> | null): Promise<boolean> {
  if (!ground || !isASalesKind(ground.kindOfWork)) return false;
  return theReleaseOneSalesBoardIsOn(prisma, ground.organizationId).catch(() => false);
}

const stop = (x: string) => String(x ?? '').trim().replace(/[.\s]+$/, '');
const firstName = (p: Ground['participants'][number] | undefined) => String(p?.user?.firstName ?? p?.nameGiven ?? '').trim().split(/\s+/)[0] || null;
const fullName = (p: Ground['participants'][number]) => [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || String(p.nameGiven ?? '').trim();

async function everyLine(prisma: Prisma, groundId: string): Promise<{ id: string; text: string; raw: string; type: string | null; participantId: string | null; checkInId: string | null; createdAt: Date; anchoredDocumentId: string | null }[]> {
  const rows = ((await (prisma.recordEntry?.findMany?.({
    where: { participant: { groundId }, disputedAt: null },
    select: { id: true, text: true, type: true, participantId: true, checkInId: true, createdAt: true, anchoredDocumentId: true },
    orderBy: { createdAt: 'asc' },
  }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[];
  return rows.map((r) => ({ ...r, raw: String(r.text ?? ''), text: cleanText(String(r.text ?? '')), createdAt: new Date(r.createdAt) }));
}

/**
 * The end of the day a check-in finished on, in the organisation's day: what a check-in brings is written a little after it
 * ends (a deal's stage, kept seconds later), so a report about that day reads the record as it stood when the day ended.
 */
export function theEndOfTheDay(at: Date, zone: string): Date {
  const day = aDayKey(at, zone);
  let t = at.getTime();
  const step = 15 * 60 * 1000;
  while (aDayKey(new Date(t + step), zone) === day && t - at.getTime() < 86_400_000) t += step;
  let end = t;
  while (aDayKey(new Date(end + 60_000), zone) === day && end - t < step) end += 60_000;
  return new Date(end + 59_999);
}

/** The session report with the sales readings this reader may read. */
export async function withTheSalesReadings<T>(prisma: Prisma, groundId: string, sessionNumber: number, requestingUserId: string, served: T): Promise<T> {
  if (!served || typeof served !== 'object' || (served as any).withheldUntilYouAnswer) return served;
  const ground = await theGround(prisma, groundId);
  if (!ground || !(await aReleaseOneSalesCheckIn(prisma, ground))) return served;
  const zone = (await theOrganisationsZone(prisma, ground.organizationId as string).catch(() => null)) ?? THE_PRODUCTS_OWN_ZONE;
  const out: any = { ...(served as any), releaseOneSalesReport: true };
  const me = ground.participants.find((p) => p.userId === requestingUserId) ?? null;
  const isTheLead = ground.initiatorId === requestingUserId;
  const runsIt = isTheLead || (!me && theyRunThisCheckIn(requestingUserId, ground as any));

  const checkIns = ((await (prisma.checkIn?.findMany?.({
    /* A session the clock closed with nothing said is not a check-in made, as the board and the count read it (staging S20: "Last updated
       ... when Associate checked in" beside a board that said nobody had). */
    where: { groundId, sessionNumber, status: 'COMPLETED', isSetup: false, AND: [NOT_A_QUIET_CLOSE] },
    select: { id: true, participantId: true, completedAt: true, optional: true },
  }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[];
  const done = checkIns.filter((c) => c.completedAt).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  /*
   * THE SESSION'S OWN DAY: the first check-in the team made in it, as the board and the list of check-ins date a session (the lead's own
   * optional check-in never dates it). The title said the day of the latest one, so check-in 4 was "The team's report, Saturday 28
   * November" beside "Mon, 23 Nov" for the same check-in on the board and the Reports tab (page audit, 24 November, row 9).
   */
  if (!done.length) return out;
  const theTeams = done.filter((c) => !c.optional);
  const theSessionsDay = aDayKey(new Date((theTeams.length ? theTeams : done).slice(-1)[0].completedAt), zone);

  const deals: ADealOnRecord[] = await theDealsOnRecord(prisma, groundId, { paymentRecord: true }).catch(() => [] as ADealOnRecord[]);
  const stages = theSalesStages(ground.workStages);
  const lines = await everyLine(prisma, groundId);
  const buyingDateOf = (d: ADealOnRecord) => theBuyingDateOf(d.fields) ?? theBuyingDateTheySaid(d, lines);

  const waits = ((await (prisma.groundDependency?.findMany?.({ where: { groundId } }) ?? Promise.resolve([])).catch(() => [])) ?? []) as AWaitOnTheDay[];
  const turns = ((await (prisma.conversationTurn?.findMany?.({
    where: { checkIn: { groundId } }, select: { checkInId: true, role: true, content: true }, orderBy: { createdAt: 'asc' },
  }) ?? Promise.resolve([])).catch(() => [])) ?? []) as { checkInId: string; role: string; content: string }[];
  const everyCheckIn = ((await (prisma.checkIn?.findMany?.({
    where: { groundId, status: 'COMPLETED', isSetup: false }, select: { id: true, participantId: true, status: true, isSetup: true, completedAt: true },
  }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[];
  const ourSide = await theNamesOnOurSide(prisma, ground.organizationId, ground.participants as any[]).catch(() => [] as string[]);
  const documents = ((await (prisma.groundDocument?.findMany?.({ where: { groundId }, select: { id: true, fileName: true, content: true, participantId: true, createdAt: true } }) ?? Promise.resolve([])).catch(() => [])) ?? []) as { id: string; fileName: string | null; content: string | null; participantId: string | null; createdAt: Date | string }[];
  const people = ground.participants.flatMap((x) => [fullName(x), firstName(x) ?? '']).filter((n) => n.length >= 2).sort((a, b) => b.length - a.length);
  const namesOnRecord = [...people, ...deals.map((d) => theContactOf(d.fields ?? null) ?? '').filter(Boolean)];
  /* Or the wait they said it about names him: Kevin's "I'll follow up with him on Monday." is what he tried on his wait on Ali. */
  const squashed = (x: string) => String(x ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const whoHimIsInTheirWait = (l: { text: string; participantId: string | null }): string | null => {
    if (!/\bhim\b/i.test(l.text)) return null;
    const said = squashed(l.text);
    const w = waits.find((x) => x.fromParticipantId === l.participantId && String(x.onLabel ?? '').trim()
      && [(x as any).triedSaid, x.then].some((t) => t && squashed(t).length >= 12 && (said.includes(squashed(t)) || squashed(t).includes(said))));
    return w ? l.text.replace(/\bhim\b/gi, String(w.onLabel).trim()) : null;
  };
  /* Their words with who "him" is, where the check-in names him (who-him-is-in-their-check-in). */
  const named = (l: { text: string; checkInId: string | null; participantId: string | null }) => {
    const p = ground.participants.find((x) => x.id === l.participantId);
    return (l.checkInId && /\bhim\b/i.test(l.text)
      ? theirWordsWithTheName(l.text, turns.filter((t) => t.checkInId === l.checkInId).map((t) => ({ role: String(t.role ?? 'PERSON'), content: String(t.content ?? '') })), namesOnRecord, p ? [fullName(p), firstName(p) ?? ''].filter((n) => n.length >= 2) : [])
      : null) ?? whoHimIsInTheirWait(l) ?? theOneNamedJustBefore(l) ?? l.text;
  };
  /* Or the line just before it in the same check-in named him: "If I don't hear from him by Monday, ..." follows "I'll follow up with him on Monday." */
  function theOneNamedJustBefore(l: { text: string; checkInId: string | null; participantId: string | null }): string | null {
    if (!/\bhim\b/i.test(l.text) || !l.checkInId) return null;
    const before = lines.filter((x) => x.checkInId === l.checkInId && x.participantId === l.participantId && x.text !== l.text && /\bhim\b/i.test(x.text));
    for (const x of before) {
      const w = whoHimIsInTheirWait(x);
      if (w) {
        const who = waits.find((y) => y.fromParticipantId === l.participantId && String(y.onLabel ?? '').trim() && w.includes(String(y.onLabel).trim()))?.onLabel;
        if (who) return l.text.replace(/\bhim\b/gi, String(who).trim());
      }
    }
    return null;
  }

  if (runsIt) {
    const day = aDayKey(new Date(done[0].completedAt), zone);
    const days = new Set(done.map((c) => aDayKey(new Date(c.completedAt), zone)));
    const today = aDayKey(new Date(), zone);
    const owner = (pid: string | null) => firstName(ground.participants.find((p) => p.id === pid));
    const lastStage = stages.length ? stages[stages.length - 1] : 'Won';
    /* A stage moved, or the customer said yes to the quote that day (quality pass, 18 October, T-4: Savannah Cafe's yes). */
    const stageMoves: ADayMove[] = theMovesOnTheDays(deals, stages, days, zone);
    const moves: ADayMove[] = [...stageMoves, ...theQuotesSaidYesTo(deals, days, new Set(stageMoves.map((m) => m.dealId)), lastStage)];
    const lead = ground.participants.find((p) => p.userId === ground.initiatorId);
    const leadFirst = firstName(lead);
    const lastIn = new Date(done[0].completedAt);
    const lastInName = owner(done[0].participantId);
    const time = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: zone }).format(lastIn).replace(':00', '').replace(/\s/g, '').toLowerCase();
    const dayCheckIns = new Set(done.map((c) => c.id as string));
    const theDaysLines = lines.filter((l) => l.checkInId && dayCheckIns.has(l.checkInId));
    const endOfTheDay = theEndOfTheDay(lastIn, zone);
    const linesByThen = lines.filter((l) => l.createdAt.getTime() <= endOfTheDay.getTime());
    const quietSince = new Map(deals.map((d) => [d.id, notAnsweringSince(d.name, linesByThen, { people: ourSide, contact: theContactOf(d.fields), peopleThere: d.peopleThere ?? [] })]));
    const contacts = deals.map((d) => ({ contact: theContactOf(d.fields ?? null) ?? '', deal: d.name, owner: d.ownerParticipantId })).filter((c) => c.contact);
    const counted: any[] = Array.isArray(out.counting) && out.counting.length ? out.counting : done;
    const carried = thePromisesCarriedOver(
      [...waits].sort((x, y) => Number(deals.some((d) => String(y.what ?? '').includes(d.name))) - Number(deals.some((d) => String(x.what ?? '').includes(d.name)))) as any[], everyCheckIn.filter((c) => c.completedAt && new Date(c.completedAt).getTime() <= endOfTheDay.getTime()),
      linesByThen as any[], turns, deals.map((d) => d.name),
    );
    const dayWord = day === today ? 'today' : `on ${aDayInWords(day)}`;

    /* In short: the kit's count of what moved, then the news in it, then what waits on a person (T-3). */
    const news: string[] = [];
    const told = new Set<string | null>();
    for (const m of [...moves].sort((x, y) => Number(!!y.accepted) - Number(!!x.accepted))) {
      if (news.length >= 2) break;
      const d = deals.find((x) => x.id === m.dealId);
      if (!d) continue;
      const contact = theContactOf(d.fields) ?? '';
      const n = theUnitsOf(d);
      if (m.accepted && n !== null) {
        const pays = aMoveInTheThirdPerson(m, d, [], waits, owner(m.ownerParticipantId) ?? '')?.split('. ')[1] ?? null;
        news.push(`${d.name} said yes to ${n} ${n === 1 ? 'unit' : 'units'}${pays && contact ? `, and ${stop(pays)}` : ''}.`);
        told.add(m.ownerParticipantId);
      } else if (/quot/i.test(m.to) && String(d.fields?.Quoted ?? '').trim() && !told.has(m.ownerParticipantId)) {
        news.push(`${owner(m.ownerParticipantId)} quoted ${d.name} ${String(d.fields.Quoted).trim()}.`);
        told.add(m.ownerParticipantId);
      }
    }
    const leadPid = lead?.id ?? null;
    for (const p of ground.participants) {
      const first = firstName(p);
      if (!first || p.id === leadPid) continue;
      const c = carried.find((x) => x.participantId === p.id);
      if (c) {
        const thing = c.says.replace(/,\s*promised three check-ins running.*$/, '');
        news.push(`${first} has still not ${/\b(?:sample|unit|stock|order)s?\b/i.test(thing) ? 'brought' : 'done'} ${thing.charAt(0).toLowerCase()}${thing.slice(1)}, promised three check-ins running.`);
      }
      const onTheLead = waits.find((w) => w.fromParticipantId === p.id && w.onParticipantId === leadPid && !w.clearedAt && String(w.status).toUpperCase() !== 'CLEARED');
      if (onTheLead) {
        const amount = (String(onTheLead.what ?? '').match(/\d[\d,]*/) ?? [])[0]?.replace(/,/g, '') ?? null;
        const priced = amount ? deals.find((d) => d.ownerParticipantId === p.id && String(d.fields?.['Price each'] ?? '').replace(/,/g, '').includes(amount)) : undefined;
        const n = priced ? theUnitsOf(priced) : null;
        news.push(priced && n !== null
          ? `${first} is waiting on ${isTheLead ? 'your' : `${leadFirst}’s`} answer on ${n} ${n === 1 ? 'unit' : 'units'} at ${String(priced.fields['Price each']).trim()} each for ${priced.name}.`
          : `${first} is waiting on ${isTheLead ? 'your' : `${leadFirst}’s`} ${stop(String(onTheLead.what ?? 'answer')).replace(/^an?\s+/i, '')}.`);
      }
    }

    /* How much it can rely on (T-1, T-2): who checked in, what has a document behind it, and each promise of their own with no day, named. */
    const noDay = thePromisesWithNoDay(theDaysLines, (l) => named(l));
    const reliance = howMuchItCanRelyOn({
      checkedIn: done.length,
      of: Math.max(done.length, counted.length),
      said: theDaysLines.length,
      documented: theDaysLines.filter((l) => l.anchoredDocumentId).length,
      withNoDay: noDay.map((l) => ({ who: owner(l.participantId) ?? 'Somebody', words: named(l) })),
    });
    out.confidence = { ...(out.confidence ?? {}), band: reliance.band, saying: reliance.saying, reasons: reliance.reasons };

    out.theTeamsDay = {
      day,
      title: `The team’s report, ${aDayWithItsWeekday(theSessionsDay)}`,
      /* The same day as the title, in the organisation's own day (the kit: "Last updated on Wednesday 23 September at 6pm, when Miriam checked in."). */
      lastUpdated: `Last updated on ${aDayWithItsWeekday(aDayKey(lastIn, zone))} at ${time}${lastInName ? `, when ${lastInName} checked in` : ''}. It only changes when something new comes in, such as a check-in, a document or a number from another system.`,
      inShort: [...inShortFromTheMoves(moves, dayWord, day, theFirstMoveOnRecord(deals, zone)), ...news],
      /* What moved: the stage each deal reached, said in the third person from what the deal holds, else its owner's own line (T-4, T-5). */
      moved: moves.map((m) => {
        const theirCheckIns = new Set(done.filter((c) => c.participantId === m.ownerParticipantId).map((c) => c.id));
        const deal = deals.find((d) => d.id === m.dealId);
        const ownerRow = ground.participants.find((p) => p.id === m.ownerParticipantId);
        const who = ownerRow?.userId && ownerRow.userId === requestingUserId ? 'You' : owner(m.ownerParticipantId);
        const theirLines = lines.filter((l) => l.checkInId && theirCheckIns.has(l.checkInId));
        const says = (deal && who ? aMoveInTheThirdPerson(m, deal, theirLines, waits, who) : null)
          ?? whatAMoveSays(m, deal ?? { name: m.name, fields: {} }, theirLines, who);
        return { dealId: m.dealId, name: m.name, owner: owner(m.ownerParticipantId), from: m.from, to: m.to, proven: m.proven, says, ...(m.accepted ? { saidYes: true } : {}) };
      }),
      whyTheNumbersDontMatch: whyTheNumbersDontMatch(
        /* A dropped deal is not open, so it is never a number that does not match (Drop Access run 1, A5). */
        deals.filter((d) => !d.dropped).map((d) => ({ name: d.name, fields: d.fields, stage: d.stage, buyingDate: buyingDateOf(d), ownerFirstName: owner(d.ownerParticipantId) })),
        await thePriceRangeAnswer(prisma, groundId),
        lastStage,
        isTheLead ? 'You' : (leadFirst ?? 'The person who runs it'),
      )?.says ?? null,
      /* Where people see it differently (T-8): the lead's target for each person against a number a person says is their own. */
      whereTheySeeItDifferently: await (async () => {
        const objectives = ((await (prisma.groundObjective?.findMany?.({ where: { groundId } }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[];
        const targets = objectives
          .filter((o) => o.ownerParticipantId && o.ownerParticipantId !== leadPid && !o.setByParticipantId && Number(o.target) > 0 && /\bunits?\b/i.test(String(o.name ?? '')))
          .map((o) => ({ participantId: o.ownerParticipantId as string, target: Number(o.target), unit: 'units' }));
        return whereTheySeeItDifferently({ targets, firstName: owner, lines: linesByThen, lead: leadFirst, zone });
      })(),
      /* How sure Groundwork is (T-12): the sales with a payment or a signed order behind them, and the deals still open. */
      howSure: howSureGroundworkIs(
        /* Sold: at the last stage, or with its payment or signed order on file whatever stage was written (polish round 15, U29). */
        deals.filter((d) => (String(d.stage ?? '').toLowerCase() === lastStage.toLowerCase() || !!d.paymentOnFile) && !d.dropped)
          .map((d) => ({ name: d.name, paid: !!d.paid, signed: !!d.signed, mpesaCode: d.mpesaCode ?? null, byMPesa: documents.some((x) => /m-?pesa/i.test(`${x.fileName ?? ''} ${x.content ?? ''}`) && `${x.fileName ?? ''} ${x.content ?? ''}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').includes(d.name.toLowerCase())) })),
        deals.filter((d) => !d.dropped && !d.paymentOnFile && String(d.stage ?? '').trim() && String(d.stage ?? '').toLowerCase() !== lastStage.toLowerCase()).length,
      ),
    };

    /* What this report can't tell you (T-9): the waits on a customer said that day that nobody has raised since, named. */
    const quiet = whatWentQuietSince({
      day, waits, dayCheckIns, deals,
      notAnswering: new Set([...quietSince.entries()].filter(([, v]) => !!v).map(([k]) => k)),
      laterLines: lines.filter((l) => l.createdAt.getTime() > endOfTheDay.getTime()),
      firstName: owner,
    });
    if (quiet || out.whatWentQuiet) out.whatWentQuiet = quiet;

    /* What is not known yet (T-10, T-11), for the service to serve in place of the open questions' list. */
    out.whatIsNotKnownYetFromTheDeals = whatIsNotKnownYet({
      now: new Date(), zone, waits, lastStage,
      deals: deals.map((d) => {
        const since = quietSince.get(d.id) ?? null;
        /* The last day anybody heard from them, before the silence began (the board's own "no reply since"). */
        const heard = since ? linesByThen.filter((l) => l.participantId === d.ownerParticipantId && aDayKey(l.createdAt, zone) < aDayKey(since, zone) && aLineIsAbout(l.raw, d)).map((l) => l.createdAt).sort((x, y) => y.getTime() - x.getTime())[0] ?? null : null;
        return { ...d, buyingDate: buyingDateOf(d), notAnsweringSince: since, heardLastOn: heard };
      }),
      linesSince: (after) => lines.filter((l) => l.createdAt.getTime() >= after.getTime()),
      firstName: owner,
      readerPid: me?.id ?? null,
    });

    /* Each person's day in short (T-6), marked proven or said (T-7), and what they said they will do. Their own words stay on the row. */
    if (Array.isArray(out.whatEachPersonSaid)) {
      out.whatEachPersonSaid = (out.whatEachPersonSaid as any[]).map((row) => {
        const p = ground.participants.find((x) => fullName(x) === row?.who || firstName(x) === row?.who);
        const c = p ? done.find((x) => x.participantId === p.id) : null;
        if (!p || !c) return row;
        const theirDeals = deals.filter((d) => d.ownerParticipantId === p.id);
        const theirLines = lines.filter((l) => l.checkInId === c.id);
        const spokenOf = theirDeals.filter((d) => String(d.stage ?? '').toLowerCase() === lastStage.toLowerCase() && !d.paid
          && theirLines.some((l) => l.text.toLowerCase().includes(d.name.split(/\s+/)[0].toLowerCase())));
        const callsSaid = theirDeals.map((d) => {
          const since = quietSince.get(d.id);
          if (!since) return null;
          const calls = theCallsNotAnswered({ name: d.name, fields: d.fields, ownerParticipantId: d.ownerParticipantId, notAnsweringSince: aDayKey(since, zone) }, theirLines);
          if (!calls) return null;
          const times = calls.calls === 1 ? 'once' : calls.calls === 2 ? 'twice' : `${calls.calls} times`;
          return `Called ${theContactOf(d.fields) ?? 'them'} at ${d.name} ${times} more, with no answer.`;
        }).find(Boolean) ?? null;
        const own = theirLines.find((l) => String(l.type ?? '').toUpperCase() === 'COMMITMENT' && isTheirOwnPromise(l.text));
        const day_ = aPersonsDayInShort({
          moves: moves.filter((m) => m.ownerParticipantId === p.id),
          deals,
          wonSpokenOf: spokenOf,
          calls: callsSaid,
          carriedOver: carried.find((x) => x.participantId === p.id)?.says ?? null,
          willDo: own ? asAWillDo(named(own), { lead: leadFirst, readerIsTheLead: isTheLead, contacts: contacts.filter((x) => x.owner === p.id) }) : null,
          fallback: theirLine(theirLines, theirDeals.map((d) => d.name)),
        });
        return { ...row, ...(day_.inShort ? { inShort: day_.inShort } : {}), mark: day_.mark, willDo: day_.willDo };
      });
    }
  }

  if (me && !runsIt) {
    const mine = done.find((c) => c.participantId === me.id);
    if (mine) {
      const theirFirst = (pid: string | null) => firstName(ground.participants.find((p) => p.id === pid));
      const myDeals = deals.filter((d) => d.ownerParticipantId === me.id);
      /* Their open deals that wait only on a colleague, from their own waits (O-7). */
      const waitsOnAColleague = myDeals.filter((d) => !d.dropped).flatMap((d) => {
        const ws = waits.filter((w) => w.fromParticipantId === me.id && w.onParticipantId && w.onParticipantId !== me.id && !w.clearedAt && String(w.status).toUpperCase() !== 'CLEARED');
        const about = ws.find((w) => String(w.what ?? '').toLowerCase().includes(d.name.toLowerCase()));
        if (!about) return [];
        const first = ws.filter((w) => w.onParticipantId === about.onParticipantId).map((w) => new Date(w.createdAt)).sort((x, y) => x.getTime() - y.getTime())[0];
        const thing = stop(String(about.what ?? '')).replace(/^(?:the|a|an|some)\s+/i, '').replace(new RegExp(`\\s+for\\s+${d.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '');
        return [{ dealName: d.name, colleague: theirFirst(about.onParticipantId) ?? 'a colleague', thing, since: first }];
      });
      out.forYouToThinkAbout = oneThingToThinkAbout(
        /* A dropped deal is over: nothing about it is asked again (Drop Access run 1, A5). */
        myDeals.filter((d) => !d.dropped),
        stages,
        lines.filter((l) => l.participantId === me.id),
        theEndOfTheDay(new Date(mine.completedAt), zone),
        { ourSide, buyingDateOf, dayInWords: (d) => aDayInWords(aDayKey(d, zone)), waitsOnAColleague },
      );
      /* Their own report, from their own deals and lines only (quality pass, 18 October, O-1 to O-6). */
      const lastStage = stages.length ? stages[stages.length - 1] : 'Won';
      const myDay = new Set([aDayKey(new Date(mine.completedAt), zone)]);
      const myMoves = theMovesOnTheDays(myDeals, stages, myDay, zone);
      const objectives = ((await (prisma.groundObjective?.findMany?.({ where: { groundId, ownerParticipantId: me.id } }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[];
      const target = objectives.find((o) => o.ownerParticipantId === me.id && !o.setByParticipantId && Number(o.target) > 0 && /\bunits?\b/i.test(String(o.name ?? '')));
      out.yourOwnReport = yourOwnReport({
        lines: lines.filter((l) => l.checkInId === mine.id && l.participantId === me.id),
        deals: myDeals,
        moves: [...myMoves, ...theQuotesSaidYesTo(myDeals, myDay, new Set(myMoves.map((m) => m.dealId)), lastStage)],
        documents: documents.filter((x) => x.participantId === me.id),
        waits: waits.filter((w) => w.fromParticipantId === me.id),
        me: me.id,
        firstName: theirFirst,
        target: target ? { amount: Number(target.target), unit: 'units' } : null,
        lastStage,
        zone,
        named: (l) => named({ ...l, checkInId: mine.id, participantId: me.id }),
      });
    }
  }
  return out as T;
}

/**
 * A PERSON'S OWN LINES, READ RIGHT (points 19 and 20): a customer's promise is said as the customer's, kept on their deal, and
 * never as this person's commitment; a date a document they added gives differently is shown from the document, with what
 * they said noted. Only their own lines, served to them alone.
 */
export async function theirOwnLinesReadRight<R extends { id: string; type: string; text: string; how?: string | null; createdAt?: Date | string; checkInId?: string | null }>(
  prisma: Prisma, participantId: string, rows: R[],
): Promise<R[]> {
  if (!rows.length) return rows;
  const p = await (prisma.groundParticipant?.findUnique?.({ where: { id: participantId }, select: { groundId: true } }) ?? Promise.resolve(null)).catch(() => null);
  if (!p?.groundId) return rows;
  const ground = await theGround(prisma, p.groundId);
  if (!ground || !(await aReleaseOneSalesCheckIn(prisma, ground))) return rows;
  const zone = (await theOrganisationsZone(prisma, ground.organizationId as string).catch(() => null)) ?? THE_PRODUCTS_OWN_ZONE;
  const deals = await theDealsOnRecord(prisma, ground.id, { paymentRecord: true }).catch(() => [] as ADealOnRecord[]);
  const lines = await everyLine(prisma, ground.id);
  const dealsWithDates = deals.map((d) => ({ name: d.name, fields: d.fields, buyingDate: theBuyingDateOf(d.fields) ?? theBuyingDateTheySaid(d, lines) }));
  /* The people in this check-in, by full name and by first name: a promise is only ever named as somebody on record's. */
  const people = ground.participants.flatMap((x) => [fullName(x), firstName(x) ?? '']).filter((n) => n.length >= 2).sort((a, b) => b.length - a.length);
  /* Only the documents this person added: "the document you added". */
  const docs = ((await (prisma.groundDocument?.findMany?.({
    where: { groundId: ground.id, participantId },
    select: { fileName: true, content: true, participantId: true, origin: true },
  }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[];
  /*
   * Who "him" is, from the line before in their own check-in (who-him-is-in-their-check-in): "I'll ask Grace first about the
   * price, then I'll call him back." reads "... then I'll call Mr Kariuki back." Where nobody is named, their words stay.
   */
  const saysHim = rows.filter((r) => r.checkInId && /\bhim\b/i.test(r.text));
  const turns = saysHim.length
    ? (((await (prisma.conversationTurn?.findMany?.({
      where: { checkInId: { in: [...new Set(saysHim.map((r) => r.checkInId as string))] }, checkIn: { participantId }, role: { in: ['AI', 'PERSON'] } },
      select: { checkInId: true, role: true, content: true },
      orderBy: { createdAt: 'asc' },
    }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[])
    : [];
  const me = ground.participants.find((x) => x.id === participantId);
  const speaker = me ? [fullName(me), firstName(me) ?? ''].filter((n) => n.length >= 2) : [];
  const namesOnRecord = [...people, ...deals.map((d) => theContactOf(d.fields ?? null) ?? '').filter(Boolean)];
  const withTheName = (r: R) => (r.checkInId && /\bhim\b/i.test(r.text)
    ? theirWordsWithTheName(r.text, turns.filter((t) => t.checkInId === r.checkInId).map((t) => ({ role: String(t.role ?? 'PERSON'), content: String(t.content ?? '') })), namesOnRecord, speaker)
    : null);
  return rows.map((r) => {
    const promise = aCustomersPromiseOnTheirDeal(r.text, dealsWithDates, people);
    if (promise) return { ...r, type: r.type === 'COMMITMENT' ? 'PROGRESS' : r.type, how: promise, typeSays: null, customersPromise: true };
    const dated = r.createdAt ? theDocumentsDateOverWhatWasSaid({ text: r.text, createdAt: r.createdAt }, docs, zone) : null;
    if (dated) return { ...r, ...(dated.readAs ? { readAs: dated.readAs } : {}), how: dated.how };
    const named = withTheName(r);
    if (named) return { ...r, readAs: named };
    return r;
  });
}
