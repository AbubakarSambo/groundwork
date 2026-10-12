/**
 * A COLLEAGUE'S FAULT, WRITTEN BY GROUNDWORK, IS THE SPEAKER'S ACCOUNT UNLESS THE RECORD CONFIRMS IT (decision 137; decision 139,
 * must-fix 4; Hafsah, 12 October, after night quality run 2).
 *
 * Hassan blamed Amina for late stock every week. Amina sent exactly his order, the same afternoon. The rows were already kept as his
 * account (a-wait-is-the-speakers-account), and the lead's daily email read "Hassan says the work is waiting on Amina ... Not backed: no
 * attempt to unblock mentioned." But Groundwork's own prose still stated his account as fact:
 *
 *   his coaching   "You have been waiting on Amina Otieno for the stock from Kisumu since 12 October, and you have not taken it any further."
 *   his report     "... and on one occasion the mix of kits was not right for the shops you had planned to visit."
 *   the lead's     "Hassan Mwenda has been waiting on Amina Otieno for the stock from Kisumu since 12 October. Ask what that is waiting on."
 *   his session    "It reached Kisii two days later."   (DN-1258 arrived the same afternoon)
 *
 * THE CHECK IS CODE, NOT A MODEL, and it reads only Groundwork's own words: anything in quotation marks is what somebody said and is never
 * touched, and a clause that already says whose account it is ("Hassan Mwenda said the wrong mix was sent") stays as it is. A sentence that
 * states a named colleague's (or the lead's) fault, lateness or blocking as fact, or a delivery's fault with nobody named, is rewritten as
 * the speaker's account with the note beside it (theNoteBesideTheClaim: "Tried: ..." or "Not backed: no attempt to unblock mentioned."),
 * unless the record confirms it: the wait is confirmed (theWaitIsConfirmed, the colleague's own promise names it), or the colleague's own
 * words own up to it. Where the speaker is not known, the sentence is kept as the account of whoever in the record gave that blame
 * ("Hassan Mwenda says ..."), with the note. Blame is never removed (Hafsah, 12 October): only text stating blame that nobody in the
 * record gave is taken out.
 *
 * WHAT THE RECORD HOLDS IS PASSED IN (whatTheRecordHoldsForBlame), so the same check runs on a session turn before it is saved, a private
 * summary and a report before they are stored, and coaching, probes and board lines when they are served.
 */

import { intoSentences } from './nothing-invented-reaches-them';
import { labelsForParties } from '../reports/party-labels';
import { NOT_BACKED, theNoteBesideTheClaim, theConfirmedWaits, theirOwnPromiseNamesIt } from '../grounds/a-wait-is-the-speakers-account';

export interface AWaitAsTheRecordHoldsIt {
  /** The speaker's name as it is served. */
  by: string;
  /** The colleague the speaker says they wait on. */
  on: string;
  what: string;
  triedSaid?: string | null;
  /** The colleague's own promise names it (theWaitIsConfirmed). */
  confirmed: boolean;
}

export interface WhatTheRecordHoldsForBlame {
  /** The names of everybody in this check-in, the lead included, as they are served. */
  people: readonly string[];
  /** The lead's name, so "the lead" reads as somebody too. */
  lead?: string | null;
  waits?: readonly AWaitAsTheRecordHoldsIt[];
  /** Each person's own words, so a colleague who owns up to it confirms it. */
  theirOwnWords?: readonly { name: string; text: string }[];
  /** Whose account the text is: the reader themself ("you"), a named person, or not known (null: a sentence that needs it is taken out). */
  speaker?: { name: string; isTheReader: boolean } | null;
  /** The note beside the rewritten sentence. Off in a session turn, where the person is spoken to, not written about. */
  withTheNote?: boolean;
}

