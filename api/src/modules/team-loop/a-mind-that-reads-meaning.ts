/**
 * A STAND-IN FOR THE MODEL THAT READS WHAT PEOPLE MEAN, FOR TESTS ONLY (Fatima round 1, groups A, B and G).
 *
 * It is not the product and it is not the model. It is a deterministic reader that works out meaning from the words as a person would, so that the
 * tests can show what the rest of the product does once the meaning is read: it sits behind the same seam as the model (the-team-mind.ts), so the
 * code that decides what is sent, approved or recorded runs for real. It is deliberately more general than a list of phrases: it looks at whether the
 * person agrees, refuses, adds a condition or asks something, reads names, jobs and contacts by their place in a sentence, and reads who wants what and
 * when. The real model is run separately on a sample (api/journey/fatima-fix-a-sanity-with-the-real-model.ts).
 */
import type { APersonNamed, TheInstruction, TheReplyBasis, TheTeamMind, WhatTheySaid } from './the-team-mind';
import type { AnAnswer } from '../executive-onboarding/her-answer';

const words = (t: string) => t.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
const AGREE = new Set(['yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'please', 'go', 'ahead', 'do', 'fine', 'correct', 'right', 'absolutely', 'definitely', 'proceed', 'carry', 'on', 'sounds', 'good', 'great', 'perfect', 'agreed', 'thanks', 'thank', 'that', 'is', "that's", 'it', 'them', 'so', 'write', 'to', 'sure', 'of', 'course']);
const REFUSE = new Set(['no', 'nope', 'not', "don't", 'dont', 'never', 'stop', 'cancel', 'hold', 'wait', 'later', 'leave']);
const CONDITION = new Set(['but', 'except', 'also', 'unless', 'only', 'instead', 'rather']);

/** What a person who read the words would say: agrees, refuses, or says something else (a condition, a question, a new request). */
export function readAnAnswerAsAPersonWould(text: string): AnAnswer {
  const w = words(text);
  if (!w.length) return 'other';
  if (/\?/.test(text) || w.some((x) => CONDITION.has(x))) return 'other';
  if (['no', 'nope', 'nah'].includes(w[0])) return 'no';
  const refuses = w.some((x) => REFUSE.has(x));
  const agrees = w.some((x) => ['yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'please', 'ahead', 'fine', 'correct', 'right', 'absolutely', 'definitely', 'proceed', 'carry', 'agreed', 'sounds', 'good', 'great', 'perfect', 'thanks', 'thank'].includes(x)) || (w.includes('do') && w.includes('it'));
  if (refuses && agrees) return 'other';
  if (refuses) return 'no';
  if (agrees && w.every((x) => AGREE.has(x))) return 'yes';
  return 'other';
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const PHONE = /(?:\+|00)?\d[\d\s().-]{6,}\d/g;
const FILLER = /\b(?:is|are|handles|handle|works|working|as|the|our|my|on|at|his|her|their|number|email|whatsapp|phone|mobile|and|can|be|reached|reach|contact|address|[a-z]+s)\b/gi;

const NOT_NAMES = new Set(['My', 'Our', 'The', 'Please', 'Also', 'These', 'Those', 'Here', 'His', 'Her', 'Their', 'Email', 'Number', 'Whatsapp', 'WhatsApp', 'Team', 'Names', 'Contacts', 'I', 'You', 'And', 'Is', 'On', 'At', 'Can', 'Reach', 'Add', 'Write', 'Send']);
const ROLE_OF_A_PERSON = /\b(?:handles?|works?(?:\s+as|\s+in|\s+on)?|is\s+(?:our|my|the)|in|as|she\s+is|he\s+is)\s+((?:our|my|the)\s+)?([a-z][a-z &/-]{2,50}?)(?=\s*(?:,|\.|\(|$|\bon\b\s|\band\b\s+(?:you|his|her|can)|\bat\b|\d))/i;

/** The first name in the words: a run of capitalised words that is not a word that only starts a sentence. */
function theNameIn(head: string): string | null {
  for (const m of head.matchAll(/[A-Z][\p{L}'’-]+(?:\s+[A-Z][\p{L}'’-]+){0,2}/gu)) {
    const run = m[0].split(/\s+/).filter((x) => !NOT_NAMES.has(x));
    if (run.length) return run.join(' ');
  }
  return null;
}

/** Reads each line or sentence as a person would: the name in it (or the one before, for "His number is"), the job beside it, and the contacts it holds. */
export function readThePeopleAsAPersonWould(text: string): APersonNamed[] {
  const segments = text.split(/\n|(?<=[a-z0-9)])\.\s+(?=[A-Z])|;|,\s+and\s+(?=[+\d])/).map((s) => s.trim()).filter(Boolean);
  const out: APersonNamed[] = [];
  const byName = new Map<string, APersonNamed>();
  let lastName: string | null = null;
  for (const seg of segments) {
    if (/\b(?:my|our)\s+(?:executive\s+)?(?:assistant|ea|pa|secretary)\b/i.test(seg) || /\bis\s+my\s+(?:executive\s+)?(?:assistant|ea|pa|secretary)\b/i.test(seg)) continue;
    const emails = seg.match(EMAIL) ?? [];
    const phones = (seg.replace(EMAIL, ' ').match(PHONE) ?? []).filter((p) => p.replace(/\D/g, '').length >= 8);
    const head = seg.replace(EMAIL, ' ').replace(PHONE, ' ').replace(/^(?:my team|the team|team|names?|contacts?)\s*:\s*/i, '');
    const candidate = theNameIn(head);
    const pronoun = !candidate && /\b(?:his|her|their)\b/i.test(seg);
    const name = candidate ?? (pronoun ? lastName : null);
    if (candidate) lastName = candidate;
    const role = candidate ? (ROLE_OF_A_PERSON.exec(head.slice(head.indexOf(candidate) + candidate.length))?.[2]?.trim().toLowerCase() ?? (/,\s*([a-z][a-z &/-]{2,50}?)\s*(?:,|\(|$)/i.exec(head.slice(head.indexOf(candidate) + candidate.length))?.[1]?.trim().toLowerCase() ?? /\(([^)]+)\)/.exec(head)?.[1]?.toLowerCase() ?? /\s-\s([a-z][a-z &/-]+?)\s*(?:-|$)/i.exec(head)?.[1]?.toLowerCase() ?? null)) : null;
    const existing = name ? byName.get(name) : null;
    if (existing) {
      existing.email = existing.email ?? emails[0]?.toLowerCase() ?? null;
      existing.phone = existing.phone ?? phones[0]?.trim() ?? null;
      existing.role = existing.role ?? role;
      continue;
    }
    if (!candidate && !emails.length && !phones.length) continue;
    const person: APersonNamed = { name, role, email: emails[0]?.toLowerCase() ?? null, phone: phones[0]?.trim() ?? null };
    out.push(person);
    if (name) byName.set(name, person);
  }
  return out;
}

const DAYS: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };

/** Reads what she wants done with her team, by who is to do what for whom, not by phrase. */
export function readAnInstructionAsAPersonWould(text: string): TheInstruction {
  const none: TheInstruction = { kind: 'none', reportWeekday: null, matter: null, who: [] };
  const w = words(text);
  const t = text.toLowerCase();
  if (/\?\s*$/.test(text.trim()) && !/\b(?:can you|could you|would you)\b/.test(t)) return none;
  const aboutTeam = /\b(?:everyone|everybody|team|people|staff|colleagues|all of them|each of them|my office)\b/.test(t) || /\bupdates?\b/.test(t);
  const tellsMe = /\b(?:email|mail|send|tell|give|report to|let|write to|come back to)\s+(?:me|us)\b/.test(t) || /\bto\s+me\b/.test(t) || /\bsummary\b/.test(t);
  const gathers = /\b(?:get|collect|gather|ask|chase|pull together|find out|check with|tell me what)\b/.test(t) || /\b(?:want|need)\s+(?:a|the)\s+(?:summary|update|report)\s+from\b/.test(t);
  const day = [...w].reverse().find((d) => d in DAYS);
  const unsure = /\b(?:not sure|don't know|do not know|unclear|no idea)\b.*\b(?:who|when|what)\b/.test(t) || /\bwho(?:'s| is)? (?:doing|going to)\b/.test(t);
  const handsOver = /\b(?:handle|sort out|deal with|take care of|follow up|look after)\b/.test(t) && /\b(?:team|everyone|them|people|governor|office)\b/.test(t);
  if (unsure && (handsOver || /\bshould\b/.test(t))) return { kind: 'unclear', reportWeekday: null, matter: /sort out the ([a-z ]+?)(?: before| and|\.|,|$)/.exec(t)?.[1] ? `the ${/sort out the ([a-z ]+?)(?: before| and|\.|,|$)/.exec(t)![1]}` : null, who: [], missing: ['owner', 'date'] };
  if (gathers && aboutTeam && tellsMe && !/\b(?:my day|what is outstanding|what's outstanding)\b/.test(t)) return { kind: 'collect_and_report', reportWeekday: day ? DAYS[day] : null, matter: null, who: [] };
  if (handsOver && /\b(?:come back|get back|report back|tell me when|let me know)\b/.test(t)) return { kind: 'handle_with_team', reportWeekday: null, matter: null, who: [] };
  return none;
}

/** A mind that reads meaning the way a person would, for every seam the product asks the model for. `readTheirWords`, `helpThem` and `narrate` give nothing, so the plain code carries on. */
export function aMindThatReadsMeaning(over: Partial<TheTeamMind> = {}): TheTeamMind & { asked: { question: string; text: string }[]; replies: TheReplyBasis[] } {
  const asked: { question: string; text: string }[] = [];
  const replies: TheReplyBasis[] = [];
  return {
    asked, replies,
    readAnAnswer: async (a) => { asked.push(a); return readAnAnswerAsAPersonWould(a.text); },
    readThePeople: async (a) => readThePeopleAsAPersonWould(a.text),
    readAnInstruction: async (a) => readAnInstructionAsAPersonWould(a.text),
    readTheirWords: async () => null,
    helpThem: async () => null,
    narrate: async () => null,
    whichShowsIt: async () => null,
    ...over,
  };
}

export const nothing: WhatTheySaid = { kind: 'other', commitments: [], outcomes: [], blockers: [], answers: [], vague: null };
