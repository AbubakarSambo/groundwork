import type { ReactNode } from 'react'

/**
 * THE SHAPE EVERY CLOSE IS DRAWN IN, IN ONE PLACE, BECAUSE THERE ARE TWO OF THEM.
 *
 * A person reads a report at the end of the entry chat before they have signed up, and reads
 * another at the end of every check-in after that. They are two different reads - one is an object
 * the page is holding, one is rows in a database - and that difference is real and stays.
 *
 * What was NOT real was them looking like two different products. One had numbered blocks with a
 * note under each saying what the block is for; the other had uppercase headings and coloured
 * cards. Same person, same week, same word "report", two designs.
 *
 * So the CHROME lives here and both draw in it: the stylesheet, the numbered block, the note. The
 * CONTENT stays with each report, because they genuinely do not hold the same things.
 */
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

/**
 * ONE STYLESHEET, BECAUSE A PHONE NEEDS A DIFFERENT SHAPE AND NOT JUST SMALLER TYPE.
 *
 * Inline styles cannot hold a media query, so every size here was one number that had to work at
 * 375px and at 1180px, and it worked properly at neither: 20px of side padding on a 375px screen
 * spends a ninth of the width on nothing, and block 2's three columns put a state word in a
 * four-character gutter.
 *
 * The rules below are the ones that have to CHANGE with the width. Everything that does not is
 * still inline, where it sits beside the thing it describes.
 *
 * NO GREY INK ON A GREY GROUND, anywhere in here. The secondary inks are only ever used on the
 * card itself, which is white; anything sitting on paper or on a tint uses --gw-sub-d, which is
 * the darker of the two. The same rule took the unfilled specificity step off --gw-bg.
 */
export const CLOSE_SHEET = `
.gw-close { --pad: 20px; --gap: 15px; --lead: 1.6; }
.gw-close .gw-blk  { padding: var(--gap) var(--pad); border-top: 1px solid var(--gw-border); }
.gw-close .gw-head { padding: var(--gap) var(--pad) 13px; }
.gw-close .gw-foot { padding: 13px var(--pad); border-top: 1px solid var(--gw-border); display: grid; gap: 9px; }

.gw-close .gw-title { font-size: 15px; font-weight: 800; color: var(--gw-text); line-height: 1.3; }
.gw-close .gw-stamp { font-family: ${MONO}; font-size: 10px; letter-spacing: .07em; text-transform: uppercase; }
.gw-close .gw-lbl {
  margin-bottom: 9px;
  display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap;
}
/*
  THE NUMBER AND THE NAME ARE MONO. THE NOTE IS NOT, AND WAS.

  The note inherited the label's monospace and its uppercase reset, so "yours to take back" came
  out as spaced-out typewriter text under a heading in the same face - two lines that look like
  one, and the second one looks like code. It is a sentence about what the block is for, so it is
  set as a sentence.
*/
.gw-close .gw-lbl .gw-name {
  font-family: ${MONO}; font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--gw-sub-d);
}
.gw-close .gw-lbl .gw-note { color: var(--gw-sub); font-size: 11.5px; line-height: 1.45; }
.gw-close .gw-n { color: var(--gw-muted); margin-right: 7px; }

.gw-close .gw-big   { font-size: 14px;   line-height: 1.5; font-weight: 600; }
.gw-close .gw-p     { font-size: 13px;   line-height: var(--lead); }
/* The ways through. Its own ground so it reads as offered rather than as part of the list above it,
   and never grey ink on a grey field - the border carries the separation, the text stays full. */
.gw-close .gw-try   { border-left: 2px solid var(--gw-border); padding-left: 12px; }
.gw-close .gw-said  { font-size: 13px;   line-height: var(--lead); }
.gw-close .gw-small { font-size: 12px;   line-height: 1.55; }
.gw-close .gw-mini  { font-size: 11.5px; line-height: 1.5; }
.gw-close .gw-link  { font-size: 12.5px; }
.gw-close .gw-quotes { display: grid; gap: 13px; }

/* Rows: dot, text, then the state word. */
.gw-close .gw-row { display: grid; grid-template-columns: 9px 1fr auto; gap: 9px; align-items: start; }

/*
  A PHONE GETS BIGGER TYPE, NOT SMALLER, WHICH IS WHAT THIS SAID FIRST TIME AND HAD BACKWARDS.

  The first pass read "make it fit" and took every size DOWN at 640px - 12.5px body, 9.5px labels -
  which is the opposite of what a smaller screen needs. A phone is held further from nothing, in
  worse light, one-handed, and the column is already narrow enough to keep the line length honest
  without shrinking the letters. So the desktop sizes above are the floor and everything goes UP
  here, with more air between blocks and a looser line, while the side gutters come IN because that
  is the one measurement a narrow screen genuinely cannot spare.
*/
@media (max-width: 640px) {
  .gw-close { --pad: 16px; --gap: 20px; --lead: 1.65; }
  .gw-close .gw-title { font-size: 18px; }
  .gw-close .gw-stamp { font-size: 11px; }
  .gw-close .gw-lbl   { margin-bottom: 11px; flex-direction: column; gap: 4px; }
  .gw-close .gw-lbl .gw-name { font-size: 11px; letter-spacing: .09em; }
  .gw-close .gw-lbl .gw-note { font-size: 13.5px; }
  .gw-close .gw-big   { font-size: 17px; line-height: 1.45; }
  .gw-close .gw-p     { font-size: 15.5px; }
  .gw-close .gw-said  { font-size: 15.5px; }
  .gw-close .gw-small { font-size: 14px; line-height: 1.6; }
  .gw-close .gw-mini  { font-size: 13px; line-height: 1.55; }
  .gw-close .gw-link  { font-size: 15px; }
  .gw-close .gw-quotes { gap: 20px; }
  .gw-close .gw-foot  { padding: 16px; gap: 14px; }
  /* The state word moves under the row it belongs to, indented to line up with it. */
  .gw-close .gw-row { grid-template-columns: 9px 1fr; gap: 10px; }
  .gw-close .gw-state { grid-column: 2; margin-top: 4px; }
}
`

/** One numbered block: its number, its name, and a note saying what the block is FOR. */
export function Block({ n, label, note, children }: {
  n: number
  label: string
  note?: string
  children: ReactNode
}) {
  return (
    <div className="gw-blk">
      <div className="gw-lbl">
        <span className="gw-name">
          {/* The space is real, not a margin: a screen reader announces the number and the name as
              two things only if there is one between them. */}
          <span className="gw-n">{String(n).padStart(2, '0')}{' '}</span>
          {label}
        </span>
        {note && <span className="gw-note">{note}</span>}
      </div>
      {children}
    </div>
  )
}
