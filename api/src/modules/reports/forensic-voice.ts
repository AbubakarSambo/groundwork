/**
 * PHRASES THAT MAKE A SHARED PICTURE READ LIKE A CASE FILE.
 *
 * People only answer honestly if it does not feel like they are being assessed
 * or put on trial. The moment a report narrates through "the record" and "the
 * accounts" and calls people "parties", it stops sounding like a colleague
 * telling you what they noticed and starts sounding like disclosure. That
 * changes what the next person writes, which changes what the product can see.
 *
 * The synthesis prompt now says all of this at length. A prompt is a request,
 * though, and a model under load reverts to the register it was trained on.
 * This is the check that it held.
 *
 * DETECT, DO NOT REWRITE. Two of these could be stripped safely and the rest
 * could not: cutting "party" out of a sentence leaves something ungrammatical,
 * and rewriting a claim inside an accountability record is far worse than a
 * stiff sentence. So this reports, and a person decides.
 *
 * IMPORTANT, AND THE REASON THIS IS NOT A BLUNT WORD LIST:
 *
 *   "record" is legitimate as the thing a closed ground becomes: "your record",
 *   "this stays on record for everyone who was in it". Only the NARRATION is
 *   forensic: "the record shows", "the record contains".
 *
 *   "account" is legitimate as the mechanism, and it is the line the whole
 *   product rests on: "everyone gives their own independent account". Only the
 *   narration is forensic: "the accounts differ", "another account describes".
 *
 * Get that split wrong and you either leave the problem in place or delete the
 * sentence that explains what Groundwork is.
 */

export type ForensicHit = { phrase: string; why: string };

const FORENSIC: { pattern: RegExp; why: string }[] = [
  // Narrating through the record, rather than saying the thing.
  { pattern: /\bthe records? (?:shows?|describes?|contains?|indicates?|reflects?|states?)\b/i,
    why: 'narrating through the record instead of saying what happened' },
  { pattern: /\b(?:both|all) records? (?:show|shows|describe|describes|contain|contains)\b/i,
    why: 'narrating through the record instead of saying what happened' },

  // Narrating through the accounts, rather than through the people.
  { pattern: /\bthe accounts? (?:differ|diverge|agree|describe|show|state)\b/i,
    why: 'narrating through the accounts instead of naming who saw what' },
  { pattern: /\b(?:another|one|each|the other) account (?:describes|states|shows|says)\b/i,
    why: 'narrating through the accounts instead of naming who saw what' },

  // People as parties.
  { pattern: /\b(?:both|all|the|each|either|one|another) part(?:y|ies)\b/i,
    why: 'calling people parties' },
  { pattern: /\bthe (?:respondent|subject|individual)\b/i, why: 'a legal or clinical label for a person' },

  // Language from a filing.
  { pattern: /\b(?:testimony|as stated|per the account|submitted their|opted out)\b/i,
    why: 'language from a legal filing' },
  { pattern: /\bevidence(?:d|s)?\b(?! of| that| for)/i, why: 'evidence as a verb reads as case-building' },
];

/** Every forensic phrase in a piece of text, with why it is one. */
export function forensicPhrases(text: string): ForensicHit[] {
  if (!text) return [];
  const hits: ForensicHit[] = [];
  for (const { pattern, why } of FORENSIC) {
    const m = text.match(pattern);
    if (m) hits.push({ phrase: m[0], why });
  }
  return hits;
}

/** Walk a whole report and return the first forensic phrase in it, if any. */
export function forensicInReport(report: Record<string, unknown>): { field: string; hit: ForensicHit } | null {
  const walk = (field: string, value: unknown): { field: string; hit: ForensicHit } | null => {
    if (typeof value === 'string') {
      const [hit] = forensicPhrases(value);
      return hit ? { field, hit } : null;
    }
    if (Array.isArray(value)) {
      for (const [i, v] of value.entries()) {
        const found = walk(`${field}[${i}]`, v);
        if (found) return found;
      }
      return null;
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        const found = walk(`${field}.${k}`, v);
        if (found) return found;
      }
      return null;
    }
    return null;
  };

  for (const field of ['sharedPicture', 'centralQuestion', 'agreements', 'divergences', 'finalSynthesis']) {
    const found = walk(field, (report as any)[field]);
    if (found) return found;
  }
  return null;
}

/**
 * HOUSE STYLE: NO EM DASHES, NO EN DASHES.
 *
 * A real report shipped with one:
 *
 *   "clearing the ticket queue—the only concrete metric he had been given"
 *
 * The style rule applies to everything written for this product and was applied
 * to none of what the product itself writes, so the model used the punctuation
 * it was trained on and nothing noticed.
 *
 * Unlike the forensic phrases, this one IS safe to fix in code. A dash between
 * clauses becomes a comma, and a dash used as a range or a minus is left alone,
 * so no meaning moves. Nothing here is a judgement call, which is exactly why it
 * belongs in code rather than in an instruction the model may or may not follow.
 */
export function withoutDashes(text: string): string {
  if (!text) return text;
  return text
    // "queue—the only" and "queue — the only" both become "queue, the only".
    .replace(/\s*[\u2014\u2013]\s*/g, (m) => (/^\s*$/.test(m) ? m : ', '))
    // A comma may now be doubled where the sentence already had one.
    .replace(/,\s*,/g, ',');
}

/** Any em or en dash left in a piece of text. */
export function hasDashes(text: string): boolean {
  return /[\u2014\u2013]/.test(text ?? '');
}
