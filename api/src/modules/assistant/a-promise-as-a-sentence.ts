/**
 * EACH PROMISE ONCE, IN THE SECOND PERSON, AS A FULL SENTENCE (privacy sweep, 7 October, item 4; user journeys F-15).
 *
 * "- I will send it (you said Next week, in "Sales team, Q3")" and "- send the Kisumu price list" were first-person and lower-case fragments, with the day said
 * in brackets, and sometimes twice or as two dates that disagreed. Now: "You said you would send the Kisumu price list by Friday." The person's own
 * words for what they would do are kept; only the frame around them is ours.
 *
 *  - "I will X" / "I'll X" / "I am going to X" becomes "you would X"; a bare "Send X" becomes "you would send X".
 *  - The day they gave is added only when the promise does not already carry a day. Where it does, the promise's own is the one said, and the other is not.
 */
const A_DAY_IN_IT = /\b(?:mon|tues?|wednes|thurs?|fri|satur|sun)day\b|\b(?:today|tomorrow|tonight|next week|this week|next month|this month|end of (?:the )?(?:week|month|quarter|year|october|november|december)|by the end)\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b/i;
const A_WAY_OF_SAYING_WHEN = /^(?:by|on|before|until|in|next|this|every|at|from|after|within|today|tomorrow)\b/i;

/** Starts with a number or a word that begins a noun phrase: not a verb. */
const A_THING_NOT_AN_ACTION = /^(?:\d|(?:a|an|the|one|two|three|four|five|six|seven|eight|nine|ten|some|several|more|another|your|our|each|every|all|no|weekly|daily|monthly)\b)/i;

const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) && !/^(?:I|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

export function whatTheyWouldDo(rawText: string): string {
  let t = String(rawText ?? '').trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  t = t.replace(/^(?:i\s+will|i['’]ll|i\s+am\s+going\s+to|i['’]m\s+going\s+to|i\s+shall|i\s+plan\s+to|i\s+need\s+to|i\s+have\s+agreed\s+to|i\s+agreed\s+to)\s+/i, '');
  t = t.replace(/^(?:to|will)\s+/i, '');
  t = t.replace(/\bmy\b/gi, 'your').replace(/\bI\b/g, 'you').replace(/\bme\b/gi, 'you');
  return lowerFirst(t);
}

export function aPromiseAsASentence(rawText: string, whenSaid: string | null | undefined, where?: string | null): string {
  const does = whatTheyWouldDo(rawText);
  const when = (whenSaid ?? '').trim().replace(/[.!?]+$/, '');
  const carriesADay = A_DAY_IN_IT.test(does);
  const day = when && !carriesADay && !does.toLowerCase().includes(when.toLowerCase()) ? (A_WAY_OF_SAYING_WHEN.test(when) ? ` ${when.charAt(0).toLowerCase()}${when.slice(1)}` : ` by ${when}`) : '';
  /* A thing and not an action ("two depot visits each week") cannot follow "you would": "you said you would two depot visits" is not a sentence (B-136). */
  if (A_THING_NOT_AN_ACTION.test(does)) return `${where ? `In "${where}", what you said you would do is ` : 'What you said you would do is '}${does}${day}.`;
  const head = where ? `In "${where}", you said you would ` : 'You said you would ';
  return `${head}${does}${day}.`;
}
