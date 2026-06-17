import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => ({
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigins: process.env.CORS_ORIGINS, // comma-separated list of allowed origins
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

// Anthropic Claude powers the conversation engine, report synthesis, and
// pattern detection. The system prompt is large + static — enable prompt
// caching on it (see conversation module).
export const anthropicConfig = registerAs("anthropic", () => ({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
  maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || "2048", 10),
}));

// Stripe, USD. Care fee = $25/mo recurring platform fee per account.
// Participant fee = $25/mo per unique active participant across all active grounds.
export const stripeConfig = registerAs("stripe", () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  careFeePriceId: process.env.STRIPE_CARE_FEE_PRICE_ID, // $25/mo recurring
  scenarioFeeCents: parseInt(process.env.STRIPE_SCENARIO_FEE_CENTS || "2500", 10), // $25/unique participant/mo
  careFeeCents: parseInt(process.env.STRIPE_CARE_FEE_CENTS || "2500", 10), // $25/mo
  callbackUrl:
    process.env.STRIPE_CALLBACK_URL || "http://localhost:5173/billing/callback",
}));
