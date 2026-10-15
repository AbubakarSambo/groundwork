import React, { useId } from 'react'
import './gw-ui.css'

/**
 * SETUP BLOCK (prototype: `blk` in the setup screen, B1-starting-a-check-in/setup.jpg).
 *
 * One question of the setup, as the prototype lays it out: the heading (18px bold, the prototype's
 * `t-h3`) with one muted sentence under it (14.5px, `t-small mut`) in a column up to 260px wide on
 * the left, and the controls on the right, 12px apart. A 1px rule on top of each block, 24px above
 * and below, 28px between the two columns. Put the blocks inside `SetupBlocks`: under 720px of room
 * (a phone, or the 640px card at the end of the lead's first check-in) the heading sits above its
 * controls, the prototype's own phone layout.
 *
 * `aria-labelledby` points the block at its own heading, so it is a named region
 * (`getByRole('region', { name: heading })`), the same way `Section` is.
 */
export function SetupBlock({ heading, help, children }: {
  heading: string
  help?: string
  children: React.ReactNode
}) {
  const headingId = useId()
  return (
    <section className="gwui-setup-block" aria-labelledby={headingId}>
      <div>
        <h2 id={headingId} className="gwui-setup-block-title">{heading}</h2>
        {help && <p className="gwui-setup-block-help">{help}</p>}
      </div>
      <div className="gwui-setup-block-body">{children}</div>
    </section>
  )
}

/** The wrapper the blocks measure their room against (a CSS container). */
export function SetupBlocks({ children }: { children: React.ReactNode }) {
  return <div className="gwui-setup-blocks">{children}</div>
}
