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
    /* The prototype's chat bubble (.bub.me, .bub.them). */
    <div className={mine ? 'bub me' : 'bub them'} style={opacity === 1 ? undefined : { opacity }}>
      {children}
    </div>
  )
}
