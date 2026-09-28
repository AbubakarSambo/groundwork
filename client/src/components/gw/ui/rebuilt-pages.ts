/**
 * THE REBUILT-PAGES LIST (design-audit.md section 4, "The order to rebuild the screens").
 *
 * Add a page's path here (relative to `client/src`, e.g. `pages/org/MembersPage.tsx`) the moment
 * it is rebuilt from `components/gw/ui` only, with no inline styles for size, colour or spacing.
 * From that moment, the-rebuilt-pages-use-only-the-new-parts.spec.ts fails the build if that file
 * ever imports one of kit.tsx's old parts, or writes one of the old CSS classes, again.
 *
 * Starts empty: this task is only the shared parts and this guard, not any screen. The screens
 * workspace adds to this list one entry at a time, in the order docs/design-audit.md sets out.
 */
export const REBUILT_PAGES: string[] = []
