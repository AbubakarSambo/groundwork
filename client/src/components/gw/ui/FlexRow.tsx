import type { CSSProperties, ElementType, FormEvent, ReactNode } from 'react'
import './gw-ui.css'

/**
 * FLEXROW (Hafsah, style clean-up round 2: "swapping them in cannot change a pixel").
 *
 * The board's own one-off `<div className="gwui-gap-N" style={{ display: 'flex', ... }}>` - a
 * row of buttons, tags or short facts spaced with one of the existing `gwui-gap-*` classes
 * (gw-ui.css, unchanged here). Every prop below is one of those inline style properties the board
 * already set by hand, named for what it does rather than its CSS value, and only the values
 * actually in use - nothing invented ahead of a real caller. A row whose inline style carries
 * anything else (a fixed `width`, `flex-direction: column`, a `flex-basis`) is NOT an exact match
 * and stays as it was; see `GroundParticipantPage.tsx`'s settings tab for one kept on purpose
 * (its children need `order`, which `Stack`'s block layout would silently break, and which this
 * part does not change - `FlexRow` renders the same flex container, order and all - but that one
 * was left alone because it is a column, outside what this round covers).
 *
 * Named `FlexRow` rather than `Row` because `Row` already exists (`Rows.tsx`, a very different
 * part - a grid-column table row with its own inset padding) and the two must not be confused.
 */
export type FlexRowGap = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 14 | 16
export type FlexRowAlign = 'center' | 'baseline' | 'flex-start'
export type FlexRowJustify = 'center' | 'flex-end' | 'space-between'

export function FlexRow({
  gap,
  align,
  justify,
  wrap,
  shrink0,
  flex1,
  capWidth,
  as: As = 'div',
  className,
  onSubmit,
  children,
}: {
  gap: FlexRowGap
  align?: FlexRowAlign
  justify?: FlexRowJustify
  wrap?: boolean
  shrink0?: boolean
  flex1?: boolean
  /**
   * B-204: for a row whose own content can be a full sentence rather than a short button or tag -
   * `shrink0` keeps such a row from being squeezed by a sibling (a title, say), but a row with
   * nothing stopping it from growing sizes to its content's full, unwrapped width regardless, which
   * can run wider than the screen on a phone. `capWidth` keeps the row inside whatever width its
   * own parent actually gives it, so `wrap` (above) has a real edge to wrap its children against.
   */
  capWidth?: boolean
  as?: 'div' | 'span' | 'form'
  className?: string
  onSubmit?: (e: FormEvent) => void
  children: ReactNode
}) {
  const style: CSSProperties = { display: 'flex' }
  if (align) style.alignItems = align
  if (justify) style.justifyContent = justify
  if (wrap) style.flexWrap = 'wrap'
  if (shrink0) style.flexShrink = 0
  if (flex1) style.flex = 1
  if (capWidth) { style.maxWidth = '100%'; style.minWidth = 0 }
  const cls = [`gwui-gap-${gap}`, className].filter(Boolean).join(' ')
  const Tag = As as ElementType
  return (
    <Tag className={cls} style={style} onSubmit={onSubmit}>
      {children}
    </Tag>
  )
}
