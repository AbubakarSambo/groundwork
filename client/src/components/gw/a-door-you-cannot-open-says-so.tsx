import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * A ROUTE SOMEBODY MAY NOT USE HAS TO REFUSE AT THE DOOR.
 *
 * `/grounds/new` and `/org/members` were behind `RequireOrgSetup` and nothing else, so anybody who
 * typed the address - or followed a link, or had the button shown to them by a bug - got the whole
 * eight-step flow and was refused on submit. The server refusal was correct every time. That is not
 * the same as this being handled: filling in eight steps and being turned away at the end teaches
 * somebody the product is broken, where being told at the door teaches them the setting is
 * deliberate and who can change it.
 *
 * IT SAYS WHY, AND WHO CAN CHANGE IT. A refusal with no next step reads as a fault. Not being able
 * to open a check-in is a setting somebody chose, and it says nothing about the person - so the
 * wording is flat, names the setting, and points at the person who can change it.
 *
 * NEVER THE ONLY CHECK. Every one of these routes is refused again by the API on the request
 * itself. This is a courtesy to the person, not a permission - a client-side gate protects nobody
 * and has never been asked to.
 */
export function ADoorYouCannotOpen({
  may,
  what,
  children,
}: {
  /** Whether this person may use what is behind the door. */
  may: boolean
  /** What they were trying to do, in their words rather than the route's. */
  what: 'open a check-in' | 'add people to your organisation'
  children: ReactNode
}) {
  const navigate = useNavigate()
  if (may) return <>{children}</>

  return (
    <div className="gw-bd" style={{ maxWidth: 540, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)', margin: '0 0 10px' }}>
        You cannot {what} here
      </h1>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.65, margin: '0 0 8px' }}>
        {what === 'open a check-in'
          ? 'Opening a check-in is limited to people your admin has named. You can still take part in any check-in somebody adds you to.'
          : 'Adding people is something your organisation’s admins do.'}
      </p>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.65, margin: '0 0 20px' }}>
        {/* Not a judgement, and said so plainly: a setting, and a person who can change it. */}
        This is a setting, not anything about you. An admin can change it.
      </p>
      <button
        type="button"
        className="gw-btn"
        style={{ margin: 0 }}
        onClick={() => navigate('/grounds')}
      >
        Back to your check-ins
      </button>
    </div>
  )
}
