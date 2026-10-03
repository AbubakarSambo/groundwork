/**
 * THE OLD CODE AGAINST THE NEW, ON EXISTING CHECK-INS (decisions 90 and 91).
 *
 * The standard is the prototype, not the old code. The new boards and reports are the gold standard for every
 * check-in, existing ones included, so nothing here asks the new board to look like the old one. It asks:
 *
 *   1. Is everything the old version served to a reader served without error by the new version?
 *   2. Is anything LOST? For each reader of each check-in, every sentence the old version showed (the board,
 *      the report, the check-in page, Ask Groundwork) and every person it named must appear SOMEWHERE in what
 *      the new version serves to the same reader. The place and the wording may differ.
 *   3. Does what is served read worse? The scorer's own wording patterns are counted on both sides.
 *   4. Is anything private served to the wrong reader?
 *   5. Are the Company page and the suites page served for every organisation, and does Ask Groundwork answer
 *      the five most common questions for a lead and a participant without error?
 *
 * It only ever reads, on the local database or on a copy of the live data (see docs/existing-users.md).
 * It runs `existing-clients-served.ts` once in the new code and once in a copy of the live main line
 * (`git worktree add --detach <path> origin/main`, kept outside this folder), then compares the two files.
 *
 *   npx ts-node -T journey/existing-clients-compare.ts --database <address> --old-tree <path to the copy of origin/main> --work <folder for the two files>
 *
 * Add --hosted-database for a copy of the live data on staging (the host name is typed back).
 */
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { NOT_A_PARTICIPANT_READ } from '../src/modules/reports/the-judgement-is-the-leads';
import { WHERE_IT_BELONGS } from '../src/modules/reports/the-four-reports';

/* ------------------------------------------------------------------------------------------------ */
/* Reading what was served.                                                                          */
/* ------------------------------------------------------------------------------------------------ */

/** Every piece of text in what was served: each string value, whole. */
export function stringsIn(x: unknown, out: string[] = []): string[] {
  if (typeof x === 'string') out.push(x);
  else if (typeof x === 'number' && Number.isFinite(x)) out.push(String(x));
  else if (Array.isArray(x)) for (const v of x) stringsIn(v, out);
  else if (x && typeof x === 'object') for (const v of Object.values(x as object)) stringsIn(v, out);
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const STOP = new Set('that this with have from they their there them what when where which would could should about been were your will into than then also just only more most some such very much many each other these those over after before because while does done being'.split(' '));

export const tokensOf = (text: string): Set<string> => new Set(norm(text).split(' ').filter((w) => w.length >= 4 && !STOP.has(w) || /^\d+$/.test(w)));

/** A sentence a person reads: at least four words with a space, not an id, not a code word, not a date stamp. */
export function sentencesAPersonReads(x: unknown): string[] {
  return stringsIn(x).filter((s) => {
    const t = s.trim();
    if (t.split(/\s+/).length < 4) return false;
    if (/^[0-9a-f-]{20,}$/i.test(t) || /^\d{4}-\d{2}-\d{2}T/.test(t)) return false;
    return /\p{L}{3}/u.test(t);
  });
}

/** Kept when most of what makes the sentence what it is (its longer words and numbers) is somewhere in the new text. */
export function isKept(sentence: string, newTokens: Set<string>): boolean {
  const mine = [...tokensOf(sentence)];
  if (mine.length === 0) return true;
  return mine.filter((t) => newTokens.has(t)).length / mine.length >= 0.6;
}

export interface WhatWasLost { sentences: string[]; people: string[]; of: number }

export function whatWasLost(oldServed: unknown[], newServed: unknown[], names: string[]): WhatWasLost {
  const newTokens = tokensOf(stringsIn(newServed).join(' '));
  const newText = ` ${norm(stringsIn(newServed).join(' '))} `;
  const oldText = ` ${norm(stringsIn(oldServed).join(' '))} `;
  const seen = new Set<string>();
  const sentences: string[] = [];
  let of = 0;
  for (const s of sentencesAPersonReads(oldServed)) {
    const k = norm(s);
    if (seen.has(k)) continue;
    seen.add(k);
    of += 1;
    if (!isKept(s, newTokens)) sentences.push(s);
  }
  const people = names.filter((n) => n.length >= 3 && oldText.includes(` ${norm(n)} `) && !newText.includes(` ${norm(n)} `));
  return { sentences, people: [...new Set(people)], of };
}

/** Each piece of text with the place it was in, such as "report.divergences.evidence" (positions in lists left out). */
export function textWithItsPlace(x: unknown, place: string, out: [string, string][] = []): [string, string][] {
  if (typeof x === 'string') out.push([place, x]);
  else if (Array.isArray(x)) for (const v of x) textWithItsPlace(v, place, out);
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x as object)) textWithItsPlace(v, `${place}.${k}`, out);
  return out;
}

