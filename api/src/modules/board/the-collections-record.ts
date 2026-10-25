import { PLAIN_WORDS } from '../conversation/plain-words';
import { withTheStageKept, theStagesToKeep, theStagesKept } from './a-deals-stages-are-kept';
import { isOneOfThePeople, type APersonALineMayName, type AnOfferedRecord } from './the-kind-of-work';
import { theTypeOnRecord, theTypeToOffer } from './the-switchboard';
import { theRelease2CollectionsIsOn } from '../grounds/release-2-collections';
import { theWordForTheBill, theBillsPlural, type ACollectionsType } from '../grounds/collect-whats-owed';

/**
 * THE COLLECTIONS RECORD: ONE ROW PER BILL, WRITTEN FROM WHAT PEOPLE SAY IN THE CHECK-IN (release plan, Release 2, and Part 1A,
 * "Filing rules"; Release 2, pull request 2 of 3).
 *
 * WHAT A ROW IS. One real thing: a fee note, an invoice or a loan, kept as a `WorkItem` like every other kind of work's record,
 * with its own owner, amount, stage, last contact, next step with a day, and proof. No new table and no new column: the details
 * are the row's `fields`, under the labels below, and what a person never reads (the stages kept with their days, the client's
 * promises, the person who follows it up) under keys starting with "_", which `plainFields` never serves.
 *
 * WHEN. Once per check-in, as it completes (the board listener), and only on a "Collect what's owed" check-in whose
 * organisation has Release 2 switched on. Off, nothing here runs and nothing is written.
 *
 * THE FILING RULES, AS CODE:
 *  - Whose a row is: always the person who said the line it came from (the record writer's rule since run-26). "Follows up" is
 *    kept beside it where the line names somebody in the check-in, and that person reads it too.
 *  - Paid counts only with proof. A line saying it was paid moves the bill to Paid as said; what proves it is a payment document
 *    filed on the bill (documents/proof-filed-on-its-item.ts), never the words "I have the slip".
 *  - A client's promise to pay is the client's: kept on the bill as "Promised by", with the day it was said, never as something
 *    the person checking in will do. The conversation's own promise reader leaves such a line out (a-promise-somebody-else-made).
 *  - A bill not yet raised is a row, at "Not yet raised".
 *  - A stage never moves back from a check-in, except Paid on somebody's word, with no proof filed: a later line saying it is not paid
 *    corrects it (the first principle: a correction is fixed in the conversation). Paid with proof never moves back.
 *  - Dates are real days or are not kept. A day said without its year is the one nearest the day it was said.
 */

/** The `WorkItem.kind` of a bill (an invoice or a fee note), and of a loan somebody owes. Neither is any other board's kind. */
export const BILL = 'bill';
export const LOAN_OWED = 'loan-owed';
export const COLLECTIONS_ITEM_KINDS = [BILL, LOAN_OWED] as const;

export const NOT_YET_RAISED = 'Not yet raised';
export const BILL_STAGES = [NOT_YET_RAISED, 'Invoiced', 'Due', 'Reminded', 'Chased', 'Promised', 'Paid'] as const;
export const LOAN_STAGES = ['Disbursed', 'Due', 'Reminded', 'Chased', 'Promised', 'Paid'] as const;

/** The details a row keeps, by the labels the model is given and the board reads. */
export const F = {
  client: 'Client',
  matter: 'Matter',
  number: 'Number',
  amount: 'Amount',
  followsUp: 'Follows up',
  fallsDue: 'Falls due',
  dueWhen: 'Due when',
  paid: 'Paid',
  proofSaid: 'Proof said',
  promisedBy: 'Promised by',
  inTheWay: 'In the way',
  disputed: 'Disputed',
  nextStep: 'Next step',
  nextStepBy: 'Next step by',
  lastContact: 'Last contact',
  business: 'Business',
  sales: 'Sales',
} as const;

/** Kept on the row, never served as a detail. */
export const FOLLOWS_UP_ID = '_followsUp';
export const PROMISES = '_promises';

const DATED = new Set<string>([F.fallsDue, F.promisedBy, F.nextStepBy, F.lastContact]);

export function stagesForType(type: ACollectionsType): readonly string[] {
  return type === 'loans' ? LOAN_STAGES : BILL_STAGES;
}

export function kindForType(type: ACollectionsType): string {
  return type === 'loans' ? LOAN_OWED : BILL;
}

