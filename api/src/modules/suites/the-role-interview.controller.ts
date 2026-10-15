import { BadRequestException, Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, CurrentUserData } from '../../common';
import { RoleInterviewService } from './the-role-interview.service';
import { LONGEST_PART_TYPED } from './correct-their-job';

class SendInterviewDto {
  /** The person's `externalId`, as the roster gives it. */
  @IsOptional() @IsString() @MaxLength(200) personId?: string;
  /** A role's name. With a person, it says which of their roles; alone, it sends to everyone who holds it. */
  @IsOptional() @IsString() @MaxLength(200) roleName?: string;
}

/** What a person changes about what they told us of their own job. Each part is optional; send only what changed. */
class CorrectMyJobDto {
  @IsOptional() @IsString() @MaxLength(200) roleName?: string;
  @IsOptional() @IsString() @MaxLength(LONGEST_PART_TYPED) owns?: string;
  @IsOptional() @IsString() @MaxLength(LONGEST_PART_TYPED) decides?: string;
  @IsOptional() @IsString() @MaxLength(LONGEST_PART_TYPED) doingWell?: string;
  @IsOptional() @IsString() @MaxLength(LONGEST_PART_TYPED) dependsOn?: string;
  @IsOptional() @IsString() @MaxLength(LONGEST_PART_TYPED) dependedOnBy?: string;
  @IsOptional() @IsString() @MaxLength(LONGEST_PART_TYPED) inTheWay?: string;
}

@ApiTags('Suites')
@ApiBearerAuth()
@Controller('suites/roles/interview')
export class RoleInterviewController {
  constructor(private readonly interview: RoleInterviewService) {}

  @Post()
  @ApiOperation({ summary: 'An admin sends the role interview to a person, or to everyone who holds a role. Admins only.' })
  send(@CurrentUser() user: CurrentUserData, @Body() dto: SendInterviewDto) {
    return this.interview.send({ userId: user.id, organizationId: user.organizationId }, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'What you told us about your own job: in the role interview, or in your first check-in. Nobody else reads it here.' })
  mine(@CurrentUser() user: CurrentUserData) {
    return this.interview.mine({ userId: user.id, organizationId: user.organizationId });
  }

  @Put('mine')
  @ApiOperation({ summary: 'Correct what you told us about your own job. You are the only one who can; send only what changed.' })
  async correctMine(@CurrentUser() user: CurrentUserData, @Body() dto: CorrectMyJobDto) {
    try {
      return await this.interview.correctMine({ userId: user.id, organizationId: user.organizationId }, dto);
    } catch (err) {
      if (err instanceof RangeError) throw new BadRequestException(err.message);
      throw err;
    }
  }
}
