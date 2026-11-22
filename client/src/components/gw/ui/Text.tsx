import type { CSSProperties, ElementType, ReactNode } from 'react'
import './gw-ui.css'

/**
 * TEXT (Hafsah, style clean-up round 2: "swapping them in cannot change a pixel").
 *
 * Wraps the board's own `gwui-fs-N` (font size) and `gwui-ink-X` (colour) one-off classes, plus
 * the handful of inline style properties the board set alongside them by hand on one sentence -
 * `lineHeight`, `fontWeight`, `letterSpacing`, `display: 'block'`. Each prop is named for the
 * style property it carries and takes only the exact values already in use; a caller whose inline
 * style sets anything else (a fixed width, a margin, a colour not already one of `gwui-ink-*`) is
 * not an exact match and is left as it was rather than stretching this part to fit it.
 *
 * `size`/`ink` are strings, not numbers, because some of the board's existing classes are not
 * whole numbers (one size is "13" and a half) - the prop names the class's own suffix exactly.
 */
/**
 * THE SIX SIZES OF THE DESIGN SYSTEM (rule 5, Hafsah, 23 November 2026), named for what they are for:
 * `title` (Literata 30, 24 on a phone), `section` (21 bold), `card` (18 bold, a card's or a row's title),
 * `body` (16), `secondary` (14, muted), `meta` (12, muted: dates, sources, counts), and `big` (Literata
 * 38) for the greeting and a big number. They read only styles/tokens.css (blocks.css). A rebuilt page
 * uses only these; the numbered sizes below are the board's older ones and go as its pages are rebuilt.
 */
export type TextRole = 'title' | 'section' | 'card' | 'body' | 'secondary' | 'meta' | 'big'
export type TextSize = TextRole | '13' | '13-5' | '14' | '14-5' | '15' | '16' | '17' | '18' | '20' | '22' | '30'
const ROLES: readonly string[] = ['title', 'section', 'card', 'body', 'secondary', 'meta', 'big']
export type TextInk =
  | 'amber'
  | 'blue'
  | 'clay'
  | 'dark'
  | 'green'
  | 'green-soft'
  | 'muted'
  | 'navy'
  | 'red'
  | 'sub'
  | 'subd'
  | 'text'
  | 'white'
  | 'white-55'
  | 'white-72'
  | 'white-75'
  | 'white-90'
  | 'white-93'

export function Text({
  size,
  ink,
  weight,
  lineHeight,
  letterSpacing,
  display,
  as: As = 'div',
  className,
  children,
}: {
  size: TextSize
  ink?: TextInk
  weight?: 600 | 700
  lineHeight?: number
  letterSpacing?: string
  display?: 'block'
  as?: 'div' | 'span' | 'p' | 'h2' | 'h3'
  className?: string
  children: ReactNode
}) {
  const style: CSSProperties = {}
  if (weight) style.fontWeight = weight
  if (lineHeight) style.lineHeight = lineHeight
  if (letterSpacing) style.letterSpacing = letterSpacing
  if (display) style.display = display
  const cls = [ROLES.includes(size) ? `ds-text-${size}` : `gwui-fs-${size}`, ink && `gwui-ink-${ink}`, className].filter(Boolean).join(' ')
  const Tag = As as ElementType
  return (
    <Tag className={cls} style={Object.keys(style).length ? style : undefined}>
      {children}
    </Tag>
  )
}
