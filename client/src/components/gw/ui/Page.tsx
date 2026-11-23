import React, { createContext, useContext } from 'react'
import { Link } from 'react-router-dom'
import { InTheDesignSystem } from './the-design-system'
import './gw-ui.css'

/**
 * PAGE (prototype: `main` and `.wrap`, app.css). The one page frame.
 *
 * WITH A TITLE, A REBUILT PAGE (the design system, rules 1 to 3, Hafsah, 23 November 2026): the
 * title, at most one line under it (`lede`), the one main action at the top right, then the page's
 * sections 32px apart. `side` adds a side column, two thirds and one third, that drops under the main
 * column on a phone. Every value is a token (styles/tokens.css, read by blocks.css), and every
 * building block inside draws its rebuilt look (the-design-system.ts).
 *
 * WITHOUT A TITLE, the page as it was: main padding 32px top, 48 sides, 72 bottom (16, 16, 100 on a
 * phone under 860px), content up to 1150px wide, left-aligned. `narrow` is for the invitation and
 * sign-in pages: one column 360px wide, centred. This branch goes when the last journey is rebuilt.
 */
/** Whether this page sits inside another page's frame (a check-in's tab inside the check-in's own page). */
const InsideAPage = createContext(false)

export function Page({ narrow, title, crumbs, lede, action, side, children }: {
  narrow?: boolean
  /** The page's name. Giving it makes this a rebuilt page. */
  title?: string
  /** Where this page sits, as a line of links above the title: "Check-ins / Sales team, Q3" (board-as-lead.txt). */
  crumbs?: { label: string; to?: string }[]
  /** At most one line under the title. It may hold a link inside the sentence. */
  lede?: React.ReactNode
  /** The page's one main action, at the top right. */
  action?: React.ReactNode
  /** A side column, a third of the width, under the main column on a phone. */
  side?: React.ReactNode
  children: React.ReactNode
}) {
  const nested = useContext(InsideAPage)
  if (title !== undefined) {
    const body = <div className="ds-page-body">{children}</div>
    /*
     * A TAB INSIDE A CHECK-IN'S PAGE (My work): the check-in's page already has the frame, its padding and its one h1, so a
     * rebuilt tab inside it adds no second padding, and its title is the h2 under that h1.
     */
    const Title = nested ? 'h2' : 'h1'
    return (
      <InTheDesignSystem.Provider value={true}>
        {/* `main` keeps the shell's own room for Ask beside the page; ds-page sets the padding from the tokens. */}
        <div className={nested ? 'ds-page' : 'main ds-page'}>
          <div className="ds-page-in">
            <header className="ds-page-head">
              <div className="ds-page-words">
                {crumbs && crumbs.length > 0 && (
                  <nav aria-label="Where you are" className="ds-text-meta ds-page-crumbs">
                    {crumbs.map((c, i) => <React.Fragment key={c.label + i}>{i > 0 && ' / '}{c.to ? <Link to={c.to}>{c.label}</Link> : c.label}</React.Fragment>)}
                  </nav>
                )}
                <Title className="ds-text-title">{title}</Title>
                {lede && <p className="ds-text-body ds-page-lede">{lede}</p>}
              </div>
              {action}
            </header>
            {side ? (
              <div className="ds-page-split">
                {body}
                <aside className="ds-page-side">{side}</aside>
              </div>
            ) : body}
          </div>
        </div>
      </InTheDesignSystem.Provider>
    )
  }
  /*
   * A `<div>`, NOT A SECOND `<main>` (real-user walk, Kijani Foods, fault 8a). AppShell already
   * renders the page's one `<main id="main">`; this sat inside it as a second `<main>`, so every
   * page with a sidebar carried two main landmarks. The class, and everything it carries in
   * gw-ui.css, is unchanged - the stylesheet only ever selects `.gwui-page-main`, never the `main`
   * element itself, so the look is identical.
   */
  return (
    <InsideAPage.Provider value={true}>
      <div className="main">
        <div className={narrow ? 'gwui-page-narrow' : 'wrap gw-stack'}>{children}</div>
      </div>
    </InsideAPage.Provider>
  )
}
