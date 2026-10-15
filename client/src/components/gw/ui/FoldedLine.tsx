import type { ReactNode } from 'react'
import './gw-ui.css'

/**
 * THE FOLDED LINE (light prototype, s56 and s57): a name, a one-line fact, a chevron. It opens in
 * place, and on a phone it stays one line. What is inside is already on the page, so text inside
 * a closed line is still there for anyone who opens it, and for a screen reader.
 *
 * The fact is handed in as data the server sent (rule 3 of docs/light-rebuild/sales-first.md),
 * never read off the screen.
 */
export function FoldedLine({ name, fact, defaultOpen, children, id }: {
  name: string
  /** A sentence from the server; or, where the server has none, a node the page fills with the section's own note. */
  fact?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  id?: string
}) {
  return (
    <details id={id} className={`gwui-fold${fact == null || fact === '' ? ' gwui-fold-nofact' : ''}`} open={defaultOpen || undefined}>
      <summary className="gwui-fold-sum">
        <span className="gwui-fold-name">{name}</span>
        {/* A line with no fact gives its name the whole line, so it stays one line on a phone. */}
        {fact == null || fact === '' ? null : <span className="gwui-fold-fact">{fact}</span>}
        <span className="gwui-fold-chev" aria-hidden="true">›</span>
      </summary>
      <div className="gwui-fold-body">{children}</div>
    </details>
  )
}

/**
 * THE BOX (light prototype, s58): a group of folded lines, its name and its two most useful facts
 * on one line. On a laptop a box can open by itself (`defaultOpen`); on a phone the caller decides.
 */
export function Box({ name, facts, defaultOpen, children, id }: {
  name: string
  facts: string[]
  defaultOpen?: boolean
  children: ReactNode
  id?: string
}) {
  return (
    <details id={id} className="gwui-box" open={defaultOpen || undefined}>
      <summary className="gwui-box-sum">
        <span className="gwui-box-name">{name}</span>
        <span className="gwui-box-facts">{facts.filter(Boolean).slice(0, 2).join(' · ')}</span>
        <span className="gwui-fold-chev" aria-hidden="true">›</span>
      </summary>
      <div className="gwui-box-body">{children}</div>
    </details>
  )
}
