/**
 * WHAT A PERSON READS AFTER A YES TO A DOCUMENT'S NUMBERS, IN PLAIN FULL SENTENCES (week 14 wording).
 *
 * It read "Recorded from Q3 targets.pdf. 1 number against the person who holds it. Nobody is
 * measured against any of it until they have seen it." The middle part was not a sentence. Every
 * part is now a sentence with a verb, and each count is in words up to ten and in figures past ten,
 * one count to a sentence, so a sentence never mixes the two.
 *
 * Two readers say yes: the person in a check-in (conversation.service) and the lead setting up a
 * check-in (grounds.service). Both come here, so the wording cannot drift between them.
 */

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** The count as the start of a sentence: "One", "Three", "12". */
function aCount(n: number): string {
  const w = n <= 10 ? WORDS[n] : String(n);
  return w.charAt(0).toUpperCase() + w.slice(1);
}

export interface WhatWasRecorded {
  fileName: string;
  /** Numbers written against the person each belongs to. */
  forAPerson: number;
  /** Numbers written for the whole check-in. */
  forEveryone: number;
  /** When the person gave a new number on one line: that line, the number they gave, and the document's. */
  corrected?: { name: string; theirs: number; documents: number } | null;
  /**
   * Whose each of those numbers is, one entry to a number, where it is known: a first name, or
   * "you" where the number is the reader's own. Said in place of "the person it belongs to".
   */
  owners?: string[] | null;
  /** 'check-in': said in a check-in. 'setup': said by the lead setting up a check-in, so the page is named. */
  reader: 'check-in' | 'setup';
}

export function whatWasRecordedFromADocument(r: WhatWasRecorded): string {
  const total = r.forAPerson + r.forEveryone;
  if (!total) return 'Those numbers are already recorded, so I have not written them a second time.';
  const n = (x: number) => x.toLocaleString('en-GB');
  const out: string[] = [`I have recorded this from ${r.fileName}.`];
  if (r.corrected) {
    out.push(`For ${r.corrected.name}, I have written ${n(r.corrected.theirs)}, as you said, instead of the ${n(r.corrected.documents)} in the document.`);
  }
  if (r.forAPerson) {
    const owners = r.owners && r.owners.length === r.forAPerson ? r.owners : null;
    const others = owners ? [...new Set(owners.filter((o) => o !== 'you'))] : [];
    const onlyTheirOwn = !!owners && !others.length;
    if (owners) {
      const distinct = [...new Set(owners)];
      out.push(r.forAPerson === 1
        ? `One number is now set for ${distinct[0]}.`
        : `${aCount(r.forAPerson)} numbers are now set, for ${andList(distinct)}.`);
    } else {
      out.push(r.forAPerson === 1
        ? 'One number is now set for the person it belongs to.'
        : `${aCount(r.forAPerson)} numbers are now set, each for the person it belongs to.`);
    }
    if (r.reader === 'setup' && !onlyTheirOwn) {
      if (owners) {
        out.push(r.forAPerson === 1
          ? `It is marked as set by you, and ${others[0]} has not seen it yet.`
          : `Each one is marked as set by you, and ${andList(others)} ${others.length === 1 ? 'has' : 'have'} not seen ${others.length === 1 && r.forAPerson === 1 ? 'it' : 'them'} yet.`);
      } else {
        out.push(r.forAPerson === 1
          ? 'It is marked as set by you, and that person has not seen it yet.'
          : 'Each one is marked as set by you, and the person it belongs to has not seen it yet.');
      }
    }
  }
  if (r.forEveryone) {
    out.push(r.forEveryone === 1
      ? 'One number is for the whole check-in, and everybody here sees it.'
      : `${aCount(r.forEveryone)} numbers are for the whole check-in, and everybody here sees them.`);
  }
  if (r.reader === 'setup') {
    out.push(total === 1
      ? 'You can see it on the Context and resources page now, and every check-in will ask about it.'
      : 'You can see them on the Context and resources page now, and every check-in will ask about them.');
  } else {
    out.push('Nobody is measured against a number until they have seen it.');
  }
  return out.join(' ');
}

const andList = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
