import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Resend } from 'resend';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Response as ExpressResponse } from 'express';
import { MAX_BATCH_BYTES } from './modules/subjects/how-heavy-a-batch-may-be';

/**
 * Refuse to boot in production with insecure defaults. These are trust- and
 * money-critical; a missing secret must fail loudly, never fall back to a dev
 * default that silently disables auth, CORS, or the paywall. (GW-05.)
 */
function assertProductionConfig(logger: Logger) {
  if ((process.env.NODE_ENV || 'development') !== 'production') return;
  const problems: string[] = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'super-secret-key') problems.push('JWT_SECRET must be set to a strong, non-default value');
  if (!process.env.CORS_ORIGINS) problems.push('CORS_ORIGINS must be an explicit allow-list (wildcard is not allowed in production)');
  if (!process.env.DATABASE_URL) problems.push('DATABASE_URL must be set');
  if (process.env.BILLING_ENABLED !== 'true') problems.push("BILLING_ENABLED must be 'true' in production (the paywall is disabled otherwise)");
  if (!process.env.STRIPE_SECRET_KEY) problems.push('STRIPE_SECRET_KEY must be set');
  if (!process.env.STRIPE_WEBHOOK_SECRET) problems.push('STRIPE_WEBHOOK_SECRET must be set (webhooks are unverified otherwise)');
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) problems.push('GOOGLE_SERVICE_ACCOUNT_JSON must be set');
  if (problems.length) {
    logger.error(`Refusing to start in production with insecure configuration:\n - ${problems.join('\n - ')}`);
    process.exit(1);
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  assertProductionConfig(logger);

  /* Typed as the Express application so the body-parser limit below is reachable. */
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // For Stripe webhook signature verification
  });

  const configService = app.get(ConfigService);

  /**
   * THE INTEGRATION API IS NOT UNDER THE INTERNAL VERSION, AND MUST NOT BE.
   *
   * Internal routes live at /api/v1 and are free to change shape whenever the product does. The
   * integration surface at /api/org/v1 is a contract somebody else's server depends on, so it is
   * excluded from this prefix rather than nested inside it - if it inherited /api/v1, then the day
   * internal routes move to v2 the customer's integration either moves with them or is left behind
   * on a version number that no longer means anything.
   *
   * The excluded controller therefore declares its full path itself. See public-api.controller.ts.
   */
  /**
   * THE BODY LIMIT, RAISED FROM EXPRESS'S 100kb DEFAULT.
   *
   * A bulk import of three thousand plain objectives is 233kb, so the default refused it while
   * `MAX_BATCH` advertised five thousand - a cap the server would not honour.
   *
   * THE FIRST ATTEMPT SCOPED A BIGGER LIMIT TO THE BULK ROUTE ALONE, with `app.use(path, json())`,
   * and that broke request body parsing for EVERY route: mounting a body parser this way stops Nest
   * registering its own, so logging in began failing with a validation error saying the email was
   * empty. It typechecked, it started cleanly, and nothing in the suite touches a real HTTP body.
   * Found by trying to log in.
   *
   * So the limit is global, set through the supported API, and kept modest enough to be unremarkable
   * on an unauthenticated endpoint - and MAX_BATCH is derived from it rather than asserted
   * separately. See how-heavy-a-batch-may-be.ts.
   */
  app.useBodyParser('json', { limit: MAX_BATCH_BYTES });


  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'api/org/v1/(.*)', method: RequestMethod.ALL }],
  });

  // CORS - allow configured origins (plus this project's Vercel previews) or all in development
  const allowedOrigins = configService.get<string>('app.corsOrigins');
  const staticOrigins = allowedOrigins ? allowedOrigins.split(',') : [];
  const vercelPreviewPattern = /^https:\/\/groundwork-[a-z0-9-]+-collecta-s-projects\.vercel\.app$/;

  app.enableCors({
    origin: !allowedOrigins
      ? true
      : (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          if (!origin || staticOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
            return callback(null, true);
          }
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Groundwork API')
    .setDescription('Contribution intelligence - alignment grounds, conversation engine, reports')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'Team member management')
    .addTag('Grounds', 'Alignment ground lifecycle')
    .addTag('Conversation', 'Check-in conversation engine')
    .addTag('Reports', 'Shared-picture report')
    .addTag('Billing', 'Care fee + scenario fee (Stripe)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: unknown, res: ExpressResponse) => res.status(200).send('ok'));

  // A health check that never touches the model cannot tell you the model is
  // unreachable. In a live run every AI call from the running process failed
  // for the best part of an hour while /health kept returning "ok" - nothing
  // would have alerted. This one makes a real call, and returns 503 when the
  // engine is actually down, so a monitor can see it.
  httpAdapter.get('/health/ai', async (_req: any, res: any) => {
    try {
      const { AnthropicService } = await import('./modules/conversation/anthropic.service');
      const svc = app.get(AnthropicService, { strict: false });
      const result = await svc.healthCheck();
      res.status(result.ok ? 200 : 503).json(result);
    } catch (err: any) {
      res.status(503).json({ ok: false, error: String(err?.message ?? err).slice(0, 300) });
    }
  });

  // Email diagnostic - call GET /health/email?to=you@example.com on the production
  // server to see exactly what Resend returns. Safe to leave in: no auth bypass,
  // no data exposure, just a test send to an explicit address.
  httpAdapter.get('/health/email', async (req: any, res: any) => {
    const to = req.query?.to;
    if (!to || !String(to).includes('@')) {
      return res.status(400).json({ error: 'Pass ?to=your@email.com' });
    }
    const apiKey = process.env.RESEND_API_KEY ?? '';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Groundwork <noreply@myground.work>';
    if (!apiKey || apiKey.startsWith('re_...')) {
      return res.status(200).json({ status: 'dev_mode', message: 'RESEND_API_KEY is the placeholder - emails are suppressed and logged only.' });
    }
    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [String(to)],
        subject: 'Groundwork email diagnostic',
        html: '<p>This is a test email from the Groundwork health check endpoint. If you received this, email delivery is working.</p>',
      });
      if (error) {
        return res.status(200).json({ status: 'resend_error', error });
      }
      return res.status(200).json({ status: 'sent', id: data?.id, from: fromEmail, to });
    } catch (err: any) {
      return res.status(200).json({ status: 'exception', message: err.message });
    }
  });

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Groundwork API running on port ${port} (docs at /api/docs)`);
}

bootstrap();
