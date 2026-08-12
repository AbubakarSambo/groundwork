import { useNavigate } from 'react-router-dom'

/**
 * A GROUND YOU CANNOT SEE. W8-65.
 *
 * Both ground pages ended at the bare words "Ground not found." - grey text at the top
 * left of an empty page, no heading, no control, plus a red toast that fades. Same family
 * as the invite and join dead ends in W8-62, found the same way: by hitting it.
 *
 * WHAT ACTUALLY CAUSES IT, and why the copy says so. The most likely reason by far is the
 * org switcher: switch organisation while looking at a ground and the ground belongs to
 * the one you just left, so the page you are on stops resolving. That is not an error and
 * it is not "not found" in any sense the person recognises - they can see the ground
 * exists, they were reading it a second ago. Naming the switch is the difference between
 * "the product lost my ground" and "ah, I am in the other organisation".
 *
 * The other reasons - removed from the ground, ground deleted, a stale link from someone
 * else's organisation - all lead to the same move, so they are not enumerated. Listing
 * which one it was would also tell whoever holds the link whether a ground exists at that
 * id, which is not something a stranger should be able to ask.
 */
export function GroundGone() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 380, margin: '0 auto', padding: '56px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>This ground is not open to you</div>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.7, marginBottom: 20 }}>
        If you just switched organisation, this ground belongs to the other one - switch back and it
        will be there. Otherwise it may have been closed, or you are no longer part of it.
      </div>
      <button className="gw-btn" onClick={() => navigate('/')}>Go to my grounds</button>
    </div>
  )
}
