import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from './config';
import { PrismaModule } from './modules/prisma';
import { EmailModule } from './modules/email';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { PromptsModule } from './modules/prompts';
import { AuthModule } from './modules/auth';
import { UsersModule } from './modules/users';
import { GroundsModule } from './modules/grounds';
import { ParticipantsModule } from './modules/participants';
import { ConversationModule } from './modules/conversation';
import { ReportsModule } from './modules/reports';
import { PatternsModule } from './modules/patterns';
import { BoardModule } from './modules/board';
import { ResolutionModule } from './modules/resolution';
import { BillingModule } from './modules/billing';
import { IntelligenceModule } from './modules/intelligence';
import { DocumentsModule } from './modules/documents/documents.module';
import { EntryModule } from './modules/entry/entry.module';
import { AdminModule } from './modules/admin/admin.module';
/**
 * FEEDBACK WAS NEVER REGISTERED, AND THE CLIENT HAS BEEN POSTING TO IT.
 *
 * FeedbackModule existed, with a controller on /feedback and a service behind it,
 * and app.module never imported it - so every request to that route 404'd. The
 * client's AppShell posts feedback and swallows the failure on purpose ("best
 * effort"), which means every piece of feedback anybody has ever submitted from
 * inside the product went nowhere and nobody saw an error.
 *
 * Found by the unwired-module rule, not by anybody noticing.
 */
import { FeedbackModule } from './modules/feedback/feedback.module';
import { JwtAuthGuard, RolesGuard, GlobalExceptionFilter, TransformInterceptor } from './common';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: 60 }]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    EmailModule,
    PromptsModule,
    AuthModule,
    UsersModule,
    GroundsModule,
    ParticipantsModule,
    ConversationModule,
    WhatsAppModule,
    ReportsModule,
    PatternsModule,
    BoardModule,
    ResolutionModule,
    BillingModule,
    IntelligenceModule,
    FeedbackModule,
    DocumentsModule,
    EntryModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
