import { Module } from '@nestjs/common';
import { SuitesModule } from '../suites/suites.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { AnthropicService } from '../conversation/anthropic.service';
import { PolicyController } from './policy.controller';
import { PolicyService } from './policy.service';

/** RELEASE 9: policy and setting up from documents. */
@Module({
  imports: [SuitesModule, KnowledgeModule],
  controllers: [PolicyController],
  providers: [PolicyService, AnthropicService],
})
export class PolicyModule {}
