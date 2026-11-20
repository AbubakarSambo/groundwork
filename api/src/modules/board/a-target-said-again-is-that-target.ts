/**
 * A TARGET SAID AGAIN IS THAT TARGET (Hafsah's point 9, 17 October; Drop Access).
 *
 * Grace set the team's 120 and each rep's 40 in her first check-in. The record then held "The team is aiming to sell 120 water
 * dispensers", "Sell 40 units" for each rep, and, from Kevin and Joseph, "My target is 120 units", "My target is actually 120
 * units", "My target is still 120 units" and "hit my target of 120 by the end of October". Read against the transcripts, every
 * one of these is a target already on record, said again: the reps were naming the team's 120. The board then read two team
 * aims of 120, two aims of 40 on Mercy's own share, a "different view" between Grace's 40 each and the reps' 120, and a
 * contradiction in "Where this is heading".
 *
 * THE RULE, FROM THE RECORD. An aim whose number and the thing it counts match a target already on record, the team's or the
 * person's own, is that target. The thing counted matches when both count money, both count leads, or both count things, and
 * the things are the same or one of them is only "units" (a team selling water dispensers counts them as units). The target
 * that was on record first is the one kept; the others are not new aims.
 *
 * NEVER INVENTED, NEVER LOST. Nothing is deleted. The read leaves the restatements out of what a person reads, and the writers
 * no longer keep a new one.
 */

export interface ATargetOnRecord {
  id?: string;
  name: string | null | undefined;
  target: number | null | undefined;
  ownerParticipantId?: string | null;
  createdAt?: Date | string | null;
}

type WhatItCounts = { kind: 'money' | 'leads' | 'things'; things: Set<string> };

const MONEY = /\b(?:kes|ksh|ngn|usd|naira|shillings?|dollars?|revenue|turnover|value|worth)\b|[₦$£€]/i;
const LEADS = /\bleads?\b/i;
/* Words that say nothing about WHICH things are counted. */
const FILLER = new Set([
  'units', 'unit', 'items', 'item', 'pieces', 'piece', 'sold', 'sell', 'selling', 'sells', 'sale', 'sales', 'target', 'targets', 'aim', 'aims',
  'aiming', 'goal', 'objective', 'team', 'the', 'a', 'an', 'of', 'to', 'by', 'for', 'my', 'our', 'is', 'are', 'am', 'be', 'was', 'still',
  'actually', 'really', 'just', 'hit', 'hitting', 'reach', 'reaching', 'get', 'getting', 'make', 'need', 'needs', 'each', 'every', 'total',
  'in', 'on', 'at', 'end', 'this', 'quarter', 'month', 'week', 'weekly', 'year', 'i', 'we', 'you', 'they', 'he', 'she', 'his', 'her',
  'their', 'your', 'me', 'us', 'it', 'and', 'with', 'all', 'more', 'than', 'so', 'far', 'set',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'th', 'st', 'nd', 'rd',
]);

