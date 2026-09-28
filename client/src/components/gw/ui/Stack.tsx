import type { ReactNode } from 'react'
import './gw-ui.css'

/**
 * STACK (prototype source, the invitation and its hand-off screens: join-invite.jpg,
 * join-waiting.jpg, join-outoftime.jpg).
 *
 * `Page`'s own stack puts a flat 30px between every direct child, which is right for a page of
 * sections but wrong for these narrow screens: the prototype groups a few things tightly (a tag
 * 12px above its title, a panel 18px below the line under a heading, one button 10px above the
 * next), then leaves the ordinary 30px between the groups themselves. `Stack` is that tighter
 * grouping - a handful of fixed gaps read off the prototype, not a free number, so nobody sets an
 * inline `gap` on one of these pages again (the-rebuilt-pages-use-only-the-new-parts.spec.ts bans
 * it there).
 */
export type StackGap = 10 | 12 | 18 | 19

export function Stack({ gap, children }: { gap: StackGap; children: ReactNode }) {
  return <div className={`gwui-stack-${gap}`}>{children}</div>
}
