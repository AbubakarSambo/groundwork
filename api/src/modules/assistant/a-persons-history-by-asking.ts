import { andList } from '../reports/each-wait-under-whoever-holds-it';
/**
 * A PERSON'S HISTORY, ASKED FOR BY NAME (chat is king, section 8).
 *
 * "How has Joseph been performing?" is answered from the page the screen already serves: that person's My work in each check-in the
 * asker runs (board/my-work.ts). That reader decides who may be read: the person's own page for themselves, the lead of the check-in
 * for anybody who takes part in it, and, asked by Ask alone, the manager the role map names for the person (decision O-15, Hafsah, 21 November
 * 2026), checked there against the role map. Nobody else is served, and it cannot be talked into reading more than the page shows. A name that
 * is not among them gets one answer whether the person exists or not.
 *
 * It says what happened and what would change it. It never ranks a person against another, and it never puts a label on anybody.
 */

/** Narrow on purpose: it needs "performance history", "performing", "performed" or "track record" beside a name. */
export const A_PERSONS_HISTORY_PATTERNS: RegExp[] = [
  /\b(?:performance|work)\s+history\s+(?:of|for|on)\s+(.{2,60}?)\s*[?.!]*\s*$/i,
  /\b(?:show|give|tell)\s+(?:me\s+)?(?:the\s+|a\s+)?(?:performance|work)\s+history\s+(?:of|for|on)\s+(.{2,60}?)\s*[?.!]*\s*$/i,
  /\b(.{2,40}?)(?:'s|’s)\s+(?:performance|work)\s+history\b/i,
  /\b(.{2,40}?)(?:'s|’s)\s+track\s+record\b/i,
  /\bhow\s+(?:has|have)\s+(?!the\b|my\b|our\b|everyone\b|everybody\b|we\b|i\b)(.{2,40}?)\s+(?:been\s+)?(?:performing|performed|been\s+doing|done)\b.*$/i,
  /\bhow\s+(?:is|are)\s+(?!the\b|my\b|our\b|everyone\b|everybody\b|we\b|i\b|things\b)(.{2,40}?)\s+performing\b.*$/i,
];

/** The name asked about, or null. "me", "my" and "myself" are the asker. */
export function whoseHistory(message: string): string | null {
  const t = (message ?? '').trim();
  for (const p of A_PERSONS_HISTORY_PATTERNS) {
    const m = p.exec(t);
    if (m?.[1]) return m[1].trim().replace(/^(?:for|of|on)\s+/i, '').replace(/[?.!]+$/, '').trim();
  }
  return null;
}

export const THE_ASKER = /^(?:me|my|myself|i)$/i;

export const NO_SIGN_IN_FOR_A_HISTORY = 'I cannot look that up without knowing who you are.';

export const NOT_A_PERSON_YOU_LEAD = (name: string) =>
  `I can give the history of people in the check-ins you run and of the people who report to you, and I cannot find ${name} among them. If you lead ${name}, ask me about a name as it is on your check-in.`;

export const JUDGEMENTS_ARE_OFF = 'Your organisation does not show judgements about people here, so I am giving you the counts only.';

export interface AHistoryBehaviour { name: string; verdict: 'Strength' | 'Needs work' | 'Not enough yet'; happened: string; toImprove: string | null }

export interface AHistoryPage {
  checkInName: string;
  personName: string;
  firstName: string;
  self: boolean;
  checkIns: { due: number; done: number; onTime: number; specific: number };
  numbers: { value: string; label: string }[];
  behaviours: AHistoryBehaviour[];
  coaching: { text: string; from: string }[];
  judgementsOff: boolean;
  /** Read by the person's manager on the role map, who does not run this check-in: nothing they told me is in it. */
  asTheirManager?: boolean;
}

const full = (s: string) => { const t = String(s ?? '').trim(); return /[.!?]["”']?$/.test(t) ? t : `${t}.`; };

/** One check-in's history, in full sentences. */
export function aHistorySaid(p: AHistoryPage): string {
  const who = p.self ? 'You' : p.firstName;
  const has = p.self ? 'have' : 'has';
  const out: string[] = [`This is ${p.self ? 'your' : `${p.firstName}’s`} history in "${p.checkInName}", read from ${p.self ? 'your' : 'their'} check-ins${p.self || p.judgementsOff || p.asTheirManager ? '' : ' and from what you have told me about them'}.`];
  if (p.checkIns.due > 0) {
    /* Where judgements are off, on time and specific are not read at all, so they are not said as nought (release test, 21 November 2026:
       "Amani has done 0 of 2 check-ins, 0 on time and 0 with specific answers"). */
    out.push(p.judgementsOff
      ? `${who} ${has} done ${p.checkIns.done} of ${p.checkIns.due} check-ins.`
      : `${who} ${has} done ${p.checkIns.done} of ${p.checkIns.due} check-ins, ${p.checkIns.onTime} on time and ${p.checkIns.specific} with specific answers.`);
  } else {
    out.push(`There is no finished check-in for ${p.self ? 'you' : p.firstName} here yet, so there is no history to read.`);
  }
  const nums = p.numbers.filter((n) => String(n.value ?? '').trim() && String(n.label ?? '').trim());
  /* Each number as the page shows it, value then what it counts, in one sentence: "check-ins is 0 of 2." was the label read as a subject. */
  if (nums.length) out.push(`The numbers on the page are ${andList(nums.map((n) => `${String(n.value).trim()} ${String(n.label).trim()}`))}.`);
  if (p.judgementsOff) return out.join('\n\n');
  const read = p.behaviours.filter((b) => b.verdict !== 'Not enough yet');
  if (read.length) {
    out.push(read.map((b) => (b.verdict === 'Strength'
      ? `${b.name} is a strength. ${full(b.happened)}`
      : `${b.name} needs work. ${full(b.happened)}${b.toImprove ? ` ${full(b.toImprove)}` : ''}`)).join('\n'));
  } else if (p.checkIns.done > 0) {
    out.push('There is not enough on record yet to say what is a strength and what needs work.');
  }
  const better = p.coaching.filter((c) => String(c.text ?? '').trim());
  if (better.length) out.push(`To do better, ${better.slice(0, 3).map((c) => `${full(c.text).replace(/^./, (x) => x.toLowerCase())}`).join(' ')}`);
  return out.join('\n\n');
}

export const A_HISTORY_CLOSING = 'This is the same page you see under My work for this check-in.';
/* No privacy note in a message (the standards; Dangote rerun, N13). Nobody else is served it: that is the backend's rule. */
export const YOUR_OWN_HISTORY_CLOSING = 'This is the same page you see under My work.';
