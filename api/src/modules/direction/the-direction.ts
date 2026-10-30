/**
 * RELEASE 6, DIRECTION ("Align people behind a vision"; release plan, Release 6; the Check-in Reports file's "Direction: the company"
 * and "Direction: a team's brief, and recommitting"). When the direction changes, every team knows what it means for them, each person
 * recommits, and nobody is judged against the old plan. This file is the reading: pure, no database. The service writes.
 */
export interface ADirectionNow { achieve?: string; why?: string; believe?: string; learned?: string; mattersMost?: string; whoOwns?: string }
export interface AWhatChanged { assumed?: string; showedNotTrue?: string; learned?: string; decided?: string; newDirection?: string }
export type ABriefVerb = 'Stop' | 'Continue' | 'Continue, changed' | 'Start' | 'Reassign'
export interface ABriefItem { verb: ABriefVerb; what: string; who?: string | null; whoParticipantId?: string | null }
export interface ATeamsPart {
  groundId: string
  team: string
  means?: string | null
  leadUserId?: string | null
  leadName?: string | null
  approvedAt?: string | null
  brief?: { items: ABriefItem[]; unclear?: string | null; questionsNow?: { asks: string; replaces?: string | null }[]; approvedAt?: string | null } | null
}
export interface ADirectionVersion { version: number; setAt: string; setBy?: string | null; now: ADirectionNow; whatChanged: AWhatChanged; teams: ATeamsPart[] }

/** A live goal (target) in a team's check-in, as the realignment reads it. */
export interface ALiveGoal { id: string; groundId: string; name: string; ownerParticipantId: string | null; ownerName: string | null; target?: number | null }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayAndMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const first = (n: string | null | undefined) => (n ?? '').trim().split(/\s+/)[0] || null;
const sentence = (s: string | null | undefined) => { const t = String(s ?? '').trim(); return t ? (/[.!?]$/.test(t) ? t : `${t}.`) : ''; };
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !['with', 'that', 'this', 'from', 'each', 'month', 'week', 'every'].includes(w)));
const alike = (a: string, b: string) => { const A = words(a), B = words(b); const both = [...A].filter((w) => B.has(w)).length; return both >= 2 || (both >= 1 && Math.min(A.size, B.size) <= 2); };

export const NOW_PARTS: [keyof ADirectionNow, string][] = [
  ['achieve', 'What we’re trying to achieve'], ['why', 'Why it matters'], ['believe', 'What we currently believe'],
  ['learned', 'What we’ve learned so far'], ['mattersMost', 'What matters most right now'], ['whoOwns', 'Who owns what'],
];
export const WHAT_CHANGED_PARTS: [keyof AWhatChanged, string][] = [
  ['assumed', 'What we assumed.'], ['showedNotTrue', 'What showed it wasn’t true.'], ['learned', 'What we learned.'], ['decided', 'What we decided.'], ['newDirection', 'The new direction.'],
];

/** "Has the organisation actually realigned?", checked every two weeks from the record: teams not approved, goals the brief stops still live, goals nobody has looked at. */
export function theRealignment(d: ADirectionVersion, live: ALiveGoal[], lookedAt: Set<string>): { title: string; says: string }[] {
  const out: { title: string; says: string }[] = [];
  const waiting = d.teams.filter((t) => !t.approvedAt);
  if (waiting.length) out.push({ title: 'Teams that have not agreed what it means for them', says: waiting.map((t) => `${t.team} is waiting for ${first(t.leadName) ?? 'its lead'}.`).join(' ') });
  for (const t of d.teams) {
    for (const item of (t.brief?.items ?? []).filter((i) => i.verb === 'Stop')) {
      const still = live.filter((g) => g.groundId === t.groundId && alike(g.name, item.what) && (!item.whoParticipantId || g.ownerParticipantId === item.whoParticipantId));
      for (const g of still) out.push({ title: 'Commitments that no longer make sense', says: `${first(g.ownerName) ?? 'Someone'}’s target, ${g.name.replace(/[.]+$/, '')}, is still on the board, though ${t.team}'s brief stops it. It is suggested to ${first(g.ownerName) ? 'them' : 'its owner'} as one to stop or change.` });
    }
  }
  const unlooked = live.filter((g) => g.ownerParticipantId && !lookedAt.has(g.id) && d.teams.some((t) => t.groundId === g.groundId));
  if (unlooked.length) {
    const who = [...new Set(unlooked.map((g) => first(g.ownerName)).filter(Boolean))] as string[];
    out.push({ title: 'Goals nobody has looked at since the change', says: `${unlooked.length} ${unlooked.length === 1 ? 'goal has' : 'goals have'} not been continued, changed or stopped yet${who.length ? `, from ${who.length === 1 ? who[0] : `${who.slice(0, -1).join(', ')} and ${who[who.length - 1]}`}` : ''}.` });
  }
  return out;
}

