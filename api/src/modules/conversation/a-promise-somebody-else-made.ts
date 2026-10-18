/**
 * A PROMISE IS FILED AS THE PROMISE OF WHOEVER MADE IT (Hafsah's point 13, Drop Access, 17 October; release plan Part 1A,
 * "Filing rules").
 *
 * Mercy said "Rose said she will buy the two units at the end of the month, on October 30th." It was written as Mercy's own
 * commitment, so the team report read it as her "Will do" and her list of things to do held it. It is Rose's promise, and it
 * belongs on Rose's deal. The same for a colleague: "He said he'll have them for me on Thursday." is Joseph's promise, and it is
 * already on record as Mercy's wait on Joseph.
 *
 * A line is somebody else's promise when what it promises has another person as its subject: a name, a customer, "he", "she" or
 * "they", followed by what they will do, said directly ("Jane will pay a deposit on Friday.") or reported ("Rose said she will
 * buy"). A line with the speaker's own promise in it ("Kasarani Gym is still on, I will see the owner on Monday.") stays theirs.
 * Read from the words alone, so it is the same for every check-in and every reader.
 */
const strip = (t: string) => String(t ?? '').replace(/\[INFERRED:[^\]]*\]/gi, '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();

/** The speaker's own promise: "I will", "I'll", "we will", "I'm going to", "I need to", "I can". */
const THEIR_OWN = /(?<![\p{L}'’])(?:I|we)(?:\s+(?:will|shall|can|must|am going to|are going to|need to|have to|plan to|intend to|promise to)|['’](?:ll|m going to|re going to))(?![\p{L}])/iu;

/** Somebody else as the subject: a name or a customer ("Rose", "Jane at Savannah Cafe", "The owner"), or he, she or they. */
const SOMEBODY = String.raw`(?:(?:[Hh]e|[Ss]he|[Tt]hey)|(?:[Tt]he\s+)?(?:customer|client|owner|buyer|manager|shop|supplier)|(?!(?:I|We|My|Our|Me|Us)\b)\p{Lu}[\p{L}'’.-]*(?:\s+(?:at|from|of)\s+\p{Lu}[\p{L}'’.-]*(?:\s+\p{Lu}[\p{L}'’.-]*){0,2}|\s+\p{Lu}[\p{L}'’.-]*){0,3})`;
/** What they will do: "will", "'ll", "is going to", "promised to", "agreed to". */
const WILL = String.raw`(?:\s+(?:still\s+|also\s+)?(?:will|would|is going to|are going to|promised to|agreed to|plans to|wants to)|['’]ll)(?![\p{L}])`;
/** Said directly, or reported: "Rose said she will", "Rose still says she will", "He said he'll", "Jane told me she would". */
const REPORTED = String.raw`(?:\s+(?:still\s+|also\s+)?(?:said|says|told (?:me|us)|promised|confirmed|agreed|mentioned)(?:\s+that)?\s+(?:he|she|they|it)${WILL}|${WILL})`;
const SOMEBODY_ELSE_WILL = new RegExp(String.raw`^(?:(?:[Aa]nd|[Bb]ut|[Aa]lso|[Ss]o|[Nn]ow)\s+)?${SOMEBODY}${REPORTED}`, 'u');

/*
 * AND A PROMISE IN A LATER CLAUSE (Drop Access short run, item 12). Mercy said "Delivery is set for Friday, and they'll pay then."
 * and the team report read it as her "Will do". Nothing in it is hers to do: the first clause says where the deal stands, the
 * second is Greenfield's promise. A line with no promise of the speaker's, where a clause after a comma, "and" or "but" is
 * somebody else's promise, is somebody else's.
 */
export function aPromiseSomebodyElseMade(text: string | null | undefined): boolean {
  const t = strip(String(text ?? ''));
  if (!t || THEIR_OWN.test(t)) return false;
  if (SOMEBODY_ELSE_WILL.test(t)) return true;
  return t.split(/\s*[,;]\s*|\s+(?=(?:and|but|so)\s)/i).slice(1).some((c) => SOMEBODY_ELSE_WILL.test(c.trim()));
}
