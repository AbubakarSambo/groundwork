/**
 * AN M-PESA CODE GIVEN IN WORDS: THE SCREENSHOT IS ASKED FOR ONCE, AND NEVER AGAIN (Hafsah, 19 October: "An M-Pesa code given in words
 * counts as proof of payment. Show it as "M-Pesa code", and ask once for the screenshot.").
 *
 * Drop Access, messages test, fourth run. Kevin said on Tuesday 13 October "Kilele Hotel's payment was KES 200,000 via M-Pesa. The
 * confirmation code is QJK4TL2MX9. I can forward the M-Pesa message if you need proof." The code is proof of payment
 * (a-typed-reference-backs-its-line). The screenshot of the M-Pesa message is asked for once for that sale, in any of his check-ins, and
 * never after.
 *
 * Two parts, as everywhere in the conversation: the model is told the fact (each code on record, the sale it was given for, and whether
 * the screenshot has been asked for already), and what is sent is checked: a sentence asking for the screenshot or the M-Pesa message of
 * a sale it was asked for already is not sent. Never a question that doubts the code.
 */
import { intoSentences } from './nothing-invented-reaches-them';
import { aQuestionNotYetAsked, WHAT_ELSE } from './nobody-is-left-looking-at-a-paragraph';

/* M-Pesa codes: ten capitals and digits, with at least two letters and one digit ("QJK4TL2MX9"). */
const AN_MPESA_CODE = /\b(?=[A-Z0-9]{10}\b)(?=[A-Z0-9]*\d)(?=(?:[0-9]*[A-Z]){2})[A-Z0-9]{10}\b/g;
const SAID_AS_MPESA = /\bm-?pesa\b|\bconfirmation code\b|\btransaction code\b/i;

export interface AnMPesaCodeOnRecord {
  code: string;
  /** The words it was given in: the sale it is for. */
  sale: string;
  at: Date | string;
}

/** The M-Pesa codes in what somebody said, each with the words it was given in. Only where the words say M-Pesa or a confirmation code. */
export function theMPesaCodesSaid(said: readonly { text: string; at: Date | string }[]): AnMPesaCodeOnRecord[] {
  const out: AnMPesaCodeOnRecord[] = [];
  for (const s of said) {
    const text = String(s.text ?? '');
    if (!SAID_AS_MPESA.test(text)) continue;
    for (const code of text.match(AN_MPESA_CODE) ?? []) if (!out.some((x) => x.code === code)) out.push({ code, sale: text.trim().slice(0, 240), at: s.at });
  }
  return out;
}

/* A sentence that asks for the screenshot, the M-Pesa message or its forward. */
const ASKS_FOR_IT = /\b(?:screenshot|screen shot|screen-shot)\b|\b(?:forward|send|share|attach|add|upload)\b[^.?!]*\b(?:m-?pesa\s+(?:message|sms|text|confirmation)|the\s+(?:m-?pesa\s+)?(?:message|sms)|a\s+photo\s+of\s+(?:the\s+)?(?:m-?pesa|message|payment))\b/i;
/* The capitalised words of the sale ("Kilele Hotel"), for whether a sentence is about it. */
const theNamesOf = (t: string) => (String(t ?? '').match(/\b[A-Z][a-z]{2,}\b/g) ?? []).filter((w) => !['The', 'This', 'That', 'Yep', 'Yes', 'Okay', 'Kes', 'Ksh'].includes(w));

function aboutThisSale(sentence: string, c: AnMPesaCodeOnRecord): boolean {
  if (sentence.includes(c.code)) return true;
  const names = theNamesOf(c.sale);
  if (names.length && names.some((n) => new RegExp(`\\b${n}\\b`).test(sentence))) return true;
  return /\bm-?pesa\b/i.test(sentence);
}

/** Whether the screenshot of this sale was asked for, in a turn of ours after the code was given. */
export function theScreenshotWasAskedFor(c: AnMPesaCodeOnRecord, ourTurns: readonly { content: string; at: Date | string }[]): boolean {
  const after = new Date(c.at).getTime();
  return ourTurns.some((t) => new Date(t.at).getTime() > after
    && intoSentences(String(t.content ?? '')).some((s) => ASKS_FOR_IT.test(s) && aboutThisSale(s, c)));
}

/** What the model is told: each code, the sale, and whether the screenshot may still be asked for. Empty where there is none. */
export function theMPesaCodesForTheModel(codes: readonly AnMPesaCodeOnRecord[], askedAlready: (c: AnMPesaCodeOnRecord) => boolean): string {
  if (!codes.length) return '';
  const lines = codes.map((c) => `- M-Pesa code ${c.code}, given for "${c.sale}". ${askedAlready(c) ? 'The screenshot was asked for already: never ask for it, or for any other proof of this sale, again.' : 'The screenshot has not been asked for yet: you may ask once, in plain words, for a screenshot of the M-Pesa message for this sale.'}`);
  return `M-PESA CODES ON RECORD. Each M-Pesa code below was typed by this person and counts as proof of payment for the sale it was given for. Never question it, and call it "the M-Pesa code".\n${lines.join('\n')}`;
}

/** The reply, without a request for the screenshot of a sale it was asked for already. */
export function withTheScreenshotAskedOnce(reply: string, codes: readonly AnMPesaCodeOnRecord[], askedAlready: (c: AnMPesaCodeOnRecord) => boolean, alreadyAsked: string[] = []): { text: string; cut: string[] } {
  if (!reply || !codes.length) return { text: reply, cut: [] };
  const done = codes.filter(askedAlready);
  if (!done.length) return { text: reply, cut: [] };
  const sentences = intoSentences(reply);
  const cut: string[] = [];
  const kept = sentences.filter((s) => {
    const t = s.replace(/"[^"\n]*"|“[^”]*”/g, ' ');
    const goes = ASKS_FOR_IT.test(t) && done.some((c) => aboutThisSale(t, c));
    if (goes) cut.push(s.trim());
    return !goes;
  });
  if (!cut.length) return { text: reply, cut };
  let text = kept.join('').replace(/[ \t]{2,}/g, ' ').trim();
  if (cut.some((c) => /\?\s*$/.test(c)) && !/\?/.test(text)) text = `${text ? `${text} ` : ''}${aQuestionNotYetAsked(WHAT_ELSE, alreadyAsked) ?? WHAT_ELSE}`;
  return { text: text || (aQuestionNotYetAsked(WHAT_ELSE, alreadyAsked) ?? WHAT_ELSE), cut };
}
