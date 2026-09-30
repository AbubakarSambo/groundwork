import { Module } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsListener } from './suggestions.listener';

@Module({
  controllers: [SuggestionsController],
  providers: [SuggestionsService, SuggestionsListener],
  exports: [SuggestionsService],
})
export class SuggestionsModule {}