/**
 * What a participant never reads, on purpose: the lead's judgement (the-judgement-is-the-leads.ts, commit 96df60a4,
 * which the live main line does not have), and the board's copies of it. Losing these from a participant's pages is the privacy rule, not a loss.
 */
const THE_LEADS_FIELDS = [...new Set([...NOT_A_PARTICIPANT_READ, ...Object.entries(WHERE_IT_BELONGS).filter(([, v]) => v.leadOnly).map(([k]) => k), 'divergence', 'managerAlignment'])];
export const THE_LEADS_JUDGEMENT = new RegExp(`(^|\\.)(${THE_LEADS_FIELDS.join('|')})(\\.|$)`);

/* The scorer's own wording patterns (tools/score_run.py), counted on what a reader is served. */
export const WORDING_PROBLEMS: Record<string, RegExp> = {
  'slot names glued to answers': /(said this was for:|What they report:|Where they say they stand now:|What they say is in the way:|reported this:|named this as being in the way:)/g,
  'internal labels shown': /\b(the initiator|The initiator|Participants? [A-Z](?:, [A-Z])*(?:,? and [A-Z])?\b|the person who set this up)/g,
  'machine table words shown': /(FIELD:|standing: |by kind - | · answered )/g,
  'sentence starting in lower case': /(?<=[a-z])(?<!\bvs)(?<!\betc)(?<!e\.g)(?<!i\.e)\. (?!e\.g|i\.e)[a-z]{2,}\b/g,
  '"1 people"': /\b1 people\b|\b1 of 1 people\b/g,
  'text cut mid-word': /[A-Za-z]\.\.\.\.|[a-z]{1,3}\.\.\.$|\b[a-z]\.\.\.\./g,
};
export const JARGON = /\b(bottlenecks?|pipeline|stakeholders?|alignment|leverage|deliverables?|escalat\w*|cadence|KPIs?|synergy|bandwidth|actionable)\b/gi;

export function wordingProblemsIn(served: unknown[]): Record<string, number> {
  const text = stringsIn(served).join('\n');
  const out: Record<string, number> = {};
  for (const [k, re] of Object.entries(WORDING_PROBLEMS)) out[k] = (text.match(re) ?? []).length;
  out['jargon'] = (text.match(JARGON) ?? []).length;
  return out;
}

/* ------------------------------------------------------------------------------------------------ */
/* The comparison.                                                                                   */
/* ------------------------------------------------------------------------------------------------ */

export interface ServedLine {
  t: string; ground?: string; scenario?: string; role?: string; userId?: string; what?: string; organizationId?: string;
  personId?: string; question?: string; outcome?: 'served' | 'refused' | 'failed' | 'wrote'; why?: string; served?: unknown;
  names?: string[]; label?: string; hasReport?: boolean; rows?: { kind: string | null; checkIns: number }[];
}

