import React from 'react'
import './gw-ui.css'

/**
 * PAGE (prototype: `main` and `.wrap`, app.css). The one page frame.
 *
 * Main padding is 32px top, 48 sides, 72 bottom (20, 18, 100 on a phone under 860px). Content is
 * up to 1150px wide, left-aligned under the page padding, never centred (design-audit.md: "Content
 * width... left-aligned"). `narrow` is for the invitation and sign-in pages: one column 360px wide,
 * centred, as today's plain arrival frame.
 */
export function Page({ narrow, children }: { narrow?: boolean; children: React.ReactNode }) {
  /*
   * A `<div>`, NOT A SECOND `<main>` (real-user walk, Kijani Foods, fault 8a). AppShell already
   * renders the page's one `<main id="main">`; this sat inside it as a second `<main>`, so every
   * page with a sidebar carried two main landmarks. The class, and everything it carries in
   * gw-ui.css, is unchanged - the stylesheet only ever selects `.gwui-page-main`, never the `main`
   * element itself, so the look is identical.
   */
  return (
    <div className="gwui-page-main">
      <div className={narrow ? 'gwui-page-narrow' : 'gwui-page-wrap'}>{children}</div>
    </div>
  )
}
