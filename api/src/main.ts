import { NestFactory } from '@nestjs/core';
import { theAddressTheApiListensOn } from './the-address-the-api-listens-on';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { JwtService } from '@nestjs/jwt';
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
  if (process.env.EMAIL_SENDS_FOR_REAL !== 'true') problems.push("EMAIL_SENDS_FOR_REAL must be 'true' in production (no mail leaves the deployment otherwise)");
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_...') || process.env.RESEND_API_KEY === 're_test') problems.push('RESEND_API_KEY must be set to a real key');
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
  /* Routing and the back-office door agree on spelling: /ADMIN is not /admin (B16, P2-007). */
  app.set('case sensitive routing', true);

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
    exclude: [
      { path: 'api/org/v1/(.*)', method: RequestMethod.ALL },
      /* The two files a customer's browser fetches. Their addresses go in a script tag on every
         page of somebody else's application, so they are stable URLs rather than ones that move
         with our internal version. */
      { path: 'embed.js', method: RequestMethod.GET },
      { path: 'embed/panel', method: RequestMethod.GET },
    ],
  });

  // CORS - allow configured origins (plus this project's Vercel previews) or all in development
  const allowedOrigins = configService.get<string>('app.corsOrigins');
  const staticOrigins = allowedOrigins ? allowedOrigins.split(',') : [];
  const vercelPreviewPattern = /^https:\/\/groundwork-[a-z0-9-]+-collecta-s-projects\.vercel\.app$/;

  /**
   * TWO SURFACES WITH OPPOSITE CORS NEEDS.
   *
   * Groundwork's own client is a known origin and carries credentials, so it gets an allow-list.
   * The integration surface is called from EVERY CUSTOMER'S OWN DOMAIN by definition - a widget on
   * their application, a panel in an iframe - and an allow-list cannot enumerate domains we have
   * never been told about. The first version applied the app's list to both, so a customer's page
   * got a 500 on the preflight; found by loading the widget from a page that was not ours.
   *
   * Opening those paths is not a weakening. CORS is not what protects them: every one is
   * authenticated by a bearer token in a header, which a cross-origin page cannot obtain by being
   * cross-origin. And `credentials: false` there is deliberate - a browser refuses to send cookies
   * to a wildcard origin anyway, and these endpoints must never depend on one.
   */
  const INTEGRATION_PATHS = /^\/(api\/org\/v1\/|embed\.js|embed\/panel)/;

  app.enableCors((req: { url?: string }, callback: (err: Error | null, options?: any) => void) => {
    if (INTEGRATION_PATHS.test(req.url ?? '')) {
      return callback(null, { origin: true, credentials: false });
    }
    callback(null, {
      origin: !allowedOrigins
        ? true
        : (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
            if (!origin || staticOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
              return cb(null, true);
            }
            cb(new Error(`Origin ${origin} not allowed by CORS`));
          },
      credentials: true,
    });
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
  /*
   * THE REFERENCE IS BEHIND THE SAME DOOR AS THE API. Every route of the product, generated from the
   * code, was readable by anybody at /api/docs: the one document somebody copying us wants most.
   * It opens with a one-hour key an approved organisation gets from the Connect page (see
   * CredentialsController.docsLink); the key is kept in a cookie so the reference's own assets load.
   * DOCS_OPEN=true leaves it open, for local work.
   */
  const docsJwt = app.get(JwtService, { strict: false });
  app.use('/api/docs', (req: ExpressRequest, res: ExpressResponse, next: () => void) => {
    if (process.env.DOCS_OPEN === 'true') return next();
    const fromQuery = typeof req.query.key === 'string' ? req.query.key : null;
    const fromCookie = /(?:^|;\s*)gw_docs=([^;]+)/.exec(req.headers.cookie ?? '')?.[1] ?? null;
    const key = fromQuery ?? fromCookie;
    try {
      const claims: any = key ? docsJwt.verify(key) : null;
      if (claims?.typ !== 'docs') throw new Error('not a docs key');
      if (fromQuery) res.setHeader('Set-Cookie', `gw_docs=${fromQuery}; Path=/api/docs; HttpOnly; SameSite=Lax; Max-Age=3600`);
      return next();
    } catch {
      res.status(403).type('text/plain').send('The API reference opens from the Connect page of an organisation with API access.');
    }
  });
  SwaggerModule.setup('api/docs', app, document);

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: unknown, res: ExpressResponse) => res.status(200).send('ok'));

  /*
   * A HEALTH CHECK THAT NEVER TOUCHES THE MODEL CANNOT TELL YOU THE MODEL IS UNREACHABLE. In a live
   * run every AI call from the running process failed for the best part of an hour while /health
   * kept returning "ok" - nothing would have alerted. So this route used to make a real model call
   * per request. That kept the lesson and opened a second door: it sits on the raw adapter, outside
   * every guard and the throttler, so anyone on the internet could spend the model budget at
   * request rate, no account needed.
   *
   * The probe has moved, not gone. AnthropicService makes the same real call on a schedule from
   * inside the process and records what happened; this route reports that record and returns 503
   * when the last probe failed, is missing, or is stale. A monitor still sees the engine go down
   * within one probe interval, and a stranger hitting this URL costs us a hash lookup.
   *
   * /health/email is gone outright. It sent real mail from our domain to any address in a query
   * string, unauthenticated and unthrottled - an open relay whose cost was the reputation every
   * invitation and magic link depends on. Its comment said "safe to leave in". The same answer is
   * on the Resend dashboard.
   */
  httpAdapter.get('/health/ai', async (_req: any, res: any) => {
    try {
      const { AnthropicService } = await import('./modules/conversation/anthropic.service');
      const svc = app.get(AnthropicService, { strict: false });
      const probe = svc.lastProbeOutcome();
      res.status(probe.ok ? 200 : 503).json(probe);
    } catch (err: any) {
      res.status(503).json({ ok: false, error: String(err?.message ?? err).slice(0, 300) });
    }
  });

  /*
   * A CONFIGURATION FAILURE REACHES A PERSON, NOT A LOG LINE. With RESEND_WEBHOOK_SECRET unset in
   * production every delivery and bounce event is rejected, all tracking is inert, and nothing else
   * says so. This reports it where a monitor looks, and 503s so the monitor notices.
   */
  httpAdapter.get('/health/mail', async (_req: any, res: any) => {
    try {
      const { DeliveryService } = await import('./modules/email/delivery.service');
      const delivery = app.get(DeliveryService, { strict: false });
      const resendWebhookSecretSet = delivery.webhookSecretConfigured();
      const ok = resendWebhookSecretSet || process.env.NODE_ENV !== 'production';
      res.status(ok ? 200 : 503).json({ ok, resendWebhookSecretSet, says: resendWebhookSecretSet ? 'Delivery and bounce events are being read.' : 'RESEND_WEBHOOK_SECRET is not set: every delivery and bounce event is rejected, and dead addresses are not being suppressed.' });
    } catch (err: any) {
      res.status(503).json({ ok: false, error: String(err?.message ?? err).slice(0, 300) });
    }
  });

  const port = configService.get<number>('app.port') || 3000;
  /* Narrowed to this machine only for an explicit development run; see the-address-the-api-listens-on.ts. */
  const host = theAddressTheApiListensOn(process.env.NODE_ENV);
  await app.listen(port, host);
  logger.log(`Groundwork API running on port ${port} (docs at /api/docs)`);
}

bootstrap();