/** The instructions the model reads each check-in's lines with, in the organisation's own word for the bill. */
export function theCollectionsRecordsPrompt(type: ACollectionsType, billWord: string): string {
  const bill = theWordForTheBill({ billWord });
  if (type === 'loans') {
    return `You are reading lines people said in a check-in about the loans they are repaying. Each person checking in owes one loan of their own. Pick out what each line says about the speaker's own loan.

Each line has an id. For every line that says something about the speaker's loan, give the id of the line, kind "${LOAN_OWED}", and name "loan". Give a stage only when the line says it, using one of: ${LOAN_STAGES.join(', ')}. Paid means the speaker says the money for what was due has gone in. Give a due date only when the line says one, as YYYY-MM-DD.

Give other details only when the line says them, as short label and value pairs, using only these labels: Amount (what is due, in full, such as KES 12,000), Paid (what the speaker says they paid, such as KES 6,000), Proof said (the record they say they have, such as an M-Pesa message; it is never proof by itself), Promised by (the day the speaker says they will pay by, as YYYY-MM-DD), In the way (what stops them paying, in their own words), Next step (what happens next, in a few words), Next step by (its day, as YYYY-MM-DD), Business (how their business is doing, in a word or two, such as trading or idle), Sales (what they sold, as said, such as KES 38,000 in four weeks).

Leave out anything the line does not say. Never make up an amount, a date or a stage. When no line says anything about the loan, give an empty list.

${PLAIN_WORDS}`;
  }
  const bills = theBillsPlural(bill);
  return `You are reading lines people said in a check-in about the ${bills} their organisation is owed, to pick out each ${bill} a line names. People here call a bill a ${bill}.

Each line has an id. For every ${bill} a line names, give the id of the line, kind "${BILL}", and the ${bill}'s name as it was said in that line, word for word: its number where the line gives one (such as FN-004), otherwise the client's name. Give a stage only when the line says it, using one of: ${BILL_STAGES.join(', ')}. "${NOT_YET_RAISED}" is a ${bill} that should go out and has not been raised yet. Paid means the line says the money came in. Give a due date only when the line says the day it falls due, as YYYY-MM-DD.

Give other details only when the line says them, as short label and value pairs, using only these labels: Client (the client who owes it), Matter (the matter or piece of work it is for), Number (the ${bill}'s number, such as FN-004), Amount (the whole amount of the ${bill}, such as KES 250,000; never a part of it), Follows up (the person in the check-in who follows it up, by name), Due when (the event it falls due on, when it waits for one, such as "the reply is filed"), Paid (what came in, such as KES 250,000), Proof said (the record they say shows the payment, such as a bank slip; it is never proof by itself), Promised by (the day the client promised to pay by, as YYYY-MM-DD: the client's promise, never the speaker's), In the way (what is in the way, in the speaker's own words), Disputed (what the client disputes, in the words the line gives), Next step (what the speaker will do next, in a few words), Next step by (its day, as YYYY-MM-DD), Last contact (the day the speaker last spoke to the client, as YYYY-MM-DD).

A client's promise to pay goes on the ${bill} as Promised by. It is never something the speaker will do. Groundwork never raises or writes a ${bill}: a ${bill} that should go out and has not is given at "${NOT_YET_RAISED}".

Leave out anything the line does not say. Never make up a ${bill}, a number, an amount, a date or a stage. A person in the check-in is never a client. When no line names a ${bill}, give an empty list.

${PLAIN_WORDS}`;
}

