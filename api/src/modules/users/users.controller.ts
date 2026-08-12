import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, CurrentUserData, Roles, Role, PaginationDto } from '../../common';

class RenameOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('organization')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Rename the organization (admin only)' })
  async renameOrganization(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: RenameOrganizationDto,
  ) {
    return this.usersService.renameOrganization(organizationId, dto.name);
  }

  @Post('me/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate own membership (self-serve leave org)' })
  async leaveOrg(@CurrentUser('id') userId: string) {
    return this.usersService.leaveOrg(userId);
  }

  /**
   * `GET /users/privacy-audit` IS DELETED, AND NOT BECAUSE IT WAS UNUSED. W13-14.
   *
   * The audit flagged it as an admin endpoint no page calls, and the plan said surface it or
   * drop it. Reading it decided the question: `getPrivacyAudit(userId)` took a user id straight
   * off the query string and **never checked that user was in the caller's organisation**. So
   * any org admin could ask whether an arbitrary user - in any company on the platform - has a
   * record, and across how many grounds.
   *
   * Thin data, but it is the wrong shape: a cross-organisation read reachable by every admin.
   * Wiring it to a page would have shipped that; the endpoint went instead. What it returned is
   * derivable from `GET /users` and a ground list, both properly scoped.
   */

  @Get('me/export')
  @ApiOperation({ summary: 'Export all personal data for the current user (GDPR Article 15)' })
  async exportData(@CurrentUser('id') userId: string) {
    return this.usersService.exportData(userId);
  }

  @Delete('me/data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete and anonymise personal data (GDPR Article 17)' })
  async eraseAccount(@CurrentUser('id') userId: string) {
    return this.usersService.eraseAccount(userId);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List users in the organization' })
  async findAll(@CurrentUser('organizationId') organizationId: string, @Query() pagination: PaginationDto) {
    return this.usersService.findAll(organizationId, pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get a single user' })
  async findOne(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    return this.usersService.findOne(id, organizationId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Invite a user to the organization' })
  @ApiResponse({ status: 201, description: 'User invited' })
  async create(@CurrentUser('organizationId') organizationId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(organizationId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a user' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: CurrentUserData) {
    return this.usersService.update(id, user.organizationId, dto, user.id);
  }

  @Post(':id/resend-invite')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Resend a pending invite' })
  async resendInvite(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    return this.usersService.resendInvite(id, organizationId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate a user' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.usersService.remove(id, user.organizationId, user.id);
  }
}
