import { theAimsThatAreNew } from '../conversation/an-aim-said-twice-is-one-aim';

/**
 * A PERSON'S OWN AIM THAT WAS KEPT ONLY AS THEIR PROMISE (screens request 110).
 *
 * Amani Wekesa said "I am aiming for 3 shops in Kilimani" in session 1 of "Sales team, Q3", and her
 * board had no target of hers and no `yourShare`. Why: until request 107 (c), part 1 (`73414f97`), a
 * participant's own counted aim was kept only as their promise (`PersonObjective`, kind TARGET, with
 * its number and what it counts) and never put on the board. The fix runs when a check-in closes, over
 * that check-in's own turns, so an aim said in a session that closed before the fix is never read
 * again unless the person says it again.
 *
 * The record still holds the aim, in the person's own words, with its number. So the board reads it
 * from there too, as a target of theirs, set by them, with nothing counted against it. Nothing is
 * written on reading. It is left out where the board already holds it: the same person's target said
 * again, or the team's aim said again (one aim is one target, request 111 b).
 *
 * Only an aim the person set for themselves (`authoredBy: 'self'`) with a plain number and what it
 * counts. A goal the lead set for somebody is not here; it has its own rules (decision 56).
 */

/** The id a board row read from a person's promise carries, so the routes can tell it from a stored target. */
export const AN_AIM_FROM_THEIR_PROMISE = 'their-own-aim-';

/** The same plain number the extraction keeps ("3", "150k", "1.5m", "12,000"), or null. */
export function aPlainNumberSaid(said: string | null | undefined): number | null {
  const m = /^\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|m|million|thousand)?\s*$/i.exec(said ?? '');
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  const times = /^k|thousand/i.test(m[2] ?? '') ? 1_000 : /^m/i.test(m[2] ?? '') ? 1_000_000 : 1;
  const v = Math.round(n * times);
  return Number.isFinite(v) && v > 0 ? v : null;
}

export interface APromiseRow {
  id: string;
  participantId: string;
  text: string | null;
  kind?: string | null;
  target?: string | null;
  measure?: string | null;
  status?: string | null;
  authoredBy?: string | null;
  createdAt?: Date | string | null;
}

export function theirOwnAimsKeptOnlyAsPromises(
  promises: APromiseRow[],
  objectives: { name: string; target: number | null; ownerParticipantId: string | null }[],
  participants: { id: string; partyType: string }[],
  groundId: string,
): any[] {
  const checksIn = new Set(participants.filter((p) => p.partyType !== 'INITIATOR').map((p) => p.id));
  const out: any[] = [];
  for (const p of promises) {
    if (p.authoredBy !== 'self' || p.kind !== 'TARGET' || !checksIn.has(p.participantId)) continue;
    if (String(p.status ?? 'OPEN').toUpperCase() !== 'OPEN') continue;
    const name = (p.text ?? '').trim();
    const target = aPlainNumberSaid(p.target);
    if (!name || target == null || !(p.measure ?? '').trim()) continue;
    const aim = { name, target };
    const theirs = [...objectives, ...out]
      .filter((o) => o.ownerParticipantId === p.participantId)
      .map((o) => ({ name: o.name, target: o.target }));
    if (!theAimsThatAreNew([aim], theirs).length) continue;
    const theTeams = objectives.filter((o) => !o.ownerParticipantId).map((o) => ({ name: o.name, target: o.target }));
    if (theTeams.length && !theAimsThatAreNew([aim], theTeams).length) continue;
    out.push({
      id: `${AN_AIM_FROM_THEIR_PROMISE}${p.id}`, groundId, name, target, count: 0, prevCount: 0,
      ownerParticipantId: p.participantId, setByParticipantId: p.participantId,
      direction: null, dueOn: null, isADecisionAboutAPerson: false, sortOrder: 1000 + out.length,
      addedAtSession: null, assumes: [], suggestedCount: null, suggestedSaid: null,
      createdAt: p.createdAt ?? null,
    });
  }
  return out;
}
