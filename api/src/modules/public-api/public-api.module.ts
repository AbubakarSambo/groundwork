import { Module } from '@nestjs/common';
import { ConnectionsAtAGlanceController } from './connections-at-a-glance.controller';
import { ConnectionsAtAGlanceService } from './connections-at-a-glance.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicApiController } from './public-api.controller';
import { CredentialsController } from './credentials.controller';
import { ImportsController } from './imports.controller';
import { CredentialsService } from './credentials.service';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { MachineTokenGuard } from './machine-token.guard';
import { SubjectsService } from '../subjects/subjects.service';
import { ScimService } from '../people/scim.service';
import { BulkImportService } from '../subjects/bulk-import.service';
import { ImportsBootstrap } from '../subjects/imports.bootstrap';
import { EmbedService } from '../embed/embed.service';
import { EmbedSessionGuard } from '../embed/embed-session.guard';
import { AssistantService } from '../assistant/assistant.service';
import { BoardModule } from '../board/board.module';
import { GroundsByApiService } from './grounds-by-api.service';
import { ReportsModule } from '../reports/reports.module';
import { GroundsModule } from '../grounds/grounds.module';
import { HandoverService } from '../grounds/handover.service';
import { DepartureService } from '../people/departure.service';
import { RetentionController } from '../people/retention.controller';
import { OnboardingService } from '../grounds/onboarding.service';
import { ScenariosService } from '../detectors/scenarios.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { KnowledgeController } from '../knowledge/knowledge.controller';
import { DetectorsController } from '../detectors/detectors.controller';
import { CheckinsController } from '../detectors/checkins.controller';
import { DraftsController } from '../drafts/drafts.controller';
import { WhatICanSeeController } from '../assistant/what-i-can-see.controller';
import { DraftsService } from '../drafts/drafts.service';
import { ApiAccessService } from './api-access.service';
import { ApiWatchCron } from './api-watch.cron';
import { HeldRequestsCron } from './a-held-request-does-not-outlive-its-ten-minutes.cron';
import { ApprovedOrMachineGuard } from './approved-or-machine.guard';
import { WhatIsTrueService } from '../assistant/what-is-true.service';
import { ReadItIfWeCanService } from '../documents/read-it-if-we-can.service';
import { ReportsForMyPeopleService } from '../reports/reports-for-my-people.service';
import { ReviewsComingUpService } from '../reports/reviews-coming-up.service';
import { ReviewsComingUpCron } from '../reports/reviews-coming-up.cron';
import { ACheckInACustomerCanRunService } from './a-check-in-a-customer-can-run.service';
import { CommitmentsByApiService } from './commitments-by-api.service';
import { WhatsAppForAnOrganisationService } from './whatsapp-for-an-organisation.service';
import { WhatsAppForAnOrganisationController } from './whatsapp-for-an-organisation.controller';
import { WhatsAppController } from '../whatsapp/whatsapp.controller';
import { TodosByApiService } from './todos-by-api.service';
import { ConversationModule } from '../conversation/conversation.module';
import { EmailModule } from '../email/email.module';
import { DocumentsModule } from '../documents/documents.module';
import { UsersModule } from '../users/users.module';
import { SuitesModule } from '../suites/suites.module';
import { RolesService } from '../detectors/roles-and-their-action.service';
import { DetectorsService } from '../detectors/detectors.service';
import { EmbedSetupController } from '../embed/embed-setup.controller';
import { EmbedAssetsController } from '../embed/embed-assets.controller';
import { WhatHappenedWithACustomerService } from './what-happened-with-a-customer.service';
/* Ask Groundwork inside the product (D1). Here because the assistant it reaches is provided here. */
import { AskController } from '../ask/ask.controller';
import { AskService } from '../ask/ask.service';
import { ParticipantsModule } from '../participants/participants.module';

@Module({
  imports: [
    PrismaModule,
    /* Imported rather than re-provided: listing ReportsService as a provider here drags its whole
       dependency chain (UsageService and below) into this module, and the server refuses to boot.
       Every test still passed - it is a wiring fault, which only starting the thing reveals. */
    ReportsModule,
    GroundsModule,
    /* Same reason as the note above: imported, not re-provided. ConversationService
       has ten dependencies and listing it here would drag every one of them into
       this module, which is a wiring fault only starting the server reveals. */
    ConversationModule,
    /* The assistant can send what it says. Imported rather than re-provided, like
       the others: EmailService has its own dependency chain. */
    EmailModule,
    DocumentsModule,
    UsersModule,
    /* Accepting an invitation from the number the organisation added (D2, 13 October 2026, evening). Imported, never re-provided. */
    ParticipantsModule,
    /* The leave suite, for leave dates said to Ask Groundwork (week 20). */
    SuitesModule,
    /*
     * THE BOARD IS IMPORTED, NEVER PROVIDED HERE A SECOND TIME. BoardService listens for every
     * finished check-in and words the board ahead of the lead's open. Listed as a provider here as
     * well, it was built twice, so every check-in warmed the board twice and asked the model twice
     * for the same lines: 18 warm-ups for 9 check-ins on run-19 (decision 44). One instance, one
     * listener. See only-one-board-listens.spec.
     */
    BoardModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('jwt.secret') }),
    }),
  ],
  controllers: [PublicApiController, ConnectionsAtAGlanceController, WhatsAppForAnOrganisationController, WhatsAppController, CredentialsController, ImportsController, EmbedSetupController, EmbedAssetsController, RetentionController, KnowledgeController, DetectorsController, CheckinsController, DraftsController, WhatICanSeeController, AskController],
  providers: [CredentialsService, ConnectionsAtAGlanceService, IdempotencyService, IdempotencyInterceptor, MachineTokenGuard, SubjectsService, ScimService, BulkImportService, ImportsBootstrap, EmbedService, EmbedSessionGuard, AssistantService, HandoverService, DepartureService, GroundsByApiService, WhatHappenedWithACustomerService, OnboardingService, ScenariosService, AnthropicService, KnowledgeService, DetectorsService, RolesService, DraftsService, ACheckInACustomerCanRunService, CommitmentsByApiService, TodosByApiService, WhatsAppForAnOrganisationService, ApiAccessService, ApiWatchCron, HeldRequestsCron, ApprovedOrMachineGuard, WhatIsTrueService, ReadItIfWeCanService, ReportsForMyPeopleService, ReviewsComingUpService, ReviewsComingUpCron, AskService],
  exports: [CredentialsService],
})
export class PublicApiModule {}
