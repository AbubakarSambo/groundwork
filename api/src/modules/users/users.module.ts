import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { MyOwnRecordService } from '../people/my-own-record.service';
import { UsersController } from './users.controller';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  /*
   * `forwardRef` on auth: AuthModule already imports UsersModule, and pasting a company in needs
   * the one implementation of "invite somebody" that lives in AuthService rather than a second
   * copy of it here. A second copy is how the invitation email and the seat gate drift apart.
   */
  imports: [BillingModule, forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [UsersService, MyOwnRecordService],
  exports: [UsersService],
})
export class UsersModule {}
