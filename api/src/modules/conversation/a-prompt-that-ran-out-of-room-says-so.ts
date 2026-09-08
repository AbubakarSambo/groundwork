/**
 * WHAT HAPPENS WHEN SOMEBODY ATTACHES FORTY PAGES.
 *
 * Every visible document is concatenated whole into the prompt, every turn. For a two page brief
 * that is right and simple. For a thirty page architecture document beside a twenty page hardware
 * spec, the model's attention decides what matters rather than anything in this codebase - and it
 * decides silently. The session still answers, still sounds informed, and has read whichever part
 * of it survived.
 *
 * Silent is the whole problem. A session that had read half a document and said so would be a
 * session somebody could work with; one that had read half and behaved as though it read all of it
 * is worse than one that read none, because the person believes their document is in the room.
 *
 * THIS IS NOT RETRIEVAL AND DOES NOT PRETEND TO BE. The right answer is to chunk these through the
 * retrieval the knowledge module already has. This is the smaller, honest thing to do first: keep a
 * bounded amount, and say exactly what was left out and what to do about it.
 *
 * NEWEST FIRST, because a document somebody attached this session is almost always the one they are
 * about to talk about, and the one they would be most surprised to find unread.
 */

export interface Attached {
  fileName: string;
  content: string;
  uploaderNote?: string | null;
  /**
   * One line saying who provided it and who can read it - see where-this-document-came-from.ts.
   * Optional so nothing that builds an `Attached` without it breaks; absent, the document goes in
   * unattributed exactly as every document used to.
   */
  provenance?: string | null;
}

/**
 * HOW MUCH DOCUMENT GOES IN, IN CHARACTERS.
 *
 * Deliberately generous - the great majority of check-ins never come near it - and deliberately
 * finite, because "as much as arrives" is not a limit, it is the absence of one.
 */
export const ROOM_FOR_DOCUMENTS = 60_000;

/** Below this a document is not worth including at all: a fragment reads as the whole thing. */
export const TOO_SHORT_TO_BOTHER = 400;

export interface WhatFitted {
  block: string;
  /** Named so the caller can log it. A silent truncation is the thing being fixed. */
  leftOut: string[];
}

export function whatFitsInTheRoom(docs: Attached[], room = ROOM_FOR_DOCUMENTS): WhatFitted {
  if (!docs.length) return { block: '', leftOut: [] };

  const parts: string[] = [];
  const leftOut: string[] = [];
  let spent = 0;

  for (const d of docs) {
    const asked = d.uploaderNote?.trim()
      ? `They asked for this to be read for: ${d.uploaderNote.trim()}\n`
      : '';
    /* Above the note, because who provided a document changes how its note reads. */
    const from = d.provenance?.trim() ? `${d.provenance.trim()}\n` : '';
    const head = `--- ${d.fileName} ---\n${from}${asked}`;
    const room_left = room - spent - head.length;

    if (room_left < TOO_SHORT_TO_BOTHER) {
      /*
       * NOT INCLUDED AT ALL RATHER THAN AS A SLIVER. Two hundred characters of a specification is
       * worse than nothing: it is enough for a model to form an impression and nowhere near enough
       * for the impression to be right.
       */
      leftOut.push(d.fileName);
      continue;
    }

    if (d.content.length <= room_left) {
      parts.push(`${head}${d.content}`);
      spent += head.length + d.content.length;
      continue;
    }

    /*
     * PART OF IT, AND THE SESSION IS TOLD WHICH PART. Without this line the model has a document
     * that stops mid-sentence and no reason to believe anything is missing.
     */
    const kept = d.content.slice(0, room_left);
    parts.push(
      `${head}${kept}\n[This document continues. You have the first part of it and not the rest -`
      + ' about ' + Math.round((kept.length / d.content.length) * 100) + ' percent. If what you need'
      + ' is not here, say so and ask them for the part you need rather than guessing at it.]',
    );
    spent = room;
    leftOut.push(`${d.fileName} (partly)`);
  }

  return { block: parts.join('\n\n'), leftOut };
}

/**
 * SAID TO THE SESSION WHEN ANYTHING WAS LEFT OUT.
 *
 * The person is told too, by the session, in its own words - not by a banner. A model that knows it
 * is missing a document can ask for the part it needs, which is the behaviour somebody would want
 * from a colleague in the same position.
 */
export function tellThemWhatIsMissing(leftOut: string[]): string {
  if (!leftOut.length) return '';
  return `NOT EVERYTHING THEY ATTACHED IS IN FRONT OF YOU. These did not fit: ${leftOut.join(', ')}.`
    + ' Do not pretend to have read them and do not infer their contents from their names. If the'
    + ' conversation turns to one of them, say plainly that you only have part of what they sent and'
    + ' ask them for the section that matters.';
}
