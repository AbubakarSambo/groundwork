/**
 * THE ONE PLACE THE TEST BED'S NUMBERS LIVE (user journey sweep, 7 October 2026).
 *
 * Two testers work at once, each on their own copy: their own database, their own API port, their
 * own mail catcher, their own WhatsApp recorder and their own clock. "a" and "b" are the two named
 * copies. Anything else can be asked for with SWEEP_NAME and the five SWEEP_* port settings.
 *
 * EVERY VALUE HERE IS A TEST VALUE. Nothing in this folder reads or writes .env, a live key or a
 * database that is not on this computer.
 */
import * as path from 'path';

export interface TheBed {
  name: string;
  database: string;
  databaseUrl: string;
  apiPort: number;
  /** Where the API's own address is, with the version prefix every route has. */
  api: string;
  mailSmtpPort: number;
  mailHttpPort: number;
  mail: string;
  recorderPort: number;
  recorder: string;
  clockPort: number;
  clock: string;
  /** Where this copy's browser app runs, so the links in its mail point at it. */
  clientPort: number;
  client: string;
  logFile: string;
  markFile: string;
}

const COPIES: Record<string, { database: string; apiPort: number; mailSmtpPort: number; mailHttpPort: number; recorderPort: number; clockPort: number; clientPort: number }> = {
  a: { database: 'gw_sweep_a', apiPort: 3201, mailSmtpPort: 1025, mailHttpPort: 1080, recorderPort: 3996, clockPort: 3301, clientPort: 5173 },
  b: { database: 'gw_sweep_b', apiPort: 3202, mailSmtpPort: 1026, mailHttpPort: 1081, recorderPort: 3997, clockPort: 3302, clientPort: 5174 },
};

/** Which copy: SWEEP=a or SWEEP=b (a is the default). */
export function theBed(name: string = process.env.SWEEP ?? 'a'): TheBed {
  const base = COPIES[name] ?? {
    database: process.env.SWEEP_DATABASE ?? `gw_sweep_${name}`,
    apiPort: Number(process.env.SWEEP_API_PORT), mailSmtpPort: Number(process.env.SWEEP_MAIL_SMTP_PORT), mailHttpPort: Number(process.env.SWEEP_MAIL_HTTP_PORT),
    recorderPort: Number(process.env.SWEEP_RECORDER_PORT), clockPort: Number(process.env.SWEEP_CLOCK_PORT), clientPort: Number(process.env.SWEEP_CLIENT_PORT) || 5175,
  };
  if (!base.apiPort || !base.mailSmtpPort || !base.mailHttpPort || !base.recorderPort || !base.clockPort) {
    throw new Error(`Copy "${name}" is not one of a or b, so SWEEP_API_PORT, SWEEP_MAIL_SMTP_PORT, SWEEP_MAIL_HTTP_PORT, SWEEP_RECORDER_PORT and SWEEP_CLOCK_PORT must all be set.`);
  }
  if (!/^gw_sweep_[a-z0-9_]+$/.test(base.database)) throw new Error('The test bed only ever uses a database called gw_sweep_ and a name. Nothing else is touched.');
  const user = process.env.PGUSER ?? process.env.USER ?? 'postgres';
  const databaseUrl = process.env.SWEEP_DATABASE_URL ?? `postgresql://${user}@localhost:5432/${base.database}?schema=public`;
  const here = path.join(__dirname, 'logs');
  return {
    name, database: base.database, databaseUrl,
    apiPort: base.apiPort, api: `http://127.0.0.1:${base.apiPort}/api/v1`,
    mailSmtpPort: base.mailSmtpPort, mailHttpPort: base.mailHttpPort, mail: `http://127.0.0.1:${base.mailHttpPort}`,
    recorderPort: base.recorderPort, recorder: `http://127.0.0.1:${base.recorderPort}`,
    clockPort: base.clockPort, clock: `http://127.0.0.1:${base.clockPort}`,
    clientPort: base.clientPort, client: `http://localhost:${base.clientPort}`,
    logFile: path.join(here, `${base.database}.log`), markFile: path.join(here, `${base.database}.mark`),
  };
}

/** Test values for WhatsApp. The API is started with these and the signed messages are signed with them. */
export const TEST_WHATSAPP = {
  appSecret: 'sweep-test-app-secret-not-a-real-secret',
  verifyToken: 'sweep-test-verify-token',
  accessToken: 'TEST-sweep-access-token-not-real',
  phoneNumberId: '100000000000009',
  displayNumber: '+44 7700 900123',
};

/** Local only. Written in the fixtures file because the testers need it to sign in. */
export const TEST_PASSWORD = 'Sweep-local-only-1';

/** The message templates the API will accept as approved, so a message outside the 24 hours goes as a template. */
export const APPROVED_TEMPLATES_ENV = 'WHATSAPP_APPROVED_TEMPLATES';
