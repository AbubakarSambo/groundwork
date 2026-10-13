import type { ReactNode } from 'react'

/**
 * B-127: A LEAD SENT TO A PAGE THAT REFUSES THEM. At `/start` and `/start/team`, once the free plan
 * is used up, "Subscribe to open more. ... See plans" was shown the same way to every reader. For an
 * admin "See plans" opens Plan and billing, the page that can act on it. For a lead it opens the same
 * page only to say "You need admin access to manage billing for your organisation." - a dead end, not
 * a way on.
 *
 * Only an admin can open Plan and billing, so only an admin is offered "See plans". Everyone else
 * reads the server's own reason and is told who can do something about it, with no link into a page
 * that refuses them.
 *
 * The admin's name is not in the client's reach here: `GET /billing/can-create-ground` (what both
 * pages already call) carries no admin field, and nothing else fetched on either screen does either
 * (checked before writing this - see the request to the engine). Once it is, `adminFirstName` can
 * replace "your admin" with a real name, as the invitation flow already does elsewhere.
 */
export function planLimitNotice(args: {
  reason: string
  isAdmin: boolean
  continuation: string
  onSeePlans: () => void
}): ReactNode {
  const { reason, isAdmin, continuation, onSeePlans } = args
  if (isAdmin) {
    return (
      <>
        {reason} {continuation}{' '}
        <button type="button" className="gwui-plain-link" onClick={onSeePlans}>See plans</button>
      </>
    )
  }
  return <>{reason} Your admin can choose a plan to open more. {continuation}</>
}
