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
import { AnthropicService } from '../conversation/anthropic.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { KnowledgeController } from '../knowledge/knowledge.controller';
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
  controllers: [PublicApiController, CredentialsController, ImportsController, EmbedSetupController, EmbedAssetsController, KnowledgeController],
  providers: [CredentialsService, IdempotencyService, MachineTokenGuard, SubjectsService, ScimService, BulkImportService, ImportsBootstrap, EmbedService, EmbedSessionGuard, AssistantService, AnthropicService, KnowledgeService],
  exports: [CredentialsService],
})
export class PublicApiModule {}
