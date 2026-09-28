import { MARKETING_URL } from '@/lib/marketing'
import './gw-ui.css'

/**
 * MARK (prototype: the three bars and "Groundwork", app.css `.brand`; join-invite.jpg,
 * join-waiting.jpg, join-outoftime.jpg, join-expired.jpg).
 *
 * The small brand at the top of a narrow arrival page (the invitation, "Almost in", "Out of
 * time", "This link has expired"): the three bars and the wordmark. Like every Groundwork mark,
 * it goes back to the marketing site (the-way-home-and-the-way-out.spec.ts).
 *
 * NO CAPTION ABOVE IT (Hafsah, pictured at 1440px against join-invite.jpg): the short line each
 * exported picture shows above the mark ("The invitation", "Waiting for an admin", "Out of
 * time", "An expired link") is the prototype PICTURE's own frame header - the label the
 * screenshot tool prints for whoever is browsing the screens - not something the screen itself
 * draws for the person using it. The real screen starts at the mark below it.
 *
 * Values are `auth-kit.tsx`'s `AuthBrand` (already checked against the prototype, U.1/U.2): 18px
 * bold navy, 9px gap.
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

export function Mark() {
  return (
    <a href={MARKETING_URL} className="gwui-mark">
      <Bars />
      <span>Groundwork</span>
    </a>
  )
}
