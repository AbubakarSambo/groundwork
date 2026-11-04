/**
 * THE DESIGN SYSTEM, LIFTED OUT OF THE ONE PAGE THAT HAD IT.
 *
 * `BoardPage.tsx` defined Zone, Sec, Card, Row, Pill and four style objects at the
 * bottom of its own file, and nothing else in the product used them. That is the whole
 * reason the board reads better than every other page: it is the only one built from
 * components instead of inline styles, so its hierarchy is consistent by construction
 * rather than by whoever was typing.
 *
 * The tokens, so they are written down somewhere:
 *
 *   Zone label     11px, uppercase, .7px tracking, weight 800, navy, with a rule
 *   Section label  12.5px, uppercase, .4px tracking, weight 700, muted
 *   Stat value     the name face (Literata), 24px, lineHeight 1, 5px under its label
 *   Row value      the name face (Literata), 17px, navy
 *
 * The serif numeral against the sans label is why the board's glance row reads
 * instantly, and it was Georgia until the design system named Literata for it.
 *
 * This is an EXTRACTION, not a redesign: every value here is copied from BoardPage
 * unchanged, so lifting them changes nothing visually and the board keeps rendering
 * exactly as it did. What it buys is that the next page to be rebuilt inherits the
 * hierarchy by importing it, and "make it look like the board" stops being a
 * judgement call.
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { MARK_WORDS, readMark, type MarkKind } from './the-mark'

/**
 * A titled band with a rule, grouping sections.
 *
 * U.10 RE-REVIEW ITEM 1: SENTENCE CASE, NOT CAPITALS. The prototype's own board and report screens
 * (docs/prototype/screens/B5-the-board/board-as-lead.jpg and .txt - "Every deal, day by day", "The
 * team today", "Blockers", "What keeps coming up", "Who checked in", "Open issues", "Where this is
 * heading"; confirmed against B4's team-report.jpg too - "What moved", "What each person did",
 * "Where people see it differently") draws every heading in sentence case, bold, never in capitals.
 * This component drew every heading in the product uppercase via `textTransform`, which is not what
 * the prototype does anywhere - so the fix is here, once, rather than on each of the pages that use
 * it. Labels passed in are already written in sentence case as content; removing the transform is
 * enough.
 */
export function Zone({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '30px 2px 2px' }}>
      <span style={{ fontSize: 13, letterSpacing: '.1px', fontWeight: 700, color: 'var(--gw-navy)' }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--gw-border)' }} />
    </div>
  )
}

/** A section heading, with an optional note about where its content came from. */
/**
 * `on` was added when the ground pages came onto the kit. Stage 5, second pass.
 *
 * Those two pages held TEN variants of this one label: 10px and 11px, .08em and .1em, and five
 * colours - including `rgba(255,255,255,.45)`, `.4` and `.35` for the same label inside dark panels.
 * Three different whites for one thing, because the kit had no answer for a label on a dark ground
 * and each panel invented its own.
 *
 * A component with no case for something real is how the ninth copy gets written.
 */
/**
 * A SECTION HEADING, OPTIONALLY NUMBERED.
 *
 * "The context page should space and number each section." A page of three near-identical panels
 * with three uppercase labels reads as one long thing; a number tells you how many there are and
 * where you are in them before you have read a word.
 *
 * `n` is optional and nothing else passes it - a numbered section only makes sense where the
 * sections are a sequence somebody works through, which is Context and not, say, Settings.
 */
