import { Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

/**
 * Rendered for any path that matches no route. Previously the wildcard route
 * redirected to "/", which for a logged-out visitor could hard-redirect to
 * an externally-configured marketing URL via window.location.replace - if
 * that URL didn't resolve, the visitor was stranded on a blank tab with no
 * indication anything went wrong (this is exactly how a stale "/entry" link
 * on the marketing site behaved). This page never leaves the app and always
 * gives the visitor a way forward.
 */
export function NotFoundPage() {
  const location = useLocation()

  useEffect(() => {
    // Visible in server/console logs so a bad link shows up without anyone
    // having to click it first - the whole reason the prior silent redirect
    // went unnoticed for as long as it did.
    console.warn(`[NotFoundPage] unmatched route: ${location.pathname}${location.search}`)
  }, [location.pathname, location.search])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <Link to="/" className="gw-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Groundwork</Link>
      </div>
      <div className="gw-bd" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '70vh', maxWidth: 420, margin: '0 auto', width: '100%' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
          Page not found
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em', lineHeight: 1.25 }}>
          There is nothing at this address.
        </div>
        <div style={{ fontSize: 14, color: 'var(--gw-sub)', marginBottom: 28, lineHeight: 1.65 }}>
          The link you followed may be out of date, or the address may have been typed incorrectly.
        </div>

        <Link to="/start" className="gw-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
          Start a Ground
        </Link>
      </div>
    </div>
  )
}
