import { Global, Module } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';

/**
 * ONE ENGINE FOR THE WHOLE PROCESS (3 November 2026).
 *
 * Six modules each listed AnthropicService among their own providers, so the process held six copies
 * of it: six clients, six failure counts that each rebuilt only their own client, and six engine probes
 * on the five-minute clock, each a call to the reports model. It is provided here once, for every module,
 * and nobody lists it again.
 */
@Global()
@Module({
  providers: [AnthropicService],
  exports: [AnthropicService],
})
export class TheEngineModule {}
