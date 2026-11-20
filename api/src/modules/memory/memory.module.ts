import { Module } from '@nestjs/common';
import { MemoryWriter } from './the-memory-writer';
import { MemoryCron } from './memory.cron';
import { Librarian } from './the-librarian';
import { MemoryController } from './memory.controller';

@Module({
  controllers: [MemoryController],
  providers: [MemoryWriter, MemoryCron, Librarian],
  exports: [MemoryWriter, Librarian],
})
export class MemoryModule {}
