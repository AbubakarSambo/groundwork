import { Page, Empty, Button } from '@/components/gw/ui'

/**
 * A GROUND YOU CANNOT SEE. W8-65.
 *
 * Both ground pages ended at the bare words "Ground not found." - grey text at the top
 * left of an empty page, no heading, no control, plus a red toast that fades. Same family
 * as the invite and join dead ends in W8-62, found the same way: by hitting it.
 *
 * WHY THE WORDS NEVER SAY WHICH REASON IT WAS (GW-PRI-04). The likeliest cause by far is
 * the org switcher - switch organisation while looking at a ground and the ground belongs
 * to the one you just left. The next likeliest is that it was closed, or removed, or the
 * reader is no longer part of it. But a board (or this page) that answers "not available"
 * has to read exactly the same whether the check-in never existed, or exists and simply
 * is not this reader's - telling the two apart on screen would tell a stranger holding a
 * stale link whether something real sits behind it. So this names the ordinary reasons as
 * a set, never which one applies, and never asserts a history ("it was ended", "you wrote
 * something here before") that would not be true of every one of them.
 *
 * WORDING, FROM THE PROTOTYPE (F4-small-states/c-gone-board.txt): the title, the body's two
 * sentences, and its two ways out, word for word. The same words show for every cause, so they
 * never tell a stranger whether something real sits behind the link (GW-PRI-04 holds: nothing
 * on this screen changes with the reason). One sentence is kept from the page before (W8-65):
 * switching organisation is how most people get here, and naming it tells them where it went.
 */
export function GroundGone() {
  return (
    <Page narrow>
      <Empty
        title="This check-in isn’t available any more"
        action={
          <div className="gwui-button-row">
            <Button kind="secondary" to="/you">Open my work</Button>
            <Button kind="quiet" to="/grounds">Go to Check-ins</Button>
          </div>
        }
      >
        Whoever ran it ended it or removed it. What you wrote is kept in your own history. If you
        have just switched organisation, it may belong to the one you switched away from.
      </Empty>
    </Page>
  )
}
