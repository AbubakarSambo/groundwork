import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ResolutionService } from './resolution.service';
import { CurrentUser } from '../../common';

class ProposeResolutionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  endState: string;

  /** Why, in a sentence or two. The people in the check-in read it with the outcome. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

class CounterProposeResolutionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  proposedEndState: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

@ApiTags('Resolution')
@ApiBearerAuth()
@Controller('grounds/:groundId/resolution')
export class ResolutionController {
  constructor(private readonly resolution: ResolutionService) {}

  @Get()
  @ApiOperation({ summary: 'Get the resolution state + valid end states (party only)' })
  async get(@Param('groundId') groundId: string, @CurrentUser('id') userId: string) {
    return this.resolution.get(groundId, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Propose or confirm an end state (closes when both parties confirm)' })
  async propose(@Param('groundId') groundId: string, @CurrentUser('id') userId: string, @Body() dto: ProposeResolutionDto) {
    return this.resolution.propose(groundId, userId, dto.endState, dto.reason);
  }

  @Post('counter')
  @ApiOperation({ summary: 'Counter-propose an end state - replaces the current proposal and notifies the other party' })
  async counterPropose(
    @Param('groundId') groundId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CounterProposeResolutionDto,
  ) {
    return this.resolution.counterPropose(groundId, userId, dto.proposedEndState, dto.message);
  }
}
