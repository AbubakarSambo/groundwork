import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => ({
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigins: process.env.CORS_ORIGINS, // comma-separated list of allowed origins
  // One-time platform-admin bootstrap: if set AND no platform admin exists yet,
  // this email is promoted on startup. No-ops once any platform admin exists,
  // so it can never be used to add a second one later - see AdminService.onApplicationBootstrap.
  platformAdminBootstrapEmail: process.env.PLATFORM_ADMIN_BOOTSTRAP_EMAIL,
  // Post-report guide generation (per-participant bridge coaching, one Gemini call
  // per party per report release). The feature is BUILT and proven accurate but has
  // no UI surface yet, so it is OFF by default to avoid paying for output nothing
  // renders. Flip to true once a client component shows each participant their guide.
  postReportGuideEnabled: process.env.POST_REPORT_GUIDE_ENABLED === "true",
  /**
   * THE COACHING LAYER. Off unless explicitly turned on, and off is the default
   * everywhere including production.
   *
   * Detection already ships: the role maps, the seven universal modes, the
   * function stored on a participant, and the neutral probes that reach the
   * prompt are all live today and are NOT behind this flag, because they are
   * existing behaviour and gating them would change what current grounds do.
   *
   * What this gates is the layer built on top of detection: coaching state, one
   * step per session, the staircases, and anything that reads back what somebody
   * was asked to do last time. That layer speaks directly to a person about
   * their own work, so it stays off until its traces have been read by a human.
   *
   * The test that matters is not that it works when on. It is that a check-in
   * with this off behaves EXACTLY as it did before any of it existed.
   */
  coachingEnabled: process.env.COACHING_ENABLED === "true",

  /**
   * CONTEXT. Off by default, on the same terms as the coaching flag above.
   *
   * What it gates: the Documents tab becoming a Context tab, open and closed
   * context as named things, per-person worries, documents read into context,
   * the context strength read, and the context chat that probes for what setup
   * did not capture.
   *
   * This one changes what people SEE ABOUT EACH OTHER, which is why it needs a
   * switch more than the coaching layer did. Today every document is private to
   * whoever uploaded it - not by policy, but because a participant guard was
   * applied to a list query - so turning this on is the first time the lead's
   * material reaches anybody. If that lands wrong, it lands wrong in the most
   * sensitive direction this product has.
   *
   * OFF MEANS THE OLD PRODUCT, NOT A DEGRADED ONE. The tab says Documents,
   * documents stay private to their uploader, and nothing asks anybody what they
   * are worried about. Additive only: new column, new tables, no changed meaning
   * for anything that exists. The test that matters is the one that proves that,
   * not the one that proves the feature works.
   */
  contextEnabled: process.env.CONTEXT_ENABLED === "true",
  /**
   * G30-G33. Off is today's product: the specificity signal, unchanged. On, the
   * same measurement is said about the picture instead of about the person, and
   * the report carries the line saying it is not final.
   *
   * A kill switch, because this changes sentences people read about themselves,
   * and a wrong sentence there costs more than a missing one.
   */
  confidenceEnabled: process.env.CONFIDENCE_ENABLED === "true",

  /**
   * OBJECTIVES AND BASELINE. Off by default, same terms as the two above.
   *
   * What it gates: an objective per person rather than one per ground, and a
   * day-one baseline recorded on purpose rather than inferred from session 1.
   *
   * WHY THIS ONE NEEDS THE SWITCH MOST. An objective field is a place to put a
   * target and score somebody against it, which is what every other product in
   * this category does. The rules that stop it - a proposal nobody has seen is
   * never read against, an absent objective produces no read at all, and the
   * only question asked of two objectives is whether they CONNECT - are the
   * whole design, and if any of them turns out to be wrong in practice the
   * damage is done to a person rather than to a screen.
   *
   * OFF MEANS THE OLD PRODUCT: one success definition belonging to the lead, and
   * the arc inferred from session 1 as it is today.
   */
  objectivesEnabled: process.env.OBJECTIVES_ENABLED === "true",
}));

export const databaseConfig = registerAs("database", () => ({
  url: process.env.DATABASE_URL,
}));

export const jwtConfig = registerAs("jwt", () => ({
  secret: process.env.JWT_SECRET || "super-secret-key",
  expiresIn: process.env.JWT_EXPIRES_IN || "7d",
}));

export const resendConfig = registerAs("resend", () => ({
  apiKey: process.env.RESEND_API_KEY,
  fromEmail: process.env.RESEND_FROM_EMAIL || "Groundwork <noreply@myground.work>",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
}));

export const googleConfig = registerAs("google", () => ({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:3000/api/v1/auth/google/callback",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
}));

// Google Gemini powers the conversation engine, report synthesis, and
// pattern detection.
export const geminiConfig = registerAs("gemini", () => ({
  projectId: process.env.GEMINI_PROJECT_ID || "groundwork-500011",
  location: process.env.GEMINI_LOCATION || "us-central1",
  model: process.env.GEMINI_MODEL || "gemini-2.5-pro",
  maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || "8192", 10),
}));

// WhatsApp Business Cloud API - single Groundwork-owned number, shared across
// all orgs. Sender detection matches the inbound phone number against
// User.phoneNumber; there is no per-org toggle. Disabled (dev-log only) until
// WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are set.
export const whatsappConfig = registerAs("whatsapp", () => ({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  enabled: !!process.env.WHATSAPP_ACCESS_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID,
}));

// Stripe, USD. Subscription billing: ten free grounds per org with unlimited
// sessions, a subscription lifts the cap. Nothing is charged per session.
export const stripeConfig = registerAs("stripe", () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  callbackUrl:
    process.env.STRIPE_CALLBACK_URL || "http://localhost:5173/billing/callback",
}));

// Fail fast in production if critical URL env vars are absent.
if (process.env.NODE_ENV === "production") {
  const required: string[] = ["FRONTEND_URL", "STRIPE_CALLBACK_URL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required env vars in production: ${missing.join(", ")}`);
  }
}