/** The direction as everybody in the organisation reads it, in plain sentences. */
export function theDirectionAsRead(d: ADirectionVersion, opts: { live?: ALiveGoal[]; lookedAt?: Set<string>; earlier?: ADirectionVersion[]; today?: string } = {}) {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const days = Math.max(0, Math.floor((Date.parse(today) - Date.parse(d.setAt.slice(0, 10))) / 86_400_000));
  const next = new Date(Date.parse(d.setAt.slice(0, 10)) + (Math.floor(days / 14) + 1) * 14 * 86_400_000).toISOString().slice(0, 10);
  return {
    version: d.version,
    setOn: dayAndMonth(d.setAt.slice(0, 10)),
    setBy: d.setBy ?? null,
    now: NOW_PARTS.filter(([k]) => String(d.now[k] ?? '').trim()).map(([k, title]) => ({ title, says: sentence(d.now[k]) })),
    whatChanged: WHAT_CHANGED_PARTS.filter(([k]) => String(d.whatChanged[k] ?? '').trim()).map(([k, label], i) => ({ n: i + 1, label, says: sentence(d.whatChanged[k]) })),
    teams: d.teams.map((t) => ({
      groundId: t.groundId, title: t.team, says: t.means ? sentence(t.means) : 'What it means for this team is not worked out yet.',
      tag: t.approvedAt ? `${first(t.leadName) ?? 'The lead'} approved` : `Waiting for ${first(t.leadName) ?? 'the lead'}`, approved: !!t.approvedAt,
    })),
    realigned: theRealignment(d, opts.live ?? [], opts.lookedAt ?? new Set()),
    nextCheckOn: dayAndMonth(next),
    revisions: (opts.earlier ?? []).map((e) => ({ version: e.version, setOn: dayAndMonth(e.setAt.slice(0, 10)), says: sentence(e.whatChanged.newDirection ?? e.now.achieve ?? '') })),
  };
}

/** A team's brief, as the lead and the team read it: each line, then what was unclear, then the team's check-in questions now. */
export function theTeamsBriefAsRead(d: ADirectionVersion, t: ATeamsPart) {
  return {
    team: t.team,
    lead: first(t.leadName),
    says: [sentence(d.whatChanged.decided), d.whatChanged.showedNotTrue ? `This is because ${sentence(d.whatChanged.showedNotTrue).charAt(0).toLowerCase()}${sentence(d.whatChanged.showedNotTrue).slice(1)}` : ''].filter(Boolean).join(' '),
    items: (t.brief?.items ?? []).map((i) => ({ verb: i.verb, says: `${i.what.replace(/[.]+$/, '')}${i.who ? ` (${first(i.who)})` : ''}`, tone: i.verb === 'Stop' ? 'con' : i.verb === 'Reassign' ? 'att' : 'rec' })),
    unclear: t.brief?.unclear ? sentence(t.brief.unclear) : null,
    approvedSays: t.brief?.approvedAt ? `${first(t.leadName) ?? 'The lead'} approved the change for the team on ${dayAndMonth(t.brief.approvedAt.slice(0, 10))}.` : null,
    questionsNow: (t.brief?.questionsNow ?? []).map((q) => q.replaces ? `“${q.asks.replace(/[“”"]/g, '')}” replaces “${q.replaces.replace(/[“”"]/g, '')}”` : `“${q.asks.replace(/[“”"]/g, '')}”`),
  };
}

/**
 * WHAT A TEAM'S CHECK-IN KNOWS OF THE DIRECTION (Release 6). Code-side words, no stored prompt: the new direction, what it means for this
 * team, the brief, the questions to ask now, and the goals stopped or replaced, which are never counted as missed. Only where Release 6 is
 * on and the team is in the direction; anywhere else it is empty and the check-in asks exactly as before.
 */
export function theDirectionBlock(d: ADirectionVersion | null, groundId: string, stopped: { name: string; owner: string | null }[] = []): string {
  if (!d) return '';
  const t = d.teams.find((x) => x.groundId === groundId);
  if (!t) return '';
  const lines = [
    `THE COMPANY'S DIRECTION CHANGED on ${dayAndMonth(d.setAt.slice(0, 10))}.${d.whatChanged.newDirection ? ` The new direction: ${sentence(d.whatChanged.newDirection)}` : ''}${d.whatChanged.decided ? ` What was decided: ${sentence(d.whatChanged.decided)}` : ''}`,
    t.means && t.approvedAt ? `For this team it means: ${sentence(t.means)}` : '',
    ...(t.brief?.items ?? []).map((i) => `${i.verb}: ${i.what}${i.who ? ` (${i.who})` : ''}.`),
    (t.brief?.questionsNow ?? []).length ? `Ask about the new direction, in your own words, where it fits: ${(t.brief!.questionsNow!).map((q) => `"${q.asks}"`).join(' ')}${(t.brief!.questionsNow!).some((q) => q.replaces) ? ` Do not ask the old questions they replace: ${(t.brief!.questionsNow!).filter((q) => q.replaces).map((q) => `"${q.replaces}"`).join(' ')}` : ''}` : '',
    stopped.length ? `These goals were stopped or replaced with the change. Never count them as missed or late, and never ask for progress on them: ${stopped.map((s) => `${s.name}${s.owner ? ` (${s.owner})` : ''}`).join('; ')}.` : '',
    'If a person is still working on what the brief stops, ask what is making the switch hard, once, without blame.',
  ].filter(Boolean);
  return lines.join('\n');
}