export type BlameRewritten = { text: string; rewritten: { from: string; to: string | null }[] };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const firstOf = (n: string) => n.trim().split(/\s+/)[0] ?? '';
/** Every way a person is named: the full name, and the first name where it is a real one. */
function namesOf(held: WhatTheRecordHoldsForBlame): string[] {
  const all = new Set<string>();
  for (const n of [...(held.people ?? []), held.lead ?? ''].map((x) => String(x ?? '').trim()).filter(Boolean)) {
    all.add(n);
    const f = firstOf(n);
    if (f.length >= 3 && /^[A-Z]/.test(f)) all.add(f);
  }
  return [...all].sort((a, b) => b.length - a.length);
}
const sameOne = (a: string, b: string) => {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  return !!x && !!y && (x === y || firstOf(x) === y || x === firstOf(y) || firstOf(x) === firstOf(y));
};

/** What somebody said is theirs: anything in quotation marks is blanked before reading, never changed. */
const withoutTheirWords = (s: string) => s.replace(/[“"][^”"]*(?:[”"]|$)/g, (m) => ' '.repeat(m.length));

/** Words that say whose account a clause is: "You reported that", "Hassan Mwenda said", "according to". */
const SAYS_WHOSE_ACCOUNT = /\b(?:says?|said|saying|reports?|reported|told|tells|according\s+to|claims?|claimed|feels?|felt|believes?|thinks?|thought|mentioned|describes?|described|blames?|blamed|puts?\s+it\s+down\s+to|in\s+(?:your|his|her|their)\s+(?:words|account|view))\b/i;

const DELIVERED_THING = '(?:stock|order|orders|kits?|delivery|deliveries|goods|mix|items?|parcel|shipment|consignment|supplies|prices?|price\\s+list|figures|numbers|list)';
const A_FAULT = '(?:not\\s+right|wrong|incorrect|late|short|incomplete|delayed|missing|held\\s+up)';

/** The colleague-named and unnamed shapes of a fault stated as fact. `who` marks the named colleague's group. */
function theFaultPatterns(names: string[]): { re: RegExp; kind: 'a wait' | 'named' | 'unnamed' }[] {
  const N = names.length ? `(?:${names.map(esc).join('|')})` : '(?!x)x';
  const WHO = `(?<who>${N}|the\\s+lead|your\\s+lead)`;
  const SUBJ = `(?<subj>(?:${N}|You|you|They|they|He|he|She|she)(?:\\s*(?:,|and)\\s*(?:${N}|you))*)`;
  return [
    /* "Hassan Mwenda has been waiting on Amina Otieno", "You have been waiting on Amina", "Hassan is waiting on the lead". */
    { kind: 'a wait', re: new RegExp(`\\b${SUBJ}\\s+(?<verb>has\\s+(?:now\\s+)?been|have\\s+(?:now\\s+)?been|had\\s+been|is\\s+still|are\\s+still|is|are|was|were)\\s+waiting(?<gap>(?:\\s+\\w+){0,4}?)\\s+on\\s+${WHO}\\b`) },
    /* "Amina Otieno sent the wrong mix", "Amina sent it late", "Amina has not sent the stock". */
    { kind: 'named', re: new RegExp(`\\b${WHO}\\s+(?:has\\s+|had\\s+)?(?:sent|delivered|dispatched|gave|packed|shipped|sends|delivers)\\s+(?:\\w+\\s+){0,4}?(?:wrong|incorrect|short|late|too\\s+few|too\\s+little|incomplete|not\\s+enough)\\b`) },
    { kind: 'named', re: new RegExp(`\\b${WHO}\\s+(?:has|have|had|did|does|do)\\s*(?:not|n't|never)\\s+(?:yet\\s+)?(?:sent|send|delivered|deliver|dispatched|dispatch|given|give|shipped|ship|replied|reply|answered|answer|signed|sign|approved|approve|paid|pay)\\b`) },
    { kind: 'named', re: new RegExp(`\\b${WHO}\\s+(?:was|is|has\\s+been|had\\s+been)\\s+(?:late|slow|the\\s+hold-?up|the\\s+blocker|holding\\s+(?:it|things|this|them|the\\s+\\w+)\\s+up)\\b`) },
    { kind: 'named', re: new RegExp(`\\b(?:late|delayed|held\\s+up|wrong|short|stuck|blocked)\\s+(?:\\w+\\s+){0,3}?because\\s+(?:of\\s+)?${WHO}\\b`) },
    { kind: 'named', re: new RegExp(`\\bbecause\\s+${WHO}\\s+(?:sends?|sent|did|was|is|has|had|never|keeps)\\b`) },
    { kind: 'named', re: new RegExp(`\\b(?:held\\s+up|blocked|delayed)\\s+by\\s+${WHO}\\b`) },
    /* Nobody named: "the mix of kits was not right", "stock arrived late", "It reached Kisii two days later." */
    { kind: 'unnamed', re: new RegExp(`\\b${DELIVERED_THING}\\b[^,.;?!]{0,30}?\\b(?:was|were|came|arrived|is|are)\\s+(?:also\\s+|again\\s+)?${A_FAULT}\\b`, 'i') },
    { kind: 'unnamed', re: /\b(?:arrived|arriving|came|coming|reached\s+\w+)\s+late\b/i },
    { kind: 'unnamed', re: new RegExp(`\\b(?:it|they|the\\s+${DELIVERED_THING})\\s+(?:only\\s+)?(?:reached|arrived|got\\s+to|came\\s+to|came)\\b[^,.;?!]{0,30}?\\b(?:days?|weeks?)\\s+later\\b`, 'i') },
    { kind: 'unnamed', re: new RegExp(`\\bthe\\s+wrong\\s+${DELIVERED_THING}\\s+(?:was|were)\\s+(?:sent|delivered|dispatched|packed)\\b`, 'i') },
  ];
}

/** A colleague owning up to it in their own words. */
const OWNS_UP = /\b(?:i|we)\s+(?:was|were|am|are|'m|'re)\s+(?:a\s+(?:bit|little)\s+|very\s+|too\s+)?(?:late|behind|slow)\b|\bmy\s+(?:fault|mistake|bad)\b|\b(?:i|we)\s+(?:sent|packed|gave|delivered)\s+(?:\w+\s+){0,3}?(?:wrong|late|short)\b|\b(?:i|we)\s+(?:have\s+not|haven't|did\s+not|didn't|still\s+have\s+not)\s+(?:yet\s+)?(?:sent|send|delivered|deliver|dispatched)\b|\bsorry\s+(?:for|about)\s+the\s+delay\b/i;

function theRecordConfirmsIt(sentence: string, who: string | null, held: WhatTheRecordHoldsForBlame): boolean {
  const theirs = (held.waits ?? []).filter((w) => w.confirmed && (!who || sameOne(w.on, who)));
  if (theirs.some((w) => theirOwnPromiseNamesIt(w.what, sentence))) return true;
  const speaker = held.speaker?.name ?? '';
  return (held.theirOwnWords ?? []).some((t) => {
    if (who ? !sameOne(t.name, who) : (speaker && sameOne(t.name, speaker))) return false;
    return OWNS_UP.test(t.text) && theirOwnPromiseNamesIt(t.text, sentence);
  });
}

const PLAIN_START = /^(?:It|The|On|This|That|These|Those|Their|His|Her|Your|Stock|Kits?|Every|Each|A|An|Some|One|Last|Twice|Once|Again|Also|And|But)\b/;
const lowerTheStart = (s: string) => (PLAIN_START.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const plural = (subj: string) => /\band\b|,/.test(subj) || /^(?:you|they)$/i.test(subj.trim());

/** The note beside the claim, read from the speaker's own words about it, naming who could have done what (theNoteBesideTheClaim). */
function theNote(by: string | null, on: string | null, held: WhatTheRecordHoldsForBlame): string {
  const rows = (held.waits ?? []).filter((w) => !by || sameOne(w.by, by));
  const row = rows.find((w) => !on || sameOne(w.on, on)) ?? rows[0];
  const reader = held.speaker?.isTheReader ? held.speaker.name : null;
  const asRead = (n: string | null | undefined) => (n && reader && sameOne(n, reader) ? 'you' : n ?? null);
  const names = { by: asRead(by ?? row?.by), on: asRead(on ?? row?.on), lead: asRead(held.lead) };
  return theNoteBesideTheClaim({ what: row?.what ?? null, triedSaid: row?.triedSaid ?? null }, names);
}

/**
 * WHO IN THE RECORD GAVE THIS BLAME, where the text does not say whose account it is (Hafsah, 12 October: blame is never removed; a
 * claim somebody made always stays, as their claim). Somebody other than the one blamed whose wait on that colleague is on record, or,
 * with nobody named, whose wait names the same thing; else somebody whose own words name the same thing and, where a colleague is named,
 * name them. Null: nobody in the record said it, so it is blame nobody gave, and it is the only thing taken out.
 */
function whoGaveIt(sentence: string, who: string | null, held: WhatTheRecordHoldsForBlame): string | null {
  const notTheOneBlamed = (n: string) => !who || !sameOne(n, who);
  const row = (held.waits ?? []).find((w) => notTheOneBlamed(w.by) && (who ? sameOne(w.on, who) : theirOwnPromiseNamesIt(w.what, sentence)));
  if (row) return row.by;
  const theirWords = (held.theirOwnWords ?? []).find((t) => notTheOneBlamed(t.name)
    && theirOwnPromiseNamesIt(t.text, sentence)
    && (!who || new RegExp(`\\b${esc(firstOf(who))}\\b`, 'i').test(t.text)));
  return theirWords ? theirWords.name : null;
}

/** One sentence, read: unchanged, rewritten as the speaker's account, or null (taken out). */
function readOne(sentence: string, held: WhatTheRecordHoldsForBlame, patterns: ReturnType<typeof theFaultPatterns>): string | null | undefined {
  const blanked = withoutTheirWords(sentence);
  if (/\?\s*$/.test(blanked.trim())) return undefined;
  const tail = sentence.match(/\s*$/)?.[0] ?? '';
  const body = sentence.slice(0, sentence.length - tail.length);
  const withNote = held.withTheNote !== false;
  const speaker = held.speaker ?? null;
  /* Clause by clause, so "You reported that X, and on one occasion Y" reads Y on its own. */
  const cuts: number[] = [0];
  const splitter = /,\s+(?:and|but|while|so)\s+|;\s+/g;
  let m: RegExpExecArray | null;
  while ((m = splitter.exec(blanked))) cuts.push(m.index + m[0].length);
  for (const { re, kind } of patterns) {
    re.lastIndex = 0;
    const hit = re.exec(blanked);
    if (!hit) continue;
    const at = hit.index;
    const clauseStart = cuts.filter((c) => c <= at).pop() ?? 0;
    const before = blanked.slice(clauseStart, at);
    if (SAYS_WHOSE_ACCOUNT.test(before)) continue;
    const who = (hit.groups?.who ?? null);
    const whoIsSomebody = who && !/^(?:the|your)\s+lead$/i.test(who) ? who : (who ? held.lead ?? who : null);
    if (theRecordConfirmsIt(body, kind === 'unnamed' ? null : whoIsSomebody, held)) continue;

    if (kind === 'a wait') {
      const subj = hit.groups!.subj;
      const by = /^you$/i.test(subj.trim()) ? (speaker?.name ?? null) : subj;
      const verb = hit.groups!.verb.replace(/^have/, 'has').replace(/^are/, 'is').replace(/^were/, 'was');
      const said = /^you$/i.test(subj.trim())
        ? `${subj} say you ${hit.groups!.verb} waiting`
        : `${subj} ${plural(subj) ? 'say' : 'says'} the work ${verb} waiting`;
      const start = hit.index;
      const verbEnd = blanked.indexOf('waiting', start) + 'waiting'.length;
      const rewritten = body.slice(0, start) + said + body.slice(verbEnd);
      const note = withNote ? ` ${theNote(by, whoIsSomebody, held)}` : '';
      return rewritten.replace(/\s+$/, '') + note + tail;
    }
    /* Whose account it is: the speaker's, or, where that is not known, whoever in the record gave this blame. Nobody: it is blame nobody gave, and it goes. */
    const claimant = speaker ?? (() => {
      const by = whoGaveIt(body, kind === 'unnamed' ? null : whoIsSomebody, held);
      return by ? { name: by, isTheReader: false } : null;
    })();
    if (!claimant) return null;
    const theyFor = claimant.isTheReader ? 'you' : claimant.name;
    const note = withNote ? ` ${theNote(claimant.name, kind === 'named' ? whoIsSomebody : null, held)}` : '';
    if (clauseStart > 0) {
      /* "..., and on one occasion the mix was not right" -> "..., and you said that on one occasion the mix was not right". */
      const rewritten = `${body.slice(0, clauseStart)}${theyFor} said that ${lowerTheStart(body.slice(clauseStart))}`;
      return rewritten.replace(/\s+$/, '') + note + tail;
    }
    const lead = claimant.isTheReader ? 'You say' : `${claimant.name} says`;
    return `${lead} ${lowerTheStart(body.trimStart())}`.replace(/\s+$/, '') + note + tail;
  }
  return undefined;
}

/** Whether a text may state a colleague's fault at all, so the record is looked up only when it might. */
export function mayStateAColleaguesFault(text: string): boolean {
  return /\bwaiting\b[^.?!]*\bon\b|\b(?:sent|delivered|dispatched|packed|gave)\b[^.?!]*\b(?:wrong|late|short|incomplete)\b|\bbecause\b|\b(?:has|have|had|did)\s*(?:not|n't|never)\s+(?:yet\s+)?(?:sent|send|deliver|delivered|dispatch|given|shipped|replied|answered|signed|approved|paid)\b|\b(?:late|later|not\s+right|wrong|held\s+up|delayed)\b/i.test(String(text ?? ''));
}

/** The text with every sentence of Groundwork's own that states a colleague's fault as fact made the speaker's account, or taken out. */
export function withAColleaguesFaultAsTheirAccount(text: string, held: WhatTheRecordHoldsForBlame): BlameRewritten {
  const src = String(text ?? '');
  if (!src.trim() || !mayStateAColleaguesFault(src)) return { text, rewritten: [] };
  const patterns = theFaultPatterns(namesOf(held));
  const out: string[] = [];
  const rewritten: BlameRewritten['rewritten'] = [];
  for (const s of intoSentences(src)) {
    const r = readOne(s, held, patterns);
    if (r === undefined) { out.push(s); continue; }
    rewritten.push({ from: s.trim(), to: r === null ? null : r.trim() });
    if (r !== null) out.push(r);
  }
  if (!rewritten.length) return { text, rewritten };
  return { text: out.join('').trim(), rewritten };
}

/** The same over every string in a stored or served value. A list item left empty goes; a field on its own stays, empty. */
const NOT_PROSE = /^(?:id|.*Id|.*Ids|code|codes|key|kind|type|status|direction|when|at|createdAt|updatedAt|session\w*|period\w*|count|n|score|level|tone|route|path|href|url|label|participantLabel|who|on|from|fieldId|band|quote|quotes|theirWords|saidWordForWord|verbatim)$/;
export function everyColleaguesFaultAsTheirAccount<T>(value: T, held: WhatTheRecordHoldsForBlame): { value: T; rewritten: BlameRewritten['rewritten'] } {
  const rewritten: BlameRewritten['rewritten'] = [];
  const REMOVE = Symbol('remove');
  const walk = (v: any, inAList: boolean): any => {
    if (typeof v === 'string') {
      const r = withAColleaguesFaultAsTheirAccount(v, held);
      rewritten.push(...r.rewritten);
      return v.trim() && !r.text.trim() && inAList ? REMOVE : r.text;
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, true)).filter((y) => y !== REMOVE);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const out: Record<string, any> = {};
      for (const [k, val] of Object.entries(v)) {
        if (NOT_PROSE.test(k)) { out[k] = val; continue; }
        const w = walk(val, false);
        out[k] = w === REMOVE ? '' : w;
      }
      return out;
    }
    return v;
  };
  const walked = walk(value, false);
  return { value: (walked === REMOVE ? value : walked) as T, rewritten };
}

/**
 * WHAT ONE CHECK-IN'S RECORD HOLDS FOR THIS CHECK: the names in it, each wait on a colleague with whether it is confirmed and what the
 * speaker said they tried, and each person's own lines. Nothing read here is shown, except the note, which is the speaker's own words
 * about their own wait, as the lead's emails already show it. A lookup that fails leaves the check without it, never stops the read.
 */
export async function whatTheRecordHoldsForBlame(
  prisma: any,
  groundId: string,
  /** `asLabels`: a report is stored without names, so it is read with the labels it is written in (labelsForParties). */
  opts: { speakerParticipantId?: string | null; speakerIsTheReader?: boolean; withTheNote?: boolean; asLabels?: boolean } = {},
): Promise<WhatTheRecordHoldsForBlame> {
  const held: WhatTheRecordHoldsForBlame = { people: [], withTheNote: opts.withTheNote };
  if (!groundId) return held;
  try {
    const parts: any[] = (await prisma.groundParticipant?.findMany?.({
      where: { groundId },
      select: { id: true, partyType: true, nameGiven: true, roleAsDescribed: true, createdAt: true, user: { select: { firstName: true, lastName: true } } },
    })) ?? [];
    const nameOf = new Map<string, string>();
    if (opts.asLabels) for (const [id, label] of labelsForParties(parts as any)) { if (label) nameOf.set(id, label); }
    else for (const p of parts) {
      const n = [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim() || String(p?.nameGiven ?? '').trim();
      if (n) nameOf.set(p.id, n);
    }
    held.people = [...nameOf.values()];
    const lead = parts.find((p) => p?.partyType === 'INITIATOR');
    held.lead = lead ? nameOf.get(lead.id) ?? null : null;
    if (opts.speakerParticipantId && nameOf.get(opts.speakerParticipantId)) {
      held.speaker = { name: nameOf.get(opts.speakerParticipantId)!, isTheReader: !!opts.speakerIsTheReader };
    }
    const rows: any[] = (await prisma.groundDependency?.findMany?.({
      where: { groundId },
      select: { id: true, groundId: true, fromParticipantId: true, onParticipantId: true, what: true, triedSaid: true },
    })) ?? [];
    const confirmed = await theConfirmedWaits(prisma, rows.map((r) => ({ id: r.id, groundId: r.groundId, onParticipantId: r.onParticipantId ?? null, what: r.what ?? '', triedSaid: r.triedSaid ?? null })));
    held.waits = rows
      .filter((r) => r.onParticipantId && nameOf.get(r.fromParticipantId) && nameOf.get(r.onParticipantId))
      .map((r) => ({ by: nameOf.get(r.fromParticipantId)!, on: nameOf.get(r.onParticipantId)!, what: r.what ?? '', triedSaid: r.triedSaid ?? null, confirmed: confirmed.has(r.id) }));
    const lines: any[] = (await prisma.recordEntry?.findMany?.({ where: { participant: { groundId } }, select: { participantId: true, text: true }, take: 2000 })) ?? [];
    held.theirOwnWords = lines.filter((l) => nameOf.get(l.participantId)).map((l) => ({ name: nameOf.get(l.participantId)!, text: String(l.text ?? '') }));
  } catch { /* not read, so only the names it did read are checked */ }
  return held;
}
