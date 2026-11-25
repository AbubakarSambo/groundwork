import React from 'react'
import { PartBoundary } from './PartBoundary'
import { useTheDesignSystem } from './the-design-system'
import './gw-ui.css'

/**
 * PANEL (prototype: .panel, .pad, app.css).
 *
 * White, 1px `--rule` line, 12px corners, 20px top/bottom and 22px sides inside, no shadow. Pass
 * `pad={false}` for a table or list that draws its own inside spacing.
 *
 * `as="section"` (the You board, group 2, piece 2) draws a real `<section>` instead of a `<div>`,
 * for a titled card that needs to be a landmark a reader can jump to - "Your goals", "Your to-dos",
 * "Coaching" and the rest of the You board's own cards, which used to be a page-local `Card`
 * component. `heading`, with either element, draws the prototype's own `.t-h3` (18px, weight 700)
 * above the content - the same size and weight the old `Card`'s bare `<h3>` inherited.
 */
export function Panel({ as, pad = true, heading, children, ...rest }: {
  /** 'section' for a titled card that is its own landmark; otherwise a plain `<div>`. */
  as?: 'section'
  pad?: boolean
  heading?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLElement>) {
  const { className, ...elRest } = rest
  /* ON A REBUILT PAGE this is the design system's card: a thin rule, 8px corners, 16px inside, its title at 18px (blocks.css). */
  const ds = useTheDesignSystem()
  const cls = (ds ? ['ds-card', !pad && 'ds-card-flush', className] : ['panel', pad && 'pad', className]).filter(Boolean).join(' ')
  const inner = <>{heading && <h3 className={ds ? 'ds-text-card' : 't-h3 ds-under-8'}>{heading}</h3>}<PartBoundary>{children}</PartBoundary></>
  if (as === 'section') return <section className={cls} {...elRest}>{inner}</section>
  return <div className={cls} {...elRest}>{inner}</div>
}
