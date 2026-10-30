/**
 * "LAST TIME YOU SAID" IS THEIR OWN WORDS, OR IT IS NOT SAID (polish round 1, 26 October 2026).
 *
 * Four openings in one week told people what they had said before, and each was wrong:
 *   Peter read "Last time, you said Upper Hill offices was a key account." He had written that he spoke to the receptionist there.
 *   Brian read "Last time you said the reply in Kasarani Foods v Tumaini Traders has already been filed." It was waiting to be filed.
 *   Wanjiru read "you said on Wednesday 14 October the day before you sent Brian the draft reply". She sent it on the 13th, and said nothing on the 14th.
 *   Wanjiru read "Last time, what you said would show it was identifying overdue bills..." Those were words from the setup, not hers.
 *
 * The model paraphrases what somebody said and dresses it as their account. The product holds what they actually wrote and when,
 * so the product writes the citation and the model only asks the question (the same fix as the session that would not quote a
 * date). A "last time you said" sentence is replaced by the sentence of theirs it is about, word for word, with its day. When
 * nothing they wrote is about it, the claim is cut and only the question after it stays.
 */
import { aDaySaidInFull } from '../board/a-day-said-in-full';

export interface AWordTheyWrote { text: string; at: Date }

const A_LAST_TIME = /\b(?:last\s+time|previously|earlier|the\s+last\s+time\s+we\s+spoke|on\s+(?:mon|tues|wednes|thurs|fri|satur|sun)day(?:\s+\d{1,2}\s+[A-Z][a-z]+)?)\b[\s,]*(?:what\s+)?you\s+(?:said|told\s+me|mentioned|wrote|named|shared)\b/i;
const ALSO_YOU_SAID = /\byou\s+(?:said|told\s+me|mentioned|wrote)\b[^.?!]*\b(?:last\s+time|on\s+(?:mon|tues|wednes|thurs|fri|satur|sun)day)\b/i;

