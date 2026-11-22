import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';

/**
 * A WAIT IS OVER FROM WHAT THE RECORD MEANS, NOT FROM ITS WORDS (Hafsah, 29 October 2026; two-week check, FN-007).
 *
 * Aisha waited on Njeri for "confirmation that FN-007 has been raised". Njeri said on 16 October that Jamii Clinics paid FN-007, and
 * said it again, in other words, more than twenty times over three months. Njeri was still told on 19 January "Aisha is waiting on you
 * for confirmation that FN-007 has been raised, since 19 October". Three word rules read the wait and the lines (a-wait-said-done-is-
 * cleared, a-wait-is-over-across-the-organisation), and none of them knew that a fee note paid was a fee note raised. Every new way of
 * saying it needed a new rule, and the next way of saying it was always missed.
 *
 * Now the model reads each open wait against the record, the way a good manager would: the lines said about it in any of the
 * organisation's check-ins (never one about a single person), by anybody, before or after it was raised, the work items it names, and
 * any correction that was backed. It decides whether the wait is over, and which line or item shows it. The product writes only that the
 * wait is over, on the day of that line; nobody's words move between check-ins. Nothing here approves or writes money or leave: those
 * keep their fixed rules. A wait the model does not end stays open, and when the model cannot be reached the old word rules run instead,
 * so a wait is never left open for want of a model that was not there.
 */

export interface AWaitToJudge {
  id: string;
  groundId: string;
  fromParticipantId: string;
  onParticipantId: string | null;
  onLabel: string | null;
  what: string;
  createdAt: Date | string;
  /** The conversation it was read from. */
  sourceCheckInId?: string | null;
}
export interface AWitness {
  /** A line on record, a work item, or a correction that was backed. */
  id: string;
  who: string;
  /** Kind of line ("what happened", "a worry", "a promise"), or "work item", or "correction". */
  kind: string;
  where: string;
  on: Date | string;
  text: string;
  /** People this is by, as user ids (one person in several check-ins is one person). */
  byUserId?: string | null;
  /** The conversation a line was said in; none for a work item or a correction. */
  checkInId?: string | null;
}
export interface AWaitOver { id: string; clearedAt: Date; witnessId: string }

export const WAIT_OVER_PROMPT_KEY = 'record.a-wait-is-over';
export const WAIT_OVER_PROMPT = `You keep the record of a team's work. Each wait below is somebody waiting on somebody else, or on something outside the team, for a thing. Decide for each wait whether the record now shows it is over, the way a sharp, fair manager would read it.

A wait is over when the record shows the thing came, happened, was done, was given, was decided, or is no longer needed, in any words: a fee note paid was raised, a reply filed means the revisions to it were done, "Jamii paid FN-007" ends a wait for confirmation that FN-007 was raised, "I approved the KES 4,500 price" ends a wait for a decision on that price. It is also over when the one waiting says they are not waiting for it any more, or the one it waits on says, believably, that nothing is owed.

A wait is not over when the record only shows a promise, a plan, a hope, a reminder or a chase, or when only part of the thing came: one person's proof does not end a wait on the whole team. A work item's stage ends a wait only when the wait was for that very stage: a deal marked Won ends a wait for the contract to be signed, never a wait for its delivery schedule, its price or anything else about that customer. It is not over from a line about a different thing, a different customer or a different deal (FN-006 is not FN-007; a sale to Juja Hardware says nothing about a price somebody else is waiting on). Something else that happened to the same thing does not answer what was asked about it: a fee note raised does not give the day it will be paid, and a promise to tell somebody is not telling them. When lines disagree, the newest line from somebody who would know wins, and a line with a document or a slip weighs more than a line without.

Name, for each wait you end, the one line or item that shows it, by its id from the list, and say in one short sentence why that line ends that wait. Never end a wait without one. When you are not sure, leave it open.`;

export const WAIT_OVER_SCHEMA = {
  name: 'the_waits_that_are_over',
  description: 'For each wait the record shows is over, its id and the id of the line or item that shows it.',
  input_schema: {
    type: 'object',
    properties: {
      over: {
        type: 'array',
        items: {
          type: 'object',
          properties: { waitId: { type: 'string' }, shownBy: { type: 'string' }, why: { type: 'string' } },
          required: ['waitId', 'shownBy', 'why'],
        },
      },
    },
    required: ['over'],
  },
};

