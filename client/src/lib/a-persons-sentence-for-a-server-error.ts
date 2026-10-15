/**
 * NEVER A CONFIGURATION NAME ON SCREEN (screen fault 4a, Plan and billing, "Move to this").
 *
 * Stripe's own refusal when no secret key is set on this deployment reads "Billing is not set up
 * on this deployment. STRIPE_SECRET_KEY is not configured, so nothing can be charged. Nothing was
 * attempted and no card was touched." (`api/src/modules/billing/stripe.service.ts`) - true, and
 * useful to whoever reads a log, but a setting's name on screen is developer talk nobody asked for.
 *
 * Every environment variable and most named settings in this codebase are shaped the same way -
 * capital letters and digits joined by underscores, at least two pieces (`STRIPE_SECRET_KEY`,
 * `WHATSAPP_ACCESS_TOKEN`...). Whenever a served message contains one, this returns the one plain
 * sentence a person actually needs instead; every other message is shown exactly as the server sent
 * it, because most of them are already a full, true sentence a person can act on.
 */
const NAMES_A_SETTING = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/

export function aPersonsSentenceForAServerError(message: string | undefined | null, fallback: string): string {
  const text = message ?? fallback
  return NAMES_A_SETTING.test(text) ? 'Paying is not set up yet. Nothing was charged.' : text
}
