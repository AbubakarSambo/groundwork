/**
 * A GOAL CHANGED BY ITS LEAD, SAID IN HER OWN CONVERSATION (Drop Access and RHEA Soil, 22 November 2026).
 *
 * "Freezers are out of stock, so this week the goal is a waitlist of 50 names." The lead says it in her check-in or on WhatsApp,
 * Groundwork says the change back, and on her yes the one stored goal changes. Nothing is added beside it: the goal row is the one
 * owner, and the board, Today, the summaries and Ask all read that row, so they read the new goal. What it was, when it changed and
 * why are kept once, in the check-in's log (`groundAuditLog.targetChanges`, where a corrected target was already kept), and every
 * reader of "what changed and why" reads that list through `theGoalChangesOn`.
 *
 * The model reads the change from her words (EXPECTATION_PROMPT, goalChanges), and only where she said yes to it. The rules here are
 * the ones every target already keeps: a goal only from the goals on record, a number only from her own words.
 */

export interface AGoalChangeSaid {
  replaces?: unknown;
  aim?: unknown;
  target?: unknown;
  whose?: unknown;
  because?: unknown;
  stopsTheWork?: unknown;
}

export interface AGoalOnRecord { id: string; name: string; target: number | null; ownerParticipantId: string | null }

/** One kept change, as the log holds it. A corrected number (from, to) has no names; a changed goal has both. */
export interface AGoalChange {
  objectiveId: string;
  from: number | null;
  to: number | null;
  fromNames?: string[];
  toName?: string;
  because?: string | null;
  stopsTheWork?: boolean;
  byParticipantId: string;
  said: string | null;
  at: string;
}

/** The change to make, worked out from what the model read and what is on record; null where nothing should change. */
export function theChangeToMake(
  said: AGoalChangeSaid,
  onRecord: readonly AGoalOnRecord[],
  people: readonly { id: string; firstName: string | null }[],
  isHerNumber: (n: number) => boolean,
): { keep: AGoalOnRecord; drop: AGoalOnRecord[]; name: string; target: number | null; ownerParticipantId: string | null; because: string | null; stopsTheWork: boolean } | null {
  const ids = Array.isArray(said.replaces) ? said.replaces.map((x) => String(x)) : [];
  const replaced = onRecord.filter((o) => ids.includes(o.id));
  const name = String(said.aim ?? '').trim().replace(/\s+/g, ' ').slice(0, 160);
  if (!replaced.length || !name) return null;
  const n = typeof said.target === 'number' && Number.isFinite(said.target) && said.target > 0 ? Math.round(said.target) : null;
  const target = n != null && isHerNumber(n) ? n : null;
  const whose = String(said.whose ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  const owner = whose && whose !== 'the' ? people.find((p) => (p.firstName ?? '').trim().toLowerCase() === whose)?.id ?? null : null;
  const because = String(said.because ?? '').trim().replace(/\s+/g, ' ').slice(0, 300) || null;
  const [keep, ...drop] = replaced;
  if (drop.length === 0 && keep.name === name && keep.target === target && keep.ownerParticipantId === owner) return null;
  return { keep, drop, name, target, ownerParticipantId: owner, because, stopsTheWork: said.stopsTheWork === true };
}

/** A goal as it was, said so a reader knows whose it was: Amani's "Sell 10 freezers a week", or the team's. */
export function theGoalAsItWas(o: AGoalOnRecord, people: readonly { id: string; firstName: string | null }[]): string {
  const name = `“${o.name.trim().replace(/[.!?\s]+$/, '')}”`;
  const first = o.ownerParticipantId ? people.find((p) => p.id === o.ownerParticipantId)?.firstName?.trim() : null;
  return first ? `${first}’s ${name}` : `the team’s ${name}`;
}

/** Every kept change of a goal on this check-in, oldest first, read from its log. */
export function theGoalChangesOn(groundAuditLog: unknown): AGoalChange[] {
  const log = groundAuditLog && typeof groundAuditLog === 'object' && !Array.isArray(groundAuditLog) ? (groundAuditLog as any) : null;
  const rows = Array.isArray(log?.targetChanges) ? log.targetChanges : [];
  return rows.filter((r: any) => r && typeof r.objectiveId === 'string' && typeof r.at === 'string');
}

/** The newest change that made this goal what it is now, where it was changed into something else (not only a new number). */
export function theChangeThatMadeThisGoal(changes: readonly AGoalChange[], objectiveId: string): AGoalChange | null {
  const mine = changes.filter((c) => c.objectiveId === objectiveId && c.toName);
  return mine.length ? mine[mine.length - 1] : null;
}

const ended = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const theDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' });
/** A sentence's first letter made small to sit inside another, unless its first word is a name (a person on the check-in, or a capital pair like "KES"). */
const lowerFirst = (s: string, names: readonly string[]) => {
  const first = s.split(/\s+/)[0] ?? '';
  if (!/^[A-Z][a-z]/.test(first) || names.some((n) => n.toLowerCase() === first.replace(/[^\w'’-]/g, '').toLowerCase())) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
};

/**
 * THE CHANGE, IN PLAIN SENTENCES FOR WHOEVER MAY READ THE GOAL, with no colons: "On 22 November the goal changed, because freezers
 * are out of stock. Before that, the goal was that Amani sells 10 freezers a week." `names` are the first names on the check-in, so
 * a name keeps its capital inside the sentence.
 */
export function theChangeAsASentence(c: AGoalChange, names: readonly string[] = []): string {
  const low = (x: string) => lowerFirst(x, names);
  const why = c.because ? `, because ${low(c.because.replace(/[.!?\s]+$/, ''))}` : '';
  const before = (c.fromNames ?? []).map((n) => n.replace(/[.!?\s]+$/, '')).filter(Boolean);
  const was = before.length === 1 ? ` Before that, the goal was ${before[0]}.` : before.length > 1 ? ` Before that, the goals were ${before.slice(0, -1).join(', ')} and ${before[before.length - 1]}.` : '';
  return ended(`On ${theDay(c.at)} the goal changed${why}`) + was;
}
