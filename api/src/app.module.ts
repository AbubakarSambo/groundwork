import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { THE_THROTTLER } from './common/the-throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BackOfficeDoorGuard } from './modules/back-office/back-office-door.guard';
import { BackOfficeModule } from './modules/back-office/back-office.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from './config';
import { PrismaModule } from './modules/prisma';
import { EmailModule } from './modules/email';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { PromptsModule } from './modules/prompts';
import { AuthModule } from './modules/auth';
import { UsersModule } from './modules/users';
import { GroundsModule } from './modules/grounds';
import { PublicApiModule } from './modules/public-api/public-api.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ParticipantsModule } from './modules/participants';
import { ConversationModule } from './modules/conversation';
import { TheEngineModule } from './modules/conversation/the-engine.module';
import { ReportsModule } from './modules/reports';
import { PatternsModule } from './modules/patterns';
import { LearningModule } from './modules/learning/learning.module';
import { BoardModule } from './modules/board';
import { ResolutionModule } from './modules/resolution';
import { SuggestionsModule } from './modules/suggestions';
import { SuitesModule } from './modules/suites';
import { PolicyModule } from './modules/policy/policy.module';
import { RoleInterviewModule } from './modules/suites/the-role-interview.module';
import { BillingModule } from './modules/billing';
import { IntelligenceModule } from './modules/intelligence';
import { DocumentsModule } from './modules/documents/documents.module';
import { EntryModule } from './modules/entry/entry.module';
import { AdminModule } from './modules/admin/admin.module';
import { AlignmentModule } from './modules/alignment/alignment.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { OpsModule } from './modules/ops/ops.module';
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
import { CoachModule } from './modules/coach/coach.module';
import { TheOrganisationsOwnDay } from './common/the-organisations-own-day';
import { NoInternalNameInAResponse } from './common/no-internal-name-in-a-response';
import { JwtAuthGuard, RolesGuard, GlobalExceptionFilter, TransformInterceptor } from './common';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { ASyncLoopIsNotABrowser } from './common/guards/a-sync-loop-is-not-a-browser';

@Module({
  imports: [
    ConfigModule,
    /*
     * THE THROTTLER COUNTS IN PROCESS MEMORY. No `storage` is given, so the default in-memory store
     * is used: a restart resets every counter, and N instances allow N times the limit. This governs
     * the OTP and the public /start routes, so it is a security control with a single-process
     * assumption in it. This deployment has no Redis; when it does, hand the store in here
     * (@nestjs/throttler accepts one) and delete this comment. Said here rather than left to be
     * discovered, the way the old exchange-code Map said it (fix plan B15).
     */
    ThrottlerModule.forRoot([{ name: THE_THROTTLER, ttl: 60000, limit: 60 }]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    EmailModule,
    PromptsModule,
    AuthModule,
    UsersModule,
    GroundsModule,
    PublicApiModule,
    WebhooksModule,
    ParticipantsModule,
    TheEngineModule,
    ConversationModule,
    KnowledgeModule,
    WhatsAppModule,
    ReportsModule,
    PatternsModule,
    LearningModule,
    BoardModule,
    ResolutionModule,
    SuggestionsModule,
    SuitesModule,
    PolicyModule,
    RoleInterviewModule,
    BillingModule,
    IntelligenceModule,
    FeedbackModule,
    CoachModule,
    DocumentsModule,
    EntryModule,
    AdminModule,
    OpsModule,
    BackOfficeModule,
    WorkspaceModule,
    AlignmentModule,
  ],
  providers: [
    /*
     * The throttler, with one exception written into it: a machine caller is limited per credential
     * rather than per IP, at a rate a roster sync can actually finish. See
     * `a-sync-loop-is-not-a-browser.ts` — the plain guard gave a customer's HR system sixty
     * requests a minute shared with everybody behind the same address.
     */
    { provide: APP_GUARD, useClass: ASyncLoopIsNotABrowser },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    /* /ops and /admin need a code emailed to the signed-in address once a week, unless the session
       came from Google. See ops/the-back-office-has-a-door.ts. */
    { provide: APP_GUARD, useClass: BackOfficeDoorGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    /* Every day a sentence says is the organisation's own day (B-094). */
    { provide: APP_INTERCEPTOR, useClass: TheOrganisationsOwnDay },
    /* No internal name or placeholder in any sentence served (night quality run 2, "NEW_PROJECT"). */
    { provide: APP_INTERCEPTOR, useClass: NoInternalNameInAResponse },
  ],
})
export class AppModule {}
