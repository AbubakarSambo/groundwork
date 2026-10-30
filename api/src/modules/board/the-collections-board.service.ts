import { theRelease3InvoicesIsOn, thePeopleWhoMayRaise, whoRaisesInvoices, theOrganisationsBills, theRaisingPattern, theInvoicesToRaise, whatIsLateToRaise } from './raising-invoices-on-time';
import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { theCollectionsStallRuleIn } from '../grounds/collect-whats-owed';
import { buildTheCollectionsBoard, anAmount, type ABillOnTheBoard, type TheCollectionsBoard } from './the-collections-board';
import { aClaimIn } from './the-persons-record';
import { BILL, LOAN_OWED, FOLLOWS_UP_ID, F, aBillIsNamed, theCollectionsTypeFor } from './the-collections-record';
import { DUE_ON_AN_EVENT, MAY_BE_DUE, whatALineDoesToABill, type ALineKept } from './a-fee-note-due-on-an-event';

/**
 * THE COLLECTIONS BOARD, SERVED TO ONE READER (Release 2, pull request 2 of 3). Read only: opening a board writes nothing.
 *
 * WHO READS WHICH BILL, ENFORCED HERE, BEFORE ANYTHING IS BUILT (release plan, Release 2: "Each person sees only their own fee
 * notes; the lead sees all of them"; the B8 picture: "Each person sees their own; the partner sees all"; for loans, a borrower
 * sees only their own loan):
 *  - whoever runs the check-in (the lead, the admin who set it up, an admin of the organisation) reads every bill;
 *  - a person in it reads only the bills they follow up: the ones they said, or the ones a line put them down to follow up;
 *  - anybody else reads none.
 * The payment documents read are only those filed on a bill this reader may read, and the counts are counted from those bills.
 */

export interface ACollectionsReader { runsIt: boolean; participantId: string | null }

