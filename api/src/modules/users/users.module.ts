import { Module, forwardRef } from '@nestjs/common';
import { GroundsModule } from '../grounds/grounds.module';
import { UsersService } from './users.service';
import { MyOwnRecordService } from '../people/my-own-record.service';
import { UsersController } from './users.controller';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { WhoIsWaitingAtTheDoorService } from '../participants/who-is-waiting-at-the-door.service';
import { EmailModule } from '../email/email.module';
import { TheOrganisationInviteLinkService } from './the-organisation-invite-link.service';
import { TheOrganisationInviteLinkController } from './the-organisation-invite-link.controller';

@Module({
  /*
   * `forwardRef` on auth: AuthModule already imports UsersModule, and pasting a company in needs
   * the one implementation of "invite somebody" that lives in AuthService rather than a second
   * copy of it here. A second copy is how the invitation email and the seat gate drift apart.
   */
  /* GroundsModule for releasing a held invitation - it owns the participant row and the invite.
     Circular by nature (grounds reads users), so both ends use forwardRef. */
  imports: [BillingModule, forwardRef(() => AuthModule), EmailModule, forwardRef(() => GroundsModule)],
  controllers: [UsersController, TheOrganisationInviteLinkController],
  /* The door service is registered here rather than exported from a participants module: it is
     used by this controller only, and the accept path writes the queue itself. */
  providers: [UsersService, MyOwnRecordService, WhoIsWaitingAtTheDoorService, TheOrganisationInviteLinkService],
  exports: [UsersService],
})
export class UsersModule {}
