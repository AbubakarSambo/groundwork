/**
 * ONE PERSON'S CIRCUMSTANCES NEVER REACH ANOTHER, WHERE PEOPLE DO NOT SEE EACH OTHER (decision 75, item 14).
 *
 * Read on the loans run (run-23): Sunday, a borrower in a cohort where people do not see each other, was served
 * "A sixth colleague received a tricycle for a business. The tricycle was stolen, so the sixth colleague has no
 * income from it." in the shared picture, its lines and the board's "what the answers say". The name was gone,
 * the circumstance was not: in a cohort of eight borrowers from one programme, a stolen tricycle in Jos names
 * the man as surely as his name would.
 *
 * Hafsah, 2 October 2026: "In a check-in where people do not see each other, one person's circumstances never
 * reach another." So for a participant in such a check-in, the shared picture carries only counts and patterns
 * across people ("All nine people have answered.", "A common experience was a delay between receiving the asset
 * and generating income."), never a sentence about one colleague. The reader's own sentences stay ("Your goal
 * was ..."), and so do the lead's, who runs it and is named to everybody.
 *
 * Applied where every report read is served, after names are put in (ReportsService.asItWasShared), so the board,
 * which takes the report through the same door, follows. A sentence is about one colleague when it calls them
 * what the naming rule calls somebody the reader may not name ("a colleague", "a sixth colleague", "the same
 * colleague"), or names one of them outright. "Colleagues", plural, is people across the group, and stays.
 */

/** "a colleague", "the sixth colleague", "a colleague's": one person the reader may not name. Never "colleagues". */
const ONE_COLLEAGUE = /\bcolleague\b(?!s)/i;

/* The reader's own sentence, even where it mentions somebody: "You are waiting on a colleague for the stock." But
   not one that puts them beside somebody: "You and a colleague both said ...". */
const THE_READERS_OWN = /^\s*(?:you|your)\b(?!\s+and\b)/i;

function sentencesKeepingSpace(text: string): string[] {
  const out: string[] = [];
  let at = 0;
  for (const m of text.matchAll(/[.!?]+["”’)\]]*(?:[ \t]+|(?=\n)|$)|\n+/g)) {
    const end = m.index! + m[0].length;
    if (end > at) out.push(text.slice(at, end));
    at = end;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

export interface TheOthers {
  /** Names of the other people in it, other than the reader and the lead, as they might appear in served text. */
  names: string[];
}

function aboutOneOfThem(sentence: string, others: TheOthers, namesOnly = false): boolean {
  if (!namesOnly && THE_READERS_OWN.test(sentence)) return false;
  if (!namesOnly && ONE_COLLEAGUE.test(sentence)) return true;
  return others.names.some((n) => n.length > 1 && new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(sentence));
}

/**
 * A piece of text without any sentence about one of the others. Paragraph breaks are kept; empty paragraphs go.
 * `namesOnly`, for a turn in a conversation: only a sentence naming one of them, since "a colleague" there is the
 * product's own way of asking about somebody the person has not named.
 */
export function withoutSentencesAboutOneOfThem(text: string, others: TheOthers, opts: { namesOnly?: boolean } = {}): string {
  const kept = sentencesKeepingSpace(text).filter((s) => !(s.trim() && aboutOneOfThem(s, others, !!opts.namesOnly)));
  return kept.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* Fields that are never about the others and never sentences: identifiers, marks, dates and the like. */
const NOT_TEXT = /^(?:id|groundId|promptVersionId|mark|marks?Behind|markSays|figureIs|sharedAs|releasedAt|createdAt|updatedAt|participantId|ownerParticipantId|kind|type|status|key)$/;

/**
 * THE SERVED REPORT, FOR A PARTICIPANT WHERE PEOPLE DO NOT SEE EACH OTHER. Every string loses its sentences about one
 * of the others; a list loses an item whose own sentence is about one of them, so a line, a "what went wrong" row
 * or a difference between two people is not served half-emptied.
 */
export function onlyCountsAndPatternsAboutTheOthers<T>(served: T, others: TheOthers): T {
  const walk = (v: any, key?: string): any => {
    if (typeof v === 'string') return key && NOT_TEXT.test(key) ? v : withoutSentencesAboutOneOfThem(v, others);
    if (Array.isArray(v)) {
      return v
        .filter((item) => {
          if (typeof item === 'string') return true;
          if (!item || typeof item !== 'object') return true;
          /* An item is dropped whole where any of its own sentences is about one of them. */
          return !Object.entries(item).some(([k, x]) => typeof x === 'string' && !NOT_TEXT.test(k) && sentencesKeepingSpace(x).some((s) => s.trim() && aboutOneOfThem(s, others)));
        })
        .map((item) => walk(item, key))
        .filter((item) => !(typeof item === 'string' && !item.trim()));
    }
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const out: any = {};
      /* A count or a read kept per person, keyed by what they are called ("A sixth colleague": 9), goes too. */
      for (const [k, x] of Object.entries(v)) if (!aboutOneOfThem(k, others)) out[k] = walk(x, k);
      return out;
    }
    return v;
  };
  return walk(served);
}