export function Sec({ title, src, n, on = 'light', size = 'default' }: { title: string; src?: string; n?: number; on?: 'light' | 'dark'; size?: 'default' | 'board' }) {
  const dark = on === 'dark'
  const board = size === 'board'
  /*
   * U.10: THE BOARD'S OWN SECTION HEADINGS, THE PROTOTYPE'S SIZE.
   *
   * The prototype (board-as-lead.jpg) heads every board section bold, near-black, about 22px, with
   * a small grey sentence right-aligned beside it - not the 14px muted label every other page in the
   * product uses for the same slot. `size="board"` is additive: every other caller of `Sec` is
   * unchanged, so Context, Settings and the rest keep the heading they already had. Only the board
   * passes it.
   */
  if (board) {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', margin: '28px 2px 10px', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gw-text)', margin: 0 }}>{title}</h2>
        {src && <span style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'right', maxWidth: '100%' }}>{src}</span>}
      </div>
    )
  }
  return (
    /*
      AND IT WRAPS, BECAUSE THE SOURCE LINE WAS BEING CUT OFF THE SCREEN.
      Measured on a real check-in at 375px: "what you put here guides every check-in · change any
      line in it" ran to 440 on a 375-wide screen - sixty-five pixels of it simply gone - and "nobody
      is marked as having done it · the check-ins ask" lost its last word. The span carried
      `whiteSpace: nowrap` and `marginLeft: auto` in a row that could not wrap, so there was nowhere
      for it to go. Every section heading in the product uses this.
    */
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', margin: n ? '28px 2px 10px' : '16px 2px 8px' }}>
      {n !== undefined && (
        <span
          aria-hidden
          style={{
            fontSize: 11, fontWeight: 700, lineHeight: '18px', width: 18, height: 18, flexShrink: 0,
            borderRadius: 9, textAlign: 'center',
            background: dark ? 'rgba(255,255,255,.14)' : 'var(--gw-blue-bg)',
            color: dark ? 'rgba(255,255,255,.75)' : 'var(--gw-navy)',
          }}
        >
          {n}
        </span>
      )}
      <h2 style={{ fontSize: 14, letterSpacing: '.1px', color: dark ? 'rgba(255,255,255,.45)' : 'var(--gw-sub)', fontWeight: 700 }}>{title}</h2>
      {/* Beside the title where it fits, on its own line where it does not, and still right-aligned. */}
      {src && (
        <span style={{
          fontSize: 10, color: dark ? 'rgba(255,255,255,.35)' : 'var(--gw-muted)',
          marginLeft: 'auto', textAlign: 'right', maxWidth: '100%', minWidth: 0,
        }}>
          {src}
        </span>
      )}
    </div>
  )
}

/**
 * `pad` has three cases, and the third was added when Settings' panels came onto the kit. Stage 5.
 *
 *   true     a list of `Row`s. 6px, because each Row brings its own 11px.
 *   false    the row list runs edge to edge - a divided list with no gutter.
 *   'block'  ONE block of content, which has no Row to bring the vertical padding.
 *
 * Without the third case, a panel holding a heading and two lines sat on 6px of air and looked
 * cramped in a way that reads as a rendering bug rather than a choice. Six of Settings' panels are
 * that shape, and so is most of the product outside the board.
 */
export function Card({ children, pad = true }: { children: React.ReactNode; pad?: boolean | 'block' }) {
  const padding = pad === 'block' ? '14px 16px' : pad ? '6px 16px' : 0
  return (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding }}>
      {children}
    </div>
  )
}

export function Row({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return <div style={{ padding: '11px 0', borderTop: first ? 'none' : '1px solid var(--gw-border)' }}>{children}</div>
}

/**
 * `outline` is additive (U.10). The prototype's blocker pills (board-as-lead.jpg) carry a visible
 * border in the tone's own colour - "Blocking" is pink fill, dark red text, red border. Every other
 * caller of Pill is unchanged: `outline` defaults to false, so nothing elsewhere in the product grew
 * a border it did not have.
 */
export function Pill({ children, tone = 'flat', outline = false }: { children: React.ReactNode; tone?: 'good' | 'warn' | 'bad' | 'info' | 'flat'; outline?: boolean }) {
  const m: Record<string, { bg: string; fg: string; b: string }> = {
    good: { bg: 'var(--gw-green-bg)', fg: 'var(--gw-green-t)', b: 'var(--gw-green-b)' },
    warn: { bg: 'var(--gw-amber-bg)', fg: 'var(--gw-amber-t)', b: 'var(--gw-amber-b)' },
    bad: { bg: 'var(--gw-red-bg)', fg: 'var(--gw-red-t)', b: 'var(--gw-red-b)' },
    info: { bg: 'var(--gw-blue-bg)', fg: 'var(--gw-blue-t)', b: 'var(--gw-blue-b)' },
    flat: { bg: 'var(--gw-bg)', fg: 'var(--gw-sub)', b: 'var(--gw-border)' },
  }
  const c = m[tone] ?? m.flat
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 11, background: c.bg, color: c.fg, whiteSpace: 'nowrap',
      border: outline ? `1px solid ${c.b}` : 'none',
    }}>
      {children}
    </span>
  )
}

