/**
 * Idempotent seed: generate and email a contributor code to each tester.
 * Safe to run multiple times -- skips anyone who already has a code with
 * note matching "seed:<email>".
 *
 * Run with: npm run seed:codes
 */
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import crypto from 'crypto';

const prisma = new PrismaClient();

const TESTERS = [
  'chaning@irrationallabs.com',
  'ajg126@gmail.com',
  'nathanialpeterson@gmail.com',
  'hjumare@gmail.com',
];

const SESSIONS_GRANTED = 5;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Groundwork <noreply@myground.work>';
const APP_URL = process.env.FRONTEND_URL || 'https://app.myground.work';

function generateCode(): string {
  return crypto
    .randomBytes(6)
    .toString('base64url')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
    .padEnd(8, '0');
}

function emailHtml(code: string, sessions: number): string {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
    <p>Here is your Groundwork access code. It gives you ${sessions} session${sessions !== 1 ? 's' : ''} free of charge.</p>
    <p style="font-size:22px;font-weight:bold;letter-spacing:0.1em;background:#F5F3EF;border-radius:6px;padding:14px 20px;display:inline-block;">${code}</p>
    <p>To use it: go to <a href="${APP_URL}">${APP_URL}</a>, create an account, set up a Ground, and enter this code when prompted. Your check-in stays private until the report is released.</p>
    <p>Any questions, reply to this email.</p>
    <p style="color:#9B9590;font-size:12px;">The Groundwork team</p>
  </div>`;
}

async function main() {
  const resendKey = process.env.RESEND_API_KEY;
  const isDev = !resendKey || resendKey.startsWith('re_...');
  const resend = isDev ? null : new Resend(resendKey);

  const seedOrg = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  const seedUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
  });

  if (!seedOrg || !seedUser) {
    console.error('No org or admin user found. Run the main seed first.');
    process.exit(1);
  }

  for (const email of TESTERS) {
    const noteKey = `seed:${email}`;
    const existing = await prisma.contributorCode.findFirst({ where: { note: noteKey } });

    if (existing) {
      console.log(`Skipped ${email} (already sent, code: ${existing.code})`);
      continue;
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await prisma.contributorCode.create({
      data: {
        organizationId: seedOrg.id,
        createdByUserId: seedUser.id,
        code,
        sessionsGranted: SESSIONS_GRANTED,
        sessionsUsed: 0,
        isActive: true,
        note: noteKey,
        expiresAt,
      },
    });

    if (isDev) {
      console.log(`[DEV] Would send code ${code} to ${email}`);
    } else {
      await resend!.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Your Groundwork access code',
        html: emailHtml(code, SESSIONS_GRANTED),
      });
      console.log(`Sent code ${code} to ${email}`);
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
