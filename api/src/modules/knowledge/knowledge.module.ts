import { Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { HowWeDoItService } from './how-we-do-it.service';
import { HowWeDoItController } from './how-we-do-it.controller';

/**
 * The product's own door to what the company says it does.
 *
 * `KnowledgeService` had no module of its own - it was registered directly by the public API, which
 * is fine for one consumer and not for three. This gives it one, and hangs the in-product
 * controller off it.
 */
@Module({
  controllers: [HowWeDoItController],
  providers: [KnowledgeService, HowWeDoItService],
  exports: [KnowledgeService, HowWeDoItService],
})
export class KnowledgeModule {}