const day = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

/** What the model is handed: the waits, and the lines and items that may bear on them, each by id. */
export function theWaitsAsked(waits: { w: AWaitToJudge; waiting: string; on: string; where: string }[], witnesses: AWitness[]): string {
  const ws = waits.map(({ w, waiting, on, where }) => `- ${w.id}: ${waiting} is waiting on ${on} for "${w.what}", since ${day(w.createdAt)}, in ${where}`).join('\n');
  const ls = witnesses
    .slice()
    .sort((a, b) => new Date(a.on).getTime() - new Date(b.on).getTime())
    .map((x) => `- ${x.id}: ${x.who}, ${x.kind}, in ${x.where}, on ${day(x.on)}: "${String(x.text).replace(/\s+/g, ' ').slice(0, 400)}"`)
    .join('\n');
  return `The waits still open:\n${ws}\n\nWhat the record holds that may bear on them, oldest first:\n${ls || '- nothing'}`;
}

/** What the model said, made safe: only a wait it was handed, only with a witness it was handed, cleared on the later of the two days. */
export function theWaitsOverMadeSafe(raw: any, waits: AWaitToJudge[], witnesses: AWitness[]): AWaitOver[] | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.over)) return null;
  const byWait = new Map(waits.map((w) => [w.id, w]));
  const byWitness = new Map(witnesses.map((x) => [x.id, x]));
  const out: AWaitOver[] = [];
  for (const o of raw.over) {
    const w = byWait.get(String(o?.waitId ?? ''));
    const x = byWitness.get(String(o?.shownBy ?? ''));
    if (!w || !x || !String(o?.why ?? '').trim() || out.some((y) => y.id === w.id)) continue;
    const clearedAt = new Date(Math.max(new Date(w.createdAt).getTime(), new Date(x.on).getTime()));
    out.push({ id: w.id, clearedAt, witnessId: x.id });
  }
  return out;
}

/* The words that name a thing: a reference ("FN-007") or a word of four letters or more that is not one every wait has. */
const COMMON = new Set(['confirmation', 'update', 'updates', 'decision', 'reply', 'response', 'answer', 'about', 'their', 'there', 'from', 'with', 'that', 'this',
  'have', 'been', 'what', 'when', 'some', 'into', 'they', 'them', 'your', 'will', 'still', 'waiting', 'next', 'more', 'information', 'word', 'news']);
export const theNamingWords = (t: string): string[] => {
  const refs = (String(t ?? '').match(/\b[A-Za-z]{1,6}-?\d{2,8}\b/g) ?? []).map((r) => r.toLowerCase().replace(/-/g, ''));
  const words = String(t ?? '').toLowerCase().replace(/[^a-z0-9' -]+/g, ' ').split(/[\s-]+/).map((w) => w.replace(/'s$/, '').replace(/s$/, ''))
    .filter((w) => w.length >= 4 && !COMMON.has(w) && !/^\d/.test(w));
  return [...new Set([...refs, ...words])];
};

/**
 * Which lines and items to hand the model for these waits. Not a decision, only what to read: the lines of the people in each wait,
 * in any check-in, and any line or item that names the same thing or the same people.
 */
