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

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('jwt.secret') }),
    }),
  ],
  controllers: [PublicApiController, CredentialsController, ImportsController],
  providers: [CredentialsService, IdempotencyService, MachineTokenGuard, SubjectsService, ScimService, BulkImportService, ImportsBootstrap],
  exports: [CredentialsService],
})
export class PublicApiModule {}
