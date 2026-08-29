import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicApiController } from './public-api.controller';
import { CredentialsController } from './credentials.controller';
import { ImportsController } from './imports.controller';
import { CredentialsService } from './credentials.service';
import { IdempotencyService } from './idempotency.service';
import { MachineTokenGuard } from './machine-token.guard';
import { SubjectsService } from '../subjects/subjects.service';
import { ScimService } from '../people/scim.service';
import { BulkImportService } from '../subjects/bulk-import.service';
import { ImportsBootstrap } from '../subjects/imports.bootstrap';
import { EmbedService } from '../embed/embed.service';
import { EmbedSessionGuard } from '../embed/embed-session.guard';
import { AssistantService } from '../assistant/assistant.service';
import { BoardService } from '../board/board.service';
import { HandoverService } from '../grounds/handover.service';
import { DepartureService } from '../people/departure.service';
import { OnboardingService } from '../grounds/onboarding.service';
import { ScenariosService } from '../detectors/scenarios.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { KnowledgeController } from '../knowledge/knowledge.controller';
import { DetectorsController } from '../detectors/detectors.controller';
import { CheckinsController } from '../detectors/checkins.controller';
import { DraftsController } from '../drafts/drafts.controller';
import { DraftsService } from '../drafts/drafts.service';
import { DetectorsService } from '../detectors/detectors.service';
import { EmbedSetupController } from '../embed/embed-setup.controller';
import { EmbedAssetsController } from '../embed/embed-assets.controller';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('jwt.secret') }),
    }),
  ],
  controllers: [PublicApiController, CredentialsController, ImportsController, EmbedSetupController, EmbedAssetsController, KnowledgeController, DetectorsController, CheckinsController, DraftsController],
  providers: [CredentialsService, IdempotencyService, MachineTokenGuard, SubjectsService, ScimService, BulkImportService, ImportsBootstrap, EmbedService, EmbedSessionGuard, AssistantService, BoardService, HandoverService, DepartureService, OnboardingService, ScenariosService, AnthropicService, KnowledgeService, DetectorsService, DraftsService],
  exports: [CredentialsService],
})
export class PublicApiModule {}