/** Every bill or loan on record for a check-in, with the payment documents filed on it and the check-ins whose lines named it. */
export async function theBillsOnRecord(prisma: any, groundId: string): Promise<ABillOnTheBoard[]> {
  const items = ((await Promise.resolve(prisma?.workItem?.findMany?.({
    where: { groundId, kind: { in: [BILL, LOAN_OWED] } },
    select: { id: true, kind: true, name: true, stage: true, ownerParticipantId: true, dueAt: true, fields: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })).catch(() => [])) ?? []) as any[];
  if (!items.length) return [];
  const evidence = ((await Promise.resolve(prisma?.itemEvidence?.findMany?.({
    where: { groundId, workItemId: { in: items.map((i) => i.id) }, countsAsProof: true },
    select: { workItemId: true, readAs: true, shows: true, createdAt: true, participantId: true },
  })).catch(() => [])) ?? []) as any[];
  const lines = ((await Promise.resolve(prisma?.recordEntry?.findMany?.({
    where: { participant: { groundId }, disputedAt: null },
    select: { id: true, text: true, checkInId: true, participantId: true, type: true, createdAt: true },
  })).catch(() => [])) ?? []) as any[];
  /* What people said in their own words, for an amount the record did not keep (final real-model check, item 9). */
  const said = ((await Promise.resolve(prisma?.conversationTurn?.findMany?.({
    where: { checkIn: { groundId }, role: 'PERSON' },
    select: { content: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })).catch(() => [])) ?? []) as any[];
  const elsewhere = await thePaymentsSaidElsewhere(prisma, groundId, items);
  return items.map((i) => ({
    id: i.id, kind: i.kind, name: i.name, stage: i.stage ?? null, ownerParticipantId: i.ownerParticipantId ?? null, dueAt: i.dueAt ?? null,
    fields: withTheAmountSaid(i, items, said.map((x) => String(x.content ?? ''))),
    paidSaidElsewhere: elsewhere.get(i.id) ?? [],
    /* Who said it was paid: the person whose own line says so, never the person who first named the bill (item 9: "You marked FN-004 paid" of Wanjiru, when Njeri said it). */
    paidSaidBy: i.kind === BILL ? (lines.filter((l) => String(l.type ?? '').toUpperCase() === 'PROGRESS' && aBillIsNamed(String(l.text ?? ''), i) && aPaymentIsSaid(String(l.text ?? '')))
      .sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime())[0]?.participantId ?? null) : null,
    createdAt: i.createdAt,
    /* Paid means proof: a payment document filed on this bill (proof-filed-on-its-item), never the words "I have the slip". */
    proof: evidence.filter((e) => e.workItemId === i.id && e.readAs === 'A payment').map((e) => ({ readAs: e.readAs, shows: e.shows ?? null, on: e.createdAt, addedBy: e.participantId ?? null })),
    saidIn: [...new Set(lines.filter((l) => l.checkInId && (i.kind === LOAN_OWED ? l.participantId === i.ownerParticipantId : aBillIsNamed(String(l.text ?? ''), i))).map((l) => String(l.checkInId)))],
  }));
}

/**
 * A PAYMENT SAID IN ANOTHER CHECK-IN OF THE ORGANISATION REACHES THE BILL (final real-model check, item 7). Aisha said in the litigation
 * daily "Oh, and Jamii said they've cleared our fee note too", and the fee notes record never heard it. A line of another check-in in the
 * same organisation that says a payment, and names one bill by its number, or by its client where that client has only one bill here
 * and the line speaks of a bill ("fee note", "invoice", "bill"), is kept beside that bill. Who said it and the words are served only to a
 * reader who may read that check-in (withTheEventsSaid).
 */
async function thePaymentsSaidElsewhere(prisma: any, groundId: string, items: any[]): Promise<Map<string, ALineKept[]>> {
  const out = new Map<string, ALineKept[]>();
  const bills = items.filter((i) => i.kind === BILL);
  if (!bills.length) return out;
  const g = await Promise.resolve(prisma?.ground?.findUnique?.({ where: { id: groundId }, select: { organizationId: true } })).catch(() => null) as any;
  if (!g?.organizationId) return out;
  const others = ((await Promise.resolve(prisma?.ground?.findMany?.({ where: { organizationId: g.organizationId }, select: { id: true, label: true } })).catch(() => [])) ?? []) as any[];
  const otherIds = others.map((x) => x.id).filter((id) => id !== groundId);
  if (!otherIds.length) return out;
  const lines = ((await Promise.resolve(prisma?.recordEntry?.findMany?.({
    where: { participant: { groundId: { in: otherIds } }, disputedAt: null, type: 'PROGRESS' },
    select: { id: true, text: true, participantId: true, createdAt: true, participant: { select: { groundId: true } } },
  })).catch(() => [])) ?? []) as any[];
  const firstWord = (c: string) => String(c ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  const clientOf = (b: any) => String(b.fields?.[F.client] ?? '').trim();
  for (const l of lines) {
    const text = String(l.text ?? '').replace(/\[[^\]]*\]/g, '').trim();
    if (!text || !aPaymentIsSaid(text)) continue;
    const lgid = l.participant?.groundId ?? null;
    if (!lgid || lgid === groundId || !otherIds.includes(lgid)) continue;
    const byNumber = bills.filter((b) => /\d/.test(String(b.fields?.[F.number] ?? '')) && aBillIsNamed(text, { name: '', fields: { [F.number]: b.fields?.[F.number] } }));
    let bill = byNumber.length === 1 ? byNumber[0] : null;
    if (!bill && !byNumber.length && /\b(?:fee notes?|invoices?|bills?)\b/i.test(text)) {
      const lower = ` ${text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')} `;
      const named = bills.filter((b) => firstWord(clientOf(b)).length >= 4 && lower.includes(` ${firstWord(clientOf(b))} `));
      const clients = new Set(named.map((b) => clientOf(b).toLowerCase()));
      /* One client: its one numbered fee note, beside a row for the client itself ("Jamii Clinics" beside FN-007). */
      const numbered = named.filter((b) => /\d/.test(String(b.fields?.[F.number] ?? '')));
      if (clients.size === 1) bill = named.length === 1 ? named[0] : numbered.length === 1 ? numbered[0] : null;
    }
    if (!bill) continue;
    const at = new Date(l.createdAt ?? Date.now()).toISOString();
    const kept: ALineKept = { lineId: l.id, groundId: lgid, label: String(others.find((x) => x.id === lgid)?.label ?? '').trim(), saidBy: l.participantId ?? null, text, at, day: at.slice(0, 10) };
    out.set(bill.id, [...(out.get(bill.id) ?? []), kept]);
  }
  return out;
}

/* A payment said, in the past, with nothing in the sentence that says it is not so (the person's record reads it the same way). */
const aPaymentIsSaid = (text: string) => String(text ?? '').split(/(?<=[.!?])\s+/).some((x) => aClaimIn(x) === 'payment');

/**
 * THE AMOUNT SAID, WHERE THE RECORD KEPT NONE (final real-model check, item 9). Wanjiru said "FN-005 for Kasarani Foods, also KES 250,000,
 * and FN-008 for Nyota Logistics, which is KES 90,000", and Brian said "FN-008 for Nyota Logistics is KES 90,000", but neither amount was
 * kept, and her morning said "KES 70,000 is owed on 3 fee notes, and 2 of them have no amount on record." A bill with no amount takes the
 * amount said straight after its own number, before any other bill's number, in somebody's own words; a paid one, the amount paid. Where
 * two amounts were said for it, none is taken.
 */
export function withTheAmountSaid(i: { kind: string; name: string; fields: unknown }, all: { kind: string; name: string; fields: unknown }[], said: string[]): Record<string, unknown> {
  const fields = { ...((i.fields && typeof i.fields === 'object' ? i.fields : {}) as Record<string, unknown>) };
  if (i.kind !== BILL || String(fields[F.amount] ?? '').trim()) return fields;
  const paid = String(fields[F.paid] ?? '').trim();
  if (/\d/.test(paid)) { fields[F.amount] = paid; return fields; }
  const number = String(fields[F.number] ?? '').trim();
  if (!/\d/.test(number)) return fields;
  const others = all.filter((x) => x !== i && x.kind === BILL).map((x) => String(((x.fields ?? {}) as any)[F.number] ?? '').trim()).filter((x) => /\d/.test(x));
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/-/g, '[\\s-]?');
  const amounts = new Set<string>();
  for (const text of said) {
    for (const m of text.matchAll(new RegExp(`(?<![A-Za-z0-9])${esc(number)}(?![0-9])`, 'gi'))) {
      let rest = text.slice((m.index ?? 0) + m[0].length);
      for (const o of others) { const at = rest.search(new RegExp(`(?<![A-Za-z0-9])${esc(o)}(?![0-9])`, 'i')); if (at >= 0) rest = rest.slice(0, at); }
      rest = rest.split(/(?<=[.!?])\s/)[0];
      const amount = /\b(?:KES|KSh|Ksh|Kshs)\.?\s?[\d,]+(?:\.\d+)?\b/i.exec(rest)?.[0];
      if (amount && !/\b(?:don['’]?t|do not|no|not)\b[^.]*\bamount\b/i.test(rest)) amounts.add(String(anAmount(amount)?.value ?? amount));
    }
  }
  if (amounts.size === 1) fields[F.amount] = `KES ${Number([...amounts][0]).toLocaleString('en-US')}`;
  return fields;
}

/** The bills this reader may read: every one to whoever runs it; to a person, the ones they follow up or owe. */
export function theBillsThisReaderMayRead<T extends { ownerParticipantId: string | null; fields: Record<string, unknown> | null }>(rows: T[], reader: ACollectionsReader): T[] {
  if (reader.runsIt) return rows;
  if (!reader.participantId) return [];
  return rows.filter((r) => r.ownerParticipantId === reader.participantId || String((r.fields ?? {})[FOLLOWS_UP_ID] ?? '') === reader.participantId);
}

/** The collections board for this reader, or null where this is not a collections check-in with Release 2 on. */
export async function theCollectionsBoardFor(prisma: any, groundId: string, reader: ACollectionsReader, now: Date = new Date()): Promise<TheCollectionsBoard | null> {
  const it = await theCollectionsTypeFor(prisma, groundId);
  if (!it) return null;
  const ground = await Promise.resolve(prisma?.ground?.findUnique?.({
    where: { id: groundId },
    select: { organizationId: true, initiatorId: true, participants: { select: { id: true, userId: true, nameGiven: true, partyType: true, user: { select: { firstName: true } } } } },
  })).catch(() => null) as any;
  if (!ground) return null;
  const zone = (await theOrganisationsZone(prisma, ground.organizationId).catch(() => null)) ?? THE_PRODUCTS_OWN_ZONE;
  const readerUserId = ((ground.participants ?? []) as any[]).find((p) => p.id === reader.participantId)?.userId ?? null;
  const isTheLead = !!readerUserId && readerUserId === ground.initiatorId;
  const rows = await withTheEventsSaid(prisma, theBillsThisReaderMayRead(await theBillsOnRecord(prisma, groundId), reader), { userId: readerUserId, isTheLead }, zone);
  const people = ((ground.participants ?? []) as any[]).map((p) => ({
    id: p.id,
    firstName: String(p.user?.firstName ?? p.nameGiven ?? '').trim().split(/\s+/)[0] || '',
    isTheLead: p.partyType === 'INITIATOR' || (!!ground.initiatorId && p.userId === ground.initiatorId),
  }));
  /* The latest check-in each person made: only the people whose bills this reader reads. */
  const whose = new Set(rows.map((r) => r.ownerParticipantId).filter(Boolean) as string[]);
  const done = whose.size ? (((await Promise.resolve(prisma?.checkIn?.findMany?.({
    where: { groundId, status: 'COMPLETED', isSetup: false, participantId: { in: [...whose] } },
    select: { participantId: true, completedAt: true },
  })).catch(() => [])) ?? []) as any[]) : [];
  const lastCheckIn: Record<string, Date | null> = {};
  for (const c of done) {
    const at = c.completedAt ? new Date(c.completedAt) : null;
    if (at && (!lastCheckIn[c.participantId] || at > (lastCheckIn[c.participantId] as Date))) lastCheckIn[c.participantId] = at;
  }
  const ways = ((await Promise.resolve(prisma?.groundContextItem?.findMany?.({ where: { groundId, kind: 'WAY_OF_WORKING' }, select: { text: true, kind: true, closedAt: true } })).catch(() => [])) ?? []) as any[];
  /* Release 3, where it is on: who raises the invoices here, and their pattern when they raise late (raising-invoices-on-time). */
  let raising: { raiser: string | null; pattern: { says: string; instances: string[] } | null; lateLines?: string[] } | undefined;
  if (await theRelease3InvoicesIsOn(prisma, ground.organizationId)) {
    const mayRaise = await thePeopleWhoMayRaise(prisma, groundId);
    const raiserId = whoRaisesInvoices(mayRaise, null);
    const raiser = mayRaise.find((p) => p.id === raiserId) ?? null;
    const theirName = raiser ? (raiser.id === reader.participantId ? 'You' : raiser.firstName) : null;
    const allHere = (await theOrganisationsBills(prisma, ground.organizationId)).filter((b) => b.groundId === groundId);
    const today = now.toISOString().slice(0, 10);
    const lateLines = theInvoicesToRaise(allHere, today).filter((i) => i.daysLate >= 1).map((i) => whatIsLateToRaise(i, it.billWord, raiser && !raiser.isTheLead ? raiser.firstName : null));
    raising = { raiser: theirName, pattern: raiser ? theRaisingPattern(allHere, raiser.firstName, it.billWord) : null, lateLines };
  }
  return buildTheCollectionsBoard({
    type: it.type, billWord: it.billWord, rows, people, lastCheckIn, now, zone, reader,
    stallRuleSet: theCollectionsStallRuleIn(ways).set,
    groundId,
    ...(raising ? { raising } : {}),
  });
}

/**
 * THE EVENTS SAID IN A MATTER CHECK-IN, ON THE BILLS THIS READER READS (a-fee-note-due-on-an-event). A bill that fell due on an event
 * carries the line that said it; where a line came close, the lead is asked. What people say in a check-in is shown word for word only
 * to the people in that check-in (and whoever runs it): a reader who is not in the matter check-in reads that it was reported there,
 * and on which day, never the words or who said them. The lines that came close are given to the lead of this check-in only.
 */
export async function withTheEventsSaid<T extends ABillOnTheBoard>(prisma: any, rows: T[], reader: { userId: string | null; isTheLead: boolean }, zone: string): Promise<T[]> {
  const kept = (r: T) => [(r.fields ?? {})[DUE_ON_AN_EVENT], ...(reader.isTheLead && Array.isArray((r.fields ?? {})[MAY_BE_DUE]) ? ((r.fields ?? {})[MAY_BE_DUE] as any[]) : []), ...((r as any).paidSaidElsewhere ?? [])].filter(Boolean) as ALineKept[];
  const groundIds = [...new Set(rows.flatMap((r) => kept(r).map((k) => k.groundId)).filter(Boolean))];
  if (!groundIds.length) return rows;
  const grounds = new Map<string, any>();
  for (const id of groundIds) {
    const g = await Promise.resolve(prisma?.ground?.findUnique?.({ where: { id }, select: { id: true, label: true, initiatorId: true, participants: { select: { id: true, userId: true, nameGiven: true, user: { select: { firstName: true } } } } } })).catch(() => null);
    if (g) grounds.set(id, g);
  }
  const dayOf = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  const asSaid = (k: ALineKept, event: string) => {
    const g = grounds.get(k.groundId);
    const inIt = !!g && !!reader.userId && (g.initiatorId === reader.userId || ((g.participants ?? []) as any[]).some((p) => p.userId === reader.userId));
    const p = ((g?.participants ?? []) as any[]).find((x) => x.id === k.saidBy);
    const by = !inIt ? null : p?.userId && p.userId === reader.userId ? 'You' : (String(p?.user?.firstName ?? p?.nameGiven ?? '').trim().split(/\s+/)[0] || 'Somebody');
    return { day: k.day, event, from: String(k.label || g?.label || 'another check-in').trim(), saidOn: dayOf(k.at), by, said: inIt ? k.text : null };
  };
  return rows.map((r) => {
    const f = (r.fields ?? {}) as any;
    const event = String(f[F.dueWhen] ?? '').trim();
    const due = f[DUE_ON_AN_EVENT] as ALineKept | undefined;
    /* A line kept to ask about is asked only while today's reading still asks about it: Wanjiru's "The most likely thing to stop the
       reply from being filed this week is ..." was kept by the earlier reading and is never asked now (final real-model check, item 9). */
    const asWaiting = { id: r.id, groundId: '', stage: r.stage, client: String(f[F.client] ?? ''), matter: String(f[F.matter] ?? '') || null, dueWhen: event, notDueFrom: [] as string[] };
    const close = (reader.isTheLead && Array.isArray(f[MAY_BE_DUE]) ? (f[MAY_BE_DUE] as ALineKept[]) : [])
      .filter((c) => whatALineDoesToABill({ id: c.lineId, text: c.text, saidOn: c.day }, asWaiting, [asWaiting]).does !== 'nothing');
    const elsewhere = ((r as any).paidSaidElsewhere ?? []) as ALineKept[];
    return {
      ...r,
      ...(elsewhere.length ? { paidElsewhere: elsewhere.map((k) => asSaid(k, 'it is paid')) } : {}),
      ...(due && event ? { event: asSaid(due, event) } : {}),
      ...(close.length && event ? { toConfirm: close.map((c) => ({ ...asSaid(c, event), lineId: c.lineId })) } : {}),
    };
  });
}
