import { GroundworkLogo } from '@/components/gw/GroundworkLogo'
import { AuthBrand } from '@/pages/auth/auth-kit'

/**
 * ONE ARRIVAL. Stage 4, and the reachable part of W8-49.
 *
 * Three ways in from an email, and each had a different amount of the product around it:
 *
 *   /invite         a header with the logo, a title, a centred column
 *   /join           a title and a column, no header
 *   /verify-email   a bare full-height div
 *
 * So the first thing somebody sees of Groundwork depended on which email they were sent, and the
 * one that looks least like a product is the magic link - the path a person takes to reach their
 * own finished ground.
 *
 * WHAT THIS IS AND IS NOT. It is the chrome: the header, the column, the heading, the space. It is
 * not the three flows. `/invite` accepts a token and lands in a check-in, `/join` needs a name and
 * an email first, `/verify-email` verifies and then commits a ground built before the account
 * existed. Those are different mechanics against different endpoints, each with its own guard file,
 * and folding them into one component would put the three paths that get people into the product at
 * all through one set of branches to save some markup. The consistency somebody actually sees is
 * here; the mechanics stay where they are tested.
 */
export function Arrival({ title, sub, children, wide, plain }: {
  title?: string
  sub?: string
  children: React.ReactNode
  /** Forms need the room; a one-line "signing you in" does not. */
  wide?: boolean
  /**
   * THE PROTOTYPE'S OWN LOOK FOR THE INVITATION (A3, join-invite.jpg; U.3 review): the cream page, the
   * small Groundwork mark at the top of one narrow column, and no header band.
   */
  plain?: boolean
}) {
  if (plain) {
    return (
      <div className="gw-arrival-plain">
        <div className="gw-arrival-plain-col">
          <AuthBrand />
          {title && <h1 className="gw-ttl">{title}</h1>}
          {sub && <div className="gw-sub-t">{sub}</div>}
          {children}
        </div>
      </div>
    )
  }
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-page)' }}>
      <div className="gw-hdr">
        <GroundworkLogo />
      </div>
      <div
        className="gw-bd"
        style={{
          maxWidth: wide ? 520 : 400,
          margin: '0 auto',
          width: '100%',
          paddingTop: 40,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {title && <h1 className="gw-ttl" style={{ textAlign: 'center' }}>{title}</h1>}
        {sub && (
          <div className="gw-sub-t" style={{ textAlign: 'center', margin: '8px auto 20px', maxWidth: 340 }}>
            {sub}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
