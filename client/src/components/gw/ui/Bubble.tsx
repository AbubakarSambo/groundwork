import type { ReactNode } from 'react'

/**
 * A CONVERSATION BUBBLE (B3, docs/prototype/source/app.css: `.bub`, `.bub.them`, `.bub.me`).
 *
 * `max-width:82%;padding:12px 16px;font-size:16px;line-height:1.5;border-radius:16px`, then
 * Groundwork's own turn (`them`) squares its BOTTOM-left corner and sits on the prototype's
 * `--chat` (our `--gw-bg`, #F7F1E5 - the same cream every soft fill in the product uses,
 * never `--gw-paper-2`, which is the page colour itself and would make this bubble invisible);
 * the person's own turn (`me`) squares its bottom-RIGHT corner and sits on the prototype's
 * `--ink` (`--gw-ink`, #1A1916 in light mode - NOT `--gw-navy`, the brand blue, which the
 * prototype never puts a bubble on), in the prototype's `--on-ink` (white).
 *
 * ROUND 4, ITEM B: extracted so `ChatPage.tsx` and `GroundChat.tsx`'s `Message` (still used by
 * `MyCheckInSessions.tsx` for past sessions) draw the same bubble from one place. `GroundChat.tsx`
 * had this corner backwards (its own comment claimed the top-left squares, when the prototype's
 * CSS squares the bottom-left) - fixed here, at the one definition, rather than in two files that
 * could disagree again.
 */
export function Bubble({ mine, children, opacity = 1 }: {
  /** True for the person's own turn; false for Groundwork's. */
  mine: boolean
  children: ReactNode
  /** For a turn still arriving (the typewriter's placeholder). */
  opacity?: number
}) {
  return (
    <div
      style={{
        maxWidth: '82%',
        alignSelf: mine ? 'flex-end' : 'flex-start',
        background: mine ? 'var(--gw-ink)' : 'var(--gw-bg)',
        color: mine ? 'white' : 'var(--gw-text)',
        borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '12px 16px',
        fontSize: 16,
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        minWidth: 0,
        opacity,
      }}
    >
      {children}
    </div>
  )
}
