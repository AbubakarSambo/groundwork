import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => ({
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigins: process.env.CORS_ORIGINS, // comma-separated list of allowed origins
  // One-time platform-admin bootstrap: if set AND no platform admin exists yet,
  // this email is promoted on startup. No-ops once any platform admin exists,
  // so it can never be used to add a second one later - see AdminService.onApplicationBootstrap.
  platformAdminBootstrapEmail: process.env.PLATFORM_ADMIN_BOOTSTRAP_EMAIL,
  // Post-report guide generation (per-participant bridge coaching, one Gemini call per party per report release). ON
  // unless the env says "false" (Hafsah, 22 November 2026: nothing is switched off). No screen shows the guide yet, so
  // each one costs a model call that nothing renders until a client component shows it.
  postReportGuideEnabled: process.env.POST_REPORT_GUIDE_ENABLED !== "false",
  /**
   * CONTEXT. Was off by default.
   *
   * What it gates: the Documents tab becoming a Context tab, open and closed
   * context as named things, per-person worries, documents read into context,
   * the context strength read, and the context chat that probes for what setup
   * did not capture.
   *
   * This one changes what people SEE ABOUT EACH OTHER, which is why it needs a
   * switch more than the coaching layer did. Then every document was private to
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
  /**
   * ON. Her decision: "context is always enabled."
   *
   * It shipped behind a flag while the shape of the page was still being decided, and the flag was
   * never turned on - so the tab said Documents, every document stayed private to whoever uploaded it
   * whatever its visibility column said, and the context chat was hidden. A large amount of built work
   * sat dark, and the product could not do the thing the Context page exists for: let a lead share the
   * brief so everybody's questions are about the real situation.
   *
   * SAFE TO FLIP RETROACTIVELY, and this is why: while it was off, `setVisibility` threw before doing
   * anything, so no document anywhere could have been marked Open or Closed. Every row is Own. Turning
   * it on reveals nothing that was previously hidden - it only lets people start choosing.
   *
   * The env var still overrides, so it can be turned off in an emergency without a deploy. Nothing
   * sets it, and nothing should.
   */
  contextEnabled: process.env.CONTEXT_ENABLED !== "false",
  /**
   * G30-G33. ON unless the env says "false" (Hafsah, 22 November 2026: nothing is switched off). The specificity
   * measurement is said about the picture instead of about the person, and the report carries the line saying it is
   * not final.
   */
  confidenceEnabled: process.env.CONFIDENCE_ENABLED !== "false",

  /**
   * THE API'S PUBLIC ADDRESS, WITHOUT /api/v1 (for example https://api.myground.work). Not a
   * secret. The Connections page builds the WhatsApp callback address from it, the one an
   * organisation pastes into Meta. Unset locally, where the page says the address is known once
   * Groundwork is hosted.
   */
  publicApiUrl: process.env.PUBLIC_API_URL,
}));

export const databaseConfig = registerAs("database", () => ({
  url: process.env.DATABASE_URL,
}));

export const jwtConfig = registerAs("jwt", () => ({
  /* No default. A missing secret is refused at boot by the-jwt-secret.ts, in every environment (B16). */
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || "7d",
}));

export const resendConfig = registerAs("resend", () => ({
  apiKey: process.env.RESEND_API_KEY,
  /* Mail leaves the building only when somebody says so, never because NODE_ENV happened to be set (D20). */
  sendsForReal: process.env.EMAIL_SENDS_FOR_REAL === 'true',
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
  // The model a person talks to. Turns are one question at a time and a person is waiting, so the
  // fast model answers them; reports, synthesis and extraction stay on `model`. Measured 10 Sep 2026
  // on the same prompt: pro 3.9-4.5s to the first word, flash 0.65s.
  conversationModel: process.env.GEMINI_CONVERSATION_MODEL || "gemini-2.5-flash",
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
  /**
   * The app secret Meta signs inbound webhooks with. Separate from verifyToken, which only
   * answers Meta's one-time subscribe handshake and says nothing about any later POST - a
   * distinction that let unsigned traffic reach the inbound handler.
   */
  appSecret: process.env.WHATSAPP_APP_SECRET,
  enabled: !!process.env.WHATSAPP_ACCESS_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID,
  /**
   * Template names Meta has approved, comma-separated. A business-initiated message outside the
   * 24-hour window goes as one of these or not at all (whatsapp/a-message-outside-the-window.ts).
   */
  approvedTemplates: (process.env.WHATSAPP_APPROVED_TEMPLATES ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  /**
   * Groundwork's own WhatsApp number as people read it, for example +44 7700 900123. Not a secret:
   * it is the number people reply to. Display only; sending uses phoneNumberId. Unset, the
   * Connections page says "Groundwork's WhatsApp number" without a number.
   */
  displayNumber: process.env.WHATSAPP_DISPLAY_NUMBER,
  /** Meta's Graph API address. Unset it is Meta's own; only a test sets it, to a recorder on this machine. */
  graphBaseUrl: process.env.WHATSAPP_GRAPH_BASE_URL,
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