const STOP = new Set(['that', 'this', 'with', 'from', 'have', 'said', 'what', 'when', 'will', 'would', 'they', 'there', 'their', 'your', 'last', 'time', 'about', 'which', 'been', 'were', 'just', 'also', 'told', 'mentioned', 'wrote', 'previously', 'earlier', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
const words = (t: string) => String(t ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' -]+/g, ' ').split(/[\s-]+/).filter((w) => w.length >= 4 && !STOP.has(w));
/*
 * Sentences, with a quotation kept whole and "v." or "Mrs." never taken for the end of one (polish round 2: "Kasarani Foods v." was cut
 * there, and a quotation split in two left a stray "”" at the start of ten openings).
 */
const ABBREVIATIONS = /\b(?:v|vs|Mr|Mrs|Ms|Dr|Prof|St|No|Ltd|Co)\.$/;
function sentencesOf(t: string): string[] {
  const text = String(t ?? '');
  const out: string[] = [];
  let start = 0;
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const closing = c === '”' || (c === '"' && inQuote);
    if (c === '“') inQuote = true;
    else if (c === '”') inQuote = false;
    else if (c === '"') inQuote = !inQuote;
    /* A quotation that ends its sentence ("... Upper Hill.” What happened?") ends it after the closing mark. */
    if (closing && i > 0 && /[.!?]/.test(text[i - 1]) && (i + 1 >= text.length || /\s/.test(text[i + 1]))) {
      out.push(text.slice(start, i + 1).trim());
      start = i + 1;
      continue;
    }
    if (inQuote || !/[.!?]/.test(c)) continue;
    let j = i + 1;
    while (j < text.length && /[”"’)]/.test(text[j])) j++;
    if (j < text.length && !/\s/.test(text[j])) continue;
    if (ABBREVIATIONS.test(text.slice(start, i + 1))) continue;
    out.push(text.slice(start, j).trim());
    start = j;
  }
  out.push(text.slice(start).trim());
  return out.filter(Boolean);
}
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const onTheDay = (d: Date) => aDaySaidInFull(new Date(d));

/** The sentence of theirs a claim is about: the one sharing the most words with it, two at least; the latest on a tie. */
function theirSentenceAbout(claim: string, earlier: AWordTheyWrote[]): { sentence: string; at: Date } | null {
  const mine = new Set(words(claim));
  let best: { sentence: string; at: Date; n: number } | null = null;
  for (const t of earlier) {
    for (const s of sentencesOf(t.text)) {
      const n = new Set(words(s).filter((w) => mine.has(w))).size;
      if (n >= 2 && (!best || n > best.n || (n === best.n && t.at > best.at))) best = { sentence: s, at: t.at, n };
    }
  }
  return best ? { sentence: best.sentence, at: best.at } : null;
}

/** Only the sentences that tell the person what they said before are touched; every other sentence stays as written. */
export function aLastTimeInTheirOwnWords(reply: string, earlier: AWordTheyWrote[]): { text: string; changed: boolean } {
  if (!reply?.trim() || !(A_LAST_TIME.test(reply) || sentencesOf(reply).some((s) => ALSO_YOU_SAID.test(s)))) return { text: reply, changed: false };
  let changed = false;
  /* A question right after a claim that was cut, pointing back at it ("What exists in the record now to show that?"), points at nothing. */
  let cutJustBefore = false;
  const POINTS_BACK = /\b(?:that|it|those|them)\b(?!\s+(?:week|month|day|morning|afternoon|quarter))/i;
  const out = reply.split(/\n/).map((line) => sentencesOf(line).map((s) => {
    if (cutJustBefore) {
      cutJustBefore = false;
      if (POINTS_BACK.test(s) && /\?\s*$/.test(s)) return 'What has moved since your last check-in?';
    }
    if (!A_LAST_TIME.test(s) && !ALSO_YOU_SAID.test(s)) return s;
    /* A quotation that is word for word theirs already is the citation. */
    const quoted = /["“]([^"”]{6,})["”]/.exec(s)?.[1];
    if (quoted && earlier.some((t) => t.text.toLowerCase().includes(quoted.toLowerCase().replace(/[.!?]+$/, '')))) return s;
    /* "...; has that happened?" or "... . What is next?": the question is the model's, and stays. */
    const cut = s.search(/[;—–]\s+(?=[^;—–]*\?\s*$)/);
    const claim = cut > 0 ? s.slice(0, cut) : s;
    const question = cut > 0 ? capital(s.slice(cut + 1).trim()) : null;
    const theirs = theirSentenceAbout(claim, earlier);
    changed = true;
    const citation = theirs ? `You wrote on ${onTheDay(theirs.at)}: “${theirs.sentence.replace(/[“”"]/g, '')}”` : '';
    if (theirs && question) return `${citation} ${question}`;
    if (theirs) return /\?\s*$/.test(s) ? `${citation} Is that still where it stands?` : citation;
    if (!question) cutJustBefore = true;
    return question ?? '';
  }).filter(Boolean).join(' ')).join('\n').replace(/\n{3,}/g, '\n\n').replace(/(^|\n)\s*[”"]\s*/g, '$1').trim();
  return out ? { text: out, changed } : { text: reply, changed: false };
}

/**
 * NO STRAY QUOTE MARK AND NOTHING POINTING AT NOTHING, WHEREVER THE OPENING WAS CUT (26 October 2026). Kevin's opening read
 * "” Did that move forward this period?": the sentence before it had been cut, leaving its closing quote mark and a question about
 * "that". A closing quote at the start of a sentence is always left over, and a first question that points back at nothing is asked plainly.
 */
export function anOpeningWithNothingLeftOver(text: string): string {
  const cleaned = String(text ?? '').replace(/(^|\n|[.!?]\s+)[”]\s*/g, '$1').trim();
  return /^(?:did|has|have|is|was)\s+(?:that|it|this|those)\b[^?]*\?\s*$/i.test(cleaned) ? 'What has moved since your last check-in?' : cleaned;
}