/**
 * The glance tile: a small uppercase label over a serif value.
 *
 * This is the thing the board has that nothing else does. Extracted as a component
 * rather than left as inline styles so the ground page and the grounds list can
 * answer "what is the state of this" the same way (W8-47, point 3).
 */
export function Stat({ label, value, caption, tone }: { label: string; value: string; caption?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const colour = tone === 'good' ? 'var(--gw-green-t)' : tone === 'warn' ? 'var(--gw-amber-t)' : tone === 'bad' ? 'var(--gw-red-t)' : 'var(--gw-navy)'
  return (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '12px 14px', flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 12, letterSpacing: '.1px', color: 'var(--gw-muted)', fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'var(--gw-font-name)', fontSize: 24, marginTop: 5, lineHeight: 1, color: colour }}>{value}</div>
      {caption && <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4, lineHeight: '17px' }}>{caption}</div>}
    </div>
  )
}

export const td: React.CSSProperties = { padding: '9px 12px', textAlign: 'left', fontSize: 12, borderBottom: '1px solid var(--gw-border)' }
export const btn: React.CSSProperties = { padding: '9px 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-block' }
export const miniBtn: React.CSSProperties = { width: 22, height: 22, borderRadius: 6, border: '1px solid var(--gw-border)', background: 'white', color: 'var(--gw-sub)', fontSize: 12, lineHeight: 1, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }
export const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 7, background: 'none', color: 'var(--gw-sub)', fontSize: 13, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }

/**
 * A TEXT LINK THAT IS A BUTTON. Lifted from AuthPage, where it was written because the "create an
 * account" and "forgot your password" links were <span onClick> - so the only route to creating an
 * account was a mouse click, and the keyboard could not reach it. Styled to read as a link; a button,
 * so it is focusable, activates on Enter and Space, and is named in the accessibility tree.
 */
/**
 * `to`, NOT `onClick`, FOR ANYTHING THAT ONLY GOES SOMEWHERE ELSE (Hafsah, 30 September). The
 * prototype draws a control that only takes you to another page or section as a plain link; a
 * button there always does something on that screen. Given `to`, this renders a real `<Link>` (an
 * `<a>`), not a `<button>` with a navigate() call standing in for one - the same distinction
 * People's own "Open" needed. Given `onClick` instead, it stays a `<button>`, because it does
 * something right here (opens a form, switches a tab) rather than leaving the screen.
 */
export function TextAction({ onClick, to, strong, children, size }: { onClick?: () => void; to?: string; strong?: boolean; children: React.ReactNode; size?: number }) {
  /* Each branch keeps its own plain style literal, not a shared `const` reference - a bare
     identifier standing in for `style={{ }}` is exactly what
     the-rebuilt-pages-use-only-the-new-parts.spec.ts's `bannedStyleReferenceProps` looks for, and a
     single literal written directly here is what it deliberately leaves alone. */
  if (to) {
    return (
      <Link
        to={to}
        style={{
          color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer',
          background: 'none', border: 'none', padding: 0, font: 'inherit',
          fontWeight: strong ? 700 : undefined,
          fontSize: size,
        }}
      >
        {children}
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer',
        background: 'none', border: 'none', padding: 0, font: 'inherit',
        fontWeight: strong ? 700 : undefined,
        fontSize: size,
      }}
    >
      {children}
    </button>
  )
}

