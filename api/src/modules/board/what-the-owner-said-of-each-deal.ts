import { aLineIsAbout } from './a-deals-value-and-buying-date';
import { theDayTheyMeant } from '../grounds/when-a-handoff-is-due';

/**
 * WHAT A DEAL'S OWNER SAID OF IT, READ FROM THEIR OWN CHECK-IN, WITH NO MODEL (Hafsah's quality pass, 18 October, B-5, B-12 to B-15).
 *
 * The record writer is a model read of each check-in's lines, and on the short run it missed what moved: Kevin's "I sent her a
 * quote for KES 30,000 for the 6 units" left Savannah Cafe at Contacted, his "It's the standard quote for four units, KES 20,000"
 * left Ngong Road Minimart at Need established with "Send the quote" as its next step, Joseph's "Wanjiru is the owner" and
 * Kevin's "She's the owner, so she decides" gave no decision maker, and "Ali said he'll decide next week" was never tied to
 * Ngong Road Minimart, so its last contact read a day old. A line often names no customer ("I just sent the quote for the four
 * units."): it follows the question it answers and the sentence before it.
 *
 * So, after the model's read, the owner's own turns in that check-in are read in order, each sentence with the deal in focus: the
 * one deal of theirs the question or their own words last named (by its name or its contact). From a sentence about the deal in
 * focus, only what it plainly says is kept:
 *  - a quote with its amount, said as done (never "I will send the quote"): "Quoted" and the stage Quoted, never a stage back;
 *  - the units the customer wants ("Jane wants 6 units"): "Units", and "Need" where none is kept;
 *  - the customer said yes to a quote on record ("Savannah Cafe said yes to 6 units"): "Quote accepted", with the day;
 *  - who decides, by name ("Wanjiru is the owner.", "She's the owner, so she decides."): "Decision maker";
 *  - the person at the customer, where the deal has none, named in the same answer as the deal ("That was Ngong Road Minimart.
 *    Ali said he'll decide next week."): "Contact";
 *  - the day the customer pays a deposit ("She's paying a deposit on Friday."): "Buying date", where none is kept.
 * Nothing is guessed: a sentence that names two deals, or none while none is in focus, gives nothing.
 */

export interface ADealToRead {
  id: string;
  name: string;
  stage: string | null;
  fields: Record<string, unknown> | null;
}

export interface AnOwnersTurn {
  role: string;
  content: string | null;
  createdAt: Date | string;
}

export interface WhatTheOwnerSaid {
  /** The stage it moved on to, where it moved. */
  stage: string | null;
  /** The details to keep, plain values only. */
  set: Record<string, string>;
}

const STAGES = ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won'];
const stageAt = (s: string | null | undefined) => STAGES.findIndex((x) => x.toLowerCase() === String(s ?? '').trim().toLowerCase());

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50 };
const NOT_A_NAME = /^(?:I|We|They|He|She|It|That|This|The|And|So|But|Yes|No|Not|Still|Today|Tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|KES|Ksh|Mr|Mrs|Ms|Dr)$/;