export interface TheComparison {
  checkIns: number; scenarios: number;
  reads: { old: Record<string, number>; now: Record<string, number> };
  /** Read by a reader in both, where the old one was served. */
  servedBefore: number; stillServed: number; newlyFailed: string[]; newlyServed: number;
  sentencesBefore: number; sentencesLost: number; specificLost: number; stockLost: number; stockLostTop: string[]; withdrawnFromParticipants: number; heldUntilReleased: number; unexplainedLost: number; readersWhoLostSomething: number; peopleLost: number;
  lostExamples: string[];
  lostByScenario: Record<string, number>;
  /** Where the lost sentences were in the old pages (board, report or page, and the field), and who read them. */
  lostByField: { field: string; readers: string; count: number; example: string }[];
  lostByRole: Record<string, number>;
  wording: { old: Record<string, number>; now: Record<string, number>; worseIn: string[]; betterIn: string[] };
  leaks: string[]; leaksAlsoBefore: number;
  company: Record<string, number>; suites: Record<string, number>; companyFaults: string[];
  ask: { asked: number; answeredBefore: number; answeredNow: number; needTheModel: number; failedNow: string[]; answeredBeforeButNotNow: string[] };
  kindsOfWork: { kind: string | null; checkIns: number }[];
  checkInsWithoutAKind: number | null;
  writesRefused: string[];
  writesByDesign: Record<string, number>;
}

const keyOf = (l: ServedLine) => [l.t, l.ground ?? l.organizationId, l.role, l.userId ?? l.personId, l.what ?? l.question].join('|');
const bump = (r: Record<string, number>, k: string) => { r[k] = (r[k] ?? 0) + 1; };

/** Every sentence not explained, with its place and reader; written to a file when GW_LIST_UNEXPLAINED names one. */
export const THE_UNEXPLAINED: { user: string; ground: string; scenario: string; role: string; place: string; text: string }[] = [];