/**
 * THE DESIGN SYSTEM'S BUTTON (A1). Four kinds, each with one job:
 *
 *   primary     navy, the one thing this screen is for ("Start your check-in")
 *   secondary   white with a line, anything else you can do here ("Read it")
 *   quiet       a navy text button, for saying no or leaving it ("Not now")
 *
 * and three sizes: the normal 44px, `big` (54px) and `small` (36px, 40px on a phone). The label is
 * the caller's, and it should say exactly what happens when it is pressed.
 *
 * With `to` it is a link to a page in the app, drawn the same way, because what matters to the
 * person is what it looks like and what it does, not which element it is.
 */
export type ButtonKind = 'primary' | 'secondary' | 'quiet'
export function Button({
  kind = 'primary', size, wide, to, onClick, type = 'button', disabled, children, ...rest
}: {
  kind?: ButtonKind
  size?: 'big' | 'small'
  wide?: boolean
  to?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  children: React.ReactNode
  'aria-label'?: string
}) {
  const className = ['gw-b', `gw-b-${kind}`, size && `gw-b-${size}`, wide && 'gw-b-wide'].filter(Boolean).join(' ')
  if (to && !disabled) {
    return <Link to={to} className={className} onClick={onClick} aria-label={rest['aria-label']}>{children}</Link>
  }
  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled} aria-label={rest['aria-label']}>
      {children}
    </button>
  )
}

/**
 * THE DESIGN SYSTEM'S TAG (A1). A short fact about a check-in, a deal or a line: "Proven",
 * "Cooling", "Your turn", "Blocked 4 days", "Only you see this".
 *
 * Each tone means one thing everywhere, as the design system says of green, amber and blue:
 *
 *   proven     checked against proof
 *   attention  needs a look
 *   action     yours to do, or a link to a decision
 *   concern    only for real problems, so it never becomes background noise
 *   plain      a fact with no judgement in it
 *
 * It is never a label on a person. "At risk" on somebody's name is exactly what this product does
 * not do; say what happened instead.
 */
export type TagTone = 'proven' | 'attention' | 'action' | 'concern' | 'plain'
export function Tag({ tone = 'plain', children }: { tone?: TagTone; children: React.ReactNode }) {
  return <span className={`gw-tag gw-tag-${tone}`}>{children}</span>
}

/**
 * ONE ROW OF "WHAT NEEDS YOU" (A1). "The coloured edge says why it's here: ready to read, a
 * decision, or something to look at. The button says exactly what happens."
 *
 *   ready    green, something is ready to read ("Today's report is ready", "Read it")
 *   decide   navy, a decision or a thing for you to do ("Decide", "Start it")
 *   look     amber, something to look at ("Open")
 *
 * The edge is a colour, so the reason is also said in words for anyone who cannot see it. Rows sit
 * inside a `NeedsYouList`, which draws the line above the first one.
 */
export type NeedKind = 'ready' | 'decide' | 'look'
/*
 * SECOND BOARD REVIEW, WORDING: "A decision for you." and "Something to look at." read, for a
 * screen reader, as a floating label stapled in front of whatever the row actually says - not a
 * sentence, because neither says what decision or what to look at. The title that follows is
 * already a full sentence of its own ("Decide whether a price range counts as a budget",
 * "Samuel has chased the same 5 leads for 3 check-ins"), so these two now say nothing extra rather
 * than announce a label the title already makes plain. "Ready to read." is kept: unlike the other
 * two, it names a real state the title does not otherwise carry for a screen reader (that the
 * report is simply ready, not what it is about).
 */