const squash = (s: unknown) => String(s ?? '').toLowerCase().replace(/[‘’“”'"]/g, '').replace(/\s+/g, ' ').trim();
const aNumber = (s: unknown) => squash(s).replace(/[^a-z0-9]/g, '');

/** A day as YYYY-MM-DD, or null. */
export function aDay(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  return isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : s;
}

/**
 * A DAY SAID WITHOUT ITS YEAR (real-model run, 25 October). Aisha said on 25 October 2026 "FN-004 will be paid by 31 October", and the
 * model kept 2023-10-31. Where the line does not say the year, the day is moved to the year that puts it nearest the day it was said.
 */
export function inTheYearItWasSaid(day: string | null, lineText: string, saidOn: Date | null | undefined): string | null {
  if (!day || !saidOn || Number.isNaN(saidOn.getTime())) return day;
  const year = day.slice(0, 4);
  if (new RegExp(`\\b${year}\\b`).test(String(lineText ?? ''))) return day;
  const y = saidOn.getUTCFullYear();
  const options = [y - 1, y, y + 1].map((n) => aDay(`${n}${day.slice(4)}`)).filter((d): d is string => !!d);
  if (!options.length) return day;
  const at = saidOn.getTime();
  return options.sort((a, b) => Math.abs(new Date(`${a}T12:00:00Z`).getTime() - at) - Math.abs(new Date(`${b}T12:00:00Z`).getTime() - at))[0];
}

export interface ABillKept {
  kind: string;
  name: string;
  stage: string | null;
  dueAt: Date | null;
  fields: Record<string, unknown>;
  sourceEntryId: string;
  ownerParticipantId: string;
}

/**
 * ONLY WHAT THE LINE SAYS. A bill the model offers is kept only when its line is one of the lines it was given, its kind is this
 * type's, and its name is in that line's words (a loan is the speaker's own, by who said it). A stage must be one of the stages,
 * a date a real day, a client never a person in the check-in. "Follows up" names a person in the check-in, or is not kept.
 */
export function onlyBillsTheLinesSay(
  type: ACollectionsType,
  offered: AnOfferedRecord[] | null | undefined,
  lines: { id: string; text: string; participantId: string; createdAt?: Date | null }[],
  people: readonly APersonALineMayName[] = [],
): ABillKept[] {
  const byId = new Map(lines.map((l) => [l.id, l]));
  const kind = kindForType(type);
  const stages = stagesForType(type);
  const out: ABillKept[] = [];
  const seen = new Set<string>();
  for (const r of offered ?? []) {
    const line = r.lineId ? byId.get(r.lineId) : undefined;
    if (!line || r.kind !== kind) continue;
    let name = String(r.name ?? '').trim();
    if (type === 'loans') {
      name = 'loan';
    } else {
      if (!name || name.length > 120 || !squash(line.text).includes(squash(name))) continue;
      if (isOneOfThePeople(name, people)) continue;
    }
    const fields: Record<string, unknown> = {};
    for (const d of r.details ?? []) {
      const label = Object.values(F).find((l) => l.toLowerCase() === String(d?.label ?? '').trim().toLowerCase());
      const value = String(d?.value ?? '').trim().slice(0, 300);
      if (!label || !value) continue;
      if (DATED.has(label)) { const day = inTheYearItWasSaid(aDay(value), line.text, line.createdAt); if (day) fields[label] = day; continue; }
      if (label === F.client && isOneOfThePeople(value, people)) continue;
      if (label === F.followsUp) {
        const who = people.find((p) => isOneOfThePeople(value, [p]));
        if (who) { fields[F.followsUp] = value; fields[FOLLOWS_UP_ID] = who.id; }
        continue;
      }
      fields[label] = value;
    }
    if (type === 'loans') { delete fields[F.client]; delete fields[F.matter]; delete fields[F.number]; delete fields[F.followsUp]; delete fields[FOLLOWS_UP_ID]; }
    if (type !== 'loans' && !fields[F.client] && !/\d/.test(name)) fields[F.client] = name;
    if (type !== 'loans' && !fields[F.number] && /^[A-Za-z]{0,6}[-\s]?\d{1,8}$/.test(name)) fields[F.number] = name;
    const stage = stages.find((s) => s.toLowerCase() === String(r.stage ?? '').trim().toLowerCase()) ?? null;
    const due = inTheYearItWasSaid(aDay(r.due), line.text, line.createdAt) ?? (typeof fields[F.fallsDue] === 'string' ? (fields[F.fallsDue] as string) : null);
    if (due) fields[F.fallsDue] = due;
    const key = `${line.id}|${type === 'loans' ? line.participantId : `${squash(name)}|${aNumber(fields[F.number])}`}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind, name, stage, dueAt: due ? new Date(`${due}T00:00:00.000Z`) : null, fields, sourceEntryId: line.id, ownerParticipantId: line.participantId });
  }
  return out;
}

export interface ABillOnFile { id: string; kind: string; name: string; stage: string | null; ownerParticipantId: string | null; fields: unknown; updatedAt?: Date | string | null }

const fieldOf = (b: { fields?: unknown }, k: string) => String(((b.fields ?? {}) as any)[k] ?? '').trim();

/**
 * THE SAME BILL. A loan is the borrower's one loan. A bill with a number is the bill with that number; one without is the open
 * bill of that client (by its name or its client) where there is exactly one, else the one of that matter, else the latest one
 * the same person spoke of. Nothing matches a bill of another kind.
 */
export function theSameBill(onFile: readonly ABillOnFile[], kept: ABillKept): ABillOnFile | null {
  const same = onFile.filter((b) => b.kind === kept.kind);
  if (kept.kind === LOAN_OWED) return same.find((b) => b.ownerParticipantId === kept.ownerParticipantId) ?? null;
  const n = aNumber(kept.fields[F.number]);
  if (n) {
    const byNumber = same.find((b) => aNumber(fieldOf(b, F.number) || b.name) === n);
    if (byNumber) return byNumber;
  }
  const client = squash(kept.fields[F.client] ?? kept.name);
  const ofClient = same.filter((b) => squash(fieldOf(b, F.client) || b.name) === client && (!n || !aNumber(fieldOf(b, F.number))));
  const open = ofClient.filter((b) => b.stage !== 'Paid');
  if (open.length === 1) return open[0];
  if (open.length > 1) {
    const matter = squash(kept.fields[F.matter]);
    const ofMatter = matter ? open.filter((b) => squash(fieldOf(b, F.matter)) === matter) : [];
    if (ofMatter.length === 1) return ofMatter[0];
    if (kept.stage === NOT_YET_RAISED) return open.find((b) => b.stage === NOT_YET_RAISED) ?? null;
    if (n) return open.find((b) => b.stage === NOT_YET_RAISED) ?? null;
    const theirs = open.filter((b) => b.ownerParticipantId === kept.ownerParticipantId)
      .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());
    return theirs[0] ?? null;
  }
  return null;
}

/** Whether a stage is earlier in the ladder than another. */
export function anEarlierStage(stage: string | null | undefined, than: string | null | undefined, type: ACollectionsType): boolean {
  const s = stagesForType(type);
  const a = s.indexOf(String(stage ?? ''));
  const b = s.indexOf(String(than ?? ''));
  return a >= 0 && b >= 0 && a < b;
}

/** The client's promises kept on a bill, oldest first: the day they promised to pay by, and the day it was said. */
export function thePromisesKept(fields: unknown): { by: string; said: string }[] {
  const list = ((fields ?? {}) as any)[PROMISES];
  return Array.isArray(list) ? list.filter((p: any) => aDay(p?.by) && typeof p?.said === 'string') : [];
}

/**
 * A ROW AFTER A LINE ABOUT IT: the details the line said over the ones on file, the stage moved on (never back), each stage kept
 * with its day, the client's promise added to its promises, and "Last contact" the day of the line where the line says the
 * client answered (a promise, a dispute, a call to somebody there).
 */
export function theBillAfter(onFile: ABillOnFile | null, kept: ABillKept, type: ACollectionsType, saidOn: Date, paidWithProof = false): { stage: string | null; fields: Record<string, unknown>; dueAt: Date | null } {
  const before = ((onFile?.fields ?? {}) as Record<string, unknown>);
  /* Paid on somebody's word, with no proof filed, is corrected by a later line that says where it really stands ("FN-004 is still unpaid"). */
  const corrected = !!onFile && onFile.stage === 'Paid' && !paidWithProof && !!kept.stage && kept.stage !== 'Paid';
  const stage = kept.stage && (corrected || !(onFile && anEarlierStage(kept.stage, onFile.stage, type))) ? kept.stage : onFile?.stage ?? null;
  let fields: Record<string, unknown> = { ...before, ...kept.fields, ...theStagesToKeep(before) };
  if (corrected && !kept.fields[F.paid]) delete fields[F.paid];
  if (Array.isArray(before[PROMISES])) fields[PROMISES] = before[PROMISES];
  const day = saidOn.toISOString().slice(0, 10);
  const promised = aDay(kept.fields[F.promisedBy]);
  if (promised) {
    const list = thePromisesKept(fields);
    if (!list.some((p) => p.by === promised)) fields[PROMISES] = [...list, { by: promised, said: saidOn.toISOString() }];
  }
  if (!kept.fields[F.lastContact] && (promised || kept.fields[F.disputed] || stage === 'Chased' && kept.stage === 'Chased')) fields[F.lastContact] = day;
  /* A bill once raised is no longer "not yet raised": a number said for it raises it. */
  const moved = stage === NOT_YET_RAISED && kept.fields[F.number] && !kept.stage ? 'Invoiced' : stage;
  fields = withTheStageKept(fields, moved, saidOn, 'check-in', onFile ? { stage: onFile.stage, since: null } : null);
  const due = aDay(fields[F.fallsDue]);
  return { stage: moved, fields, dueAt: due ? new Date(`${due}T00:00:00.000Z`) : null };
}

/** The check-in's collections type, where it is a "Collect what's owed" check-in and Release 2 is on for its organisation. */
export async function theCollectionsTypeFor(prisma: any, groundId: string): Promise<{ type: ACollectionsType; billWord: string } | null> {
  const g = await Promise.resolve(prisma?.ground?.findUnique?.({
    where: { id: groundId },
    select: { organizationId: true, scenario: true, label: true, brief: true, kindOfWork: true, kindOfWorkSetBy: true, checkInType: true, checkInTypeConfirmedAt: true },
  })).catch(() => null) as any;
  if (!g || g.scenario !== 'COLLECTIONS') return null;
  if (!(await theRelease2CollectionsIsOn(prisma, g.organizationId))) return null;
  const org = await Promise.resolve(prisma?.organization?.findUnique?.({ where: { id: g.organizationId }, select: { billWord: true } })).catch(() => null) as any;
  /* The type the lead confirmed or the check-in's kind of work holds; where neither, the one read from her words and the organisation (never stored). */
  const t = theTypeOnRecord(g).type ?? theTypeToOffer(g, { billWord: org?.billWord ?? null }).type;
  if (t !== 'invoices or fee notes' && t !== 'loans') return null;
  return { type: t, billWord: theWordForTheBill(org) };
}

/**
 * FILE THE BILLS ONE CHECK-IN SAID (the board listener calls this before anything else on a completed check-in). Returns how many
 * rows it wrote, or null where this is not a collections check-in with Release 2 on, so the listener carries on as before.
 */
export async function fileTheBillsSaid(
  deps: { prisma: any; anthropic: { extract: <T>(system: string, messages: any[], schema: any) => Promise<T | null> }; logger?: { log: (s: string) => void; warn: (s: string) => void } },
  e: { groundId: string; checkInId: string },
  schema: any,
): Promise<number | null> {
  const { prisma } = deps;
  const it = await theCollectionsTypeFor(prisma, e.groundId);
  if (!it) return null;
  try {
    const ground = await prisma.ground.findUnique({
      where: { id: e.groundId },
      select: { participants: { select: { id: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } } },
    }) as any;
    const said = await prisma.recordEntry.findMany({
      where: { checkInId: e.checkInId, disputedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, text: true, participantId: true, createdAt: true },
    });
    const lines = (said as any[]).map((l) => ({ id: l.id, text: String(l.text ?? '').replace(/\[[^\]]*\]/g, '').trim(), participantId: l.participantId, createdAt: l.createdAt ? new Date(l.createdAt) : new Date() })).filter((l) => l.text);
    if (!lines.length) return 0;
    const people: APersonALineMayName[] = ((ground?.participants ?? []) as any[]).map((p) => ({ id: p.id, firstName: p.user?.firstName ?? null, lastName: p.user?.lastName ?? null, nameGiven: p.nameGiven ?? null }));
    const nameOf = (pid: string) => {
      const p = people.find((x) => x.id === pid);
      return (p ? [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || (p.nameGiven ?? '').trim() : '') || 'Somebody';
    };
    const kind = kindForType(it.type);
    const onFile = ((await prisma.workItem.findMany({ where: { groundId: e.groundId, kind }, select: { id: true, kind: true, name: true, stage: true, ownerParticipantId: true, fields: true, updatedAt: true } })) ?? []) as ABillOnFile[];
    const known = onFile.filter((b) => b.kind === BILL).map((b) => [fieldOf(b, F.number), fieldOf(b, F.client) || b.name].filter(Boolean).join(', ')).filter(Boolean);
    const answer = await deps.anthropic.extract<{ records?: AnOfferedRecord[] }>(
      theCollectionsRecordsPrompt(it.type, it.billWord),
      [{
        role: 'user',
        content: [
          `People in this check-in: ${people.map((p) => nameOf(p.id)).filter((n) => n !== 'Somebody').join(', ') || 'none named'}.`,
          ...(known.length ? [`${theBillsPlural(it.billWord).replace(/^./, (c) => c.toUpperCase())} on record: ${known.join('; ')}.`] : []),
          '',
          ...lines.map((l) => `[${l.id}] ${nameOf(l.participantId)} said: ${l.text}`),
        ].join('\n'),
      }],
      schema,
    );
    const kept = onlyBillsTheLinesSay(it.type, answer?.records ?? [], lines, people);
    const proven = new Set(((await Promise.resolve(prisma.itemEvidence?.findMany?.({ where: { groundId: e.groundId, readAs: 'A payment', workItemId: { not: null } }, select: { workItemId: true } })).catch(() => [])) ?? []).map((x: any) => x.workItemId));
    const at = new Map(lines.map((l) => [l.id, l.createdAt]));
    let written = 0;
    for (const k of kept) {
      const same = theSameBill(onFile, k);
      const after = theBillAfter(same, k, it.type, at.get(k.sourceEntryId) ?? new Date(), !!same && proven.has(same.id));
      if (same) {
        const fromSomebodyElse = !!same.ownerParticipantId && same.ownerParticipantId !== k.ownerParticipantId;
        await prisma.workItem.update({
          where: { id: same.id },
          data: { stage: after.stage, fields: after.fields, ...(after.dueAt ? { dueAt: after.dueAt } : {}), ...(fromSomebodyElse ? {} : { sourceEntryId: k.sourceEntryId }) },
        });
        same.stage = after.stage;
        same.fields = after.fields;
      } else {
        const made = await prisma.workItem.create({ data: { groundId: e.groundId, kind: k.kind, name: k.name, stage: after.stage, dueAt: after.dueAt, fields: after.fields, sourceEntryId: k.sourceEntryId, ownerParticipantId: k.ownerParticipantId } });
        onFile.push({ id: made?.id ?? `new-${written}`, kind: k.kind, name: k.name, stage: after.stage, ownerParticipantId: k.ownerParticipantId, fields: after.fields });
      }
      written += 1;
    }
    deps.logger?.log(`Kept ${written} ${it.billWord} record(s) from check-in ${e.checkInId}.`);
    return written;
  } catch (err: any) {
    deps.logger?.warn(`Reading the ${it.billWord} records for check-in ${e.checkInId} failed: ${err?.message}`);
    return 0;
  }
}

/** For the board and the reports: the stages a row was put at, with their days. */
export { theStagesKept };

/**
 * WHETHER A DOCUMENT'S WORDS NAME THIS BILL: its number, whole ("FN-004", "FN 004", "fn004", never "FN-0041"); or, where the bill
 * has no number, its client by name. Two bills of one client with no number between them are both named, so the proof is filed on
 * neither (proof-filed-on-its-item: never a guess).
 */
export function aBillIsNamed(words: string, bill: { name: string; fields?: unknown }): boolean {
  const said = String(words ?? '').toLowerCase();
  const number = aNumber(fieldOf(bill, F.number) || (/\d/.test(bill.name) ? bill.name : ''));
  const parts = number.match(/^([a-z]*)(\d+)$/);
  if (parts && (parts[1] || parts[2].length >= 3)) {
    return new RegExp(`(?<![a-z0-9])${parts[1]}[\\s-]?${parts[2]}(?![0-9])`).test(said);
  }
  const client = squash(fieldOf(bill, F.client) || bill.name);
  return client.length >= 3 && squash(words).includes(client);
}

/**
 * A BILL MARKED PAID IS NEVER WAITED ON FOR ITS PAYMENT (Hafsah, 19 October, point 4: "a bill marked paid is never called late (FN-004)";
 * messages test after the fixes, finding 8). Muchemi & Co. (test): Njeri said on Monday 12 October that Kasarani Foods had paid the
 * KES 250,000 for FN-004, and the bill is marked Paid. The wait set up that morning, "payment for fee note FN-004" on Kasarani Foods, was
 * never cleared, and Wanjiru's morning summary said four mornings running "You are waiting on Kasarani Foods for payment for fee note
 * FN-004, which was due on Monday 5 October and is eight days late." A wait for the payment of a bill the record marks Paid is over: the
 * bill it names, by its number, or by its client where it has none, is Paid. Read wherever a wait is told as late.
 */
const A_PAYMENT_WAIT = /\b(?:pay(?:s|ing|ment|ments)?|paid|money|settle(?:d|ment)?|kes|ksh)\b/i;
export function theBillThisWaitIsPaidOn(what: string, bills: readonly { name: string; stage?: string | null; fields?: unknown }[]): { name: string } | null {
  if (!A_PAYMENT_WAIT.test(String(what ?? ''))) return null;
  const named = bills.filter((b) => aBillIsNamed(what, b));
  if (named.length !== 1) return null;
  return String(named[0].stage ?? '').trim().toLowerCase() === 'paid' ? named[0] : null;
}