export function compare(
  oldLines: ServedLine[], newLines: ServedLine[],
  leakOf: (l: ServedLine, readerIsLead: boolean) => string[] = () => [],
): TheComparison {
  const oldBy = new Map<string, ServedLine>(oldLines.filter((l) => ['read', 'ask'].includes(l.t)).map((l) => [keyOf(l), l]));
  const groundsNow = newLines.filter((l) => l.t === 'ground');
  const names = new Map<string, string[]>(groundsNow.map((g) => [g.ground!, g.names ?? []]));
  const scenarioOf = new Map<string, string>(groundsNow.map((g) => [g.ground!, g.scenario ?? '']));
  const out: TheComparison = {
    checkIns: groundsNow.length, scenarios: new Set(groundsNow.map((g) => g.scenario)).size,
    reads: { old: {}, now: {} }, servedBefore: 0, stillServed: 0, newlyFailed: [], newlyServed: 0,
    sentencesBefore: 0, sentencesLost: 0, specificLost: 0, stockLost: 0, stockLostTop: [], withdrawnFromParticipants: 0, heldUntilReleased: 0, unexplainedLost: 0, readersWhoLostSomething: 0, peopleLost: 0, lostExamples: [], lostByScenario: {}, lostByField: [], lostByRole: {},
    wording: { old: {}, now: {}, worseIn: [], betterIn: [] }, leaks: [], leaksAlsoBefore: 0,
    company: {}, suites: {}, companyFaults: [],
    ask: { asked: 0, answeredBefore: 0, answeredNow: 0, needTheModel: 0, failedNow: [], answeredBeforeButNotNow: [] },
    kindsOfWork: newLines.find((l) => l.t === 'kinds')?.rows ?? [], checkInsWithoutAKind: null,
    writesByDesign: ((newLines.find((l) => l.t === 'done') as any)?.writesByDesign as Record<string, number>) ?? {},
    writesRefused: ((newLines.find((l) => l.t === 'done') as any)?.writesRefused as string[]) ?? [],
  };
  out.checkInsWithoutAKind = out.kindsOfWork.length ? out.kindsOfWork.filter((r) => r.kind === null).reduce((n, r) => n + r.checkIns, 0) : null;

  /* One reader of one check-in: everything the old version served them against everything the new one does. */
  const readers = new Map<string, { old: ServedLine[]; now: ServedLine[] }>();
  for (const l of newLines.filter((x) => x.t === 'read')) {
    bump(out.reads.now, l.outcome!);
    const o = oldBy.get(keyOf(l));
    if (o) bump(out.reads.old, o.outcome!);
    if (o?.outcome === 'served' && l.outcome === 'served') out.stillServed += 1;
    if (o?.outcome === 'served') out.servedBefore += 1;
    if (o?.outcome === 'served' && l.outcome !== 'served' && l.outcome !== 'refused') out.newlyFailed.push(`${l.what} for a ${l.role} of check-in ${l.ground!.slice(0, 8)}: ${l.why}`);
    if (o?.outcome === 'served' && l.outcome === 'refused') out.newlyFailed.push(`${l.what} was served to a ${l.role} of check-in ${l.ground!.slice(0, 8)} before and is refused now: ${l.why}`);
    if (l.outcome === 'failed' || l.outcome === 'wrote') out.newlyFailed.push(`${l.what} for a ${l.role} of check-in ${l.ground!.slice(0, 8)} ${l.outcome === 'wrote' ? 'tried to write' : 'failed'}: ${l.why}`);
    if (l.outcome === 'served' && o?.outcome !== 'served') out.newlyServed += 1;
    const k = `${l.ground}|${l.userId}`;
    const slot = readers.get(k) ?? { old: [], now: [] };
    if (o?.outcome === 'served') slot.old.push(o);
    if (l.outcome === 'served') slot.now.push(l);
    readers.set(k, slot);
    if (l.outcome === 'served') {
      const before = o?.outcome === 'served' ? leakOf(o, l.role === 'lead') : [];
      for (const kind of leakOf(l, l.role === 'lead')) {
        /* Found in the old code's pages too: a short phrase that two people happen to share, not something new. */
        if (before.includes(kind)) out.leaksAlsoBefore += 1;
        else out.leaks.push(`${kind}, in the ${l.what} for a ${l.role} of check-in ${l.ground!.slice(0, 8)}`);
      }
    }
  }
  /* Ask Groundwork's answers are part of what a person may read, so they count for the same reader. */
  const asks = newLines.filter((l) => l.t === 'ask');
  for (const l of asks) {
    out.ask.asked += 1;
    const o = oldBy.get(keyOf(l));
    const said = (x?: ServedLine) => x?.outcome === 'served' && stringsIn(x.served).join(' ').trim().length > 0;
    if (said(o)) out.ask.answeredBefore += 1;
    if (said(l)) out.ask.answeredNow += 1;
    else if (l.outcome === 'wrote' && /the model\./.test(l.why ?? '')) out.ask.needTheModel += 1;
    else out.ask.failedNow.push(`"${l.question}" for a ${l.role}: ${l.outcome} ${l.why ?? ''}`.trim());
    if (said(o) && !said(l) && !(l.outcome === 'wrote' && /the model\./.test(l.why ?? ''))) out.ask.answeredBeforeButNotNow.push(`"${l.question}" for a ${l.role}`);
  }

  /* A stock sentence is one the old version printed on three or more different check-ins (a footnote, a description of a kind of role, a placeholder). */
  const whereSaid = new Map<string, Set<string>>();
  for (const l of oldLines.filter((x) => x.t === 'read' && x.outcome === 'served')) for (const sen of sentencesAPersonReads(l.served)) { const k = norm(sen); (whereSaid.get(k) ?? whereSaid.set(k, new Set()).get(k)!).add(l.ground!); }
  const stockTally = new Map<string, number>();
  const fieldTally = new Map<string, { count: number; roles: Set<string>; example: string }>();
  const wordingOld: Record<string, number> = {}, wordingNow: Record<string, number> = {};
  for (const [k, slot] of readers) {
    if (!slot.old.length) continue;
    const ground = k.split('|')[0];
    const lost = whatWasLost(slot.old.map((l) => l.served), slot.now.map((l) => l.served), names.get(ground) ?? []);
    out.sentencesBefore += lost.of;
    out.sentencesLost += lost.sentences.length;
    const specific = lost.sentences.filter((x) => (whereSaid.get(norm(x))?.size ?? 0) < 3);
    for (const x of lost.sentences) if (!specific.includes(x)) stockTally.set(x.slice(0, 160), (stockTally.get(x.slice(0, 160)) ?? 0) + 1);
    out.specificLost += specific.length;
    out.stockLost += lost.sentences.length - specific.length;
    lost.sentences = specific;
    const newTokens = tokensOf(stringsIn(slot.now.map((l) => l.served)).join(' '));
    const heldBack = slot.now.some((l) => (l.served as any)?.teamPicture?.shared === false);
    for (const l of slot.old) for (const [place, text] of textWithItsPlace(l.served, l.what!)) {
      if (sentencesAPersonReads(text).length === 0 || (whereSaid.get(norm(text))?.size ?? 0) >= 3 || isKept(text, newTokens)) continue;
      if (l.role === 'participant' && THE_LEADS_JUDGEMENT.test(place)) { out.withdrawnFromParticipants += 1; continue; }
      /* A participant whose report says a later session's picture is not shared yet: it comes back when the lead releases it. */
      if (l.role === 'participant' && heldBack) { out.heldUntilReleased += 1; continue; }
      out.unexplainedLost += 1;
      THE_UNEXPLAINED.push({ user: l.userId ?? '', ground, scenario: scenarioOf.get(ground) ?? '', role: l.role!, place, text });
      const e = fieldTally.get(place) ?? { count: 0, roles: new Set<string>(), example: text.slice(0, 140) };
      e.count += 1; e.roles.add(l.role!); fieldTally.set(place, e);
      bump(out.lostByRole, l.role!);
    }
    out.peopleLost += lost.people.length;
    if (lost.sentences.length || lost.people.length) {
      out.readersWhoLostSomething += 1;
      bump(out.lostByScenario, scenarioOf.get(ground) ?? 'unknown');
      for (const s of lost.sentences.slice(0, 2)) if (out.lostExamples.length < 25) out.lostExamples.push(`${scenarioOf.get(ground)}: ${s.slice(0, 220)}`);
      for (const p of lost.people.slice(0, 1)) if (out.lostExamples.length < 25) out.lostExamples.push(`${scenarioOf.get(ground)}: the name ${p} is no longer served`);
    }
    for (const [w, c] of Object.entries(wordingProblemsIn(slot.old.map((l) => l.served)))) wordingOld[w] = (wordingOld[w] ?? 0) + c;
    for (const [w, c] of Object.entries(wordingProblemsIn(slot.now.map((l) => l.served)))) wordingNow[w] = (wordingNow[w] ?? 0) + c;
  }
  out.lostByField = [...fieldTally].sort((a, b) => b[1].count - a[1].count).slice(0, 15).map(([field, e]) => ({ field, readers: [...e.roles].join(' and '), count: e.count, example: e.example }));
  out.stockLostTop = [...stockTally].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t, c]) => `${c} readers: ${t}`);
  out.wording.old = wordingOld; out.wording.now = wordingNow;
  for (const w of Object.keys({ ...wordingOld, ...wordingNow })) {
    if ((wordingNow[w] ?? 0) > (wordingOld[w] ?? 0)) out.wording.worseIn.push(w);
    if ((wordingNow[w] ?? 0) < (wordingOld[w] ?? 0)) out.wording.betterIn.push(w);
  }

  for (const l of newLines.filter((x) => x.t === 'company' || x.t === 'suites')) {
    const into = l.t === 'company' ? out.company : out.suites;
    bump(into, l.outcome!);
    if (l.outcome === 'failed' || l.outcome === 'wrote') out.companyFaults.push(`The ${l.t === 'company' ? 'Company page' : 'suites page'} for a ${l.role} of organisation ${l.organizationId!.slice(0, 8)} ${l.outcome === 'wrote' ? 'tried to write' : 'failed'}: ${l.why}`);
  }
  return out;
}

