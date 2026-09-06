import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceNotifierService } from './workspace-notifier.service';
import { WorkspaceNotifierController } from './workspace-notifier.controller';

@Module({
  imports: [PrismaModule],
  controllers: [WorkspaceNotifierController],
  providers: [WorkspaceNotifierService],
  exports: [WorkspaceNotifierService],
})
export class WorkspaceModule {}
