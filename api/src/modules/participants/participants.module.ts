import { Module } from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { ParticipantsController } from './participants.controller';
import { AuthModule } from '../auth';

@Module({
  imports: [AuthModule], // re-exports JwtModule -> JwtService for issuing tokens
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
