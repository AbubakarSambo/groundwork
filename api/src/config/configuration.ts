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

// Google Gemini powers the conversation engine, report synthesis, and
// pattern detection.
export const geminiConfig = registerAs("gemini", () => ({
  projectId: process.env.GEMINI_PROJECT_ID || "groundwork-500011",
  location: process.env.GEMINI_LOCATION || "us-central1",
  model: process.env.GEMINI_MODEL || "gemini-2.5-pro",
  maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || "8192", 10),
}));

// Stripe, USD. Per-session billing: first session per ground is free, each additional is $5.
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