export function whatItCounts(name: string | null | undefined): WhatItCounts {
  const t = String(name ?? '');
  if (MONEY.test(t)) return { kind: 'money', things: new Set() };
  if (LEADS.test(t)) return { kind: 'leads', things: new Set() };
  const words: string[] = t.toLowerCase().replace(/[‘’'"]/g, '').match(/[a-z]+/g) ?? [];
  /* "water dispensers" and "water dispenser" are one thing. */
  const things = new Set(words.filter((w) => w.length > 2 && !FILLER.has(w)).map((w) => w.replace(/s$/, '')));
  return { kind: 'things', things };
}

/** Whether two aims count the same thing: both money, both leads, or things that are the same or only "units" on one side. */
export function theyCountTheSameThing(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = whatItCounts(a);
  const y = whatItCounts(b);
  if (x.kind !== y.kind) return false;
  if (x.kind !== 'things') return true;
  if (!x.things.size || !y.things.size) return true;
  return [...x.things].some((w) => y.things.has(w));
}

const when = (t: ATargetOnRecord): number => {
  const d = t.createdAt ? new Date(t.createdAt).getTime() : NaN;
  return Number.isFinite(d) ? d : Number.MAX_SAFE_INTEGER;
};

/**
 * The target on record this aim says again, or null where it is an aim of its own. Only a target held by the team, or by the
 * aim's own person, and only one on record before it.
 */
export function theTargetItSaysAgain<T extends ATargetOnRecord>(aim: ATargetOnRecord, onRecord: readonly T[]): T | null {
  if (typeof aim.target !== 'number' || !(aim.target > 0)) return null;
  const mine = aim.ownerParticipantId ?? null;
  const candidates = onRecord.filter((t) => t !== aim
    && (!aim.id || t.id !== aim.id)
    && t.target === aim.target
    && (!t.ownerParticipantId || t.ownerParticipantId === mine)
    && theyCountTheSameThing(aim.name, t.name)
    && (aim.createdAt == null || when(t) < when(aim) || (when(t) === when(aim) && (t.ownerParticipantId ?? null) === null && mine !== null)));
  if (!candidates.length) return null;
  /* The team's target first, then the one on record first. */
  return [...candidates].sort((a, b) => (a.ownerParticipantId ? 1 : 0) - (b.ownerParticipantId ? 1 : 0) || when(a) - when(b))[0];
}

/**
 * AN AIM WITH NO NUMBER, SAID AGAIN IN OTHER WORDS (Hafsah, 18 October; Muchemi & Co). "The team files and stamps the Kamau v.
 * Apex defence" and "The team is aiming to file the statement of defence for Kamau v. Apex Ltd" are one piece of work, and the
 * Context tab listed it twice. Two aims with no number are one where they belong to the same person (or both to the team) and
 * at least three of the words that say what the work is are shared, covering three quarters or more of the shorter one. "Draft
 * a reply to the plaintiff's letter in Kamau v. Apex Ltd" shares only the case's name, and stays an aim of its own.
 */
export function theyNameTheSameWork(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = whatItCounts(a);
  const y = whatItCounts(b);
  if (x.kind !== 'things' || y.kind !== 'things') return false;
  const shared = [...x.things].filter((w) => y.things.has(w)).length;
  const shorter = Math.min(x.things.size, y.things.size);
  return shared >= 3 && shorter > 0 && shared / shorter >= 0.75;
}

function theWorkItSaysAgain<T extends ATargetOnRecord>(aim: ATargetOnRecord, onRecord: readonly T[]): T | null {
  if (typeof aim.target === 'number') return null;
  const mine = aim.ownerParticipantId ?? null;
  return onRecord.find((t) => t !== aim && (!aim.id || t.id !== aim.id) && typeof t.target !== 'number'
    && (t.ownerParticipantId ?? null) === mine && theyNameTheSameWork(aim.name, t.name)) ?? null;
}

/** The targets a person reads: each target once, the one on record first, with every restatement of it left out. */
export function eachTargetOnce<T extends ATargetOnRecord>(objectives: readonly T[]): T[] {
  const kept: T[] = [];
  const inOrder = [...objectives].map((o, i) => ({ o, i })).sort((a, b) => when(a.o) - when(b.o) || a.i - b.i);
  const dropped = new Set<T>();
  for (const { o } of inOrder) {
    const before = kept.filter((k) => !dropped.has(k));
    if (theTargetItSaysAgain(o, before) || theWorkItSaysAgain(o, before)) { dropped.add(o); continue; }
    kept.push(o);
  }
  /* In the order they were given. */
  return objectives.filter((o) => !dropped.has(o));
}

/**
 * A DIFFERENCE THAT IS ONLY A TARGET SAID AGAIN, OR ONLY WHERE SOMEBODY'S WORK STANDS, IS NOT A DIFFERENCE (point 9).
 *
 * "You stated each of the three team members is responsible for selling 40 units, but two of the three team members state their
 * individual target is 120 units." Each side named a target on record: Grace each rep's 40, Kevin and Joseph the team's 120.
 * And "Each person is expected to open 10 new leads every week." against Joseph's "I have not planned for generating new leads
 * yet." is the target on one side and where Joseph's work stands on the other, not a different view of it.
 *
 * A side is "the lead" or a person; `targetsFor(side)` gives the numbers on record that side may be naming (the team's and their
 * own; for the lead, every target on record).
 */
export interface ASide { participantLabel?: string | null; view?: string | null; who?: string | null }

const NUMBERS = (t: string): number[] => (t.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, ''))).filter((n) => Number.isFinite(n) && n > 0);
const ONLY_WHERE_IT_STANDS = /^\s*(?:i|we)\s+(?:have\s+not|haven['’]t|has\s+not|hasn['’]t|did\s+not|didn['’]t|am\s+not|are\s+not)\s+(?:yet\s+)?(?:planned|plan|started|begun|set\s+up|worked\s+out|decided|thought\s+about)\b/i;

export function isOnlyATargetSaidAgainOrWhereWorkStands(sides: readonly ASide[], targetsFor: (side: ASide) => readonly number[]): boolean {
  if (sides.length < 2) return false;
  /* A side that says only where their own work stands holds no view of its own. */
  const views = sides.filter((s) => !ONLY_WHERE_IT_STANDS.test(String(s.view ?? '')));
  if (views.length < 2) return true;
  const said = views.map((s) => ({ s, n: NUMBERS(String(s.view ?? '')) }));
  if (!said.some((x) => x.n.length)) return false;
  return said.every((x) => x.n.length > 0 && x.n.every((n) => targetsFor(x.s).includes(n)));
}

/**
 * THE DIFFERENCES ON A REPORT THAT ARE ONLY A TARGET SAID AGAIN, OR ONLY WHERE SOMEBODY'S WORK STANDS (point 9), one rule for
 * the board, Today and the weekly report. `whoIs` reads a side's label (a report label, or a name where the report was served
 * with names) as the person's row; the lead's side may be naming any target on record, anybody else's the team's and their own.
 */
export function theDifferencesThatAreOnlyATargetSaidAgain<D>(
  divergences: readonly D[],
  objectives: readonly { target?: number | null; ownerParticipantId?: string | null }[],
  leadRowId: string | null,
  whoIs: (label: string) => string | null,
): Set<D> {
  const targets = objectives.filter((o) => typeof o.target === 'number');
  const team = targets.filter((o) => !o.ownerParticipantId).map((o) => o.target as number);
  const everyTarget = targets.map((o) => o.target as number);
  const targetsFor = (side: ASide): number[] => {
    const label = String(side.participantLabel ?? '').trim();
    const pid = /^(?:the\s+)?(?:initiator|lead)$/i.test(label) || label === 'You' ? leadRowId : whoIs(label);
    if (pid && pid === leadRowId) return everyTarget;
    return [...team, ...targets.filter((o) => pid && o.ownerParticipantId === pid).map((o) => o.target as number)];
  };
  return new Set(divergences.filter((d: any) => {
    const sides: ASide[] = Array.isArray(d?.positions) ? d.positions : Array.isArray(d?.perspectives) ? d.perspectives : [];
    return isOnlyATargetSaidAgainOrWhereWorkStands(sides, targetsFor);
  }));
}
