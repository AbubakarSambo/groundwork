/**
 * WHAT THE "NO LABEL IS THE LEAD'S NOTE" SPECS LOOK FOR. Request 36, 27 September 2026.
 *
 * `roleAsDescribed` is mostly the lead's own private sentence about a person, typed when adding
 * them. It is seeded here as a sentence nobody could write by accident, in the "Name - note" shape
 * leads type, so that any piece of it showing up on a page is found: the part before the dash (which
 * the old label code took as the name), the marker, and the judgement.
 */
export const PRIVATE_NOTE = 'Daniel9k2 - PRIVATE-DESCRIPTION-9k2 is not meeting targets'
export const FRAGMENTS = ['Daniel9k2', 'PRIVATE-DESCRIPTION-9k2', 'not meeting targets']

/**
 * Every place a piece of the note is on the page, split into the lead's own labelled note (an
 * element marked `data-leads-note`, reading "Your note: ...") and anywhere else, which includes
 * every name and label, and titles and aria-labels a screen reader reads.
 */
export function whereTheNoteIs(root: HTMLElement = document.body): { asTheirNote: string[]; elsewhere: string[] } {
  const asTheirNote: string[] = []
  const elsewhere: string[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent ?? ''
    if (!FRAGMENTS.some((f) => text.includes(f))) continue
    const el = n.parentElement
    const note = el?.closest('[data-leads-note]')
    if (note) asTheirNote.push(note.textContent ?? '')
    else elsewhere.push(el?.textContent ?? text)
  }
  for (const el of root.querySelectorAll('*')) {
    for (const a of ['title', 'aria-label', 'alt', 'placeholder', 'value']) {
      const v = el.getAttribute(a)
      if (v && FRAGMENTS.some((f) => v.includes(f))) elsewhere.push(`${a}="${v}"`)
    }
  }
  return { asTheirNote, elsewhere }
}
