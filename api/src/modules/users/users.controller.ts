import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { CurrentUser, CurrentUserData, Roles, Role, PaginationDto } from '../../common';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('privacy-audit')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Privacy audit for a user — admin only diagnostic (GW-privacy)' })
  async getPrivacyAudit(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId query parameter is required');
    return this.usersService.getPrivacyAudit(userId);
  }

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
