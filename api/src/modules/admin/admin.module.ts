import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController, OtpGuard } from './admin.controller';
import { EmailModule } from '../email/email.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [EmailModule, BillingModule],
  controllers: [AdminController],
  providers: [AdminService, OtpGuard],
  exports: [AdminService],
})
export class AdminModule {}
