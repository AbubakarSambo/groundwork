/**
 * WHAT THE LEAD ASKED FOR IN SO MANY WORDS, READ FROM THEIR OWN MESSAGES (user journeys, F-2 and F-3).
 *
 * Setup reads how often people check in, how long it runs and the check-in's name with the model, best effort, and a miss is silent. The
 * check-in then ran on the situation's own default: a lead who said "weekly for twelve weeks" read "Every month. 12 sessions in total" and
 * 360 days, and a lead who said "Call it New starter onboarding" read "A name" still empty and the card's own title on every list.
 *
 * Only words that leave no room are read here: a rhythm said beside "check in" or "check-ins", a length said as "for twelve weeks", and a
 * name said as "Call it ...". Anything looser is left to the model, and what the lead did not say is never filled in. When they say it
 * more than once, the last time stands, which is how a person correcting themselves means it.
 */
export type TheRhythm = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';

export interface WhatTheyAskedFor {
  cadence?: TheRhythm;
  timelineDays?: number;
  name?: string;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, eighteen: 18, twenty: 20, 'twenty-four': 24, thirty: 30, sixty: 60, ninety: 90,
};
const HOW_MANY = '(\\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|eighteen|twenty|twenty-four|thirty|sixty|ninety)';

const countOf = (s: string): number | null => {
  const t = s.toLowerCase();
  return /^\d+$/.test(t) ? Number(t) : NUMBER_WORDS[t] ?? null;
};

const RHYTHM_WORDS = '(weekly|every week|once a week|fortnightly|every (?:two|2) weeks|every other week|twice a month|monthly|every month|once a month|daily|every day|every working day)';

function rhythmOf(word: string): TheRhythm | null {
  const w = word.toLowerCase();
  if (/^(weekly|every week|once a week)$/.test(w)) return 'WEEKLY';
  if (/^(fortnightly|every (two|2) weeks|every other week|twice a month)$/.test(w)) return 'FORTNIGHTLY';
  if (/^(monthly|every month|once a month)$/.test(w)) return 'MONTHLY';
  if (/^(daily|every day|every working day)$/.test(w)) return 'DAILY';
  return null;
}

/** Said as the check-in's own rhythm: next to "check in" / "check-ins", or as "weekly for twelve weeks". */
const RHYTHM_NEXT_TO_CHECK_IN = [
  new RegExp(`\\bcheck(?:ing)?[- ]?ins?\\b[^.!?\\n]{0,24}?\\b${RHYTHM_WORDS}\\b`, 'gi'),
  new RegExp(`\\b${RHYTHM_WORDS}\\s+check(?:ing)?[- ]?ins?\\b`, 'gi'),
  new RegExp(`\\b${RHYTHM_WORDS}\\s+for\\s+(?:the next\\s+)?${HOW_MANY}\\s+(?:weeks?|months?|days?)\\b`, 'gi'),
];

const LENGTH = new RegExp(`\\b(?:for|over|across|during|lasting|runs for|running for)\\s+(?:the next\\s+|the coming\\s+)?${HOW_MANY}[- ](weeks?|months?|days?)\\b`, 'gi');
const LENGTH_AS_AN_ADJECTIVE = new RegExp(`\\b${HOW_MANY}[- ](week|month|day)\\s+(?:check-?in|run|period|plan|pilot|programme|program|onboarding|sprint)\\b`, 'gi');
const THE_QUARTER = /\b(?:for|over|across)\s+(?:the|a|this|one)\s+quarter\b/gi;

const NAME = /\b(?:call it|call this one|call this|name it|let'?s call it|let us call it)\s+["“'‘]?([^\n.!?"”]{2,80})/gi;

const inDays = (n: number, unit: string): number | null => {
  const u = unit.toLowerCase();
  const days = u.startsWith('week') ? n * 7 : u.startsWith('month') ? n * 30 : n;
  return days >= 7 && days <= 730 ? days : null;
}

/** The last thing each one was said as, across the lead's own messages, in order. */
export function whatTheyAskedFor(theirMessages: readonly string[]): WhatTheyAskedFor {
  const out: WhatTheyAskedFor = {};
  for (const raw of theirMessages) {
    const text = (raw ?? '').replace(/\s+/g, ' ');
    for (const re of RHYTHM_NEXT_TO_CHECK_IN) {
      for (const m of text.matchAll(re)) {
        const r = rhythmOf(m[1]);
        if (r) out.cadence = r;
      }
    }
    for (const m of text.matchAll(LENGTH)) {
      const n = countOf(m[1]);
      const days = n == null ? null : inDays(n, m[2]);
      if (days) out.timelineDays = days;
    }
    for (const m of text.matchAll(LENGTH_AS_AN_ADJECTIVE)) {
      const n = countOf(m[1]);
      const days = n == null ? null : inDays(n, m[2]);
      if (days) out.timelineDays = days;
    }
    if (THE_QUARTER.test(text)) out.timelineDays = 90;
    THE_QUARTER.lastIndex = 0;
    for (const m of text.matchAll(NAME)) {
      /* "Call it New starter onboarding and start it now" is the name and then an instruction. */
      const name = m[1].replace(/\s+(?:and|then)\s+(?:start|begin|run|set|check|invite|add|make|send)\b.*$/i, '')
        /*
         * And the schedule said after a comma is not part of the name (reviewer, 14 October): "Call it Litigation daily,
         * start now, every day, no end" was saved as that whole sentence. A comma followed by when it starts, how often
         * or how long ends the name; "Sales team, Q4" keeps its comma.
         */
        .replace(/\s*[,;:\u2013\u2014-]\s*(?:and\s+)?(?:start|starting|begin|beginning|run|running|open|opens|from|today|now|tomorrow|tonight|next|this\s+(?:week|month|monday|tuesday|wednesday|thursday|friday)|every|each|daily|weekly|monthly|fortnightly|once|twice|until|till|for\s+(?:\w+\s+)?(?:days?|weeks?|months?)|no\s+end|never\s+ends?|with\s+no\s+end|on\s+(?:mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?|weekdays))\b.*$/i, '')
        .replace(/[,;:\s]+$/, '').trim();
      if (name.length >= 2) out.name = name;
    }
  }
  return out;
}