export function theWitnessesFor(waits: { w: AWaitToJudge; names: string[]; userIds: string[] }[], all: AWitness[], perWait = 30): AWitness[] {
  const chosen = new Map<string, AWitness>();
  for (const { w, names, userIds } of waits) {
    /*
     * NOTHING FROM THE CONVERSATION THAT RAISED IT (release test, 21 November 2026, bugs 35 and 40). That conversation was read whole,
     * and its reading is that the wait is open: that is why the row exists. Handed back its own lines, the model ended Wairimu's wait
     * for delivery slots at the very moment it was raised, from "a second Kilimani run is possible from 1 December", her own words
     * beside it. A wait is ended only by something said somewhere else, or later.
     */
    const elsewhere = all.filter((x) => !(w.sourceCheckInId && x.checkInId && x.checkInId === w.sourceCheckInId));
    const thing = theNamingWords(w.what);
    const people = names.flatMap((n) => theNamingWords(n));
    const scored = elsewhere
      .map((x) => {
        const said = new Set(theNamingWords(x.text));
        const thingHits = thing.filter((t) => said.has(t)).length;
        const byThem = !!x.byUserId && userIds.includes(x.byUserId);
        const names = people.some((p) => said.has(p));
        const score = thingHits * 3 + (byThem ? 2 : 0) + (names ? 1 : 0) + (x.kind === 'correction' ? 5 : 0);
        return { x, score, relevant: thingHits > 0 || (byThem && new Date(x.on).getTime() >= new Date(w.createdAt).getTime()) || x.kind === 'correction' };
      })
      .filter((s) => s.relevant)
      .sort((a, b) => b.score - a.score || new Date(b.x.on).getTime() - new Date(a.x.on).getTime())
      .slice(0, perWait);
    for (const s of scored) chosen.set(s.x.id, s.x);
  }
  return [...chosen.values()];
}

type Engine = { extract: (p: string, h: { role: 'user' | 'assistant'; content: string }[], t: any, o?: any) => Promise<any> };
type Prompts = { getActive: (key: string) => Promise<{ content: string } | null> } | null | undefined;

const KIND: Record<string, string> = {
  PROGRESS: 'what happened', WORRY: 'a worry', COMMITMENT: 'a promise', INTENT: 'what they mean to do', TENSION: 'a disagreement',
  TOLERANCE: 'what they will put up with', ASK: 'something they asked for', TIMEFRAME: 'a time they gave', SUCCESS_DEFINITION: 'what success looks like',
  OPERATING_DIFFERENCE: 'how they work',
};

/** What each batch of waits was last read with, for each database, so a wait is not asked about again until something new bears on it. */
const lastReadIn = new WeakMap<object, Map<string, string>>();

/**
 * Reads every open wait in the organisation of this check-in against the record, and clears those the model shows are over. `extra`
 * is a correction somebody made that was backed (in Ask), read as one more line. Returns the waits cleared, or null when the model
 * could not be reached, so the caller may fall back to the word rules.
 */