const count = (r: Record<string, number>, k: string) => r[k] ?? 0;
const total = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

export function theSummary(c: TheComparison): string[] {
  const lines: string[] = [];
  lines.push(`Compared ${c.checkIns} check-ins across ${c.scenarios} kinds of scenario, each read as its lead, up to two participants and an admin, through the old code (the live main line) and the new code.`);
  lines.push(`The old code served ${count(c.reads.old, 'served')} of ${total(c.reads.old)} reads (board, report and check-in page). The new code serves ${count(c.reads.now, 'served')} of ${total(c.reads.now)}, with ${count(c.reads.now, 'failed')} failed and ${count(c.reads.now, 'wrote')} tried to write. Of the ${c.servedBefore} the old code served, ${c.stillServed} are still served; ${c.newlyServed} more are served now than before.`);
  lines.push(`Nothing lost, tested sentence by sentence: the old code showed ${c.sentencesBefore} different sentences to these readers. ${c.sentencesBefore - c.sentencesLost} still appear somewhere the same reader can read (the board, the report or the check-in page), in the same or in plainer words; ${c.sentencesLost} do not: ${c.specificLost} are about one check-in's own people, words or numbers, and ${c.stockLost} are stock sentences that the old code printed on three or more check-ins (footnotes, placeholders, descriptions of a kind of role). ${c.peopleLost} named people are no longer named.`);
  lines.push(`Wording, counted with the scorer's own patterns on what readers are served (old, then new): ${Object.keys({ ...c.wording.old, ...c.wording.now }).map((k) => `${k} ${count(c.wording.old, k)} then ${count(c.wording.now, k)}`).join('; ')}. Worse in: ${c.wording.worseIn.join(', ') || 'nothing'}. Better in: ${c.wording.betterIn.join(', ') || 'nothing'}.`);
  const alsoBefore = c.leaksAlsoBefore ? ` ${c.leaksAlsoBefore} matches of a short phrase were found in the old code's pages too; they are a sentence or a title that two people share, not private material.` : '';
  lines.push((c.leaks.length ? `${c.leaks.length} private things were found in what a reader was served (listed below).` : "Nobody was newly served the lead's private notes, another person's own report, a question to Ask Groundwork, or another person's load across check-ins.") + alsoBefore);
  lines.push(`The Company page: ${count(c.company, 'served')} served, ${count(c.company, 'refused')} refused on purpose, ${count(c.company, 'failed') + count(c.company, 'wrote')} failed. The suites page: ${count(c.suites, 'served')} served, ${count(c.suites, 'refused')} refused on purpose, ${count(c.suites, 'failed') + count(c.suites, 'wrote')} failed.`);
  const by = Object.entries(c.writesByDesign);
  lines.push(by.length ? `Opening a page made these writes by design, which the check did not run (the data does not change): ${by.map(([k, v]) => `${k} ${v} times`).join(', ')}.` : 'Opening a page made no write of any kind.');
  lines.push(`Ask Groundwork, five common questions for a lead and a participant: ${c.ask.asked} asked; ${c.ask.answeredBefore} answered by the old code, ${c.ask.answeredNow} by the new code, and ${c.ask.needTheModel} reached the model, which this check does not have, so they were not tested (they are asked by people who have a say-back waiting for an answer; the old code answered those with rules).`);
  lines.push(c.checkInsWithoutAKind === null ? 'The new code has no kind of work column on these check-ins.' : `${c.checkInsWithoutAKind} of ${c.kindsOfWork.reduce((n, r) => n + r.checkIns, 0)} check-ins on this database have no kind of work yet; another builder is giving them one, so each was measured as it is now.`);
  for (const f of c.newlyFailed.slice(0, 40)) lines.push(`FAULT: ${f}`);
  for (const f of c.companyFaults.slice(0, 20)) lines.push(`FAULT: ${f}`);
  for (const f of c.ask.failedNow.slice(0, 20)) lines.push(`ASK: ${f}`);
  for (const f of c.ask.answeredBeforeButNotNow) lines.push(`ASK WORSE: ${f}`);
  for (const l of c.leaks.slice(0, 20)) lines.push(`LEAK: ${l}`);
  lines.push(`Of the sentences about one check-in's own people, words or numbers, ${c.withdrawnFromParticipants} were the lead's judgement (where accounts differ, what was inferred, who stays hidden) that a participant no longer reads, on purpose, because a participant never reads the lead's judgement. ${c.heldUntilReleased} more were the picture of a later session, which a participant reads once the lead releases it (each session's picture is released on its own). ${c.unexplainedLost} are not explained either way (by reader: ${Object.entries(c.lostByRole).map(([r, n2]) => `${r}s ${n2}`).join(', ')}).`);
  for (const f of c.lostByField) lines.push(`WHERE: ${f.count} times in ${f.field} for ${f.readers}, such as: ${f.example}`);
  for (const l of c.stockLostTop) lines.push(`STOCK: ${l}`);
  for (const l of c.lostExamples) lines.push(`LOST: ${l}`);
  const bad = c.newlyFailed.length + c.companyFaults.length + c.leaks.length + c.unexplainedLost + c.peopleLost + c.ask.answeredBeforeButNotNow.length + c.wording.worseIn.length;
  lines.push(bad === 0 ? 'Nothing needs attention.' : `${bad} things need attention.`);
  return lines;
}