const MONEY = /\b(?:KES|Ksh|KSh|KSH)\s?(\d[\d,]*)/;
const A_QUOTE = /\bquot(?:e|ed|es|ing)\b/i;
const NOT_DONE_YET = /\b(?:will|['’]ll|going to|need to|have to|plan to|tomorrow)\b/i;
const SAID_YES = /\b(?:said yes|accepted|agreed to)\b/i;
const THE_OWNER = /\b(?:is|['’]s)\s+the owner\b|,\s*the owner,\s*decides\b|\bthe owner,?\s+so\s+(?:she|he|they)\s+decides?\b/i;
const A_DEPOSIT_ON = /\b(?:pay|pays|paying)\b[^.]*\bdeposit\b[^.]*\bon\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
const WANTS_UNITS = /\bwants?\s+(\d+|[a-z]+)\s+units?\b/i;
const FOR_UNITS = /\bfor\s+(?:the\s+)?(\d+|[a-z]+)\s+units?\b/i;

const toNumber = (s: string): number | null => (/^\d+$/.test(s) ? Number(s) : NUMBER_WORDS[s.toLowerCase()] ?? null);
const plain = (fields: Record<string, unknown> | null | undefined, key: string): string => {
  const v = (fields ?? {})[key];
  return typeof v === 'string' ? v.trim() : '';
};
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const sentencesOf = (text: string): string[] => String(text ?? '').split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);

/** The name a sentence opens on, as the person at the customer: "Ali said he'll decide next week." gives "Ali". */
function aPersonItOpensOn(sentence: string, ours: ReadonlySet<string>, dealName: string): string | null {
  const m = sentence.match(/^(?:And\s+|So\s+)?([A-Z][a-z]{2,})\s+(?:said|says|wants|will|is|has|told|asked|decides)\b/);
  if (!m) return null;
  const name = m[1];
  if (NOT_A_NAME.test(name) || ours.has(name.toLowerCase())) return null;
  if (dealName.toLowerCase().split(/\s+/).includes(name.toLowerCase())) return null;
  return name;
}

/** The person a sentence says will decide: "Peter needs to see them to make a decision.", "Ali can make the decision". */
const DECIDES_BY_NAME = /\b([A-Z][a-z]{2,})\s+(?:needs? to see\b[^.]*\bto (?:make (?:a|the) decision|decide)\b|(?:can|will|could) (?:make (?:a|the) decision|decide)\b|is the one who decides\b)/;

/** The person a sentence says is the owner: "Wanjiru is the owner.", "Rose, the owner, decides.", or the deal's contact for "She's the owner". */
function whoIsTheOwner(sentence: string, contact: string): string | null {
  if (!THE_OWNER.test(sentence)) return null;
  const named = sentence.match(/\b([A-Z][a-z]{2,})(?:\s+is|,)\s+the owner\b/);
  if (named && !NOT_A_NAME.test(named[1])) return named[1];
  const bare = contact.replace(/^(?:mr|mrs|ms|dr)\.?\s+/i, '');
  return /^[A-Z][\p{L}'’-]+(?:\s+[A-Z][\p{L}'’-]+)?$/u.test(bare) && /\b(?:she|he|they)['’]?s?\b/i.test(sentence) ? contact : null;
}

export function whatTheOwnerSaidOfEachDeal(
  deals: readonly ADealToRead[],
  turns: readonly AnOwnersTurn[],
  ourNames: readonly string[],
): Map<string, WhatTheOwnerSaid> {
  const out = new Map<string, WhatTheOwnerSaid>();
  if (!deals.length || !turns.length) return out;
  const ours = new Set(ourNames.map((n) => n.toLowerCase()).filter(Boolean));
  /* The details as they stand, with what this check-in adds, so a later sentence reads what an earlier one kept. */
  const now = new Map(deals.map((d) => [d.id, { ...(d.fields ?? {}) } as Record<string, unknown>]));
  const stageNow = new Map(deals.map((d) => [d.id, d.stage]));
  const said = (d: ADealToRead): WhatTheOwnerSaid => {
    const had = out.get(d.id) ?? { stage: null, set: {} };
    out.set(d.id, had);
    return had;
  };
  const keep = (d: ADealToRead, key: string, value: string) => {
    if (plain(now.get(d.id), key) === value) return;
    said(d).set[key] = value;
    now.get(d.id)![key] = value;
  };
  const named = (text: string) => deals.filter((d) => aLineIsAbout(text, { name: d.name, fields: { Contact: plain(now.get(d.id), 'Contact') } }));
  let focus: ADealToRead | null = null;
  const ordered = [...turns].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const t of ordered) {
    const text = String(t.content ?? '');
    const on = new Date(t.createdAt);
    if (String(t.role).toUpperCase() !== 'PERSON') {
      const asked = named(text);
      focus = asked.length === 1 ? asked[0] : asked.length > 1 ? null : focus;
      continue;
    }
    const namedInThisAnswer = new Set<string>();
    for (const s of sentencesOf(text)) {
      const here = named(s);
      if (here.length > 1) {
        /* Two deals in one sentence: only a yes said right after a deal's own name is that deal's ("Savannah Cafe said yes to 6 units"). */
        for (const d of here) {
          const f = now.get(d.id)!;
          const yes = new RegExp(`${d.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(?:said yes|accepted|agreed to)\\b`, 'i');
          if (yes.test(s) && plain(f, 'Quoted') && !plain(f, 'Quote accepted')) keep(d, 'Quote accepted', dayKey(on));
        }
        focus = null;
        continue;
      }
      if (here.length === 1) { focus = here[0]; namedInThisAnswer.add(here[0].id); }
      const d = focus;
      if (!d) continue;
      const f = now.get(d.id)!;
      /* The person at the customer, named in the same answer as the deal, where the deal has none. */
      if (!plain(f, 'Contact') && namedInThisAnswer.has(d.id) && !here.length) {
        const person = aPersonItOpensOn(s, ours, d.name);
        if (person) keep(d, 'Contact', person);
      }
      /* A quote, with its amount, said as done. */
      const money = s.match(MONEY);
      if (A_QUOTE.test(s) && money && !NOT_DONE_YET.test(s)) {
        keep(d, 'Quoted', `KES ${Number(money[1].replace(/,/g, '')).toLocaleString('en-GB')}`);
        if (stageAt(stageNow.get(d.id)) < stageAt('Quoted')) { said(d).stage = 'Quoted'; stageNow.set(d.id, 'Quoted'); }
      }
      /* The units the customer wants. */
      const wants = s.match(WANTS_UNITS) ?? (A_QUOTE.test(s) ? s.match(FOR_UNITS) : null);
      const units = wants ? toNumber(wants[1]) : null;
      if (units && !plain(f, 'Units')) keep(d, 'Units', String(units));
      if (units && !plain(f, 'Need') && WANTS_UNITS.test(s)) keep(d, 'Need', `${units} ${units === 1 ? 'unit' : 'units'}`);
      if (units && stageAt(stageNow.get(d.id)) < stageAt('Need established') && WANTS_UNITS.test(s)) { said(d).stage = 'Need established'; stageNow.set(d.id, 'Need established'); }
      /* The customer said yes to a quote on record. */
      if (SAID_YES.test(s) && plain(f, 'Quoted') && !plain(f, 'Quote accepted')) keep(d, 'Quote accepted', dayKey(on));
      /* Who decides, by name. */
      const owner = whoIsTheOwner(s, plain(f, 'Contact'));
      const dm = plain(f, 'Decision maker');
      const unnamed = !dm || !/[A-Z]/.test(dm.replace(/^the\b/i, ''));
      if (owner && unnamed) keep(d, 'Decision maker', `${owner}, the owner`);
      const decider = !owner ? s.match(DECIDES_BY_NAME)?.[1] ?? null : null;
      if (decider && unnamed && !NOT_A_NAME.test(decider) && !ours.has(decider.toLowerCase())) keep(d, 'Decision maker', decider);
      /* The day the customer pays a deposit. */
      const deposit = s.match(A_DEPOSIT_ON);
      if (deposit && !plain(f, 'Buying date')) {
        const day = theDayTheyMeant(deposit[1], on);
        if (day) keep(d, 'Buying date', dayKey(day));
      }
    }
  }
  for (const [id, w] of out) if (!w.stage && !Object.keys(w.set).length) out.delete(id);
  return out;
}