const NEED_REASON: Partial<Record<NeedKind, string>> = {
  ready: 'Ready to read.',
}
export function NeedsYouRow({ kind, title, detail, actions }: {
  kind: NeedKind
  title: string
  detail?: string
  /** One or two buttons. The first is the main one. */
  actions?: React.ReactNode
}) {
  return (
    <li className={`gw-need gw-need-${kind}`}>
      <span className="gw-need-edge" aria-hidden />
      <div style={{ minWidth: 0 }}>
        {NEED_REASON[kind] && <span className="gw-sr-only">{NEED_REASON[kind]} </span>}
        <div className="gw-need-h">{title}</div>
        {detail && <div className="gw-need-s">{detail}</div>}
      </div>
      {actions && <div className="gw-need-acts">{actions}</div>}
    </li>
  )
}
export function NeedsYouList({ label, children }: { label: string; children: React.ReactNode }) {
  return <ul className="gw-need-list" aria-label={label} style={{ listStyle: 'none' }}>{children}</ul>
}

/**
 * THE MARK (A1). "A ring is something someone said; a filled mark is proven." It replaces the
 * claimed, proven and not-proven chips, and reads the same for a deal, a task, a commitment or a
 * stakeholder.
 *
 * ONLY WHAT THE RECORD SAYS. The mark comes from the data, never from the screen guessing: with no
 * mark, or one this screen does not know, `Mark` draws nothing at all, so nobody is shown a proof
 * that was never checked. `readMark` is the one place a value from the server is turned into a mark.
 *
 * The words are the prototype's key (docs/prototype/screens/B4-reports-and-sharing/team-report.txt
 * and A1's design-system.txt), and a screen reader hears them, since a ring says nothing aloud.
 */
export function Mark({ mark, large }: { mark: unknown; large?: boolean }) {
  const kind = readMark(mark)
  if (!kind) return null
  return (
    <span
      className={`gw-mk gw-mk-${kind}${large ? ' gw-mk-lg' : ''}`}
      role="img"
      aria-label={MARK_WORDS[kind]}
      title={MARK_WORDS[kind]}
    />
  )
}

/** The key under a list of marked lines: "Proven", "Confirmed by the person who received it", ... */
export function MarkKey({ marks = ['proven', 'confirmed', 'said', 'memory'] }: { marks?: MarkKind[] }) {
  return (
    <ul className="gw-mk-key">
      {marks.map(m => (
        <li key={m}><span className={`gw-mk gw-mk-${m}`} aria-hidden />{MARK_WORDS[m]}</li>
      ))}
    </ul>
  )
}

/**
 * THE STAGE LADDER (A1): Contacted, Need, Pitched, Qualified, Quoted, each with its mark, so "Aisha
 * says it's qualified. The proof shows it up to need." can be seen at a glance.
 *
 * The stages and their marks come from the data. If not one stage carries a mark there is nothing
 * true to draw, so the ladder draws nothing rather than a row of empty rings that would read as
 * "nothing happened". `says` is the one sentence that goes with it, in the engine's words.
 */
export function StageLadder({ stages, says, label }: {
  stages: { name: string; mark?: unknown }[]
  says?: string
  /** What the ladder is about, for a screen reader: "Eastside Foods". */
  label?: string
}) {
  const read = stages.map(s => ({ name: s.name, mark: readMark(s.mark) }))
  if (read.length === 0 || read.every(s => s.mark === null)) return null
  return (
    <div className="gw-ladder" role="group" aria-label={label}>
      <div className="gw-ladder-row" aria-hidden>
        {read.map((s, i) => (
          <React.Fragment key={s.name + i}>
            {i > 0 && <span className={`gw-ladder-ln gw-ladder-ln-${s.mark ?? 'none'}`} />}
            <span className={`gw-mk gw-mk-lg gw-mk-${s.mark ?? 'none'}`} />
          </React.Fragment>
        ))}
      </div>
      <ol className="gw-ladder-stages">
        {read.map((s, i) => (
          <li key={s.name + i}>
            {s.name}
            <span className="gw-sr-only">. {MARK_WORDS[s.mark ?? 'none']}.</span>
          </li>
        ))}
      </ol>
      {says && <p className="gw-ladder-says">{says}</p>}
    </div>
  )
}
