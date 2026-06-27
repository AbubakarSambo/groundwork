import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

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

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // For Stripe webhook signature verification
  });

  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  const allowedOrigins = configService.get<string>('app.corsOrigins');
  app.enableCors({
    origin: allowedOrigins ? allowedOrigins.split(',') : true,
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
    .setDescription('Contribution intelligence — alignment grounds, conversation engine, reports')
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
  httpAdapter.get('/health', (_req, res) => res.status(200).send('ok'));

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Groundwork API running on port ${port} (docs at /api/docs)`);
}

bootstrap();
