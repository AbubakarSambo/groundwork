import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

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

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Groundwork API running on port ${port} (docs at /api/docs)`);
}

bootstrap();