export async function clearTheWaitsTheRecordEnds(
  prisma: any,
  engine: Engine | null | undefined,
  prompts: Prompts,
  groundId: string,
  extra: AWitness[] = [],
): Promise<AWaitOver[] | null> {
  if (!engine?.extract) return null;
  const here = await Promise.resolve(prisma.ground?.findUnique?.({ where: { id: groundId }, select: { organizationId: true } })).catch(() => null);
  const grounds: any[] = here?.organizationId
    ? ((await Promise.resolve(prisma.ground?.findMany?.({ where: { organizationId: here.organizationId }, select: { id: true, scenario: true, label: true } })).catch(() => [])) ?? [])
    : ((await Promise.resolve(prisma.ground?.findMany?.({ where: { id: groundId }, select: { id: true, scenario: true, label: true } })).catch(() => [])) ?? []);
  const shared = grounds.filter((g) => !isEvaluationCheckIn(g.scenario));
  const ids = shared.map((g) => g.id);
  if (!ids.length) return [];
  const labelOf = new Map(shared.map((g) => [g.id, String(g.label ?? 'a check-in')]));
  const waits: AWaitToJudge[] = (await prisma.groundDependency.findMany({
    where: { groundId: { in: ids }, status: { in: ['WAITING', 'BLOCKING'] }, clearedAt: null },
    select: { id: true, groundId: true, fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, createdAt: true, sourceCheckInId: true },
  })) ?? [];
  const people: any[] = (await prisma.groundParticipant.findMany({
    where: { groundId: { in: ids } },
    select: { id: true, groundId: true, userId: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
  })) ?? [];
  const byId = new Map(people.map((p) => [p.id, p]));
  /* A correction reads only the waits it can bear on: those its person is in, and those about the same thing. */
  if (extra.length) {
    const said = new Set(extra.flatMap((x) => theNamingWords(x.text)));
    const users = new Set(extra.map((x) => x.byUserId).filter(Boolean));
    const bears = (w: AWaitToJudge) => theNamingWords(w.what).some((t) => said.has(t))
      || users.has(byId.get(w.fromParticipantId)?.userId) || (!!w.onParticipantId && users.has(byId.get(w.onParticipantId)?.userId));
    waits.splice(0, waits.length, ...waits.filter(bears));
  }
  if (!waits.length) return [];
  const nameOf = (pid: string | null | undefined): string => {
    const p = pid ? byId.get(pid) : null;
    return p ? ([p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ') || String(p.nameGiven ?? '').trim() || 'somebody') : 'somebody';
  };
  const lines: any[] = (await prisma.recordEntry.findMany({
    where: { disputedAt: null, participant: { groundId: { in: ids } } },
    select: { id: true, participantId: true, checkInId: true, type: true, text: true, createdAt: true, participant: { select: { groundId: true, userId: true } } },
  })) ?? [];
  const items: any[] = (await Promise.resolve(prisma.workItem?.findMany?.({
    where: { groundId: { in: ids }, stage: { not: null } },
    select: { id: true, groundId: true, kind: true, name: true, stage: true, updatedAt: true },
  })).catch(() => [])) ?? [];
  const all: AWitness[] = [
    ...lines.map((l) => ({
      id: l.id, who: nameOf(l.participantId), kind: KIND[String(l.type)] ?? 'a line', where: labelOf.get(l.participant?.groundId) ?? 'a check-in',
      on: l.createdAt, text: String(l.text ?? '').replace(/\[INFERRED:[^\]]*\]/g, '').trim(), byUserId: l.participant?.userId ?? null, checkInId: l.checkInId ?? null,
    })),
    ...items.map((i) => ({ id: i.id, who: 'the record', kind: 'work item', where: labelOf.get(i.groundId) ?? 'a check-in', on: i.updatedAt, text: `${i.kind} ${i.name} is at the stage "${i.stage}"` })),
    ...extra,
  ];
  const version = await Promise.resolve(prompts?.getActive(WAIT_OVER_PROMPT_KEY)).catch(() => null);
  const prompt = version?.content ?? WAIT_OVER_PROMPT;
  const cleared: AWaitOver[] = [];
  let reached = false;
  const lastRead = lastReadIn.get(prisma) ?? new Map<string, string>();
  lastReadIn.set(prisma, lastRead);
  const BATCH = 12;
  for (let i = 0; i < waits.length; i += BATCH) {
    const batch = waits.slice(i, i + BATCH);
    const framed = batch.map((w) => {
      const onUser = w.onParticipantId ? byId.get(w.onParticipantId)?.userId : null;
      return {
        w, waiting: nameOf(w.fromParticipantId), on: w.onParticipantId ? nameOf(w.onParticipantId) : (String(w.onLabel ?? '').trim() || 'somebody outside the team'),
        where: labelOf.get(w.groundId) ?? 'a check-in',
        names: [nameOf(w.fromParticipantId), w.onParticipantId ? nameOf(w.onParticipantId) : String(w.onLabel ?? '')],
        userIds: [byId.get(w.fromParticipantId)?.userId, onUser].filter(Boolean) as string[],
      };
    });
    const witnesses = theWitnessesFor(framed, all);
    const key = batch.map((w) => w.id).join(',');
    const seen = witnesses.map((x) => x.id).sort().join(',');
    if (!extra.length && lastRead.get(key) === seen) { reached = true; continue; }
    const raw = await engine.extract(prompt, [{ role: 'user', content: theWaitsAsked(framed, witnesses) }], WAIT_OVER_SCHEMA).catch(() => null);
    const safe = theWaitsOverMadeSafe(raw, batch, witnesses);
    if (!safe) continue;
    reached = true;
    lastRead.set(key, seen);
    for (const o of safe) {
      await prisma.groundDependency.updateMany({ where: { id: o.id, clearedAt: null }, data: { status: 'CLEARED', clearedAt: o.clearedAt } });
      cleared.push(o);
    }
  }
  return reached ? cleared : null;
}