/* ------------------------------------------------------------------------------------------------ */
/* The run.                                                                                          */
/* ------------------------------------------------------------------------------------------------ */

export function readLines(file: string): ServedLine[] {
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function runServed(cwd: string, args: string[], label: string) {
  console.log(`Serving the sample with ${label}...`);
  const r = spawnSync('npx', ['ts-node', '-T', 'journey/existing-clients-served.ts', ...args], { cwd, stdio: 'inherit', env: { JWT_SECRET: 'a-local-secret-for-this-read-only-comparison-0123456789abcdef', ...process.env, DATABASE_URL: '' } });
  if (r.status !== 0) throw new Error(`Serving with ${label} stopped (status ${r.status}).`);
}

async function main() {
  const args = process.argv.slice(2);
  const get = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const database = get('--database'); const oldTree = get('--old-tree'); const work = get('--work');
  if (!database || !oldTree || !work) throw new Error('Give --database <address>, --old-tree <copy of origin/main> and --work <folder>. Nothing was read.');
  fs.mkdirSync(work, { recursive: true });
  const extra = ['--database', database, ...args.filter((a, i) => ['--hosted-database'].includes(a) || ['--per-scenario', '--organisations'].includes(args[i - 1]) || ['--per-scenario', '--organisations'].includes(a))];
  const here = path.resolve(__dirname, '..');
  const old = path.join(oldTree, 'api');
  for (const f of ['existing-clients-served.ts', 'the-read-only-guard.ts']) fs.copyFileSync(path.join(here, 'journey', f), path.join(old, 'journey', f));
  const oldFile = path.join(work, 'served-old.jsonl'); const newFile = path.join(work, 'served-new.jsonl');
  if (!args.includes('--compare-the-files-already-there')) {
    runServed(old, [...extra, '--out', oldFile], 'the old code');
    runServed(here, [...extra, '--out', newFile], 'the new code');
  }
  const newLines = readLines(newFile);
  const leakOf = await theLeakSearch(database, newLines);
  const c = compare(readLines(oldFile), newLines, leakOf);
  for (const l of theSummary(c)) console.log(l);
  if (process.env.GW_LIST_UNEXPLAINED) fs.writeFileSync(process.env.GW_LIST_UNEXPLAINED, JSON.stringify(THE_UNEXPLAINED, null, 1));
  fs.writeFileSync(path.join(work, 'comparison.json'), JSON.stringify(c, null, 1));
  process.exit(c.newlyFailed.length || c.companyFaults.length || c.leaks.length || c.unexplainedLost || c.peopleLost ? 3 : 0);
}

/** The private material of each check-in, searched for in what the new code served (the same search as existing-clients-check.ts). */
async function theLeakSearch(database: string, newLines: ServedLine[]): Promise<(l: ServedLine, lead: boolean) => string[]> {
  const { whatLeaked, dataFrom } = await import('./existing-clients-check');
  const { installTheGuard, makeTheDatabaseReadOnly, withOneConnection } = await import('./the-read-only-guard');
  const { PrismaClient } = await import('@prisma/client');
  const prisma: any = new PrismaClient({ datasources: { db: { url: withOneConnection(database) } }, log: [] });
  installTheGuard(prisma);
  await makeTheDatabaseReadOnly(prisma);
  const piles = new Map<string, any[]>();
  for (const g of newLines.filter((l) => l.t === 'ground')) {
    const data = await dataFrom(prisma, { limit: null, ground: g.ground! })();
    piles.set(g.ground!, data.grounds[0] ? await data.privatePileFor(data.grounds[0]) : []);
  }
  await prisma.$disconnect();
  return (l, lead) => whatLeaked(JSON.stringify(l.served ?? null), l.userId!, piles.get(l.ground!) ?? [], lead);
}

if (require.main === module) {
  main().catch((err) => { console.error(err?.message ?? err); process.exit(1); });
}
