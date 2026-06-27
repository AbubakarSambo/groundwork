import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController, OtpGuard } from './admin.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [AdminController],
  providers: [AdminService, OtpGuard],
  exports: [AdminService],
})
export class AdminModule {}
