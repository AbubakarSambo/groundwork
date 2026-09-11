import { Global, Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

/* The platform webhook controller is registered in PublicApiModule, beside the organisation handler it
   delegates to: one inbound handler, not two. */
@Global()
@Module({
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
