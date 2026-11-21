import type { TheInstruction, TheirWork, TheTeamMind, WhatTheySaid } from './the-team-mind';

/**
 * WHAT IS READ WHEN THE MODEL CANNOT BE (the deterministic fallback of the team loop). It says less than the model does and never more: it keeps
 * only plain "I will ..." promises and a clearly thin update, and leaves everything else to be kept as it was. It is the safe floor, not the way
 * people are understood; the model reads first (the-team-mind.ts).
 */

const WEEKDAYS: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };

const A_HELP = /\b(?:help me|can you help|could you help|draft|write (?:me )?a|prepare me|agenda|how (?:do|should) i (?:tell|ask|raise|follow)|next step)\b/i;
const A_CORRECTION = /(?:that'?s not right|that is not right|that'?s wrong|that is wrong|not true|i (?:already )?sent (?:it|that|them)|i did send|already (?:sent|done|paid|filed))/i;
const A_THIN = /^\s*(?:it'?s |it is |all |everything is |still )?(ongoing|in progress|done|finished|completed|soon|almost there|working on it)\b[\s.!]*$/i;
const A_PROMISE = /\b(?:i will|i'll|i am going to|i'm going to|i shall)\s+([^.!?\n]{6,160})/gi;

export function theDeterministicReading(text: string, work: TheirWork): WhatTheySaid {
  const t = String(text ?? '');
  if (A_CORRECTION.test(t)) return { kind: 'correction', commitments: [], outcomes: [], blockers: [], answers: [], vague: null };
  if (A_HELP.test(t)) return { kind: 'help', commitments: [], outcomes: [], blockers: [], answers: [], vague: null };
  const thin = A_THIN.exec(t);
  if (thin) {
    const word = thin[1].toLowerCase();
    const how = /done|finished|completed/.test(word) ? 'done' : word === 'soon' || word === 'almost there' ? 'soon' : 'ongoing';
    const about = work.commitments[0]?.text ?? '';
    return { kind: 'update', commitments: [], outcomes: [], blockers: [], answers: [], vague: { about, how } };
  }
  const commitments: { text: string; whenSaid: string | null }[] = [];
  for (const m of t.matchAll(A_PROMISE)) {
    const said = m[0].trim().replace(/[,;]+$/, '');
    const when = /\b(?:by|on|before|this|next)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|\d{1,2}(?:st|nd|rd|th)?\s+\w+)\b|\btomorrow\b|\btoday\b/i.exec(said)?.[0] ?? null;
    commitments.push({ text: said, whenSaid: when });
  }
  return { kind: 'update', commitments: commitments.slice(0, 8), outcomes: [], blockers: [], answers: [], vague: null };
}

export function theDeterministicInstruction(text: string): TheInstruction {
  const t = String(text ?? '');
  const day = Object.keys(WEEKDAYS).find((d) => new RegExp(`\\b${d}\\b`, 'i').test(t));
  if (/\b(?:get|collect|gather)\b[^.]{0,40}\b(?:updates?|reports?)\b/i.test(t) && /\b(?:email|send|write to|mail)\s+(?:them\s+to\s+)?me\b/i.test(t)) {
    return { kind: 'collect_and_report', reportWeekday: day ? WEEKDAYS[day] : null, matter: null, who: [], ...(/\b(?:today|now)\b/i.test(t) ? { today: true } : {}) };
  }
  if (/\bhandle (?:this|it|that)\b[^.]{0,40}\b(?:team|everyone|them|people)\b/i.test(t) && /\b(?:come back|get back|report back|tell me)\b/i.test(t)) {
    return { kind: 'handle_with_team', reportWeekday: null, matter: null, who: [] };
  }
  return { kind: 'none', reportWeekday: null, matter: null, who: [] };
}

/** The model's reading, and where it gives none, the plain one. */
export async function whatTheySaid(mind: TheTeamMind | null | undefined, a: { text: string; hasDocuments: boolean; work: TheirWork; recent?: string }): Promise<WhatTheySaid> {
  const read = await mind?.readTheirWords(a).catch(() => null);
  return read ?? theDeterministicReading(a.text, a.work);
}

export async function whatTheInstructionIs(mind: TheTeamMind | null | undefined, text: string): Promise<TheInstruction> {
  const read = await mind?.readAnInstruction({ text }).catch(() => null);
  return read ?? theDeterministicInstruction(text);
}
