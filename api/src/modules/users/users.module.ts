import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MyOwnRecordService } from '../people/my-own-record.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService, MyOwnRecordService],
  exports: [UsersService],
})
export class UsersModule {}
