/**
 * SHARED ACROSS THE ENTRY CHAT'S OWN REBUILD SPECS (4d-1, 4d-2, 4d-3, and 4d-4 once it lands).
 *
 * The save card (4d-3) stays mounted the whole time the chat is open, CSS-hidden behind
 * `gwui-ec-savecard-overlay-hidden` until `showSave` is true - the comment above that class in
 * EntryChatPage.tsx explains why: the card's own opacity/visibility transition is the same one the
 * page already had before this rebuild, and conditionally mounting it instead would change that
 * behaviour, which this rebuild is not allowed to do. `visibility: hidden` genuinely takes the
 * card's own "Save my check-in"/"Save this" button out of the page's accessibility tree and tab
 * order while it is hidden, so a person never reaches two navy buttons at once - but a DOM query
 * for `.gwui-btn-primary` cannot see CSS, and jsdom's test environment does not apply this
 * project's actual stylesheet, so a literal count finds the hidden one too.
 *
 * This is the one place that knows which wrapper classes mean "hidden, not just out of frame", so
 * every spec that checks "at most one navy button" asks it rather than re-deriving the same
 * exclusion on its own.
 */
export function visiblePrimaryButtons(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll('.btn.pri')).filter(
    /* The composer's own send arrow is the prototype's .btn.pri.ci-sq, part of the box you type in, not a section's action. */
    (el) => !el.closest('.gwui-ec-savecard-overlay-hidden') && !el.closest('.gw-composer'),
  )
}
