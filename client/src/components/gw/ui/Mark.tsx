import { MARKETING_URL } from '@/lib/marketing'
import './gw-ui.css'

/**
 * MARK (prototype: the three bars and "Groundwork", app.css `.brand`; join-invite.jpg,
 * join-waiting.jpg, join-outoftime.jpg, join-expired.jpg).
 *
 * The small brand at the top of a narrow arrival page (the invitation, "Almost in", "Out of
 * time", "This link has expired"): an optional caption above it, taken word for word from the
 * prototype's own screen (`docs/prototype/screens/A3-organisations-and-joining/join-*.txt` puts
 * a short line - "Waiting for an admin", "Out of time", "An expired link" - directly above the
 * mark on every one of these screens), then the three bars and the wordmark. Like every
 * Groundwork mark, it goes back to the marketing site (the-way-home-and-the-way-out.spec.ts).
 *
 * Values are `auth-kit.tsx`'s `AuthBrand` (already checked against the prototype, U.1/U.2): 18px
 * bold navy, 9px gap. `caption` reuses PageTitle's eyebrow size, 14.5px muted, since it is the
 * same kind of line - a short label above the real heading.
 */
function Bars() {
  return (
    <svg width="22" height="17" viewBox="0 0 22 17" aria-hidden focusable="false">
      <rect x="5" y="0" width="12" height="3" rx="1.5" fill="currentColor" opacity="0.45" />
      <rect x="2" y="6" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.72" />
      <rect x="0" y="12" width="22" height="3" rx="1.5" fill="currentColor" />
    </svg>
  )
}

export function Mark({ caption }: {
  /** The short line above the mark, e.g. "Waiting for an admin". Omitted where no screen has one. */
  caption?: string
}) {
  return (
    <div className="gwui-mark-wrap">
      {caption && <p className="gwui-mark-caption">{caption}</p>}
      <a href={MARKETING_URL} className="gwui-mark">
        <Bars />
        <span>Groundwork</span>
      </a>
    </div>
  )
}
