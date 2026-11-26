/**
 * A DECK IS A ZIP OF XML, AND THE TEXT IN IT IS WORTH HAVING.
 *
 * Slides were refused outright, which is defensible - a deck is the least reliable document in any
 * company, being written to be spoken over - and it is not what people have. Roadmaps, architecture
 * overviews, quarterly plans and board updates arrive as decks, and telling somebody to export a PDF
 * first is asking them to do a conversion the product can do itself.
 *
 * NO NEW PARSER. A `.pptx` is a zip whose `ppt/slides/slideN.xml` files hold every run of text in
 * `<a:t>` elements. Pulling those out is a dozen lines and needs nothing that was not already here.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not reconstruct layout, read speaker notes, describe
 * images, or claim to know which slide mattered. It returns the words, slide by slide, in order.
 * A deck read this way is a list of headings and fragments, which is genuinely most of what a deck
 * is - and the honest framing of that is in the header it writes at the top, so whoever reads it
 * downstream knows they are looking at slide text and not at prose somebody wrote to be read.
 */


/**
 * Said at the top of every deck this reads.
 *
 * Without it, forty fragments of slide text arrive looking like a document somebody wrote in
 * sentences, and everything downstream - the assessment, the claim extraction, the check-in that
 * quotes it - treats a headline as a considered statement. A deck is not that and should not be
 * read as that.
 */
export const WHAT_A_DECK_IS =
  'SLIDE TEXT. This came from a presentation, so it is headings, bullet fragments and labels rather '
  + 'than written prose. Words on a slide were meant to be spoken over: read them as the shape of '
  + 'what somebody planned to say, never as a considered written statement, and never quote a '
  + 'fragment back as though it were a sentence somebody wrote.';

/** One `<a:t>` run. The `s` flag matters: a run can be split across lines in the file. */
const TEXT_RUN = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    /* Last, or an escaped ampersand in the source becomes a second entity. */
    .replace(/&amp;/g, '&');
}

export function textFromOneSlide(xml: string): string {
  const runs: string[] = [];
  for (const m of xml.matchAll(TEXT_RUN)) {
    const t = unescapeXml(m[1]).trim();
    if (t) runs.push(t);
  }
  return runs.join(' ').replace(/\s+/g, ' ').trim();
}

/* Which slide is which, in the deck's own order, is read by documents/a-file-as-cells.ts slidesOfADeck. */

/** Assembles what gets stored. Slide numbers are the deck's own, so a question can point at one. */
export function deckToText(slides: { number: number; text: string }[]): string {
  const said = slides
    .map(({ number, text }) => (text ? `Slide ${number}: ${text}` : null))
    .filter((l): l is string => !!l);

  /*
   * A DECK OF IMAGES READS AS EMPTY, and saying so is better than storing nothing. Somebody who
   * exported their architecture diagram as pictures should be told that is what happened rather
   * than left wondering why the check-in never mentions their document.
   */
  if (!said.length) return `${WHAT_A_DECK_IS}\n\nThis deck has no text in it - every slide is an image, or it is empty.`;

  return `${WHAT_A_DECK_IS}\n\n${said.join('\n')}`;
}
