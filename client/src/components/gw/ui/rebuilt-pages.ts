/**
 * THE REBUILT-PAGES LIST (design-audit.md section 4, "The order to rebuild the screens").
 *
 * Add a page's path here (relative to `client/src`, e.g. `pages/org/MembersPage.tsx`) the moment
 * it is rebuilt from `components/gw/ui` only, with no inline styles for size, colour or spacing.
 * From that moment, the-rebuilt-pages-use-only-the-new-parts.spec.ts fails the build if that file
 * ever imports one of kit.tsx's old parts, or writes one of the old CSS classes, again.
 *
 * THE INVITATION (design-audit.md section 3, "The invitation"; the invitation task) is the first
 * entry: the invite landing and the three states it hands over to when someone cannot answer
 * today - held for a seat, waiting for an admin to let them in, and a check-in out of time. Each
 * is now `Page narrow` with the small `Mark`, `PageTitle` in Literata, the standard `Button`, and
 * (where the prototype has one) `Callout`/`Panel`/`Section`/`Steps` - no `Arrival`, no `AuthCard`,
 * no old CSS class.
 */
export const REBUILT_PAGES: string[] = [
  'pages/invite/InvitePage.tsx',
  'pages/invite/InvitationExpired.tsx',
  'pages/join/WaitingForAnAdminPage.tsx',
]
