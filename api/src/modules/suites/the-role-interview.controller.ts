import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, CurrentUserData } from '../../common';
import { RoleInterviewService } from './the-role-interview.service';

class SendInterviewDto {
  /** The person's `externalId`, as the roster gives it. */
  @IsOptional() @IsString() @MaxLength(200) personId?: string;
  /** A role's name. With a person, it says which of their roles; alone, it sends to everyone who holds it. */
  @IsOptional() @IsString() @MaxLength(200) roleName?: string;
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
  @ApiOperation({ summary: 'The answers you gave to the role interview. Nobody else reads them here.' })
  mine(@CurrentUser() user: CurrentUserData) {
    return this.interview.mine({ userId: user.id, organizationId: user.organizationId });
  }
}
